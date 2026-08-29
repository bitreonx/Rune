# RUNE2 Release Readiness Report

Updated 2026-08-29. This report records what is proven, what is not, and the
next owner/action needed before release. It intentionally does not certify the
release while critical runtime rows remain static-only.

## Executive result

Status: **not release ready**.

The current `main` contains the Rune2 implementation slices through the shared
workspace viewer shell and has strong deterministic coverage. Runtime/browser,
manual multi-surface, dependency restoration, performance, and packaged rerun
evidence remain open.

## Proven in this pass

- `main` is clean and pushed at `993a568`.
- The focused integrated smoke set passed 27 suites and 246 tests.
- Composer, goal, historical mutation, skills, workrail, and motion logic passed
  11 suites and 99 tests.
- Viewer descriptor/routing/shell metadata and explorer inline-edit contracts
  passed 7 suites and 38 tests.
- Workspace mutation and entry behavior passed 2 suites and 36 tests.
- The latest viewer slice uses one shared `ViewerShell` for active rich file
  previews, canonical workspace identity, PDF/binary fallbacks, media routing,
  and local-only media volume persistence.
- The latest explorer slice uses one inline create/rename state and preserves
  canonical workspace refs, validation, retry, and cancellation behavior.

## Release blockers and owners

| Area | Finding | Required next proof | Owner |
| --- | --- | --- | --- |
| Web dependencies | `tsgo`, React/Vite plugins, and some runtime packages are unavailable in the checkout; installation also hit workspace/registry failures. | Restore the declared dependency graph in a clean isolated checkout and rerun targeted typecheck/build. | Release engineering |
| Viewer runtime | Static routing and shell tests pass, but rich React render/browser behavior is not proven here. | Run the viewer dogfood matrix for `.ts`, `.md`, `.svg`, `.png`, `.mp4`, `.pdf`, and unknown binary from Explorer and attachment paths. | Web maintainer |
| Antigravity adapter | Protocol/provider tests pass; the adapter suite did not return within the bounded test window and was interrupted. | Re-run `apps/server/src/provider/Layers/AntigravityAdapter.test.ts` in a complete dependency/runtime environment and capture the result. | Server maintainer |
| Cross-harness handoff | Contracts and surface logic pass; no live quota/forced-handoff continuation was captured. | Exercise Claude Code → Codex account/model continuation and verify the same mission/worktree with route receipts. | Provider maintainer |
| Agent fleet | Dock/lifecycle logic passes; five-child live fleet, direct messaging, needs-you, and no-zombie behavior are not manually proven. | Run the three-role and five-child fleet scenarios with durable status evidence. | Client/runtime maintainer |
| Pocket scale | Projection logic passes; 100/500-thread open, scroll, rerender, and memory measurements are absent. | Seed synthetic metadata only and measure open/scroll/memory without transcript prefetch. | Client performance owner |
| Accessibility/motion | Reduced-motion and keyboard contracts are represented in code, but no full keyboard/screen-reader/manual pass is claimed. | Verify keyboard-only paths, focus restoration, reduced motion, and labels on web/desktop. | UX/accessibility owner |
| Packaged desktop | Startup state tests pass and an earlier pack exited successfully with optional warnings; the merged `main` package has not been rerun. | Build and launch the current packaged app, including headless startup and second-instance recovery. | Desktop/release owner |

## Evidence commands

The primary evidence commands used for this report were focused `vp test run`
invocations, including the 27-suite/246-test cross-surface set and the
11-suite/99-test composer/goal/mutation/skills/workrail set. No repository-wide
check was used as a substitute for the acceptance matrix.

## Release decision

Do not publish a release or call the Rune2 pack production-ready until every
critical row in `RELEASE-ACCEPTANCE-MATRIX.md` has integration/runtime evidence,
and the current dependency tree has passed the web build/typecheck and packaged
desktop gates.
