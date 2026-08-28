# Dashboard Shell — Polished IDE Direction

> Spec status: **draft, awaiting maintainer review**. Generated from a 5-agent code review of `apps/web/src/`. The full brainstorm dump lives in the conversation that produced this spec; this file is the per-surface proposal. This rev replaces the "mission-control" draft. Direction: premium IDE-class shell, Cursor/Codex Glass parity, RUNE's liquid-glass language, web + desktop, mobile inherits. Beta polish gated behind a user-controlled toggle so it never lands on anyone who doesn't want it.

## 1. Principles

The dashboard shell commits to **one direction**: an IDE-class shell for people who run agents all day. Concretely:

- **One dark canvas.** Sidebar, top bar, right rail, status bar, and chat canvas all read as one piece, not card-on-card. Liquid glass lives on the composer shell, the right rail shell, the status bar, the topbar chrome, and the sidebar's active project/thread highlight — *over* the canvas, not as a separate surface. Assistant messages are not a card and are not liquid-glass.
- **Light + System are parallel designs, not second-class.** `appearanceMode` keeps defaulting to `"system"` (`apps/web/src/hooks/useTheme.ts:42`). The three tiles in `ThemeSettings.tsx:712-748` (System / Light / Dark at line 742) stay. The 5 built-in themes (RUNE Core, Grove, Ocean, Ember, Iris) keep their light + dark variants.
- **Status, not chrome.** Every persistent UI element carries data. No decorative counters, no "burn meter" art, no in-card mini-stats. Status lives in the status bar.
- **Beta polish is a toggle, not a default.** `shellPolished` is the user-facing escape hatch. Off by default; the new IDE-class layout + liquid glass are opt-in. Schema uses `Schema.withDecodingDefault(Effect.succeed(false))` like `planModeEnabled` (`packages/contracts/src/settings.ts:235`) so users who flip it off never get re-enrolled on a schema bump.
- **Keyboard-first.** Command palette (Cmd/Ctrl+K) is a primary surface, not a discoverability crutch. Utility nav keeps text labels in the chrome.
- **No continuous animations.** Per AGENTS.md. Loading dots step, they don't sweep. No bouncing arrows, no perpetual pulses, no `filter: blur` on route changes, no per-row `setInterval` ticking the working-duration clock.
- **No surface removal.** `LegacySidebar` stays. The `legacySidebarEnabled` setting (`packages/contracts/src/settings.ts:245`) still gates it. We do not add a kill switch.
- **Mobile inherits.** The same `ServerProvider` snapshot and the same `shellPolished` toggle drive mobile. Web and desktop are the design surface; mobile gets the same atoms, the same toggle, and its own layout.

## 2. Surface map (what lives where)

### 2.1 Top bar — 52px, one row

`WorkspacePageHeader` is the single 52px top bar. The per-thread `ChatHeader` is **folded in** as a slot the chat view fills. Result: one status row at the top.

- **Left:** brand mark + active environment name.
- **Center:** thread breadcrumb (or "Home" when on `_chat.index`).
- **Right:** active model chip, topbar cost chip (opt-in, beta-gated — see §3.4), `ThreadStatusIndicators`, connection dot.
- **Drag region** + WCO insets + macOS traffic-lights inset (`AppSidebarLayout.tsx:45` → `MACOS_TRAFFIC_LIGHTS_LEFT_INSET = "90px"`; line 167 `isMacosDesktop`), all preserved.

### 2.2 Sidebar — 280px, project list, not a card

