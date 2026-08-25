# RUNE Workbench Motion, Composer, and Console Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Make the composer, right panel, and terminal feel like one smooth RUNE workbench while preserving current session and focus behavior.

**Architecture:** Consume the foundation motion variables and keep the existing right-panel store, terminal UI store, and composer draft/editor state as the only sources of truth. Animate containers and state boundaries, not the provider/session contents, so opening and closing surfaces does not recreate runtime state.

**Tech Stack:** React 19, Tailwind CSS 4, Zustand, Ghostty, TanStack Router, Vitest.

**Spec:** docs/superpowers/specs/2026-08-24-rune-workbench-redesign-design.md

## Global Constraints

- Scope is web and desktop; do not touch mobile.
- Right-panel and terminal toggles must remain reversible and keyboard-safe.
- Preserve existing surface types, terminal sessions, splits, shortcuts, and focus ownership.
- Use 160–240ms motion and an immediate reduced-motion path.
- Do not animate the prompt editor on each keystroke or recreate Ghostty surfaces during layout changes.

---

### Task 1: Add a right-panel transition contract

**Files:**
- Create: apps/web/src/runePanelMotion.ts
- Create: apps/web/src/runePanelMotion.test.ts
- Modify: apps/web/src/rightPanelLayout.ts
- Modify: apps/web/src/components/RightPanelSheet.tsx
- Modify: apps/web/src/components/RightPanelTabs.tsx
- Modify: apps/web/src/components/chat/PanelLayoutControls.tsx
- Modify: apps/web/src/components/ChatView.tsx
- Modify: apps/web/src/index.css

**Interfaces:**
- RunePanelMotionState is "closed" | "opening" | "open" | "closing".
- resolveRunePanelMotionState(input: { open: boolean; previousOpen: boolean; reducedMotion: boolean }): RunePanelMotionState.
- runePanelTransitionClass(state: RunePanelMotionState): string.

- [ ] **Step 1: Write the state transition tests**

~~~ts
expect(resolveRunePanelMotionState({ open: true, previousOpen: false, reducedMotion: false })).toBe("opening");
expect(resolveRunePanelMotionState({ open: false, previousOpen: true, reducedMotion: false })).toBe("closing");
expect(resolveRunePanelMotionState({ open: true, previousOpen: true, reducedMotion: false })).toBe("open");
expect(resolveRunePanelMotionState({ open: true, previousOpen: false, reducedMotion: true })).toBe("open");
~~~

- [ ] **Step 2: Run the focused test and verify the new contract fails**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/runePanelMotion.test.ts

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the contract and layout classes**

Use a stable data attribute on the panel host:

~~~tsx
<div data-rune-right-panel-state={motionState} data-right-panel-surface-content>
  {children}
</div>
~~~

Use grid-template-columns or the existing inline/sheet layout seam for the width transition. Use opacity/translate only for content enter/exit, and keep the active surface mounted while it is closing. Add a reduced-motion rule that removes transform and transition duration.

- [ ] **Step 4: Preserve focus and toggle semantics**

When closing, return focus to the invoking panel toggle if the active surface did not move focus into an interactive control. When switching tabs, keep the active tab and surface ids unchanged. Keep the live-agent badge and aria-pressed values derived from the existing props.

- [ ] **Step 5: Run right-panel tests**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/runePanelMotion.test.ts src/components/RightPanelTabs.test.tsx src/rightPanelStore.test.ts
~~~

Expected: PASS.

### Task 2: Redesign the terminal as RUNE Console

**Files:**
- Modify: apps/web/src/components/ThreadTerminalDrawer.tsx
- Modify: apps/web/src/terminalUiStateStore.ts
- Modify: apps/web/src/components/RightPanelTabs.tsx
- Modify: apps/web/src/index.css
- Modify: apps/web/src/components/ThreadTerminalDrawer.test.ts
- Modify: apps/web/src/terminalUiStateStore.test.ts

**Interfaces:**
- Existing ThreadTerminalDrawer props and TerminalViewport behavior remain unchanged.
- Add data-rune-console, data-rune-console-session, and data-rune-console-status attributes.
- Keep terminalOpen, terminalHeight, terminalIds, activeTerminalId, terminalGroups, and activeTerminalGroupId as the persisted state shape.

- [ ] **Step 1: Add state invariants for animated visibility**

Extend terminal UI tests to assert that closing the drawer does not clear terminal ids or active group state, and that opening a previously configured thread restores the same active terminal.

~~~ts
const state = getThreadTerminalUiState(threadRef);
expect(state.terminalOpen).toBe(false);
expect(state.terminalIds).toEqual(["terminal-a", "terminal-b"]);
expect(state.activeTerminalId).toBe("terminal-b");
~~~

- [ ] **Step 2: Run terminal tests before styling**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/terminalUiStateStore.test.ts src/components/ThreadTerminalDrawer.test.ts

