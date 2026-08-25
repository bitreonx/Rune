# RUNE Foundation and Shell Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Replace the T3-like visual foundation with a cohesive graphite/ink and violet RUNE shell shared by web and desktop.

**Architecture:** Extend the existing semantic CSS token system and shared shell components. Keep environment artwork as an explicit optional mode, but make the default chrome quiet and RUNE-owned. Add one small motion contract for all later work instead of adding animation values independently to each component.

**Tech Stack:** React 19, Tailwind CSS 4, Effect/Schema settings, TanStack Router, Vitest.

**Spec:** docs/superpowers/specs/2026-08-24-rune-workbench-redesign-design.md

## Global Constraints

- Scope is web and desktop; do not touch mobile.
- Use graphite/ink surfaces, violet/plum brand actions, and copper/amber runtime state.
- Preserve existing sidebar sorting, settled/snoozed shelves, keyboard shortcuts, environment access, and desktop titlebar geometry.
- Default environment artwork is replaced by quiet RUNE chrome; explicit user-selected artwork remains opt-in.
- Use reduced-motion fallbacks and avoid always-running animation.

---

### Task 1: Add the RUNE motion and visual-language contract

**Files:**
- Create: apps/web/src/runeMotion.ts
- Create: apps/web/src/runeMotion.test.ts
- Modify: apps/web/src/index.css
- Modify: apps/web/src/themePalette.ts only where the default palette preview needs the new semantic roles

**Interfaces:**
- Produces RUNE_MOTION_MS with fast, standard, and slow numeric durations.
- Produces resolveRuneMotionDuration(durationMs: number, reducedMotion: boolean): number.
- Produces CSS variables --rune-violet-*, --rune-copper-*, --rune-motion-fast, --rune-motion-standard, and --rune-motion-slow.

- [ ] **Step 1: Write the failing motion contract test**

~~~ts
import { describe, expect, it } from "vitest";
import { RUNE_MOTION_MS, resolveRuneMotionDuration } from "./runeMotion";

describe("RUNE motion contract", () => {
  it("uses short product motion durations", () => {
    expect(RUNE_MOTION_MS.fast).toBe(160);
    expect(RUNE_MOTION_MS.standard).toBe(200);
    expect(RUNE_MOTION_MS.slow).toBe(240);
  });

  it("disables motion when reduced motion is requested", () => {
    expect(resolveRuneMotionDuration(RUNE_MOTION_MS.standard, true)).toBe(0);
    expect(resolveRuneMotionDuration(RUNE_MOTION_MS.standard, false)).toBe(200);
  });
});
~~~

- [ ] **Step 2: Run the focused test and verify it fails**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts

Expected: FAIL because the motion contract does not exist.

- [ ] **Step 3: Implement the contract and semantic CSS roles**

Add the exact exported values used by the test:

~~~ts
export const RUNE_MOTION_MS = Object.freeze({
  fast: 160,
  standard: 200,
  slow: 240,
} as const);

export function resolveRuneMotionDuration(durationMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : durationMs;
}
~~~

In index.css, add the violet, copper, surface, and motion variables inside the existing light/dark semantic theme blocks. Add prefers-reduced-motion overrides that set the RUNE motion variables to 0ms without removing focus transitions that improve orientation.

- [ ] **Step 4: Run the focused test and CSS build**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts

Expected: PASS.

Run: pnpm.cmd --filter @t3tools/web build

Expected: PASS, with no new CSS parse errors.

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

### Task 5: Foundation gate

- [ ] **Step 1: Run focused foundation tests**

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts src/components/RuneMark.test.tsx src/components/SidebarStageBackdrop.test.tsx src/components/Sidebar.logic.test.ts src/components/ui/sidebar.test.tsx src/components/RunePageTransition.test.tsx src/components/settings/settingsLayout.test.tsx
~~~

- [ ] **Step 2: Run scoped typecheck**

Run: pnpm.cmd --filter @t3tools/web typecheck

Expected: PASS.

- [ ] **Step 3: Verify the retained web runtime**

Open the already running isolated web app at http://localhost:5733/ and verify a populated sidebar, settings navigation, light/dark theme switching, and desktop-width titlebar geometry. Record any baseline issue separately from foundation regressions.