- **Header (40px on Stable):** brand mark only; wordmark hidden. On Dev/Nightly a small clickable stage pill opens a popover with build SHA, server time, and changelog link. `SidebarChrome.tsx:39-85` is the chrome; `z-10` content sits over the `z-0` backdrop. `SidebarStageBackdrop.tsx:13` uses `STAGE_BACKDROP_VIEW_BOX = "0 0 8192 96"` — the wide viewBox is preserved.
- **Search row (40px):** unchanged search input + new-thread/scope icons.
- **Project list (flex):** split into a project-header subscribing to `useProjects()` and per-project containers subscribing to their own thread atom. The single 3,900-LoC `Sidebar()` at `Sidebar.tsx:1881` subscribes to `useProjects()`, `useThreadShells()`, and six `useClientSettings` selectors simultaneously — that parent subscription is the root cause of every "sidebar redraws on composer keystroke" finding. PR 4 splits it.
- **Footer (collapsed):** utility nav (Settings / Skills / Plugins / PRs / Usage) with text labels. Update pills anchor to a popover so the footer stays fixed-height. No burn meter lives here.
- **No burn meter.** A burn meter in the sidebar bottom commits the shell to one number's worth of design and one telemetry stream's worth of complexity. Drop the concept. Cost is in the status bar (§2.5) and the topbar chip (§3.4). The `/usage` page is the deep dive.

### 2.3 Right rail — opt-in always-on column

`RightPanelSheet.tsx:1-43` stays the default for backwards compatibility. The new always-on column mode is opt-in.

- **Default (toggle off):** today's `Sheet` slide-in. `RIGHT_PANEL_STORAGE_KEY = "rune:right-panel-state:v2"` (`rightPanelStore.ts:67`) keeps persisting `byThreadKey` per-thread state.
- **Polished (toggle on AND viewport `md+`):** the rail becomes a fixed-width column to the right of the canvas. Tabs (terminal / diff / files / browser / agents / PRs) are first-class nav, each with its own per-thread state. No slide-in animation. Tabs expand on click.
- **Mobile / narrow viewports:** always a sheet, regardless of toggle state. The column does not fit.
- **Status bar ↔ right-rail link:** the status bar's "thread status" cell links to the rail's active tab. The rail and the bar share a focus context.

### 2.4 Status bar — 28px, opt-in via the beta toggle

A new `apps/web/src/components/StatusBar.tsx`. Bottom of the shell, 28px high. The status bar is the new home for shell-level status that the prior draft tried to push into a "burn meter".

- **Cells (left → right):** connection dot · environment name · current model · last action's cost · thread status · build SHA on Nightly (hidden on Stable).
- **Gating:** when `shellPolished` is `false`, the bar is unmounted entirely. Off-shell users see the same chrome they see today.
- **Cost source:** `ThreadTokenUsageSnapshot.costUsd` for the current turn (read via `useLatestContextWindowSnapshot(activeThreadId)`, a new hook at `apps/web/src/hooks/useLatestContextWindowSnapshot.ts` — PR 5/6), and `MergedUsage.costUsd` for the 24h total (read from the existing `usageSummary` SWR cache, 60s SWR at `packages/client-runtime/src/state/server.ts:729`). The shell does NOT poll its own usage endpoint; it reads from the page's existing cache. If the cache is empty (first render), the chip shows "$ —" — no placeholder spinner.
- **Status bar ↔ right-rail link:** "thread status" cell is a `Link` to the rail's active tab. Sets focus so the rail and the bar read as one piece.

### 2.5 Workspace map landing — tile grid (unchanged from prior)

`RuneWorkspaceProjectCardView` stays. The prior draft's 12×12 `RuneProjectTile` with cost sparkline is shelved. The four-status-segment on the settings card is the settings spec's problem, not ours.

## 3. Beta-features toggle — "Polished shell"

The new flagship concept: a first-class user toggle that gates the polished layout, the liquid-glass composer/active-card, the always-on right rail column, the topbar cost chip, and the status bar. Off by default. Same plumbing as `planModeEnabled`.

### 3.1 Settings schema

Add to `UnifiedSettings` in `packages/contracts/src/settings.ts` next to `planModeEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false)))` at line 235:

```ts
// IDE-class polished shell: status bar, topbar cost chip, right-rail
// always-on column, liquid-glass composer/card opacities. Off by default;
// users opt in. withDecodingDefault pins the choice across schema bumps so
// opt-outs are durable.
shellPolished: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
```

