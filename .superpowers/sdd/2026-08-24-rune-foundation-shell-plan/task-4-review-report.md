# Task 4 review — shared RUNE page transition chrome

## Spec Compliance

- **Component API: pass.** `RunePageTransition` exposes the exact required `routeKey: string`, `children: ReactNode`, and optional `className` interface in `apps/web/src/components/RunePageTransition.tsx:13-20`.
- **Transition behavior: pass at the component level.** The current children are rendered once with no retained outgoing tree. The state marker is stable and CSS supplies opacity plus `translateY(6px)`, within the required 4–8px range (`RunePageTransition.tsx:41-50`, `index.css:1610-1617`). The animated properties are compositor-friendly opacity/transform only.
- **Reduced motion: pass by source inspection.** A reduced-motion match initializes/resets to `entered`, and the transition utility disables CSS interpolation (`RunePageTransition.tsx:22-44`). A hash-only settings navigation does not replay the page transition because the shared settings seam keys it on `pathname`, not `hash` (`settingsLayout.tsx:245-262`).
- **Settings integration: pass.** Every normal settings route resolves to an existing settings panel that uses `SettingsPageContainer`; that shared container wraps the routed children once at the content seam (`settingsLayout.tsx:235-265`). The settings sidebar markers correctly preserve sidebar/footer geometry instead of wrapping their contents.
- **Workspace-body integration: fail.** The transition component has only one production use, in `SettingsPageContainer`. Workspace surfaces still render direct page bodies, for example `RuneProjectWorkspace.tsx:198-202` and `_chat.index.tsx:200-205`. `WorkspacePageHeader` has only a chrome marker; it is not and cannot be a body transition seam.

## Strengths

- The data attributes make both route identity and transition state inspectable.
- The boundary does not retain the outgoing page, so it avoids duplicate interactive trees and navigation blocking.
- The fixed chrome treatment is appropriately narrow: the header/sidebar receive `position: relative; z-index: 1`, while the actual settings body is the animated element (`index.css:1603-1617`).
- Settings search/hash behavior is intentionally preserved: the pathname key remains stable while the target is focused and the hash is removed without resetting scroll (`settingsLayout.tsx:245-251`).

## Issues

### Critical

- **Workspace page bodies are not wrapped at a shared seam.** This is a direct Task 4 requirement and the named integration risk. `rg` finds `RunePageTransition` used only in its implementation, test, and `settingsLayout.tsx`; no workspace body imports it. Workspace map, project workspace, no-active-thread, usage, chat, and project-settings body paths therefore do not receive the transition. Marking `WorkspacePageHeader` and `SettingsSidebarNav` with `data-rune-page-transition-chrome` only changes stacking geometry; it does not add a transition boundary around the page content. Add the component at the actual shared workspace body/layout seam (or refactor one), with a route-derived key, and cover the resulting workspace routes.

### Important

- **The route/media reset calls state setters during render.** `RunePageTransition.tsx:29-32` performs two render-phase updates whenever its derived key changes. The guard makes this bounded and React permits same-component guarded adjustment, but this is a fragile pattern at the exact route-key and media-query boundaries this task owns. It makes correctness dependent on React abandoning the first render and is harder to reason about under rapid navigation or a live `prefers-reduced-motion` change. Replace it with a keyed internal transition child or an effect/layout-effect-based reset that cleanly cancels any pending frame, then verify both direction changes of the media query.

- **The focused tests do not exercise the dynamic behavior they certify.** `RunePageTransition.test.tsx:1-40` renders static server markup with a fixed mock. It never mounts the component, advances/cancels `requestAnimationFrame`, rerenders with a new `routeKey`, changes the media-query result after mount, or asserts one current child tree. `settingsLayout.test.tsx` tests target scrolling but not pathname-versus-hash transition behavior. Add DOM tests for route A -> route B, hash-only changes, motion off -> on and on -> off, and pending-frame cleanup; add an integration assertion that both settings content and a workspace body are wrapped.

### Minor

- No additional minor issues found within the requested review boundary.

## Assessment

**Needs fixes.** The component, CSS, reduced-motion source path, hash strategy, and settings integration are sound enough to retain. Task 4 cannot be approved because its shared workspace-body integration is absent, and the state-reset behavior lacks dynamic coverage at the route and media-query edges.

## Review boundaries

Read-only source review of the three supplied Task 4 artifacts, all six Task-owned files, the media-query hook, settings route layout/routes, and the minimal workspace shell/body call sites needed to verify integration. No source mutations, test runs, broad suites, Git operations, or subagents were used.
