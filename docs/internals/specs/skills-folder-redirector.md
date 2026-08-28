# Skills — One Registry, Many Bridges

> Spec status: **draft, awaiting maintainer review**. Generated from a code review of `apps/server/src/provider/Drivers/ClaudeSkills.ts`, `ClaudeHome.ts`, `CodexDriver.ts`, `CodexHomeLayout.ts`, `OpenCodeDriver.ts`, `opencodeRuntime.ts`, `acp/CursorAcpSupport.ts`, `acp/GrokAcpSupport.ts`, `Layers/CodexProvider.ts`, `Layers/CodexSessionRuntime.ts`, `Layers/ClaudeProvider.ts`, `Layers/ClaudeAdapter.ts`, `Layers/OpenCodeProvider.ts`, `Layers/AntigravityAdapter.ts`, `apps/web/src/components/skills/`, `packages/client-runtime/src/providerSkills.ts`, `packages/contracts/src/server.ts`, `apps/server/src/orchestration/workflowScriptQuery.ts`. The new `composerGoal.ts` is unrelated (slash-command parser for `/goal`).

## 1. The problem

Five providers, four default skills folders, and a list-returning reader per adapter. Each adapter scans its own slice of the filesystem, dedupes in its own way, and surfaces a per-provider list. The user has no central place to enable, disable, or copy a skill. A `discoverClaudeSkills` change doesn't help Codex, an `app.skills()` change doesn't help Claude, and a `<cwd>/.codex/skills` write is invisible to the rest.

| Provider | Today | Surface |
|---|---|---|
| Codex | `discoverClaudeSkills`-style read of `<cwd>/.agents/skills` + `<cwd>/.claude/skills`; `codex app-server` `skills/list` (`CodexProvider.ts:404-412`); shadow-home symlink of the whole `CODEX_HOME` tree (`CodexHomeLayout.ts:25, 320-415`) | Three inputs, no dedup |
| Claude Code | `discoverClaudeSkills` (`ClaudeSkills.ts:95-155`) — `configDirPath/skills`, `<cwd>/.agents/skills`, `<cwd>/.claude/skills`, later winning on name collisions | One reader, returns a list |
| OpenCode | `app.skills()` SDK call (`opencodeRuntime.ts:715-725`); `OPENCODE_CONFIG_CONTENT` env (`opencodeRuntime.ts:40-49`) | Two surfaces, no registry |
| Cursor / Grok / Antigravity | Not surfaced to RUNE today | None |