### 3.2 Settings row — "Workspace → Shell" (or "General")

Use the exact `SettingsRow` + `Switch` + `SettingResetButton` pattern at `SettingsPanels.tsx:2026-2050` (the "Show skills in slash menu" row). Place it adjacent to that row, under a "Shell" section header. Wire it to the same `updateSettings({ shellPolished })` flow.

```tsx
<SettingsRow
  {...searchableSetting("polished-shell")}
  title="Polished shell (beta)"
  description="Status bar, topbar cost chip, always-on right rail, and the liquid-glass composer. Disable to fall back to the default chrome."
  resetAction={
    settings.shellPolished !== DEFAULT_UNIFIED_SETTINGS.shellPolished ? (
      <SettingResetButton
        label="polished shell"
        onClick={() =>
          updateSettings({ shellPolished: DEFAULT_UNIFIED_SETTINGS.shellPolished })
        }
      />
    ) : null
  }
  control={
    <Switch
      checked={settings.shellPolished}
      onCheckedChange={(checked) =>
        updateSettings({ shellPolished: Boolean(checked) })
      }
      aria-label="Polished shell (beta)"
    />
  }
/>
```

### 3.3 Search index + reset list

Mirror the existing pattern:

- `SettingsPanels.tsx:508-510` is the changed-settings list that powers the search index. Add `settings.shellPolished !== DEFAULT_UNIFIED_SETTINGS.shellPolished ? ["Polished shell"] : []` here.
- `SettingsPanels.tsx:657` is the parallel "reset to defaults" branch. Add `shellPolished: DEFAULT_UNIFIED_SETTINGS.shellPolished` to the reset object.

### 3.4 Feature gates driven by `shellPolished`

| Feature | Gated by `shellPolished`? | Also requires | Notes |
|---|---|---|---|
| Status bar | yes | — | Unmounts when toggle is off. |
| Topbar cost chip | yes | — | Reads `ThreadTokenUsageSnapshot.costUsd` (current turn) + `MergedUsage.costUsd` from the `usageSummary` SWR cache (24h). One chip, tooltip shows both. |
| Right-rail always-on column | yes | viewport `md+` | Sheet on mobile/narrow. |
| Liquid-glass composer shell | yes | — | Chat composer spec dep (per chat spec §3). |
| Liquid-glass right rail shell | yes | — | Per chat spec. |
| Liquid-glass status bar | yes | — | When present. |
| Liquid-glass topbar chrome | yes | — | Subtle backdrop-blur on the chrome. |
| Liquid-glass sidebar active row | yes | — | Subtle backdrop-blur on the active project/thread highlight. |

### 3.5 Rollback path

Because the flag uses `Schema.withDecodingDefault(Effect.succeed(false))`, an existing user with `shellPolished: false` keeps `false` after a schema bump. No silent re-enrollment. Document this in the "Beta features" section of the user docs and link the schema comment from §3.1 to the spec.

### 3.6 Toggle lifecycle — opt-in → default-on → remove

`shellPolished` is **not** a permanent opt-in toggle. A permanent beta toggle means RUNE maintains two shells forever. The correct lifecycle:

1. **MVS (development).** `shellPolished: false` is the default. Users opt in. Feature works. Telemetry tracks adoption.
2. **Release candidate.** `shellPolished: true` is the default for the RC build. The legacy shell becomes the explicit opt-out via a temporary `useLegacyShell: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false)))` setting. The migration path is testable from day one, not bolted on at the end.
3. **Stable after verification.** `shellPolished: true` is the default. The legacy shell is reachable via `useLegacyShell` (default `false`). The setting carries `Schema.withDecodingDefault` so it survives schema bumps.
4. **1-2 stable releases later.** The migration toggle is removed. The legacy shell is gone. The `useLegacyShell` schema entry is deleted in a follow-up contracts PR.

The `shellPolished` schema MUST use `Schema.withDecodingDefault(Effect.succeed(false))` so the default survives schema bumps. Users who opt-out at any point stay opted-out until the toggle is removed. This mirrors `planModeEnabled` at `packages/contracts/src/settings.ts:235`.

