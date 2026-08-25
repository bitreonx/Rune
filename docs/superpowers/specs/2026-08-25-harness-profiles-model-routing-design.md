# Harnesses & Models — Profiles, Identities, Model Services & Routing

**Date:** 2026-08-25
**Status:** Approved design, pending implementation plan
**Scope:** Web + desktop settings/composer; server domain + adapters. Mobile inherits data through existing snapshots; mobile picker rework is a fast-follow.
**Supersedes:** [`2026-08-25-claude-service-integrations-design.md`](./2026-08-25-claude-service-integrations-design.md) (absorbed — see "Relationship to prior art").

---

## Problem

RUNE conflates five concepts under one "provider instance" idea:

1. **harness** (Claude Code, Codex, …),
2. **account/identity** (work vs personal ChatGPT),
3. **model service** (OpenRouter, Anthropic, native subscription),
4. **model**, and
5. **harness-internal role models** (main / fast / subagent).

Consequences users feel today:

- Routing Claude Code through OpenRouter requires either hand-editing env vars or a
  Claude-specific wizard whose translation lives **client-side** (`claudeRoles.ts`,
  `ClaudeServiceSettings.tsx` build `ANTHROPIC_*` variables in React). Mobile can never reuse it.
- An OpenRouter key must be re-entered per provider instance; there is no reusable service.
- Role routing does not exist: when a custom model is selected, the adapter pins **one** model onto
  every Claude alias (`ClaudeAdapter.ts` `customModelAliasEnv`). Main and subagents cannot diverge,
  and a route change cannot reach already-running sessions.
- OpenRouter/OpenAI-API exist as harness-shaped _drivers_, so "where models come from" masquerades
  as a coding agent in the picker.
- Multi-account Codex exists (shadow homes) but is configured by typing filesystem paths.
- Settings shows one flat grid of instances plus a Driver→Identity→Config wizard asking for slugs,
  accents, binary paths up front, plus a documentation-heavy sign-in guide modal.

## Product model

```
HARNESS  (Claude Code)
  └─ PROFILE  ("Claude via OpenRouter")
       ├─ IDENTITY?   (Codex: Work / Personal account)
       ├─ ROUTE       (service + default model + role overrides + routeVersion)
       │    └─ MODEL SERVICE  (OpenRouter — key stored once, reused)
       └─ COMPILED OUTPUT → existing ProviderInstance machinery (unchanged runtime)
```

The user edits only the top three layers. Compiled instances become internal.

## Decisions locked during brainstorming

| Question       | Decision                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces       | Web + desktop now; mobile picker follows using the same contracts                                                                                                                   |
| Harness roster | Existing 7 drivers (codex, claudeAgent, cursor, grok, opencode, antigravity, runeNative); no DeepSeek placeholder                                                                   |
| Migration UX   | Silent projection; lazy write-back on first edit                                                                                                                                    |
| Architecture   | Compile-over substrate — profiles/services/routes are the authoring surface in `ServerSettings`; a server-side compiler materializes `providerInstances`; session runtime untouched |

## Domain contracts

New module `packages/contracts/src/harness.ts`.

**Deviations from the task's literal interfaces** (the task invites following repo conventions):

- `HarnessKind` is a branded **open slug**, not a closed union — same forward/backward-compat
  invariant as `ProviderDriverKind` (`providerInstance.ts` module docs): forks/downgrades must
  parse. Known values come from the static definitions catalog.
- Harness ids **reuse driver-kind strings**: `codex`, `claudeAgent`, `cursor`, `grok`, `opencode`,
  `antigravity`, plus new `runeNative`. One vocabulary end-to-end; every persisted thread binding
  keeps routing with zero translation. `"claude-code"` naming is display-layer only.
- Routes are embedded in profiles (`profile.route`), not separate `ModelRouteId` records — one less
  indirection to migrate; service-deletion protection scans `route.modelServiceId`.
- Identities are stored inside profiles for v1 (`identity?: { label, accountDisplay?, authState?,
configDir?, managedShadowHome? }`) rather than a standalone map — Codex is the only harness with
  identities today; promote to a first-class map if a second consumer appears.

