# Task 2 — Quiet RUNE chrome default

## Status

Implemented the quiet RUNE chrome default in the Task 2 source scope. No commit was created because this source snapshot has no Git metadata.

## Delivered behavior

- `environmentIdentificationMode` now defaults to `pill`; its schema still explicitly permits `artwork`, `pill`, and `none`.
- Added `RuneMark` with `size?: "sm" | "md"` and `showWordmark?: boolean`, a geometric RUNE-specific SVG, and `role="img" aria-label="RUNE"`.
- `SidebarChromeHeader` now renders the RUNE mark in the existing desktop titlebar geometry. The default pill mode does not mount stage artwork.
- Explicit `artwork` still mounts `SidebarStageBackdrop`; explicit `none` mounts neither artwork nor an environment pill.
- Added `data-sidebar-stage-backdrop` to the existing decorative, `aria-hidden` backdrop to make the opt-in mount behavior testable.
- The mark inherits chrome color, keeping the quiet light/dark foreground behavior and the explicit-artwork white foreground without importing old T3 or blue artwork into the mark.

## TDD evidence

RED command:

```powershell
pnpm.cmd exec vp test run packages/contracts/src/settings.test.ts apps/web/src/components/RuneMark.test.tsx apps/web/src/components/SidebarStageBackdrop.test.tsx
```

Observed expected failures before implementation:

- `DEFAULT_CLIENT_SETTINGS.environmentIdentificationMode` was `artwork`, not `pill`.
- `RuneMark` did not exist.
- Explicit artwork had no stable backdrop mount marker.

GREEN command:

```powershell
pnpm.cmd exec vp test run packages/contracts/src/settings.test.ts apps/web/src/components/RuneMark.test.tsx apps/web/src/components/SidebarStageBackdrop.test.tsx
```

Result: PASS — 3 files, 58 tests.

Coverage includes the decoded/default setting, every accepted explicit mode, RUNE's accessible label, compact mark rendering, light/dark color inheritance, and sidebar pill/artwork/none output.

The prescribed `vp` wrapper completed normally on the follow-up verification, so no direct Vitest fallback was needed.

## Typecheck

Ran:

```powershell
pnpm.cmd --filter @t3tools/web typecheck
```

Result: blocked by the pre-existing Task 1 file `apps/web/src/runeMotion.test.ts`, which imports `vitest` but the web typecheck cannot resolve its types (`TS2307`). This task did not modify that approved motion file or its dependencies.

## Self-review

- Preserved the existing desktop `drag-region`, titlebar height, content-left inset, and focused-link geometry.
- Kept the backdrop decorative with `aria-hidden`; the mark has an explicit accessible RUNE label and no hard-coded light/dark color.
- Did not touch mobile, server, providers, sidebar hierarchy, or later task files.
- Did not start or stop a development server.

## Fix round 1 — pre-hydration quiet chrome

### Changed files

- `apps/web/src/hooks/useSettings.ts`
- `apps/web/src/hooks/useSettings.test.ts`

### Fix

`resolveEnvironmentIdentificationMode` now returns the quiet `pill` default while client settings are unhydrated. After hydration, it continues to return each persisted explicit mode (`artwork`, `pill`, or `none`), including the existing palette-theme adaptation for artwork only.

The existing Task 2 sidebar-header tests still exercise pill, artwork, and none output; the expanded hook regression test verifies the mode supplied to that header before and after hydration.

### TDD and verification

RED command:

```powershell
pnpm.cmd exec vp test run packages/contracts/src/settings.test.ts apps/web/src/hooks/useSettings.test.ts apps/web/src/components/RuneMark.test.tsx apps/web/src/components/SidebarStageBackdrop.test.tsx
```

Expected result observed before the implementation: the three unhydrated resolver cases returned `none` instead of `pill`.

GREEN command:

```powershell
pnpm.cmd exec vp test run packages/contracts/src/settings.test.ts apps/web/src/hooks/useSettings.test.ts apps/web/src/components/RuneMark.test.tsx apps/web/src/components/SidebarStageBackdrop.test.tsx
```

Result: PASS — 4 files, 68 tests.

Typecheck:

```powershell
pnpm.cmd --filter @t3tools/web typecheck
```

Result: PASS (`tsgo --noEmit`).

### Fix-round self-review and concerns

- Pre-hydration no longer hides the default environment indicator or mounts artwork.
- Hydrated explicit `artwork` and `none` are covered by direct resolver assertions, and the existing header test covers their rendered branches.
- No mobile, server, provider, sidebar-hierarchy, or dev-server changes were made.
- No remaining source or verification concerns in this scoped fix. No browser run was requested.