## 4. Theme polish — keep light, keep system, sharpen liquid glass

- `appearanceMode` default stays `"system"` (`apps/web/src/hooks/useTheme.ts:42`). The `ThemePreferenceMode` list at `useTheme.ts:131-133` is `["light", "dark", "system"]`. No changes.
- The 5 built-in themes (RUNE Core, Grove, Ocean, Ember, Iris) keep light + dark variants. No theme gets a variant removed.
- The "Light" tile in `ThemeSettings.tsx:742` stays. The `renderModeTiles` call at line 712 and the `(["system", "light", "dark"] as const).map(...)` at line 718 stay.
- `index.css:1583-1592` light sidebar token set stays. `index.css:1662-1693` (`[data-app-sidebar]` light zinc overrides) and `1695-1721` (dark canvas overrides) stay.
- Liquid-glass opacities are derived from a `--glass-opacity` token (already wired into `surface-glass` at `index.css:270-278`); the beta toggle's effect on the composer / active card re-reads that token. Respect `prefers-reduced-motion`.

## 5. Animation policy — no continuous repaint

This is the perf contract. Every continuous repaint that survives this spec is a bug.

- **Delete `status-ping`** (`index.css:253-267`). The 0%→40%→100% keyframe is a continuous repaint that pegs the GPU on a high-refresh display (`scale: 0.75 → 2`, opacity sweep). Replace with a single fade on state transition. No `scale` interpolation, no continuous keyframe.
- **Delete `filter: blur(3px)` from `RunePageTransition`** (`index.css:1829-1833`). `RunePageTransition.tsx:54,65` already toggles `data-rune-page-transition-state="entering"` then `"entered"` on a rAF. Keep opacity + a small `translateY` (transform-only). No GPU filter.
- **Remove the `bounce` animation** at `ProviderInstanceCard.tsx:461` (`[animation:bounce_2.4s_ease-in-out_infinite]`). Replace with a static icon — the update pill is already a button with a tooltip.
- **Remove `autoAnimate` import and call** at `Sidebar.tsx:1` (import) and `Sidebar.tsx:3555-3558` (usage: `autoAnimate(node, { duration: 150, easing: "ease-out" })`). dnd-kit's `transform` covers sortable motion.
- **Cap `RuneLoader` at 2s.** The 6-facet cycle at `RuneLoader.tsx:17-66` is currently infinite. After 2s, drop to a static "ready" state (a single filled mark, no facets moving). Same for `SplashScreen.tsx:26` (the `rune-splash-status-dot` becomes static after 2s).
- **One shared `useTick(intervalMs)`** at `apps/web/src/hooks/useTick.ts`. Components read it via `useSyncExternalStore`. `WorkingDuration` (`Sidebar.tsx:251-265`, the 1s per-row `setInterval`) consumes it. The status bar consumes it for cost refresh. No per-row `setInterval` survives.
- **`prefers-reduced-motion`.** Add a single rule to `index.css` that zeros `animation` and `transition` step animations and the live caret. The `motion-reduce:` Tailwind utility pattern (`motion-reduce:animate-none`, `motion-reduce:transition-none`) is already used in `RunePageTransition.tsx:61`; replicate it everywhere new code lands.
- **CI lint guard.** A pre-commit grep for `[animation:.*infinite]` in `apps/web/src/` blocks regressions. Lives next to the existing CI configs.

## 6. Performance contract

