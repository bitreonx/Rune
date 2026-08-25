# Task 3 report — sidebar hierarchy

## Status

Implemented and verified within the Task 3 source boundary. No commit was created because this snapshot has no Git metadata.

## Delivered

- Added the stable sidebar styling and verification hooks:
  - `data-rune-sidebar-section`
  - `data-rune-sidebar-row`
  - `data-rune-sidebar-scope`
- Applied them at existing composition seams rather than rebuilding state in JSX:
  - workspace header and utility footer;
  - thread/settings search and project scope controls;
  - projects/threads content, search results, thread rows, draft rows, snoozed and settled shelves; and
  - settings navigation and settings utilities.
- Applied the RUNE graphite/ink surface hierarchy using existing sidebar, RUNE surface, and violet semantic tokens. Scope/search controls use the subtle surface; the workspace and utility boundaries use restrained sidebar borders; compact shelf labels use mono metadata; keyboard focus uses the violet focus token.
- Added transition styling driven by Task 1's `--rune-motion-fast`; its existing reduced-motion override resolves those transitions to `0ms`.
- Kept `SidebarThreadRow`, `SidebarDraftRow`, `SidebarDraftBlock`, settled/snoozed shelf state, filtering/sorting, drag ordering, keyboard activation, thread selection, tooltips, and terminal activity logic unchanged.

## TDD evidence

1. Added the structural contract to `apps/web/src/components/ui/sidebar.test.tsx` before adding production hooks.
2. Red: `pnpm.cmd --filter @t3tools/web exec vitest run src/components/Sidebar.logic.test.ts src/components/ui/sidebar.test.tsx` failed as expected because `Sidebar.tsx` did not contain `data-rune-sidebar-section`. Existing tests in the two targets still passed (113 passed, 1 structural failure).
3. Added the hooks and semantic hierarchy styling.
4. Green: the same direct Vitest target passed with 2 files and 114 tests.

## Verification

- PASS — `pnpm.cmd --filter @t3tools/web exec vitest run src/components/Sidebar.logic.test.ts src/components/ui/sidebar.test.tsx`: 2 files, 114 tests passed.
- PASS — `pnpm.cmd --filter @t3tools/web typecheck`: `tsgo --noEmit` exited 0.
- No browser or dev-server verification was run, as requested. No mobile, server, provider, terminal/panel-motion, composer, or page-transition files were modified.

## Concerns

- The prescribed wrapper command, `pnpm.cmd --filter @t3tools/web test -- --run ...`, ignored its file arguments and began the full unit project. It encountered the existing unrelated `ServerUpdateAction.test.tsx` wording failure (`t3@...` expected vs `RUNE@...` rendered), so it was stopped and the direct installed Vitest command above supplied the focused evidence.
- The structural test uses Vite's typed `?raw` import of `Sidebar.tsx` because the assigned UI test file has no runnable full-sidebar harness. It verifies stable hook presence while the existing `Sidebar.logic.test.ts` target continues to cover behavior derivation.

## Fix round 1 — shelf hierarchy and reduced motion

### Changed files

- `apps/web/src/components/Sidebar.tsx`
- `apps/web/src/components/ui/sidebar.test.tsx`
- This report

### Fix

- Replaced the snoozed shelf header's raw `text-blue-*` and `bg-blue-*` hierarchy classes with existing `text-sidebar-muted-foreground` and `bg-sidebar-border` semantic tokens. Its label, count, toggle state, selection-safe marker, and snoozed row rendering are unchanged.
- Added `duration-[var(--rune-motion-fast)] ease-out motion-reduce:transition-none` to the snoozed and settled shelf chevrons. The existing rotation and expanded-state logic are unchanged.
- Added focused source-level regression assertions that isolate each shelf header, reject raw blue header hierarchy classes, and require the RUNE duration plus reduced-motion override on both chevrons.

### TDD evidence

Red command:

```powershell
pnpm.cmd --filter @t3tools/web exec vitest run src/components/Sidebar.logic.test.ts src/components/ui/sidebar.test.tsx
```

Observed expected failure: the snoozed shelf segment lacked semantic sidebar text/border tokens and both shelf segments lacked `duration-[var(--rune-motion-fast)]`.

Green command:

```powershell
pnpm.cmd --filter @t3tools/web exec vitest run src/components/Sidebar.logic.test.ts src/components/ui/sidebar.test.tsx
```

Output: PASS — 2 files, 116 tests.

Typecheck:

```powershell
pnpm.cmd --filter @t3tools/web typecheck
```

Output: PASS — `tsgo --noEmit` exited 0.

### Concerns

- No browser or development-server run was performed, as requested.
- No commit was created or fabricated because the source snapshot has no Git metadata.
