# Task 4 report — shared page transition chrome

## Status

Implemented and verified within the Task 4 source boundary. `D:\Apps\Rune` is a source snapshot without Git metadata, so no commit was created or fabricated.

## Delivered

- Added `RunePageTransition` with the required `routeKey`, `children`, and optional `className` interface.
- Each boundary renders exactly one current page tree. A route-key change replaces the page immediately, starts from `entering`, and settles on the next animation frame; no outgoing page is retained and navigation is never blocked.
- The boundary exposes the stable `data-rune-page-transition` route key and `data-rune-page-transition-state` state.
- Added shared opacity and `translateY(6px)` transition styling, using Task 1's `--rune-motion-standard` duration and `motion-reduce:transition-none`.
- Reduced-motion sessions render the settled `entered` state immediately.
- Wrapped all settings page bodies in `SettingsPageContainer`, keyed by pathname only. Hash-based settings-search navigation therefore retains its existing scroll/focus behavior without replaying a page transition.
- Marked the workspace header and settings sidebar/footer as stable transition chrome so their desktop titlebar and sidebar geometry remain above the transitioning page body.

## TDD evidence

1. Created `apps/web/src/components/RunePageTransition.test.tsx` before the component existed.
2. RED: `pnpm.cmd --filter @t3tools/web exec vitest run src/components/RunePageTransition.test.tsx` failed as expected because `./RunePageTransition` did not exist.
3. Implemented the smallest single-boundary transition component and integrated it at the approved shared seams.
4. GREEN: the focused transition/settings test command below passed.

## Verification

- PASS — `pnpm.cmd --filter @t3tools/web exec vitest run src/components/RunePageTransition.test.tsx src/components/settings/settingsLayout.test.tsx`: 2 files, 6 tests passed.
- PASS — `pnpm.cmd --filter @t3tools/web typecheck`: `tsgo --noEmit` exited 0.
- Used the direct focused Vitest command because prior Task 1/3 evidence shows this snapshot's package-script wrapper ignores file arguments and begins the full unit suite.

## Scope and concerns

- Modified only the six Task 4 source/test files listed in the brief and this required report; approved Task 1-3 changes were preserved.
- No mobile, server, provider, composer, terminal/panel, or route-specific settings page files were touched.
- No development server or browser session was started. Automated component, settings-layout, and typecheck evidence is complete; no integrated visual pass was requested.

## Inline fix round 1 — workspace seam and dynamic transition behavior

The first review found that only settings content was wrapped and that the
transition reset used render-phase state setters. The fix was completed inline
after switching execution mode from subagent-driven to controller-owned work.

### Changed files

- `apps/web/src/components/AppSidebarLayout.tsx`
- `apps/web/src/components/RunePageTransition.tsx`
- `apps/web/src/components/RunePageTransition.test.tsx`
- This report

### Fix

- Added `WorkspaceRouteContent` at the shared `AppSidebarLayout` body seam so
  non-settings workspace routes receive one transition boundary with the
  pathname as its route key. Settings are left to `SettingsPageContainer`, so
  they do not receive nested transitions.
- Replaced render-phase state resets with a keyed internal transition frame.
  Route-key and reduced-motion changes remount one frame, while the effect
  schedules and cancels only that frame's requestAnimationFrame.
- Added dynamic coverage for route replacement, one current page tree,
  reduced-motion on/off changes, pending-frame cleanup, settings hash-only
  stability, and workspace/settings boundary selection.

### Verification

- PASS — `pnpm.cmd --filter @t3tools/web exec vitest run src/components/RunePageTransition.test.tsx src/components/settings/settingsLayout.test.tsx`: 2 files, 10 tests.
- PASS — `pnpm.cmd --filter @t3tools/web typecheck` (`tsgo --noEmit`).
- No browser or dev-server run was performed; the shared web/desktop shell
  source and focused tests are the current evidence boundary.