- **Sidebar scale:** must render 50+ projects and 200+ threads without jank. Achieved by splitting the parent (`Sidebar.tsx:1881-2046`) into a project header + per-project containers. The parent subscribes to `useProjects()` and the per-project group ordering; each project container subscribes to its own thread atom.
- **Working durations:** one shared 1s `useTick(intervalMs)` for working durations. No per-row `setInterval` (the current `Sidebar.tsx:251-265` pattern).
- **Status bar cost:** reads `ThreadTokenUsageSnapshot.costUsd` for the current turn (via `useLatestContextWindowSnapshot(activeThreadId)`) and `MergedUsage.costUsd` for the 24h rolling value (via the existing `usageSummary` SWR cache at `packages/client-runtime/src/state/server.ts:729`). No extra RPC, no extra atom, no separate store, no parallel analytics architecture.
- **Topbar cost chip:** reads from the same two sources. No parallel state. Tooltip shows the 24h rolling value; the chip itself shows per-turn. If the cache is empty (first render), the chip shows "$ —" — no spinner.
- **Right-rail always-on column:** the column mounts once; tab switching is a per-thread `useState` swap, not a remount. `rightPanelStore.ts:67` persists `byThreadKey` so tab state survives reloads.
- **Bench profiles.** Land two Vitest bench tests in `apps/web/src/test/perf/`:
  - 1k-message thread render (long-message thread, scroll-back)
  - 50-project sidebar render (50 project headers + 200 thread rows split per-project)
- **Animation cost.** `transition-[left,right,width]` on the sidebar gap + container (`ui/sidebar.tsx:282-316`) uses `--rune-motion-standard` (cubic-bezier 0.22, 1, 0.36, 1) and stays. The single 200ms ease on collapse is the one animation that earns its keep. Everything else is gone.

## 7. Web vs desktop vs mobile

- **Web (browser):** polished shell when toggle is on; default chrome when off. Right rail is a sheet on `sm`, a column on `md+`.
- **Desktop (Electron):** same shell, same toggle. Tray integration is a separate spec — out of scope here. The `QuitHoldOverlay` is preserved.
- **Mobile:** inherits the same `ServerProvider` snapshot and the same `shellPolished` toggle. Mobile keeps its own React Native layout; the toggle just gates the mobile-side liquid-glass tokens. Web and desktop are the design surface; mobile gets the same atoms.

## 8. Persistent state (no schema change beyond the new flag)

`uiStateStore`, `rightPanelStore`, `composerDraftStore`, `terminalUiStateStore`, `connection/storage.ts` are unchanged. The new `shellPolished` flag is the only schema addition (PR 2). The `legacySidebarEnabled` setting stays where it is.

## 9. Dead code to delete (pre-work for the spec)

These land in PR 1 so subsequent PRs build on a clean surface. **Do not** delete `LegacySidebar` or the `legacySidebarEnabled` setting.

1. `apps/web/src/components/settings/ProviderSettingsPanel.tsx` — delete the unused `ProviderInstanceCard` import.
2. `apps/web/src/components/settings/UniversalServiceSettings.tsx` — delete the unused `SparklesIcon` import and the unused `onOpenAddApiProvider` prop.
3. `apps/web/src/components/Sidebar.tsx:1` + `Sidebar.tsx:3555-3558` — delete the `autoAnimate` import + call.
4. `apps/web/src/index.css:253-267` — delete the `status-ping` keyframe.
5. `apps/web/src/index.css:1829-1833` — remove the `filter: blur(3px)` line from `RunePageTransition`.
6. `apps/web/src/components/settings/ProviderInstanceCard.tsx:461` — strip the `[animation:bounce_2.4s_ease-in-out_infinite]` Tailwind arbitrary value.
7. `apps/web/src/components/Sidebar.tsx:251-265` — remove the per-row `setInterval`; replace with a `useTick` consumer (PR 3).

## 10. Open questions

