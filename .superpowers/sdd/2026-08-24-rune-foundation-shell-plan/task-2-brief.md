### Task 2: Make quiet RUNE chrome the default

**Files:**
- Create: apps/web/src/components/RuneMark.tsx
- Create: apps/web/src/components/RuneMark.test.tsx
- Modify: packages/contracts/src/settings.ts
- Modify: packages/contracts/src/settings.test.ts
- Modify: apps/web/src/components/SidebarStageBackdrop.tsx
- Modify: apps/web/src/components/SidebarStageBackdrop.test.tsx
- Modify: apps/web/src/components/sidebar/SidebarChrome.tsx
- Modify: apps/web/src/index.css

**Interfaces:**
- RuneMark accepts size?: "sm" | "md" and showWordmark?: boolean.
- The default DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE becomes pill, preserving the explicit artwork and none values.
- SidebarChromeHeader renders the RUNE mark and environment pill without mounting default stage artwork.

- [ ] **Step 1: Add contract tests for the new default**

Extend packages/contracts/src/settings.test.ts with a test that decodes default client settings and asserts:

~~~ts
expect(DEFAULT_CLIENT_SETTINGS.environmentIdentificationMode).toBe("pill");
~~~

Add a component test that renders RuneMark and asserts its accessible label contains RUNE, while the default sidebar header does not render data-sidebar-stage-backdrop.

- [ ] **Step 2: Run the focused tests and verify the default test fails**

Run:

~~~powershell
pnpm.cmd exec vp test run packages/contracts/src/settings.test.ts apps/web/src/components/RuneMark.test.tsx apps/web/src/components/SidebarStageBackdrop.test.tsx
~~~

Expected: the new default assertion fails before implementation.

- [ ] **Step 3: Implement the default and mark**

Change only the default setting value, not the schema literals. Build RuneMark from text and a simple RUNE-specific geometric mark rendered with CSS/SVG paths; do not import T3 artwork or use the old blue stage asset. Update SidebarChromeHeader so the default header uses the mark and pill. Keep SidebarStageBackdrop available only when the resolved environment mode is explicitly artwork.

- [ ] **Step 4: Verify light, dark, artwork, pill, and none states**

Run the focused tests again. Expected: PASS.

Run: pnpm.cmd --filter @t3tools/web typecheck

Expected: PASS with the desktop titlebar props still accepted.

