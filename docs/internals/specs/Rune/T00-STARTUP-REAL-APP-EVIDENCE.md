# T00 startup and real-app evidence

Date: 2026-08-28  
Checkout: `D:\Apps\Rune`  
Branch: `main`  
HEAD: `2b551bf7ec13b8cf6455f7798035114555bc4b0`  
Node: `v24.17.0`  
pnpm: `11.10.0` (root requires `11.10.0`)

## Safety baseline

The checkout was already dirty before T00 work, with broad staged and unstaged
changes under `.artifacts/`, `apps/server/`, `apps/web/`, `packages/`, and the
new RUNE spec folder. The current worktree inventory also showed:

- `D:\Apps\Rune\.claude\worktrees\file-explorer-plan-1` dirty in two desktop test files.
- `D:\Apps\Rune\worktrees\cross-thread-intelligence` on `codex/fix-stable-startup`, with no reported changes.

No reset, clean, revert, deletion, or unrelated implementation edit was used.
The only T00 changes are the task status, T00 status row, this evidence file,
and the requirement ledger.

## Focused verification

The repository Vite+ binary was invoked directly after `pnpm exec` attempted a
workspace install and hit the existing dependency patch condition
`[ERR_PNPM_PATCH_FAILED] Could not apply patch ... react-native-screens@4.25.2.patch`.
Tests were filtered to exclude the two existing worktree copies so their
duplicate test files could not contaminate the root result.

| Command | Result |
|---|---|
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' apps/web/src/components/ChatView.logic.test.ts` | 1 file, 57 tests passed |
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' packages/shared/src/agentActivity.test.ts` | 1 file, 5 tests passed |
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' scripts/dev-runner.test.ts` | 1 file, 72 tests passed |
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' apps/server/src/serverRuntimeStartup.test.ts apps/server/src/serverRuntimeStartup.reconcile.test.ts` | 2 files, 14 tests passed |
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' apps/web/src/components/settings/UniversalServiceSettings.test.ts` | 1 file, 5 tests passed |
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' apps/web/src/authBootstrap.test.ts apps/web/src/environments/primary/httpLayer.test.ts` | 2 files, 23 tests passed |
| `vp.cmd test run --exclude 'worktrees/**' --exclude '.claude/**' packages/shared/src/shell.test.ts` | 1 file, 29 tests passed |
| `node apps/desktop/scripts/smoke-test.mjs` | Passed; no configured fatal Electron patterns |
| `node scripts/release-smoke.ts` | Passed; `Release smoke checks passed.` |

These are focused/unit/package-fixture proofs only. They do not prove a live
browser flow, provider turn, installed Windows app, or packaged `rune://app`
flow.

## Development desktop gate

Command:

```text
node scripts/dev-runner.ts dev:desktop
```

Observed output first resolved the repository runner configuration:

```text
[dev-runner] mode=dev:desktop source=default ports serverPort=13773 webPort=5733 baseDir=C:\Users\Bitreon\.rune
```

It then failed before starting the child task:

```text
DevRunnerProcessError: Dev-runner process operation "spawn" failed for mode "dev:desktop".
cause: Error: spawn vp ENOENT
```

This was a launcher-boundary failure caused by direct invocation not inheriting
pnpm's workspace-local `node_modules/.bin` PATH entry. The fix is now scoped to
`scripts/dev-runner.ts`: it prepends the script's own portable
`node_modules/.bin` directory before asking the shared Windows spawn resolver
for `vp`. Do not hide launcher failures with retries or sleeps.

## Current real-app boundary

Not verified in this T00 run:

- renderer/server/provider logs from a successful development desktop launch;
- creating/opening a thread in a running client;
- loading provider settings in a running client;
- a real or fixture native harness turn;
- installed/unpacked current Windows package startup and `rune://app` behavior;
- the full manual walkthrough in T00 §6 / the v4 release script.

No browser or computer-use session was opened. No installer was executed.

## Exact next verification

1. Repair or make available the Windows `vp` executable resolution used by the
   dev runner, then rerun exactly:

   ```text
   node scripts/dev-runner.ts dev:desktop
   ```

2. Capture the runner, renderer, Electron main, server, and provider output;
   verify startup without `PrimaryEnvironmentRequestError` or record its
   original cause. Stop only the process captured from this launch.

3. In the running client, verify create/open thread, provider-settings load,
   and one bounded fixture/real native turn.

4. Build the current Windows package using the repository release command,
   launch the unpacked/package target safely, and repeat startup, thread,
   settings, and native-turn checks through the packaged path.

5. Update this evidence file, the T00 ledger, and only the T00 row in
   `STATUS.md`; then let T18 close the final packaged-release gate.