- **Beta toggle name** — `shellPolished` vs `liquidGlassShell` vs `missionControlShell`. Pick one. The Settings row title is "Polished shell (beta)"; the schema key should match. **Recommendation: `shellPolished`.**
- **Status bar on `md` viewports** — keep the 28px bar on `md` (smaller), or restrict to `lg+`? Smaller laptops have ~768px of vertical; 28px is fine, but it does eat into chat scroll. **Recommendation: render on `md+`; hide on `sm` and below.**
- **Topbar cost chip** — per-turn (volatile, updated on `context-window.updated`) or 24h rolling? **Recommendation: per-turn as the chip value; tooltip shows 24h rolling.** Per-turn is what a user actually watches when an agent is running.
- **Status-bar cell count** — the spec lists 6 cells. On a 1366×768 laptop that is tight. **Recommendation: collapse "build SHA" into a tooltip on the connection dot on Stable; show it inline only on Dev/Nightly.**
- **Liquid-glass token names** — do we keep `bg-card/55`-style Tailwind utilities, or move to a dedicated `--glass-surface` token? Out of scope for this spec; surface when the chat-composer work lands.
- **The `useLegacyShell` migration toggle: should it ship in MVS, or wait until the RC when the default flips?** The migration path is testable from day one only if the toggle exists from the start. **Recommendation: ship in MVS, default `false`, so the migration path is testable from day one and the schema migration is a single forward step rather than a runtime schema swap.**
- **Topbar cost chip: should it show current turn + 24h in one chip, or two separate chips?** Two chips doubles the chrome weight on the topbar; one chip with a tooltip keeps the topbar single-row. **Recommendation: one chip with a tooltip showing both values.**

## 11. PR breakdown (each PR is small + reversible via the toggle)

| # | Title | What ships |
|---|---|---|
| 1 | `chore(shell): delete dead code + lock down animations` | The 7 dead-code cleanups from §9; the `bounce` strip; the `status-ping` deletion; the `autoAnimate` removal; the `RunePageTransition` `filter: blur(3px)` removal. Add the CI lint rule for `[animation:.*infinite]`. Cap `RuneLoader` + `SplashScreen` at 2s. |
| 2 | `feat(shell): add Polished-shell beta toggle + opt-in flag plumbing` | Add `shellPolished` to `UnifiedSettings` (mirror `planModeEnabled`). Add the Settings row, the search-index entry, the reset list. Gated on the flag; **no behavior change yet.** |
| 3 | `feat(shell): shared useTick hook + kill per-row setInterval` | `apps/web/src/hooks/useTick.ts`. `WorkingDuration` (`Sidebar.tsx:251-265`) reads from it. Status bar's cost refresh (PR 5) will read from the same hook. |
| 4 | `feat(shell): split Sidebar into project-header + per-project containers` | Per-project atom scope. Drop `useThreadShells()` from the parent (`Sidebar.tsx:1881`). |
| 5 | `feat(shell): status bar (opt-in via beta toggle)` | `StatusBar.tsx` + mount in `AppSidebarLayout.tsx`. Gated on `shellPolished`. Cost source: `ThreadTokenUsageSnapshot.costUsd` via `useLatestContextWindowSnapshot(activeThreadId)` (current turn) + `MergedUsage.costUsd` from the `usageSummary` SWR cache (24h). No `usageOverview` dependency. |
| 6 | `feat(shell): topbar cost chip (opt-in via beta toggle)` | Topbar reads `ThreadTokenUsageSnapshot.costUsd` (current turn, via `useLatestContextWindowSnapshot`) + `MergedUsage.costUsd` (24h, from the `usageSummary` SWR cache). Gated on `shellPolished`. One chip; tooltip shows both. If the cache is empty, the chip shows "$ —" (no spinner). |
| 7 | `feat(shell): right-rail always-on column (opt-in via beta toggle)` | `RightPanelSheet` gets a `mode="column" \| "sheet"` prop, chosen by viewport + beta flag. |
| 8 | `feat(shell): liquid-glass opacities on composer + right rail + selected shell surfaces` | Re-skin the `ChatComposer` shell, the right rail shell, the status bar, the topbar chrome, and the sidebar's active row highlight when the toggle is on. Does NOT re-skin assistant messages (the chat spec is the source of truth there). |

Each PR is independently revertable by flipping the toggle off (or, for PR 1, by `git revert`). No PR requires the toggle to be on for the test suite to pass.

## 12. Files in scope (per the review)

