### Task 3: Redesign the sidebar hierarchy without changing behavior

**Files:**
- Modify: apps/web/src/components/Sidebar.tsx
- Modify: apps/web/src/components/AppSidebarLayout.tsx
- Modify: apps/web/src/components/sidebar/SidebarChrome.tsx
- Modify: apps/web/src/components/settings/SettingsSidebarNav.tsx
- Modify: apps/web/src/index.css
- Modify: apps/web/src/components/Sidebar.logic.test.ts
- Modify: apps/web/src/components/ui/sidebar.test.tsx

**Interfaces:**
- Existing SidebarThreadRow, SidebarDraftRow, SidebarDraftBlock, settled/snoozed shelves, drag-and-drop ordering, and keyboard navigation remain the behavior layer.
- Add stable data attributes data-rune-sidebar-section, data-rune-sidebar-row, and data-rune-sidebar-scope for styling and integrated verification.

- [ ] **Step 1: Add structural assertions before styling**

Add focused assertions to the existing sidebar tests:

~~~ts
expect(markup).toContain("data-rune-sidebar-section");
expect(markup).toContain("data-rune-sidebar-row");
~~~

Keep existing tests for sorting, settling, snoozing, drag order, thread selection, and terminal activity unchanged.

- [ ] **Step 2: Run the sidebar test files and record the expected failure**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/components/Sidebar.logic.test.ts src/components/ui/sidebar.test.tsx

Expected: new structural assertions fail.

- [ ] **Step 3: Apply the RUNE hierarchy**

Group the sidebar into workspace header, search, projects/threads, and utility sections. Use semantic surface, surface-subtle, sidebar-row-active, and violet focus tokens. Keep compact metadata in mono text and retain all existing labels/tooltips. Do not reimplement thread filtering or state derivation in JSX.

- [ ] **Step 4: Verify behavior and visual contract**

Run the focused sidebar tests and pnpm.cmd --filter @t3tools/web typecheck.

Expected: PASS, with no behavior regressions.

