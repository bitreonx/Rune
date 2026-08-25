# Task 3 review — RUNE sidebar hierarchy

## Spec Compliance

The composition keeps the existing behavior layer intact: `SidebarThreadRow`, `SidebarDraftRow`, and `SidebarDraftBlock` remain the render seams, while the existing search, shelf, sort, pinned drag, selection, keyboard, tooltip, terminal-status, and settings-navigation paths remain connected. The reported focused test and web typecheck passes were not rerun for this read-only review.

All three hooks exist at meaningful seams. `data-rune-sidebar-section` marks workspace, search, thread/search-result/shelf, settings, and utility regions; `data-rune-sidebar-row` marks workspace, search, scope, draft, thread, shelf, settings, and utility affordances; and `data-rune-sidebar-scope` distinguishes the root threads/settings/legacy view and project/all-project settings. See `AppSidebarLayout.tsx:217-221`, `SidebarChrome.tsx:54-57`, `Sidebar.tsx:3383-3390`, `Sidebar.tsx:3487-3491`, `Sidebar.tsx:3586-3589`, and `SettingsSidebarNav.tsx:182-189`.

The intended semantic surface hierarchy is largely present: the sidebar root, search/header/footer boundaries, and scope control use the established sidebar and RUNE surface tokens. Violet is correctly routed through `--rune-sidebar-focus` for the hook-based focus outline (`index.css:1534-1558`, `index.css:1585-1605`). However, the visual and reduced-motion contract is not fully met; see Important issues.

Leaving `Sidebar.logic.test.ts` unchanged is defensible. The brief explicitly says to keep its sorting, settling/snoozing, drag-order, selection, and terminal-activity assertions unchanged; the new structural assertion belongs in the runnable UI sidebar test. The file list's “Modify” entry is therefore not, on its own, a reason to force an unrelated logic-test edit.

## Strengths

- The redesign uses existing structural seams rather than reimplementing filtering or row-state derivation in JSX.
- Root and project/settings scopes are explicit and stable, making them useful for both styling and integrated verification.
- Existing interactive semantics remain in place: the search combobox handling, shelf toggle state, sortable pinned list, thread row keyboard handlers, tooltip providers, and settings result/navigation handlers are preserved.
- Active and selected rows retain semantic sidebar surfaces instead of adopting a primary/violet fill; the existing logic tests specifically guard that behavior.

## Issues

### Critical

None.

### Important

1. Reduced motion is incomplete for the shelf interaction. The snoozed and settled chevrons use `transition-transform` in `Sidebar.tsx:3867-3872` and `Sidebar.tsx:3903-3908`, without `motion-reduce:transition-none` or a duration bound to `--rune-motion-fast`. The reduced-motion rule in `index.css:1523-1528` only zeroes the RUNE variables, while Tailwind’s default `transition-transform` duration remains active. This contradicts the report's claim that the added sidebar transitions resolve to `0ms`. Make these transforms explicitly reduced-motion-safe.

2. The snoozed section header is still a raw blue hierarchy treatment: `text-blue-*` and `bg-blue-*` at `Sidebar.tsx:3861-3870`. This is a section label and divider, not a compact status badge, while the settled shelf already uses `text-muted-foreground` and `bg-sidebar-border` at `Sidebar.tsx:3897-3906`. Replace the raw blue classes with the existing graphite/ink semantic tokens so the hierarchy matches the brief. This does not require changing the snoozed behavior or its label.

### Minor

1. The new structural test in `ui/sidebar.test.tsx:23-30` only searches the raw text of `Sidebar.tsx`. It proves those three strings occur in that one source file, but not that the hooks render at their stated seams or that the hooks added in `AppSidebarLayout`, `SidebarChrome`, and `SettingsSidebarNav` remain present. This meets the brief’s minimal `toContain` examples, but it is weak integrated-verification coverage. Add targeted rendered assertions where a lightweight harness exists, or at least source assertions for the three other Task 3 seam files.

## Assessment

**Needs fixes.** The behavior-preservation approach and the decision not to edit `Sidebar.logic.test.ts` are sound, but the two Important visual/motion contract issues should be corrected and the focused tests/typecheck rerun before approval.
