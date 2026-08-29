# RUNE2 UX Reference Contract

This document records the behavioral target for the Rune2 implementation pack. It is a requirement contract, not a pixel-copy guide.

## Reference families

| Reference family | Required behavior |
|---|---|
| Pocket folder | Organize durable work without creating one visible tab per thread; support peek, shelf, workspace, keyboard access, and reduced motion. |
| Tasks | Show compact and expanded states, structural progress, blocked/needs-you states, and causal activity without fake percentages. |
| Workspace control | Make environment, branch, Git state, and handoff actions discoverable from one contextual control surface. |
| Subagent completion | Keep child lifecycle, artifacts, trail, escalation, and direct messaging durable in the Agent Dock; do not rely on a completion toast. |
| Structured asker | Provide a measured-height, keyboard-safe, accessible ask sheet that exposes the whole frontier of decisions. |
| File Explorer | Use inline rename/new-file actions and a meaningful context menu with recoverable errors and undo where possible. |
| Provider settings | Separate harness, instance, service/connection, and model; show truthful readiness and contextual sign-in/recovery guidance. |

## Shared visual contract

- Premium black/metallic surfaces with restrained liquid-purple edge energy.
- Clear hierarchy, no decorative neon framing, and no styling that masks broken runtime state.
- Motion is short and interruptible, generally 120–280 ms, with `prefers-reduced-motion` support.
- Web, desktop, and mobile must preserve the same state semantics even when composition differs.
- Keyboard navigation, focus visibility, readable contrast, and touch-sized actions are acceptance requirements.

## Evidence boundary

No user-supplied screenshot assets were present in the worktree during baseline capture. The plan package therefore records behavioral requirements only. If visual references are supplied later, they must be compared against the canonical shared components and documented as evidence; they must not become a second source of truth.
