# Task 1 report — RUNE motion and visual-language contract

## Status

DONE_WITH_CONCERNS

## Delivered

- Added `apps/web/src/runeMotion.ts` with the exact frozen `RUNE_MOTION_MS` values:
  - `fast: 160`
  - `standard: 200`
  - `slow: 240`
- Added `resolveRuneMotionDuration(durationMs, reducedMotion)`, returning `0` only when reduced motion is requested.
- Added `apps/web/src/runeMotion.test.ts` covering the duration contract and reduced-motion branch.
- Extended the existing light and dark semantic theme blocks in `apps/web/src/index.css` with:
  - violet strong/soft roles;
  - copper strong/soft roles;
  - canvas, raised, and overlay surface roles; and
  - fast, standard, and slow motion variables.
- Added a `prefers-reduced-motion` override that sets only the RUNE motion variables to `0ms`; focus transitions are not removed.
- Did not modify `themePalette.ts`: its preview changes the existing semantic surface variables, which the new RUNE surface roles reference dynamically. No additional preview mapping is required.

## TDD evidence

1. Added the requested test before `runeMotion.ts` existed.
2. Red evidence: `pnpm.cmd --filter @t3tools/web exec vitest run src/runeMotion.test.ts` failed as expected with `Cannot find module './runeMotion'`.
3. Added the minimal implementation and CSS contract.
4. Green evidence: `pnpm.cmd --filter @t3tools/web exec vitest run src/runeMotion.test.ts` passed: 1 file, 2 tests.

## Verification

- PASS — focused motion test: 1 file, 2 tests passed.
- PASS — `pnpm.cmd --filter @t3tools/web build` completed successfully after the final CSS change; no CSS parse errors.
- PASS — self-review confirmed the task touched only `apps/web/src/runeMotion.ts`, `apps/web/src/runeMotion.test.ts`, and `apps/web/src/index.css`, plus this report. No mobile, server, desktop-shell, or later-task files changed.

## Concerns

- The exact prescribed wrapper command, `pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts`, did not settle after 90 seconds on this snapshot and was stopped after producing only the Vitest startup banner. The direct installed Vitest invocation above ran the same target and provided both the red and green evidence.
- The successful production build emitted existing-style performance/chunk-size warnings, but no CSS parse failure or task-specific error.

## Commit availability

`D:\Apps\Rune` has no `.git` metadata, so no commit was created or fabricated.

## Follow-up fix round

### Root cause and change

Task 2 web typecheck reproduced `TS2307: Cannot find module 'vitest' or its corresponding type declarations` at `apps/web/src/runeMotion.test.ts:1`. The test used a package name that is not part of this web package's typed test convention. Changed only that import to `vite-plus/test`, matching the existing web test files.

### Verification

- PASS — `pnpm.cmd --filter @t3tools/web exec vitest run src/runeMotion.test.ts`: 1 file, 2 tests passed.
- PASS — `pnpm.cmd --filter @t3tools/web typecheck`.
- CONCERN — the requested wrapper command `pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts` forwarded into the repository test script but ran the full unit project rather than only the named file. It completed with 282 test files passing and one unrelated `src/components/ServerUpdateAction.test.tsx` failure: the expectation still says `Reconnected on t3@0.0.31.`, while the runtime produced `Reconnected on RUNE@0.0.31.`. The rune motion file-scoped test passed independently.

No dev server was started or stopped, no subagents were dispatched, and no commit was fabricated.
