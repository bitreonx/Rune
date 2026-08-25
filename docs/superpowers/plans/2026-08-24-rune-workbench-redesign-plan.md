# RUNE Workbench Redesign Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Deliver a distinct RUNE web and desktop workbench with a graphite/ink and violet visual system, coherent motion, a better composer and console, honest provider/model settings, real API-provider support, and scoped skills/plugins.

**Architecture:** Execute four independently testable plans in order: foundation/shell, workbench motion/composer/console, provider/model workspace, and skills/plugin inventory and scope. Shared UI remains in apps/web so desktop inherits it; server and contracts change only where a feature crosses the existing environment boundary.

**Tech Stack:** React 19, Vite+, TanStack Router, Tailwind CSS 4, Effect/Schema contracts, Zustand UI stores, Ghostty terminal, Vitest through Vite Plus, Electron desktop wrapper.

**Spec:** docs/superpowers/specs/2026-08-24-rune-workbench-redesign-design.md

## Global Constraints

- Scope is web and desktop; mobile source and navigation remain unchanged.
- The visual foundation is graphite/ink with violet/plum as the RUNE brand accent and copper/amber reserved for active runtime state.
- Remove the default blue/grid T3-like topbar treatment; optional environment artwork cannot be the default RUNE identity.
- Motion uses short, reversible, compositor-friendly transitions and an immediate reduced-motion path.
- Existing provider, thread, terminal, remote-connection, and desktop IPC behavior remains authoritative.
- API providers and plugin actions are unavailable until real server contracts, secret handling, and runtime enforcement exist.
- Do not expose API keys or other secrets to ordinary browser-visible settings.
- Do not run repo-wide checks; use focused tests, scoped typecheck/build, and one integrated web pass.

---

## Plan set and delivery order

1. docs/superpowers/plans/2026-08-24-rune-foundation-shell-plan.md
   Establishes semantic tokens, default RUNE chrome, sidebar hierarchy, and shared page transitions.
2. docs/superpowers/plans/2026-08-24-rune-workbench-motion-plan.md
   Redesigns the composer, right-panel, terminal/Console, and their reversible motion.
3. docs/superpowers/plans/2026-08-24-rune-provider-model-plan.md
   Adds provider workspace presentation, model management, and real OpenAI API/OpenRouter adapters.
4. docs/superpowers/plans/2026-08-24-rune-skills-plugin-plan.md
   Adds skills inventory and a server-authoritative project/user plugin inventory and permission model.

## Cross-plan handoffs

- Foundation produces the RUNE semantic CSS variables and the shared motion duration contract consumed by the workbench plan.
- Workbench consumes the existing provider/model/skill snapshots and must not add a second selection or terminal state store.
- Provider/model work produces connection-category and model-presentation helpers consumed by settings, composer, and skills/plugin navigation.
- Skills/plugin work consumes environment identity and provider snapshots from the existing server atoms and keeps scope explicit in every operation.
- Each plan ends with its own focused test/typecheck gate before the next plan begins.

## Overall verification

Run after all four plans:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run
pnpm.cmd --filter @t3tools/web typecheck
pnpm.cmd --filter @t3tools/web build
~~~

Then reuse the retained isolated web server at http://localhost:5733/ for one integrated pass covering a populated thread, a draft thread, a provider settings page, a skills page, an open right panel, and an open terminal. Verify the shared UI in the desktop shell after the web pass; do not change mobile.

