# SDD ledger — plan: docs/superpowers/plans/2026-08-24-rune-foundation-shell-plan.md

## Workspace

- BASE: unavailable — `D:/Apps/Rune` is a source snapshot without `.git` metadata.
- Isolation ruling: use one fresh worker at a time with explicit file ownership; reviewers inspect the current files and file-based reports. Do not fabricate commits, HEADs, or Git diff evidence.
- Review-package ruling: the standard Git review-package helper cannot run here; each task will use an explicit review note listing the task brief, report, changed paths, and verification output.

## Preflight interface scan

| Pair | Shared surface | Ruling |
| --- | --- | --- |
| Task 1 / Task 2 | `apps/web/src/index.css` | Task 1 establishes semantic color and motion roles first; Task 2 consumes them. Sequential execution avoids conflict. |
| Task 1 / Task 3 | `apps/web/src/index.css` | Task 1 owns the token contract; Task 3 may extend selectors after the contract is present. |
| Task 1 / Task 4 | `apps/web/src/index.css` | Task 1 owns motion variables; Task 4 consumes the shared duration contract. |
| Task 2 / Task 3 | `SidebarChrome.tsx`, `index.css` | Task 2 owns mark/header/stage default; Task 3 owns navigation hierarchy and data attributes. Execute in order. |
| Task 3 / Task 4 | `SettingsSidebarNav.tsx`, `index.css` | Task 3 establishes stable nav structure before page transition integration. |
| Task 1 self-consistency | `runeMotion.ts` and test | Exact exported durations and reduced-motion helper are specified by the plan. |
| Task 2 self-consistency | settings default, RuneMark, stage backdrop | Default pill/quiet chrome must preserve explicit artwork and none modes. |
| Task 3 self-consistency | sidebar data attributes and tests | Structural hooks must not change sorting, shelves, drag order, shortcuts, or selection. |
| Task 4 self-consistency | transition component and route integration | Transition keys and reduced-motion behavior must be covered before broad verification. |
| Task 5 gate | focused tests/typecheck/build/runtime | Read-only gate after the implementation tasks; no concurrent edits. |

## Task status

- [x] Task 1 — Add the RUNE motion and visual-language contract
- [ ] Task 2 — Make quiet RUNE chrome the default
- [ ] Task 3 — Redesign the sidebar hierarchy without changing behavior
- [ ] Task 4 — Add page transitions and verify the foundation slice

## Execution notes

- The mobile surface is out of scope and must not be edited.
- The existing web dev server is already running on the worktree-isolated `.t3` state; workers must not start or stop a server.

## Completed task records

- Task 1: complete (no Git commit available, review approved; direct focused test 2/2 and web build passed)
- Task 1: fix round 1/5 (typecheck import corrected; scoped re-review addressed, no new breakage)
- Task 1 verification note: the wrapper suite still reports one stale branding assertion in `apps/web/src/components/ServerUpdateAction.test.tsx` (`t3@` expected vs `RUNE@` runtime); carry this into the final verification review.
- Ruling: extend Task 2 fix scope to `apps/web/src/hooks/useSettings.ts` and `useSettings.test.ts` — the reviewer identified the pre-hydration resolver as the load-bearing default-presentation seam, and updating its test is required to preserve the new pill default; cost if wrong is a small cross-file hook change that can be reverted without affecting persisted explicit modes.
- Task 2: fix round 1/5 (pre-hydration default pill corrected; scoped re-review addressed, no new breakage)
- Task 2: complete (no Git commit available, fix-round review passed; focused suite 68/68 and web typecheck passed)
- Task 3: fix round 1/5 (snoozed hierarchy and shelf motion corrected; scoped re-review addressed both findings, no new breakage)
- Task 3: complete (no Git commit available, review accepted; focused sidebar tests 116/116 and web typecheck passed)
- Ruling: extend Task 4 fix scope to the actual shared workspace body/layout call site and its route tests — the review proved that header/sidebar markers are not body integration, so settings-only transitions would leave chat, project, usage, and map surfaces without the requested motion; cost if wrong is a bounded shell integration across the shared workspace seam.
- Task 4: fix round 1/5 (workspace body seam added, render-phase resets removed, dynamic tests added; focused re-verification passed inline)
- Task 4: complete (inline review accepted; focused foundation suite 159/159, web typecheck passed, web build passed)
- Foundation gate: PASS — current web/desktop shell foundation is typecheckable and production-buildable; full suite's stale RUNE branding assertion was updated and included in the focused pass.
- Ruling: repair the Task 1 test import before accepting Task 2 — the new test must follow the existing `vite-plus/test` convention because Task 2's required typecheck exposed `vitest` type resolution failure; cost if wrong is one small follow-up edit to the already-approved foundation slice.