The redirector pattern (one canonical folder on disk, symlinks into each provider's tree) is rejected. The user's editor is downstream of RUNE, not the other way around. RUNE owns a registry; the bridges are projections.

## 2. Principles

- **One registry, many bridges.** The server owns a `SkillRegistry`. Adapters write into it; bridges read from it. The per-provider list (`ServerProvider.skills`) is a projection of the registry filtered by adapter reach.
- **Dedup by content hash, then by slug.** Two skills with the same body are one skill. Two skills with the same slug and different bodies are versions. Name collisions in the discovery phase are resolved by the registry, not by a list's "later wins" rule (`ClaudeSkills.ts:142-150`).
- **Progressive load.** Index `slug`, `contentHash`, `scope`, `sourcePath`, `enabled`, `version`, `lastUsedAt` on startup. Read `body` on demand, cache 60s, re-read. `discoverClaudeSkills` reading every `SKILL.md` upfront (`ClaudeSkills.ts:95-155`) is wrong.
- **Realpath containment** for every bridge write — registry write, symlink creation, or config snippet. Same model as `apps/server/src/orchestration/workflowScriptQuery.ts:50-60`. Refuse otherwise.
- **Bridges are one-way.** Registry → on-disk layout, never the reverse. A provider that scans the filesystem gets a *projection* of the registry, not a list the registry then re-discovers.
- **`~/.claude/projects/...` is sacred.** The hardcoded realpath root in `orchestration/workflowScriptQuery.ts:25-27` is not touched by the registry.
- **Web is browser-only; the import UX is a server RPC.** Desktop and mobile both go through the same server route.

## 3. The registry

### 3.1 Shape

New file: `apps/server/src/provider/SkillRegistry.ts`. Naming follows the existing pattern (`ProviderInstanceRegistry`, `ProviderRegistry`, `ProviderAdapterRegistry`, `McpSessionRegistry`, `PullRequestProviderRegistry`, `SourceControlProviderRegistry`, `VcsDriverRegistry` — grep `SkillRegistry` / `registry.ts` in `apps/server/src` returns nothing today).

**Architecture split.** Two distinct sources of truth, kept separate on purpose:

- **FILES on disk** — `<cwd>/.agents/skills/<slug>/SKILL.md`, `<cwd>/.claude/skills/...`, `CODEX_HOME/skills/...`, the OpenCode skill tree, etc. — are the source of *content* truth. The user's authored `SKILL.md` is canonical for the bytes; RUNE does not own or rewrite it.
- **RUNE Skill Registry** is the source of *runtime/discovery* truth: which skills exist, where, dedupe, scope, version, activation, metadata.

Editing a skill outside RUNE (in the user's editor) is safe: the next Discovery Adapter re-reads the file, the content hash bumps, dedupe re-evaluates, the version increments. The Registry never writes back to the source path.

```ts
type RegisteredSkill = {
  // Registry record. The source of bytes lives at `sourcePath` (user-owned);
  // the Registry holds runtime/discovery metadata only.
  id: SkillId;                  // contentHash:slug
  slug: string;                 // e.g. "test-runner"
  name: string;
  description: string;
  scope: "project" | "repo" | "personal" | "app";
  sourceAdapter: ProviderDriverKind;  // which adapter surfaced it
  sourcePath: string;           // original path, for editing/refresh
  contentHash: string;          // SHA-256 of SKILL.md + sibling files
  version: number;              // bumped on content change
  enabled: boolean;             // user-controlled
  body: string;                 // SKILL.md contents, lazy-loaded
  references: ReadonlyArray<{ path: string; hash: string }>;
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
  lastUsedAt: string | null;    // when the registry last saw this skill be activated
}
```

`ServerProvider.skills` (`packages/contracts/src/server.ts:162-198`) is a projection of the Registry, filtered by the provider's adapter reach.

### 3.2 Discovery Adapters

A *Discovery Adapter* is read-only: it reads the upstream filesystem / API, computes the content hash, and writes a `RegisteredSkill` record into the Registry. The Registry never writes back to the source path.

- Discovery runs on Registry startup, on a file-watcher debounce (1s), and on explicit `registry.refresh()` (RPC).
- Dedup key is `contentHash` first, then `slug`. Same body + different slugs → surfaced as "two names, one body". Same slug + different body → versioned.
- `discoverClaudeSkills` (`ClaudeSkills.ts:95-155`) becomes a *writer*, not a list-returning function. Its three scan roots (`ClaudeSkills.ts:104-112`) feed the adapter. The Map dedupe at `ClaudeSkills.ts:142-150` moves into the Registry.
- `codex app-server` `skills/list` (`CodexProvider.ts:404-412`) is a Discovery Adapter too.
- `app.skills()` (`opencodeRuntime.ts:715-725`) is a Discovery Adapter.
- Cursor / Grok / Antigravity: same pattern, but the writer is a stub until upstream ships a path. The Registry just doesn't write to those adapters.

### 3.3 Progressive loading

- Startup indexes `slug`, `contentHash`, `scope`, `sourcePath`, `enabled`, `version`, `lastUsedAt`. No bodies.
- `registry.getSkillBody(id)` reads the file from the **user's source path** (the original `SKILL.md` at `sourcePath`, not a Registry-owned copy), caches the body in memory for 60s, and re-reads on expiry. The cache is an in-memory TTL only; the Registry never writes the body back to disk.
- The wire carries `id, slug, name, scope, sourceAdapter, enabled, lastUsedAt` only. `body` is fetched on demand via `serverGetSkillBody({ id })`.

### 3.4 Activation

- A skill is *active* for a thread iff `enabled === true` AND its `scope` includes the thread's project cwd.
- A `thread.started` event bumps `lastUsedAt` for the active set. One bump per thread, not per turn.
- The composer surfaces enabled skills via the `$` menu (kept). The slash menu also surfaces skills if `showSkillsInSlashMenu` is on (kept — no new setting).

## 4. Execution Bridges (only where upstream requires them)

An *Execution Bridge* is one-way: **Registry → provider runtime**. The bridge is the *only* place we touch the provider's filesystem, env, or config. The Registry is canonical; the bridge is a projection. The reverse direction is the Discovery Adapter's job (§3.2), not the bridge's.

Distinguish two named things (this is a rename of the prior "bridge" concept):

- **Discovery Adapter** — provider/filesystem/API → Registry. Reads upstream, writes Registry records. Read-only against the source path.
- **Execution Bridge** — Registry → provider runtime. One-way: registry to on-disk layout the provider reads, env / `--add-dir`, or config snippet. Never the reverse.

### 4.1 Codex — shadow-home symlink, registry-driven (Execution Bridge)

- `CodexHomeLayout.ts:25-30` drops `"skills"` from `KNOWN_SHARED_DIRECTORIES`. The shadow home no longer symlinks the whole `CODEX_HOME/skills` tree blindly.
- `materializeCodexShadowHome` (`CodexHomeLayout.ts:320-415`) builds `<shadow>/skills` from the registry's "codex-visible" set. Each enabled Codex-scope skill's directory is materialized (real symlink or junction on Windows via `ensureSymlink`, `CodexHomeLayout.ts:216-293`).
- `Layers/CodexProvider.ts:340-345` keeps `CODEX_HOME` set via `expandHomePath`. No change.
- The bridge is one-way: registry → on-disk. Codex's `client.request("skills/list", { cwds: [input.cwd] })` at `Layers/CodexProvider.ts:404-412` is a Discovery Adapter (it writes into the registry); it is *not* the source of truth for the UI.

### 4.2 Claude Code — `--add-dir` from the registry (Execution Bridge)

- `Layers/ClaudeAdapter.ts:4232-4286` rewrites `additionalDirectories` from `[input.cwd, serverConfig.attachmentsDir]` to the union of: thread cwd, attachments dir, and each enabled project-scope skill's directory. All from the registry.
- Per-thread cwd fix: `Layers/ClaudeProvider.ts:929` calls `discoverClaudeSkills` against the server's cwd. That call site is the Discovery Adapter, which is per-thread.
- The Claude SDK follows symlinks within `--add-dir` paths, so a single skill directory under `<cwd>/.agents/skills/<slug>` works as-is.

### 4.3 OpenCode — config snippet, GATED on upstream verification

- OpenCode's `skills.path` config key is **NOT shipped** until OpenCode upstream documents and supports it. The prior spec proposed the `RUNE_OPENCODE_CONFIG_SKILLS` JSON snippet as "forward-compat"; the maintainer rejects speculative config keys.
- **Until upstream verification**: OpenCode is registry-only. The SkillsPage surfaces OpenCode skills for browsing and activation, but the OpenCode runtime does not load them — the OpenCode Execution Bridge is a no-op.
- **PR 9 is conditional**: it ships only after an explicit verification step — a link to OpenCode docs that document the `skills.path` key, OR a minimal `OpenCode config skills` test that proves the key is honored at runtime.
- Discovery Adapters still run: `serve` spawn (`opencodeRuntime.ts:510-530`) and `app.skills()` (`opencodeRuntime.ts:715-725`) write into the registry; neither is the source of truth for the UI.
- `OPENCODE_CONFIG_CONTENT` precedence (`opencodeRuntime.ts:40-49`) is left untouched until the gate clears.

### 4.4 Cursor / Grok / Antigravity — registry exposes, runtime ignores

- No Execution Bridge. No symlink. No stub file. The registry exposes the skill via `ServerProvider.skills` for the UI; the runtime dispatches nothing.
- The stub-file publisher (rejected) would have written a fake `SKILL.md` into Cursor's expected folder. That is dishonest and confuses the user's editor. RUNE surfaces the skill in the SkillsPage; the user copies it to Cursor manually if they want it.

## 5. Realpath containment

Every registry write or symlink creation must realpath to a path under the project's `cwd`. Refuse otherwise. Same model as `apps/server/src/orchestration/workflowScriptQuery.ts:50-60`:

```ts
const real = await FileSystem.realpath(target);
const projectReal = await FileSystem.realpath(cwd);
if (resolved !== root && !resolved.startsWith(root + sep)) {
  return yield* Effect.fail(new SkillRegistryError({
    reason: "target-escapes-project",
    target: real,
    projectRoot: projectReal,
  }));
}
```

## 6. Skills import — copy from project A to project B

The web is a browser; the filesystem is server-side. The copy is always a server request.

### 6.1 New RPC group: `SkillRegistryRpc`

New file: `apps/server/src/skills/skillRegistryRpc.ts`. New contract: `packages/contracts/src/skills.ts`.

- `listSkillSourceCandidates({ sourceEnvironmentId, sourceProjectKey? }): { entries: SkillImportCandidate[] }` — returns the registry's discoverable skills in the source project.
- `copySkillsToProject({ sourceEnvironmentId, sourceProjectKey?, sourceSkillIds, destinationEnvironmentId, destinationProjectKey?, canonicalRoot?: "agents" | "claude" | "codex" }): { copied: number, skipped: Array<{ id: string, reason: string }> }` — FILES-to-FILES copy. The server reads the skill body from the **source FILES** (using `sourcePath` from the source Registry row to locate the original `SKILL.md` on disk) and writes the body to the **destination FILES** at the resolved canonical root. The Registry is not in the loop for the bytes. After the copy lands, both sides re-run their Discovery Adapters: the destination's Discovery Adapter picks up the new files, hashes them, and indexes them into the destination Registry. The destination Execution Bridge (e.g. Codex shadow-home symlink) is rebuilt on the destination side after the Discovery Adapter re-indexes.

### 6.2 Server implementation

New file: `apps/server/src/skills/skillImport.ts`. The handler reads the body off disk at the source `sourcePath` (NOT from the source Registry record's cached body — re-read from FILES so external edits are honored), then writes a recursive `FileSystem.copy` of `SKILL.md` and any sibling files to the destination. Refuses to write outside the resolved canonical root (realpath containment, same pattern). Wired into the API layer. The destination Registry is then refreshed via the destination Discovery Adapter; the import handler does not write Registry rows directly.

### 6.3 Web client

New: `apps/web/src/skills/skillRegistry.client.ts`. Thin RPC client wrapper. Result is shown in a toast; the SkillsPage re-queries the destination environment's providers.

### 6.4 UI

- The SkillsPage lists **Registry rows**, not filesystem entries. Each row carries `slug`, `name`, `scope`, `sourceAdapter`, `enabled`, `lastUsedAt`, and the `sourcePath` of the underlying file. The `sourcePath` is shown on hover and in the detail panel so the user can open the original `SKILL.md` in their editor.
- Editing a skill in the user's editor is safe and encouraged. The next Discovery Adapter refresh (file-watcher debounce at 1s, or explicit `registry.refresh()`) re-reads the file, the content hash bumps, dedupe re-evaluates, and `version` increments. The Registry never writes back to the source path.
- Add a "Copy to project…" button to `apps/web/src/components/skills/SkillDetailPanel.tsx` (sibling to "Use in composer" / "Copy command", which stay at `SkillDetailPanel.tsx:79-87`).
- Add a multi-select "Import these skills" toolbar on `apps/web/src/components/skills/SkillsPage.tsx:193-200`.
- The button opens a small destination picker (environment + project).

### 6.5 Auth/scope

The operation needs `AuthOperateScope` (it's a write to project B's filesystem). It does **not** need server-admin scope (no global state changes).

### 6.6 Why the server, not the client

- Web browsers have no FS.
- Mobile RN has FS but not the project's FS (it's a different host).
- Desktop is the only surface that *could* do this client-side, but routing through the server means web and mobile get the same UX. The server already knows the `cwd` of every project; copying via the server is one trip and one audit trail.

## 7. Files in scope

Server: `apps/server/src/provider/SkillRegistry.ts` (NEW), `Drivers/ClaudeSkills.ts`, `ClaudeHome.ts`, `CodexDriver.ts:108-141` (driver `create` — natural seam for the registry), `CodexHomeLayout.ts:19-30, 216-293, 320-415`, `opencodeRuntime.ts:40-49, 510-530, 715-725`, `acp/CursorAcpSupport.ts`, `acp/GrokAcpSupport.ts`, `Layers/CodexProvider.ts:340-345, 354-372, 404-412`, `Layers/CodexSessionRuntime.ts`, `Layers/ClaudeProvider.ts:929`, `Layers/ClaudeAdapter.ts:4232-4286`, `Layers/OpenCodeProvider.ts`, `Layers/AntigravityAdapter.ts`, `providerSnapshot.ts:223`. New: `apps/server/src/skills/skillRegistryRpc.ts` (RPC group), `apps/server/src/skills/skillImport.ts` (server-side copy).

Web: `apps/web/src/components/skills/SkillsPage.tsx:100-114, 117-146, 193-200`, `SkillDetailPanel.tsx:11-17, 33-41, 79-87`, `apps/web/src/skills/skillsWorkspace.logic.ts:28-35, 59-96, 98-120`. New: `apps/web/src/skills/skillRegistry.client.ts` (thin RPC client).

Contracts: `packages/contracts/src/server.ts:89-98` (`ServerProviderSkill` becomes a projection: `id, slug, name, scope, sourceAdapter, enabled, lastUsedAt`; `body` is omitted from the wire and fetched on demand), `packages/contracts/src/server.ts:162-198` (`ServerProvider.skills` carries the projection; new field `skillsRegistryVersion: number` so the client can detect changes). New: `packages/contracts/src/skills.ts` (`RegisteredSkill`, `SkillRegistryRpc`).

Shared: `packages/client-runtime/src/providerSkills.ts:1-100` (keep `ProviderSkillSourceKind`; add `formatRegistrySkillDisplayName`).

## 8. PR breakdown

| # | Title | What ships |
|---|---|---|
| 1 | `feat(skills): SkillRegistry + per-adapter writers` | New `apps/server/src/provider/SkillRegistry.ts`. `ClaudeSkills` / `CodexProvider` / `opencodeRuntime` each become writers. Server start reindexes. |
| 2 | `feat(skills): ServerProvider.skills is a projection of the registry` | Wire change: `ServerProviderSkill` adds `id, sourceAdapter, lastUsedAt`. `ServerProvider` adds `skillsRegistryVersion`. |
| 3 | `feat(skills): Claude Code additionalDirectories reads from the registry` | `Layers/ClaudeAdapter.ts:4232-4286` is rewritten. Per-thread cwd fix (`Layers/ClaudeProvider.ts:929`). |
| 4 | `feat(skills): Codex shadow-home symlink reads from the registry` | `CodexHomeLayout.ts:25-30, 320-415` — drop `"skills"` from `KNOWN_SHARED_DIRECTORIES`. The symlink is rebuilt from the registry's "codex-visible" set. |
| 5 | `feat(skills): SkillsPage is a registry view + Enable/Disable toggle` | Web side: registry-driven rows, source-kind labels, Enable/Disable. The "Use in composer" + "Copy command" actions stay. |
| 6 | `feat(skills): progressive body load (on demand)` | `registry.getSkillBody(id)` + 60s cache. Wire RPC `serverGetSkillBody({ id })`. |
| 7 | `feat(skills): SkillRegistryRpc + copy between projects` | New RPC group; server-side copy; web multi-select toolbar. |
| 8 | `test(skills): realpath containment + dedup-by-content-hash tests` | Pure unit tests; no DOM. |
| 9 | `feat(skills): OpenCode Execution Bridge (gated on upstream verification)` | GATED: does not ship until OpenCode upstream documents and supports the `skills.path` config key. PR description must include either (a) a link to OpenCode docs that document the key, or (b) a minimal `OpenCode config skills` test that proves the key is honored at runtime. Until the gate clears, OpenCode is registry-only — the SkillsPage surfaces OpenCode skills for browsing and activation, but the OpenCode runtime does not load them. `OPENCODE_CONFIG_CONTENT` precedence at `opencodeRuntime.ts:40-49` is left untouched. |

## 9. Severity-1 findings (from the review)

1. **`discoverClaudeSkills` is a list-returning function, not a writer** (`apps/server/src/provider/Drivers/ClaudeSkills.ts:95-155`) — PR 1.
2. **`KNOWN_SHARED_DIRECTORIES` includes `skills`; the shadow home symlinks blindly** (`apps/server/src/provider/Drivers/CodexHomeLayout.ts:25`) — PR 4.
3. **`ClaudeServiceSettings` is a separate component — fold into `UniversalServiceSettings`** (cross-ref: settings spec).
4. **Codex `app-server` `skills/list` returns the on-disk list, not a registry view** (`Layers/CodexProvider.ts:404-412`) — PR 1.
5. **OpenCode has no registry writer today** (`opencodeRuntime.ts:715-725`) — PR 1.
6. **Cursor / Grok / Antigravity have no skill surface today.** The stub-file publisher fallback is rejected. The registry just doesn't write to those adapters until upstream ships a path — PR 1 leaves them as no-ops.
7. **`body` is read upfront by `discoverClaudeSkills`** (`ClaudeSkills.ts:95-155` reads the file in the loop). Progressive-load instead — PR 6.
8. **Per-thread cwd bug**: `discoverClaudeSkills` runs against the server cwd, not the thread cwd (`Layers/ClaudeProvider.ts:929`). PR 3 fixes this via the registry writer.
9. **Map dedupe by name in `discoverClaudeSkills`** (`ClaudeSkills.ts:142-150`) — the registry dedupes by content hash first, then slug. PR 1.
10. **Prior spec framed the Registry as the source of truth, contradicting the user's on-disk skill files** (`ClaudeSkills.ts:95-99` `discoverClaudeSkills` signature; `ClaudeSkills.ts:104-112` three scan roots). The corrected architecture splits: **FILES** on disk (`.agents/skills/<slug>/SKILL.md`, `<cwd>/.claude/skills`, `CODEX_HOME/skills`, etc.) are the source of *content* truth; the **RUNE Skill Registry** is the source of *runtime/discovery* truth (which skills exist, where, dedupe, scope, version, activation, metadata). The Registry never writes back to the source path. Editing outside RUNE is safe — the next Discovery Adapter refresh picks up the change, the content hash bumps, dedupe re-evaluates, and `version` increments. Renames the prior "bridge" concept into two named things: **Discovery Adapter** (provider/filesystem/API → Registry) and **Execution Bridge** (Registry → provider runtime, one-way).
11. **OpenCode `skills.path` config key was proposed as forward-compat; rejected.** Do not ship speculative config keys. The OpenCode Execution Bridge is gated on verified upstream capability — a link to OpenCode docs that document the `skills.path` key, OR a minimal `OpenCode config skills` test that proves the key is honored at runtime. Until the gate clears, OpenCode is registry-only (SkillsPage surfaces the skills; the OpenCode runtime does not load them). `OPENCODE_CONFIG_CONTENT` precedence at `opencodeRuntime.ts:40-49` is left untouched. PR 9 is conditional on this verification.

## 10. Open questions

- **`SkillId` format**: `contentHash:slug`? Or `slug@version`? Recommend `contentHash:slug` for the MVS and accept a breaking rename in v2 if the user wants version-anchored IDs.
- **`lastUsedAt` source**: which event bumps it? `thread.started`? Or the per-turn model-call? Recommend `thread.started` (cheaper; one bump per thread, not per turn).
- **`scope` in the registry**: should "repo" be project-local (one cwd) or repo-wide (one git repo, many cwds)? Recommend project-local for MVS; repo-wide is a follow-up.
- **Progressive body TTL**: 60s — too short? Too long? Recommend 60s with a 30s prefetch on hover.
- **"Personal" scope for Claude**: today `~/.claude/skills` is loaded as "user"; the registry should preserve the "user" label and not flatten it to "personal". The prior spec called this out; keep the call.
- **External-edit refresh latency**: when a user edits a skill in their editor outside RUNE, the Discovery Adapter re-reads on the next refresh cycle. Is the file-watcher debounce (1s) tight enough? Loose enough? Recommend 1s for MVS; revisit if user reports stale reads.

## 11. Out of scope

- The symlink-manager-as-redirector design (rejected).
- The stub-file-publisher fallback (rejected).
- Cursor / Grok / Antigravity runtime skill dispatch (kept as "registry exposes, runtime ignores" until upstream ships a path).
- The `~/.claude/projects/...` realpath root in `orchestration/workflowScriptQuery.ts:25-27` (preserved).
- Mobile UI changes beyond reusing the web RPC.
- The chat, shell, settings, usage specs.
- The speculative OpenCode `skills.path` config snippet — gated until OpenCode upstream documents and supports the key (PR 9 is conditional).