```ts
HarnessRole = "main" | "reasoning" | "fast" | "subagent" | "reviewer" | "compaction"

HarnessDefinition = {
  kind: HarnessKind            // slug
  displayName                  // "Claude Code"
  iconKey                      // web asset reference
  tagline                      // one sentence for the chooser card
  capabilities: {
    canApplyRoutesLive: boolean        // claudeAgent/runeNative true, codex false
    supportsMultipleIdentities: boolean // codex true
    supportedServiceKinds: ModelServiceKind[]
    roles: ReadonlyArray<{ role: HarnessRole, label: string }>
  }
}

ModelServiceKind = "native" | "openrouter" | "openai" | "anthropic" | "google"
                 | "custom-openai-compatible" | "custom-anthropic-compatible"

ModelServiceConfig = {
  serviceId                    // slug
  kind                         // above
  displayName                  // "OpenRouter Personal"
  baseUrl?                     // default per kind
  credentialRef?               // ServerSecretStore name: model-service:<serviceId>:api-key
}
// Wire projection adds derived, non-secret state: hasCredential, maskedLabel, status:
// "connected" | "needs-auth" | "unavailable" | "checking"

HarnessProfileConfig = {
  profileId                    // slug
  harnessKind
  displayName                  // "Claude OpenRouter"
  accentColor?
  enabled                      // default true
  identity?                    // see note above
  instanceId                   // STABLE compiled ProviderInstanceId target
  route: ModelRoute
  routeVersion                 // bumped on any route change; starts at 1
  advanced?: {                 // passthrough preserved verbatim, never translated
    environment?: ProviderInstanceEnvironment
    configPatch?: unknown      // merged over compiled driver config
  }
}

ModelRoute = {
  modelServiceId: ServiceId | "native"
  defaultModel                 // slug within the service
  sameModelEverywhere          // default true — pins all supported roles
  roleOverrides                // Partial<Record<HarnessRole, string>>
}
```

`ServerSettings` gains `harnesses: { profiles: Record<ProfileId, HarnessProfileConfig>,
services: Record<ServiceId, ModelServiceConfig> }` (both decode-empty). `providerInstances`
remains in the schema but is documented as **compiled output**; WS settings patches from clients
that touch `providerInstances` directly keep working during the transition but the new page never
writes it.

### Secrets

Credentials ride the existing `ServerSecretStore` pipeline (`serverSettings.ts`
persist/materialize): `credentialRef` entries live only in `<state>/secrets/` (0700), settings.json
keeps `hasCredential` state, clients receive masked projections only, log redaction inherited.
Routes/profiles contain references, never raw keys (§34 satisfied by construction).

## Compiler

`apps/server/src/provider/harnesses/HarnessProfileCompiler.ts` — pure function
`(profiles, services, definitions, legacyInstances) => Record<ProviderInstanceId,
ProviderInstanceConfig>`, invoked inside the settings-materialization pipeline before registry
hydration, so hot-reload semantics are byte-for-byte today's.

Rules:

- Deterministic id: `profile.instanceId` (assigned at creation; migration pins existing ids).
- Claude Code + gateway service → `{driver: "claudeAgent", environment: [ANTHROPIC_BASE_URL,
ANTHROPIC_AUTH_TOKEN(sensitive→secret)], config.customModels: [route models]}`. Role env vars are
  NOT baked here — see live resolution below — except as the Advanced-passthrough fallback.
- Codex + native → `{driver: "codex", config: {homePath: <shared>, shadowHomePath:
auto-managed}}`. RUNE owns shadow homes at `<t3-home>/codex-accounts/<identityId>/`;
  `CodexHomeLayout.ts` symlink layout is reused verbatim. Users never type paths.
- runeNative + openrouter/openai/custom → existing `openrouter`/`openaiApi` envelopes.
- Cursor/Grok/OpenCode/Antigravity → their current settings shapes; single-source adapters.
- Legacy instances not owned by any profile pass through untouched (rendered under
  _Advanced → Other instances_).
- `profile.advanced.environment` merges **over** compiled vars (manual wins — matches today's
  `env: {...customModelAliasEnv, ...claudeEnvironment}` ordering).

## Route resolution & versioning

`apps/server/src/provider/harnesses/HarnessRouteService.ts` (Effect service):