App entry: `apps/web/src/main.tsx`, `AppRoot.tsx`, `router.ts`, `routeTree.gen.ts`, `routes/__root.tsx`, `routes/_chat.tsx`, `routes/_chat.index.tsx`, `routes/settings.tsx`.

Shell layout: `AppSidebarLayout.tsx:160`, `ui/sidebar.tsx`, `sidebar/SidebarChrome.tsx:39`, `sidebar/ThreadSidebarRail.tsx`, `sidebar/SidebarUpdatePill.tsx`, `sidebar/SidebarProviderUpdatePill.tsx`, `Sidebar.tsx:1881`, `LegacySidebar.tsx`, `SidebarStageBackdrop.tsx:13`, `WorkspacePageHeader.tsx:7`, `workspaceTitlebar.ts`, `RunePageTransition.tsx:54,65`, `RuneMark.tsx:1`, `SplashScreen.tsx:26`, `RuneLoader.tsx:17`, `runeLoader.css`, `QuitHoldOverlay.tsx:14`.

New: `apps/web/src/components/StatusBar.tsx`, `apps/web/src/hooks/useTick.ts`, `apps/web/src/hooks/useLatestContextWindowSnapshot.ts` (PR 5/6 — reads the latest `context-window.updated` activity for the active thread and exposes the `ThreadTokenUsageSnapshot` it carries, including `costUsd`).

Right rail: `RightPanelSheet.tsx:1-43`, `RightPanelTabs.tsx`, `rightPanelStore.ts:67`.

State: `state/shell.ts:17`, `state/entities.ts:111`, `state/environments.ts`, `state/threads.ts`, `state/projects.ts`, `state/server.ts`, `uiStateStore.ts:1`, `threadSelectionStore.ts`, `terminalUiStateStore.ts`, `browserHistoryStore.ts`, `browserFaviconStore.ts`, `connection/storage.ts:1`.

Theme: `themePalette.ts:1`, `hooks/useTheme.ts:1` (lines 30-44, 131-133), `appearanceFonts.ts:1`, `appearanceContrast.ts`, `components/clerk/clerkAppearance.ts`, `components/settings/ThemeSettings.tsx:712-748`, `ThemeColorPicker.tsx`, `ThemeEditorPanel.tsx`, `branding.ts`, `branding.logic.ts`, `index.css:253-267, 1583-1592, 1662-1693, 1695-1721, 1829-1833`.

Contracts: `packages/contracts/src/settings.ts:235` (add `shellPolished` next to `planModeEnabled`).

Settings UI: `apps/web/src/components/settings/SettingsPanels.tsx:508-510` (search index), `SettingsPanels.tsx:657` (reset list), `SettingsPanels.tsx:2026-2050` (SettingsRow pattern).

Excluded: `CommandPalette.tsx`, `CommandPaletteContent.tsx`, `CommandPaletteResults.tsx`, `CommandPalette.logic.ts`, `commandPaletteBus.ts`, `ui/toast.tsx`, `ui/dialog.tsx`, `ui/dialog-styles.ts`, `ui/sheet.tsx`, `ConfirmDialogHost.tsx`, `PullRequestThreadDialog.tsx`, `SlowRpcRequestToastCoordinator.tsx`, `SoundEventHost.tsx`, `browser/ElectronBrowserHost.tsx`, `PreviewAutomationHosts.tsx`, `cloud/ConnectOnboardingDialog.tsx`, `cloud/RelayClientInstallDialog.tsx`, `desktop/SshPasswordPromptDialog.tsx`, `ProviderUpdateLaunchNotification.tsx`, `RenderErrorBoundary.tsx`, `chat/ChatHeader.tsx`, `WorkspaceBreadcrumb.tsx`, `settings/SettingsSidebarNav.tsx`, `keybindings.ts:1`, `shortcutModifierState.ts`. These are surface-orthogonal to the shell.

## 13. Severity-1 findings (carried over from the prior review)

The following block-the-direction findings are addressed across the PRs above. The design-direction findings the prior draft leaned on (burn meter, kill light mode, kill legacy sidebar, four-status-segment claim) are **rejected** in this rev — see §1 and §14.

