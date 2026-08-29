# RUNE2 Implementation Recovery Ledger

> Baseline captured from the isolated `rune2/implementation` worktree at commit `3d913ee7b83e41b532c4f2a25ea1ff65529852db`.

## Repository topology

| Worktree | Branch | HEAD | Clean | Recovery finding |
|---|---|---|---|---|
| `D:/Apps/Rune` | `main` | `3d913ee7b83e41b532c4f2a25ea1ff65529852db` | yes at inspection | live parent checkout; preserved |
| `D:/Apps/Rune-rune2` | `rune2/implementation` | `3d913ee7b83e41b532c4f2a25ea1ff65529852db` | yes at inspection | active isolated implementation worktree |

No other local worktrees or branches were present at the recovery inspection. The only remote branch was `origin/main` at `262b3face419a106311291649dcda71b9be8b0af`.

## Requirement ledger

| Requirement family | Current source of truth | Candidate branch/commit | Decision | Verification |
|---|---|---|---|---|
| Provider control plane and settings | `apps/web`, `apps/server`, `packages/contracts`, `packages/shared` plus `02-provider-control-plane-and-settings.md` | none | PARTIAL: inspect and complete current architecture | focused provider contract/runtime tests |
| RUNE Native and harness runtime | current provider adapters and native loop; `03-rune-native-and-harness-runtime.md` | none | PARTIAL: preserve typed runtime and repair proven gaps | server runtime tests and native acceptance |
| Automatic harness/model bridge | `03A-automatic-harness-model-bridge.md`, existing provider routing code | none | KEEP current foundations; add route planner only where contracts prove need | route planner tests and provider matrix |
| Structured command execution | existing `RuneCommandOperation` and command adapters; `03B-command-execution-reliability.md` | none | KEEP foundation; complete policy/presentation and failure semantics | focused command tests |
| Brand shell and motion | canonical brand registry plus current web shell | none | PARTIAL: consolidate shared seams | focused UI tests and static accessibility checks |
| Pockets/workspace continuity | current Pocket contracts/store/sidebar | none | KEEP and complete projection/scale behavior | store tests and integrated client acceptance |
| Activity and change receipts | current activity/diff derivation | none | KEEP and complete semantic receipt presentation | derivation tests and client acceptance |
| Tasks/workrail | current `TasksPanel` and related client state | none | PARTIAL: one presentation model and structural progress | focused component tests |
| Workspace control and handoff | environment panel, branch toolbar, Git actions | none | PARTIAL: connect existing actions to one control center | action tests and integrated acceptance |
| Agent Dock and child threads | current `AgentsPanel`, child fold, and `AgentChatPanel` | none | PARTIAL: make lifecycle and escalation authoritative | server/client lifecycle tests |
| Composer, asker, commands, goal | current composer trigger/goal logic | none | PARTIAL: unify parser and keyboard-safe ask sheet | parser and component tests |
| Sent-message mutation | `packages/shared/src/historicalMutationPolicy.ts` and current `ChatView` | none | KEEP policy; complete UI/runtime wiring | mutation policy and integration tests |
| File Explorer inline UX | current File Explorer/tree and workspace file identity | none | KEEP canonical identity; replace modal-only edits | focused tree/action tests |
| Universal viewer and attachments | viewer registry and existing viewers | none | KEEP registry; complete shared shell/transport | viewer registry and client tests |
| Smart references | `WorkspaceFileRef`, asset transport, viewer registry; `12A-smart-references-links-and-artifacts.md` | none | KEEP identity primitives; add typed classification/actions | classifier/action tests |
| Skills/plugins marketplace | current provider skill surfaces and repository links | none | PARTIAL: separate skills from installable plugins | identity/install tests |
| Usage intelligence | existing Usage page | none | PARTIAL: derive metrics from canonical receipts | data/selector tests |
| Desktop startup/release | existing startup splash and desktop smoke foundations | none | PARTIAL: reproduce installed failure before changing startup | desktop smoke and packaged artifact checks |
| Integrated dogfood | `16-integrated-verification-dogfood.md` | none | PENDING all prior gates | full acceptance matrix with evidence |

## Recovery rule

Historical snapshots and stale handoff documents are orientation only. No recovery merge is authorized from them because no unique local feature branch was found. Current `main` and its tests remain authoritative.