```ts
resolve({profileId, role, sinceVersion?}):
  { model, serviceKind, routeVersion, stale }   // stale = sinceVersion !== undefined && routeVersion > sinceVersion
listProfiles(), streamRouteChanges()           // composer + UI feed
```

Single source of truth (§38): composer defaults, text-generation titles, adapter role resolution,
and subagent spawning all call this. No other site may hardcode a model fallback chain.

- `sameModelEverywhere=true` ⇒ every supported role resolves to `defaultModel`; overrides win
  per-role otherwise.
- Sessions record `startedRouteVersion`. Claude + runeNative apply routes live (below); Codex main
  rides thread `modelSelection` next turn natively; anything an adapter cannot apply live surfaces
  once in UI as "Restart session to apply this route". A silently-stale child is always a bug (§47).

### Live role resolution (the §15 fix)

`ClaudeAdapter.ts` currently computes `customModelAliasEnv` from `customModels` + selection at each
query — good bones, wrong source. Change: resolve roles through `HarnessRouteService` at query time
(`ANTHROPIC_DEFAULT_OPUS_MODEL`←reasoning, `_SONNET_`←general slot, defaults to `defaultModel`,
`_HAIKU_`+legacy
`ANTHROPIC_SMALL_FAST_MODEL`←fast, `CLAUDE_CODE_SUBAGENT_MODEL`←subagent). A route edit therefore
reaches the next spawned subagent with no restart. Thread-level explicit picks (composer) keep
working for the **main** model; subagents always follow the profile route, never a frozen
creation-time value. RuneNative's loop reads role models from the route service per request.

## Route adapters

Server-side interface (no React involvement):

```ts
HarnessRouteAdapter = {
  compile(profile, route, service | undefined): ProviderInstanceConfig
  supportedRoles(): readonly HarnessRole[]
  canApplyRouteLive(): boolean
}
```

Implementations: `ClaudeCodeRouteAdapter`, `CodexRouteAdapter`, `RuneNativeRouteAdapter`,
plus thin `CursorRouteAdapter` / `GrokRouteAdapter` / `OpenCodeRouteAdapter` /
`AntigravityRouteAdapter` (single-source; `roles: ["main"]`).

### Compatibility checking

Static matrix keyed `(harnessKind, serviceKind, model-slug heuristic)` →
`compatible | likely | experimental | unsupported | unknown` (§31). V1 rows: claudeAgent+anthropic
native=compatible; claudeAgent+openrouter with `anthropic/*`=likely; other claudeAgent combos=
experimental (warning copy + [Use anyway]); codex+non-native=unsupported in v1; runeNative+
openai-compatible=compatible. Unknown ⇒ no warning, no block.

## Model services UX

- Connect once (key → secret store, masked after save), reuse across any number of profiles.
- Catalog fetch: the `/api/providers/model-catalog` endpoint and tolerant parser from the absorbed
  spec move behind the service record (key resolved server-side from `credentialRef`).
  `parseOpenRouterModelCatalog` stays the OpenRouter normalizer.
- Deleting a service referenced by ≥1 profile is blocked; offer **Reassign affected profiles**
  (pick another compatible service, or convert to native where supported).
- Health-check interval moves to Advanced → Diagnostics; page renders cached status instantly and
  refreshes async via existing snapshot streams (`providerStatusCache` reused; no new polling).

## Migration

Silent, lazy, lossless:

1. Hydration projects existing `providerInstances` into profile/service records **in memory** when
   `settings.harnesses` is empty for that instance: plain instances → native profiles;
   Claude instances carrying `ANTHROPIC_BASE_URL` → profile + gateway service (base URL
   `openrouter.ai` ⇒ kind `openrouter`); Codex shadow-home instances → identities labeled from
   auth email when readable.
2. Migrated profiles adopt the existing `instanceId`, so compiled output for unedited configs is
   identical and every persisted thread survives untouched.
3. Nothing writes back until the user edits something in the new UI (lazy materialization);
   untouched installs keep byte-identical settings.json.
4. Unrecognized env/config survives verbatim in `profile.advanced` — never dropped (§36).

Existing `AddClaudeServiceDialog` instances (id `claude_<slug>` with env-built gateways) project the
same way; the dialog itself is retargeted to author profile+service records (same 5-section UX,
new persistence) until the generic two-step add flow replaces it.

## Settings information architecture

