# RUNE2 Release Acceptance Matrix

Updated 2026-08-29 against `main` after the workspace viewer merge (`993a568`).

This matrix separates deterministic source/test evidence from integration and
manual release evidence. `Pass` in Unit does not mean the product is release
ready when a runtime, packaging, or manual column remains open.

| Acceptance row | Unit | Integration | Manual desktop | Packaged | Performance | Accessibility | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider routing | Pass | Open | Not run | N/A | Open | Open | Unit proven | `packages/contracts/src/provider.test.ts`, `providerInstance.test.ts`, `apps/server/src/provider/HarnessModelRoutePlanner.test.ts` |
| RUNE Native | Partial | Open | Not run | Open | Open | Open | Runtime gate open | Native driver/source paths exist; live provider execution still needs proof |
| Cross-harness model bridge | Pass | Open | Not run | N/A | Open | Open | Unit proven | `HarnessModelRoutePlanner.test.ts`, `ModelBridgeHealth.test.ts` |
| Multi-account | Pass | Open | Not run | N/A | Open | Open | Unit proven | `packages/contracts/src/providerInstance.test.ts` |
| Antigravity fallback | Pass | Open | Not run | N/A | Open | Open | Unit proven; adapter environment gate open | `antigravityProtocol.test.ts` (8), `AntigravityProvider.test.ts` (7); adapter suite hung in this environment |
| Inline / grillme | Pass | Open | Not run | N/A | Open | Open | Unit proven | `packages/shared/src/composerTrigger.test.ts`, `apps/web/src/composer-logic.test.ts` |
| `/goal` | Pass | Open | Not run | N/A | Open | Open | Unit proven | `packages/shared/src/composerGoal.test.ts`, `apps/web/src/composerGoal.test.ts` |
| Sent-message edit/fork/rewind | Pass | Open | Not run | N/A | Open | Open | Policy proven; UI gate open | `historicalMutationPolicy.test.ts`, `ChatView.logic.test.ts` |
| Windows command reliability | Pass | Open | Not run | N/A | Open | Open | Unit proven | `CommandIntentPolicy.test.ts`, `CommandRecoveryPolicy.test.ts` |
| Ask Sheet | Pass | Open | Not run | N/A | Open | Open | Logic/render contract proven; integrated gate open | `ComposerPendingUserInputPanel.test.tsx` (2) |
| Tasks | Pass | Open | Not run | N/A | Open | Open | Unit proven | `taskWorkrail.logic.test.ts`, `chatTasksMotion.test.ts` |
| Activity receipts | Pass | Open | Not run | N/A | Open | Open | Unit proven | `packages/shared/src/agentActivity.test.ts` |
| Agent Dock | Pass | Open | Not run | N/A | Open | Open | Unit proven; fleet gate open | `agentDock.logic.test.ts`, `agentChatLogic.test.ts`, `subagentRuntime.test.ts` |
| Handoff | Pass | Open | Not run | N/A | Open | Open | Contract and surface logic proven | `packages/contracts/src/handoff.test.ts`, `handoffSurface.logic.test.ts` |
| Pocket 100 threads | Pass | Open | Not run | N/A | Partial | Open | Projection proven; scale measurement open | `pocketProjection.test.ts`, `pocketProjection.viewState.test.ts`, `pocketWorkspace.logic.test.ts` |
| File create/rename | Pass | Pass | Not run | N/A | Open | Open | Focused mutation and inline UX proven | `WorkspaceFileSystem.mutations.test.ts` (4), `fileTreeInlineEdit.test.ts` |
| Viewer image/SVG/video/PDF | Pass | Open | Not run | N/A | Open | Open | Routing/metadata proven; browser render gate open | `viewerDescriptor.test.ts`, `viewerRegistry.test.tsx`, `viewerShell.logic.test.ts` |
| Smart file/PR references | Pass | Open | Not run | N/A | Open | Open | Classification proven; click-path gate open | `apps/web/src/smartReference.test.ts` |
| Skill install/use | Pass | Open | Not run | N/A | Open | Open | Unit proven | `providerSkills.test.ts`, `skillsWorkspace.logic.test.ts`, `marketplaceRegistry.test.ts`, `marketplaceInstaller.test.ts` |
| Usage 1h/custom | Pass | Open | Not run | N/A | Open | Open | Model/page logic proven; live data gate open | `usageIntelligence.test.ts`, `UsageProviderChart.test.ts`, `UsagePage.test.tsx` |
| Desktop installed startup | Pass | Open | Not run | Pass previously | Open | Open | Startup state proven; current packaged rerun open | `apps/desktop/src/app/DesktopStartupState.test.ts`, prior desktop pack evidence |

## Current focused evidence

- Cross-surface smoke set: 27 suites, 246 tests passed.
- Composer/goal/mutation/skills/workrail set: 11 suites, 99 tests passed.
- Viewer/explorer set: 7 suites, 38 tests passed.
- Workspace mutation/entry checks: 2 suites, 36 tests passed.
- `git diff --check`: passed on every committed slice.

## Known verification boundary

The checkout does not currently contain a complete installable dependency tree.
The web typecheck cannot find `tsgo`; the web build cannot resolve several Vite
plugins; React render suites can fail before test execution when packages such
as `react-dom/server` or `lucide-react` are absent. `vp i` was attempted in the
isolated worktree but stopped at workspace package mismatch and registry
retry/network failures. These are environment gates, not release evidence.

No browser/manual desktop pass is claimed in this document.