1. **`status-ping` repaints 40% of every 2s cycle** (`index.css:253-267`) — PR 1.
2. **`WorkingDuration` ticks every 1s per row** (`Sidebar.tsx:251-265`) — PR 3.
3. **`autoAnimate` polls every list mutation** (`Sidebar.tsx:1, 3555-3558`) — PR 1.
4. **`RunePageTransition` uses `filter: blur(3px)`** (`index.css:1829-1833`) — PR 1.
5. **`bounce` animation infinite** (`ProviderInstanceCard.tsx:461`) — PR 1.
6. **`RuneLoader` 6-facet cycle is infinite** (`RuneLoader.tsx:17-66`) — PR 1 (2s cap).
7. **Sidebar subscribes to every project and every thread** (`Sidebar.tsx:1881-2046`) — PR 4.
8. **Sidebar gap animates 200ms on collapse** (`ui/sidebar.tsx:282-316`) — keep; the cubic-bezier earns it.
9. **Right-rail is sheet-only, no always-on column** (`RightPanelSheet.tsx:1-43`) — PR 7.
10. **No status bar** — PR 5.
11. **No topbar cost chip** — PR 6.
12. **No liquid-glass re-skin of the composer / right rail / status bar / topbar / sidebar active row** — PR 8.
13. **No user-facing beta toggle for the polish** — PR 2 (this is the new flagship concept).
14. **Shell referenced `usageOverview.costTrendLastHour` and `usageOverview.currentTurnCost`** — the revised usage spec removed `usageOverview` (along with `forecast`, `trend`, `comparison`). The shell must not create a parallel analytics architecture just to power itself. Drop the dependency. Use `ThreadTokenUsageSnapshot.costUsd` for current turn cost (read via `useLatestContextWindowSnapshot(activeThreadId)`); read 24h from the existing `usageSummary` SWR cache (`packages/client-runtime/src/state/server.ts:729`). — PR 5 + PR 6.
15. **Shell referenced a `MessageCard` liquid-glass active card** — the revised chat spec rejected `MessageCard` for assistant messages (the assistant body is an open canvas, not a card). Liquid glass applies to the composer shell, the right rail shell, the status bar, the topbar chrome, and the sidebar's active row highlight — not to assistant messages. The chat spec is the source of truth on message rendering. — PR 8.
16. **Beta toggle `shellPolished` was framed as a permanent opt-in.** A permanent toggle means RUNE maintains two shells forever. Document the lifecycle: opt-in (MVS) → default-on (RC) → default-on with legacy opt-out via `useLegacyShell` (Stable) → remove the migration toggle (1-2 releases later). The `shellPolished` schema uses `Schema.withDecodingDefault` so opt-outs survive schema bumps. — §3.6.

## 14. Out of scope (per the brief)

- **Removing light mode** (kept). **Removing system mode** (kept). **Removing legacy sidebar** (kept; `legacySidebarEnabled` still gates it).
- **Removing the four-status-segment on the settings card.** That's the settings spec's problem.
- **The `RuneWorkspaceProjectCardView` 12×12 tile grid.** Unchanged; the prior draft's tile rewrite is shelved.
- **A sidebar "burn meter".** The status bar is the new home for cost. `/usage` is the deep dive.
- **Chat internals** (composer internals, message rendering), usage page, settings forms, skills system, server, contracts (except the new `shellPolished` field), database, checkpointing. Each has its own spec.
- **Desktop tray integration** — the prior draft's PR 6. The desktop spec owns this.
- **The legacy shell (after the migration toggle is removed).** Once `useLegacyShell` is deleted in a follow-up contracts PR, the legacy shell is gone. The shell spec ends at that point.
- **The `usageOverview` derivation (rejected by the usage spec).** The shell reads from the existing `usageSummary` SWR cache and `ThreadTokenUsageSnapshot.costUsd` — it does not create a parallel analytics architecture.