Heading: **Harnesses & Models** (route stays `/settings/providers`; old deep links keep working).
Two sections, replacing the single grid:

1. **Harnesses** — card per harness kind with ≥1 profile. Card answers 4 questions at a glance:
   harness logo + name (primary), unified status chip, profile rows (accent dot · label · resolved
   model), bottom-right low-contrast model-service badge (14–18px icon + 9–11px label). Codex card
   lists accounts with accent dots + "+ Add account". "+ Add harness" opens the two-step modal:
   choose harness (logo cards, availability) → choose model source (account / OpenRouter /
   Anthropic API / Custom). If the chosen service is already connected: no key prompt — straight
   to searchable model picker (search id/name/provider; manual-entry fallback; context/pricing
   metadata on hover/details) with **Use this model everywhere** checked by default and collapsed
   **Customize harness models** disclosure (role dropdowns + presets: Same everywhere / Balanced /
   Maximum quality / Custom).
2. **Model services** — connect once, reuse everywhere; masked key state; refresh-models action.

Profile detail view: identity / model source / main model / routing summary / status; **Advanced
accordion** (binary path, config dir, raw env, launch args, instance slug). Contextual sign-in
replaces the sign-in-guide modal: inline "Sign in to continue → run `codex login` → [Copy]
[I've signed in]".

Status vocabulary (mapped from existing probe states, reason one level deeper):
`Ready | Needs sign-in | Needs setup | Checking | Unavailable | Disabled | Configuration error`.

### Composer

Trigger: `Claude Code · stealth/ox-alpha`. Popover grouped by harness; profile rows show service
badge. Profile switch within a compatible continuation group swaps identity without rebuilding the
thread (existing `continuationKey` guard does the rejecting). Stale-route chip appears when an
adapter can't apply live. Web+desktop now; mobile reads the same contracts later.

## Relationship to prior art

The absorbed claude-service-integrations spec contributed: catalog endpoint shape, tolerant parser,
badge asset approach (`serviceBadgeSrc` prop, vendored OpenRouter mark), dialog section layout.
What changes under this spec: persistence (integration = profile + service records, not raw
instance envelopes), translation ownership (server compiler/adapters replace client-side
`buildClaudeServiceEnvironment`/`buildClaudeRoleEnvironment`, which are deleted once call sites
move), scope (generic harness flow, not Claude-only), and routing (role pins resolve live via
HarnessRouteService rather than static env written at save time).

## Performance

Page renders from cached snapshots (<100ms target after mount); refresh async; memoized rows so
streaming statuses don't repaint the grid; no new polling loops or continuous animations. Compiler
runs only on settings change (existing pipeline cost class).

## Accessibility

Dialog semantics with focus trap, escape closes, enter confirms where safe; focus-visible rings on
all controls; labels on toggles/buttons; status conveyed by icon + text, never color alone;
reduced-motion honored.

## Testing

Focused tests only (`vp test run <files>`), per repo policy — no repo-wide runs:

- **Contracts**: schema round-trips; open-slug tolerance (unknown harness kinds parse).
- **Compiler**: golden per harness × service kind; advanced-passthrough precedence; legacy
  pass-through; deterministic ids.
- **Routing**: same-everywhere; role overrides; version bump on edit; stale detection;
  deletion-protection scan.
- **Claude adapter**: role→env mapping incl. legacy alias; per-query live resolution; manual-env
  precedence over managed pins; gateway base URL composition.
- **Codex**: shared-home/shadow-home compilation; multi-account isolation; continuation-key
  stability across account switch; thread-switch compatibility rules.
- **Migration**: gateway detection; unknown-env preservation; id stability; lazy write-back.
- **UI**: add flow, service connect/reuse, model search incl. manual entry, badge rendering,
  status mapping, advanced accordion, migration rendering.
- **Security**: secrets never serialized back to clients; absent from logs; service deletion
  blocked while referenced.

Acceptance scenarios §45–§50 of the task brief map onto the test list above; the Claude+OpenRouter
scenario additionally gets a manual integrated pass (`test-t3-app` skill) since this environment
itself runs that configuration.

## Out of scope

Mobile picker rework (fast-follow, same contracts); DeepSeek harness; Codex-through-gateway models;
usage/quota display beyond what supported APIs report; rewriting unrelated settings pages.
