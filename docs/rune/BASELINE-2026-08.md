# RUNE2 Baseline — 2026-08-29

## Snapshot

| Field | Value |
|---|---|
| Baseline commit | `3d913ee7b83e41b532c4f2a25ea1ff65529852db` |
| Baseline branch | `rune2/implementation` |
| Parent checkout | `D:/Apps/Rune` on `main` |
| Remote comparison | `main` is six commits ahead of `origin/main` |
| Worktree state | clean at inspection |
| Node | `v24.17.0` |
| Git | `2.55.0.windows.2` |
| Vite Plus CLI | unavailable before dependency setup |
| Dependencies | absent before setup; install incomplete |

## Reproducibility and environment evidence

The isolated worktree initially had no `node_modules` and no `vp` executable. `pnpm install --frozen-lockfile` resolved the lockfile and began linking packages, but exited with `ERR_PNPM_TARBALL_INTEGRITY` for `update-browserslist-db@1.2.3`: the registry payload checksum differed from the lockfile by one byte. The lockfile was not modified and checksums were not refreshed.

This blocks trustworthy test, typecheck, lint, dev-server, and performance measurements until dependency installation is repaired or a trusted package cache is supplied.

## Measurements

Values are intentionally marked unavailable where the measurement could not be obtained. No values are inferred.

| Scenario | Baseline | Evidence/status |
|---|---:|---|
| Desktop cold start → first visible surface | not measured | packaged runtime not launched; dependency gate open |
| Desktop start → main visible | not measured | packaged runtime not launched; dependency gate open |
| Simple `hi` → first token | not measured | server/provider runtime not launched |
| Simple `hi` → model request count | not measured | server/provider runtime not launched |
| Small edit → model request count | not measured | server/provider runtime not launched |
| Provider switch latency | not measured | client runtime not launched |
| File Explorer open latency | not measured | browser verification not authorized in this turn |
| 100-thread Pocket synthetic render | not measured | browser verification not authorized in this turn |

## Known scenarios requiring focused reproduction

The following scenarios are carried forward from the Rune2 plan package and remain unverified until the runtime gate is open:

- OpenRouter-backed instance displays a stale sign-in state.
- RUNE Native reports provider-not-found or cannot complete a turn.
- Antigravity discovery times out.
- Inline `/grillme` trigger behavior differs across entry points.
- Installed/headless desktop startup fails or remains blank.
- Child-agent completion is represented as a toast instead of durable child state.
- File Explorer rename/new-file actions rely on modal behavior.

## Baseline gate

Status: **OPEN / BLOCKED ON ENVIRONMENT**.

Downstream implementation may continue only for source-level changes that do not claim runtime verification. Before any plan is marked accepted, restore a trusted dependency install, rerun the focused checks, and replace every `not measured` value needed by that plan with captured evidence.
