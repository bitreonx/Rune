### Task 4: Add shared page transition chrome

**Files:**
- Create: apps/web/src/components/RunePageTransition.tsx
- Create: apps/web/src/components/RunePageTransition.test.tsx
- Modify: apps/web/src/components/WorkspacePageHeader.tsx
- Modify: apps/web/src/components/settings/settingsLayout.tsx
- Modify: apps/web/src/components/settings/SettingsSidebarNav.tsx
- Modify: apps/web/src/index.css

**Interfaces:**
- RunePageTransition accepts routeKey: string, children: ReactNode, and optional className.
- It keeps one page mounted during the short enter/exit boundary, uses opacity plus 4–8px displacement, and switches to an immediate render when reduced motion is active.

- [ ] **Step 1: Write the transition contract test**

~~~tsx
it("renders a stable route key and reduced-motion class", () => {
  const { container } = render(
    <RunePageTransition routeKey="settings/providers">
      <div>Providers</div>
    </RunePageTransition>,
  );
  expect(container.firstElementChild).toHaveAttribute("data-rune-page-transition", "settings/providers");
});
~~~

- [ ] **Step 2: Implement and use the transition**

Use CSS classes driven by data-rune-page-transition-state and motion-reduce:transition-none. Wrap settings page content and workspace page bodies at the existing shell seam; do not add route-specific animation code to every settings route.

- [ ] **Step 3: Run the focused transition/settings tests**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/components/RunePageTransition.test.tsx src/components/settings/settingsLayout.test.tsx

Expected: PASS.

