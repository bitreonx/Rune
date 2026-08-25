# Rune harness continuation handoff

Date: 2026-08-25
Repository: `D:\Apps\Rune`
Required final branch: `main`

## Mission

Continue the Rune native harness until the current fast-agent plan is either fully implemented or every remaining item has an evidence-backed blocker. The final state must be committed to `main`, pushed to the configured remote, and leave no implementation branch/worktree as the active source of truth.

Do not claim “pushed” while the repository has no configured remote. At handoff creation time, `git remote -v` returned no remotes.

## Read these first

The canonical plan and specification are:

1. [`D:\Apps\Rune\docs\superpowers\plans\2026-08-25-fast-agent-execution.md`](../superpowers/plans/2026-08-25-fast-agent-execution.md)
2. [`D:\Apps\Rune\docs\internals\fast-agent-execution.md`](fast-agent-execution.md)
3. [`D:\Apps\Rune\docs\internals\rune-native-agent.md`](rune-native-agent.md)
4. [`D:\Apps\Rune\docs\superpowers\plans\2026-08-25-native-agent-loop-plan.md`](../superpowers/plans/2026-08-25-native-agent-loop-plan.md)
5. `D:\Apps\Rune\AGENTS.md`

The original harness research/blueprint is in the repository root as `T3CODE-HARNESS-MAXXING-BLUEPRINT (1).md` and the local reference material is under `system-prompts-and-models-of-ai-tools-main\`. Treat those as research input only; current code, current contracts, current tests, and current runtime behavior outrank them.

## Important repository state

`D:\Apps\Rune` is already on `main` but has a very large pre-existing dirty worktree: approximately 1,791 modified tracked paths and 212 untracked paths at this handoff. It includes newer Rune work and overlapping API-harness files such as:

- `apps/server/src/provider/Layers/ApiCapabilities.ts`
- `apps/server/src/provider/Layers/ApiContextLedger.ts`
- `apps/server/src/provider/Layers/ApiExecutionPolicy.ts`
- `apps/server/src/provider/Layers/ApiRequestBudget.ts`
- `apps/server/src/provider/Layers/ApiToolScheduler.ts`
- `apps/server/src/provider/Layers/ApiWorkspaceTools.ts`
- `packages/client-runtime/src/state/agentExecution.ts`
- `packages/contracts/src/providerRuntime.performance.test.ts`

This is newer/different work from the isolated branch below. Preserve it. Do not run `git reset`, `git clean`, `git checkout --`, broad `git add .`, or force-push.

## Previous isolated slice

An older isolated worktree exists at:

`D:\Apps\Rune\worktrees\rune-harness-foundation`

Branch: `codex/rune-harness-foundation`

Its implementation is uncommitted and based on the older `@t3tools/*` snapshot. It contains useful reference work in:

- `apps/server/src/provider/Layers/ApiHarness.ts`
- `apps/server/src/provider/Layers/ApiSessionState.ts`
- `apps/server/src/provider/Layers/ApiAgentLoop.ts`
- `apps/server/src/provider/Layers/ApiAdapter.ts`
- `apps/server/src/provider/Layers/ProviderService.ts`
- `docs/internals/rune-native-harness.md`

The slice added a bounded outcome contract, `run_checks`, verification invalidation after mutations, repair-ready failure capsules, native tool lifecycle events, bounded transcript resume cursors, and completion-triggered provider-session persistence. Its last focused proof was 43 passing tests across six API harness files, plus one ProviderService cursor-refresh test; server typecheck exited 0 with only pre-existing diagnostic suggestions.

Do not merge or cherry-pick that branch wholesale. First compare it with current `main`: the parent has renamed packages (`@rune/contracts`) and newer execution-policy/context-ledger/tool-scheduler work. Extract behavior only when it is genuinely missing from the current implementation, then rewrite it against the current Rune contracts and tests.

## Required continuation procedure

### 1. Establish truth

Run from `D:\Apps\Rune`:

```powershell
git branch --show-current
git status --short
git worktree list
git remote -v
```

Confirm that work is on `main`, record the dirty baseline, and inspect the current diffs before editing. Keep unrelated user changes untouched. Use focused tests only; the repository instructions prohibit repo-wide checks unless explicitly requested.

### 2. Reconcile against the current plan

Read every task/checklist in `docs\superpowers\plans\2026-08-25-fast-agent-execution.md`. For each item, mark it only after inspecting current code and adding/running focused tests. The highest-priority runtime seams are:

- bounded per-turn API request/retry policy;
- deterministic context ledger and loop detection;
- concurrent safe reads with ordered mutations;
- atomic patch/generation behavior;
- structured focused checks and repair flow;
- capability-aware OpenRouter/DeepSeek-compatible request bodies;
- cumulative usage/progress telemetry through contracts and client-runtime;
- preservation of approvals, sandboxing, interruption, remote/relay/tunnel behavior;
- web, desktop, and mobile presentation where the current plan changes shared contracts.

Do not duplicate a capability that already exists in the newer `Api*` modules. Prefer one canonical seam over parallel implementations.

### 3. Verify before integration

Run the narrow tests for every changed seam, then the server typecheck and `git diff --check`. Capture exact commands and counts in the final handoff. Do not use browser/computer verification unless the user explicitly requests it. Do not call the product complete merely because static tests pass; separate local proof from real provider, desktop, mobile, relay, tunnel, and production proof.

### 4. Commit only the intended main changes

Because `main` is dirty, stage explicit paths only. Before each commit:

```powershell
git diff --cached --stat
git diff --cached --check
git status --short
```

Never stage the whole repository to “make the tree clean.” If an intended file overlaps unrelated parent edits, stop and reconcile it manually with current source; do not overwrite the parent version with the old isolated version.

Use clear conventional commits, for example:

```text
feat(server): complete fast native harness execution
docs(internals): add Rune harness continuation handoff
```

Only commit the handoff document when the maintainer wants it as part of the main implementation record; this handoff exists because the user explicitly requested it.

### 5. Push and enforce main-only completion

A remote is currently absent. Obtain/confirm the correct remote URL before configuring one; never invent a repository URL. After the intended commits are present on `main`:

```powershell
git remote -v
git push origin main
git status --short
git branch --show-current
git worktree list
```

If push is rejected, investigate the remote divergence or branch protection. Do not force-push. Do not report success until the push command exits 0.

After all useful work has been reconciled and no unique uncommitted files remain in the old isolated worktree, remove the stale worktree and delete `codex/rune-harness-foundation` only after verifying its contents are no longer needed. Never use `--force` to erase unique uncommitted work without explicit confirmation.

## Definition of done

- Current `main` source, not the stale isolated snapshot, is canonical.
- All applicable plan tasks have either passing focused proof or a named blocker.
- No duplicate harness implementation remains.
- Approval, sandbox, interruption, workspace confinement, and remote execution boundaries remain intact.
- Focused tests, server typecheck, and diff checks have fresh evidence.
- Intended changes are committed on `main` only.
- The correct remote is configured and `git push origin main` exits 0.
- `git status --short` and `git worktree list` are reported honestly.
- Any remaining gap is documented as open; no “best ever” or production-ready claim is made without corresponding runtime evidence.