Expected: existing tests pass; new invariant fails until the test fixture is wired to the store behavior.

- [ ] **Step 3: Implement Console chrome**

Add a compact title row with active session, project/CWD metadata, process status, split/new/close actions, and a clear active focus treatment. Keep all existing TerminalActionButton handlers and shortcut labels. Style the terminal canvas through --terminal-* variables derived by terminalThemeFromApp, using RUNE violet for focus/cursor and copper for active process state.

- [ ] **Step 4: Animate open, close, resize, and split boundaries**

Use height, opacity, and contain on the drawer host. Keep Ghostty mounted while the drawer is open or closing, and call fit() only from the existing resize epoch path. Do not introduce an interval or per-frame polling loop.

- [ ] **Step 5: Run focused terminal tests and typecheck**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/terminalUiStateStore.test.ts src/components/ThreadTerminalDrawer.test.ts src/components/RightPanelTabs.test.tsx
pnpm.cmd --filter @t3tools/web typecheck
~~~

Expected: PASS.

### Task 3: Redesign the composer command surface

**Files:**
- Create: apps/web/src/components/chat/ComposerContextTray.tsx
- Create: apps/web/src/components/chat/ComposerContextTray.test.tsx
- Modify: apps/web/src/components/chat/ChatComposer.tsx
- Modify: apps/web/src/components/chat/ComposerControl.tsx
- Modify: apps/web/src/components/chat/ComposerBannerStack.tsx
- Modify: apps/web/src/components/chat/ProviderModelPicker.tsx
- Modify: apps/web/src/components/chat/ComposerPrimaryActions.test.tsx
- Modify: apps/web/src/components/chat/ComposerPendingTerminalContexts.test.tsx
- Modify: apps/web/src/components/chat/composerProviderState.test.tsx
- Modify: apps/web/src/index.css

**Interfaces:**
- ComposerContextTray accepts contexts, skills, onRemoveContext, and onOpenSkill.
- Context entries expose id, kind, label, and optional scope.
- Existing prompt editor, draft store, attachment uploads, provider/model selection, plan mode, approval, user input, task progress, and terminal context handlers remain the source of truth.

- [ ] **Step 1: Write the context tray test**

~~~tsx
it("renders removable context with its scope", () => {
  render(
    <ComposerContextTray
      contexts={[{ id: "terminal-1", kind: "terminal", label: "npm test", scope: "D:/Apps/Rune" }]}
      skills={[]}
      onRemoveContext={onRemoveContext}
      onOpenSkill={onOpenSkill}
    />,
  );
  expect(screen.getByText("npm test")).toBeVisible();
  expect(screen.getByText("D:/Apps/Rune")).toBeVisible();
  expect(screen.getByRole("button", { name: /remove npm test/i })).toBeVisible();
});
~~~

- [ ] **Step 2: Run the composer tests and verify the new test fails**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/components/chat/ComposerContextTray.test.tsx

Expected: FAIL because the context tray does not exist.

- [ ] **Step 3: Implement the tray and integrate it at the composer seam**

Place the tray between the prompt canvas and footer controls. Keep the footer compacting logic, provider unavailable state, and pending banners intact. Use semantic violet focus and neutral context chips; use copper only for active/pending runtime states. Ensure chips are removed through the existing draft/context callbacks.

- [ ] **Step 4: Redesign control grouping without hiding capabilities**

Make provider/model, interaction mode, runtime access, attachments, skills, and send/interrupt visually distinct. On narrow desktop widths, collapse secondary controls into the existing compact menu while preserving keyboard reachability and accessible names.

- [ ] **Step 5: Verify composer behavior**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/components/chat/ComposerContextTray.test.tsx src/components/chat/ComposerPrimaryActions.test.tsx src/components/chat/ComposerPendingTerminalContexts.test.tsx src/components/chat/composerProviderState.test.tsx src/components/chat/ComposerCommandMenu.test.tsx
pnpm.cmd --filter @t3tools/web typecheck
~~~

Expected: PASS.

### Task 4: Workbench interaction gate

- [ ] **Step 1: Run the combined focused suite**

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/runePanelMotion.test.ts src/components/RightPanelTabs.test.tsx src/rightPanelStore.test.ts src/terminalUiStateStore.test.ts src/components/ThreadTerminalDrawer.test.ts src/components/chat/ComposerContextTray.test.tsx src/components/chat/ComposerPrimaryActions.test.tsx src/components/chat/ComposerCommandMenu.test.tsx
~~~

- [ ] **Step 2: Verify the retained web runtime**

Use http://localhost:5733/ to open and close the right panel, switch between files/diff/agents/terminal, open and close the Console, resize it, split it, add terminal context to the composer, attach a file, switch provider/model, and use reduced-motion in browser settings. Verify that focus returns to the invoking control and no terminal session is recreated.

