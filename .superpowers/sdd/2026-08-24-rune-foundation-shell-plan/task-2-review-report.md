# Task 2 Review — Quiet RUNE chrome default

## Spec Compliance

- **Contract default and schema:** Partially compliant. `DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE` is `pill`, and `EnvironmentIdentificationMode` still accepts exactly `artwork`, `pill`, and `none` ([settings.ts](D:/Apps/Rune/packages/contracts/src/settings.ts):123-125). The client schema decodes that default ([settings.ts](D:/Apps/Rune/packages/contracts/src/settings.ts):174-175), and the contract test covers the decoded default, all three accepted values, and an invalid value ([settings.test.ts](D:/Apps/Rune/packages/contracts/src/settings.test.ts):71-87).
- **RUNE mark and accessibility:** Compliant. `RuneMark` exposes the requested `size` and `showWordmark` props, provides a `role="img"` with `aria-label="RUNE"`, and hides its duplicated visual SVG/text from assistive technology ([RuneMark.tsx](D:/Apps/Rune/apps/web/src/components/RuneMark.tsx):1-37).
- **Quiet default and reverse states:** Compliant after settings hydrate. The header resolves the backdrop only for explicit `artwork`, renders a pill only for `pill`, and renders neither for `none` ([SidebarChrome.tsx](D:/Apps/Rune/apps/web/src/components/sidebar/SidebarChrome.tsx):42-79). The focused component tests exercise all three outputs, including absence of `data-sidebar-stage-backdrop` for pill and none ([SidebarStageBackdrop.test.tsx](D:/Apps/Rune/apps/web/src/components/SidebarStageBackdrop.test.tsx):118-140).
- **Desktop titlebar and focus behavior:** Source-compliant. The header retains the shared topbar height and Electron drag region; the brand retains the titlebar control inset, a visible keyboard focus ring, and an anchor remains an Electron no-drag descendant ([SidebarChrome.tsx](D:/Apps/Rune/apps/web/src/components/sidebar/SidebarChrome.tsx):53-94; [index.css](D:/Apps/Rune/apps/web/src/index.css):2108-2119). The titlebar inset itself remains derived from the native control geometry ([sidebar.tsx](D:/Apps/Rune/apps/web/src/components/ui/sidebar.tsx):165-172).
- **Artwork and color:** Compliant. `RuneMark` imports no artwork and contains only its own geometric paths; all visible paint uses `currentColor` ([RuneMark.tsx](D:/Apps/Rune/apps/web/src/components/RuneMark.tsx):18-28). Its utility preserves inheritance, while the header supplies `text-foreground` for quiet chrome and `text-white` only for explicit artwork ([index.css](D:/Apps/Rune/apps/web/src/index.css):418-422; [SidebarChrome.tsx](D:/Apps/Rune/apps/web/src/components/sidebar/SidebarChrome.tsx):85-94). No T3 or blue-mark asset is imported into the new mark.
- **Verification evidence:** I reran the prescribed focused command successfully: 3 test files and 58 tests passed. The package also records the controller's subsequent successful `@t3tools/web` typecheck; I did not rerun that broader check.

## Strengths

- The implementation is narrowly scoped and preserves the old stage art as an explicit opt-in rather than deleting a supported state.
- The mark is independently named for screen readers even when its visual wordmark is hidden.
- The header tests cover the actual rendering branches, not only the resolver helpers, and the backdrop gets a stable, decorative-only test marker.
- Light/dark color behavior is implemented through semantic parent color and `currentColor`, avoiding hard-coded palette values in the mark.

## Issues

### Critical

None.

### Important

1. **The runtime default is still `none` until settings hydrate, so the default header initially omits the required pill.** `useEnvironmentIdentificationMode` feeds `SidebarChromeHeader`, but `resolveEnvironmentIdentificationMode` unconditionally returns `none` when `settingsHydrated` is false ([useSettings.ts](D:/Apps/Rune/apps/web/src/hooks/useSettings.ts):243-254). This was appropriate when the default was artwork, but Task 2 changed the default to quiet `pill`; the default chrome is therefore not consistently pill during initial render. The existing hook test explicitly expects this hidden state ([useSettings.test.ts](D:/Apps/Rune/apps/web/src/hooks/useSettings.test.ts):11-19), while the Task 2 header test mocks the hook as already `pill`, so the suite cannot catch the mismatch.

   Update the pre-hydration resolution policy for the new quiet default (or otherwise render the default pill without mounting artwork), then replace the stale expectation with a regression test that covers the unhydrated default. Preserve explicit `artwork` and `none` once persisted settings are available.

### Minor

None.

## Assessment

**Needs fixes.** The persistent contract, mark, explicit reverse states, desktop chrome, and focused test suite are sound. Approval is blocked by the pre-hydration runtime path, which still renders `none` rather than the specified default `pill` and is currently protected by a stale test expectation.
