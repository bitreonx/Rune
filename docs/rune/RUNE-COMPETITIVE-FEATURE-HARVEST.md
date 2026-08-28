# RUNE competitive feature harvest

Status: evidence-backed product research and design input; not a feature-parity backlog.

Research date: 2026-08-28

This document records interaction principles that are useful to RUNE, the smallest
provider-neutral interpretation of each principle, and the evidence available in
the current checkout. Competitor behavior is treated as interaction evidence only;
it is not an endorsement of a competitor's architecture or a claim that RUNE is
ahead without a matching runtime or UX proof.

## Decision vocabulary

- **ADOPT** — the principle belongs in RUNE's product direction and is already
  implemented or has a clearly bounded RUNE seam.
- **ADAPT** — the problem is real, but RUNE should express it through an existing
  RUNE primitive.
- **RUNE_ALREADY_BETTER** — the current RUNE architecture already has the more
  general or inspectable form; preserve the evidence and avoid copying the surface.
- **REJECT_AS_FILLER** — the apparent feature adds noise, duplication, or manual
  configuration without a demonstrated user problem.
- **DEFER** — useful, but it needs a product or runtime contract that T16 does not
  authorize us to invent.

## Current product evidence

The current checkout already contains these reusable seams:

| RUNE seam | Evidence in this checkout | Harvest implication |
| --- | --- | --- |
| Provider-neutral routing | `packages/contracts/src/providerInstance.ts`, `packages/contracts/src/orchestration.ts`, and `apps/server/src/provider/Layers/ProviderService.ts` | Provider-specific capability differences belong behind an instance/adapter boundary. |
| Durable turns, activities, and child attribution | `packages/contracts/src/orchestration.ts`, `packages/contracts/src/providerRuntime.ts`, and `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts` | A collaborator or background result must be an attributable RUNE event, not a copied transcript. |
| Isolated work and review | `packages/contracts/src/environment.ts`, `packages/contracts/src/orchestration.ts`, `apps/server/src/checkpointing/CheckpointDiffQuery.ts`, and `apps/server/src/orchestration/chatDiffAggregate.ts` | Parallel work should use worktree/checkpoint/diff primitives and explicit ownership. |
| Verification evidence | `apps/server/src/provider/Layers/ApiHarness.ts` and its focused test | A successful tool call is not proof; verification must be explicit and can become stale after mutation. |
| Background and remote-aware policy | `packages/contracts/src/background.ts` | Future background triggers must carry scope and lifecycle state rather than assume a foreground composer. |
| Cross-thread inspectable context | `packages/contracts/src/crossThread.ts` | Reuse bounded claims and source references for future handoff/security context; do not duplicate a second context store. |

These are source observations, not a release certificate. Browser, mobile,
packaged-app, provider-credential, and live remote behavior still require their
own verification.

## Harvest matrix

### Codex

| Feature | User problem solved | Interaction model | Architecture implication | Current RUNE equivalent | RUNE status | Decision | RUNE improvement | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Multiple independent agent threads | Long tasks compete for one conversation and context is lost when switching | Project-organized threads with in-thread review | Durable thread identity, scoped state, and a clear parent/child relation | Orchestration threads, provider task/agent attribution, cross-thread capsules | Partial: current source has durable threads and agent attribution; complete cross-surface child navigation is broader than T16 | ADAPT | Keep one RUNE thread identity and expose semantic state/diff/trace as projections; do not copy Codex layout | `packages/contracts/src/orchestration.ts`; `apps/server/src/provider/Layers/ProviderService.ts`; child-thread tests under `apps/server/src/provider/Layers/` |
| Worktrees for parallel changes | Parallel agents overwrite one checkout | Each agent works in an isolated copy and changes are reviewed before adoption | Worktree identity must be part of execution context and review | Thread environment/worktree fields and checkpoint/diff services | Partial | ADAPT | Require explicit isolation for parallel writers and keep workspace Git state distinct from chat ownership | `packages/contracts/src/environment.ts`; `apps/server/src/checkpointing/CheckpointDiffQuery.ts`; `apps/server/src/orchestration/chatDiffAggregate.ts` |
| Skills and reusable workflows | Repeating a detailed operating procedure is expensive and inconsistent | Discoverable skill selected explicitly or by task | Provider-neutral discovery and provider-specific execution bridge | Skills are a separate T07 concern; provider drivers already own runtime details | Planned/adjacent | ADAPT | Keep skill content as source truth and activation/provider execution as registry concerns | `docs/internals/specs/Rune/tasks/T07-skills-registry-and-mattpocock-pack.md`; current provider driver files |
| Automations/background work | Repetitive maintenance needs a durable trigger and review point | Scheduled work returns a result to a review queue | Turns, goals, actions, agents, handoffs, and results need durable IDs | Background scope/policy contracts exist; no T16 scheduler change | Partial | DEFER | Preserve background-compatible IDs and scope without adding a security scheduler or new automation product here | `packages/contracts/src/background.ts`; `docs/internals/specs/Rune/tasks/T11-actions-and-learned-actions.md` |
| Secure-by-default permissions | Agents can make unsafe filesystem or network changes unexpectedly | Sandbox/approval policy is explicit and escalates at a boundary | Policy must be provider-neutral while adapter capabilities remain truthful | `ProviderSandboxMode`, `ProviderApprovalPolicy`, and provider request kinds | VERIFIED at contract seam; live provider policy remains separate | RUNE_ALREADY_BETTER | Keep policy in RUNE's execution contract and never infer approval from a provider label | `packages/contracts/src/orchestration.ts`; provider adapter tests |

### Cursor

| Feature | User problem solved | Interaction model | Architecture implication | Current RUNE equivalent | RUNE status | Decision | RUNE improvement | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Clean-context specialized subagents | A large parent context makes focused subtasks slower and less reliable | Specialist workers receive a bounded objective/context and return a result | Child context must be scoped and result attribution durable | Provider runtime agent IDs, parent-agent IDs, cross-thread capsules | Partial | ADAPT | Use real child RUNE threads plus bounded capsules; never make a hidden provider task the conversation identity | `packages/contracts/src/crossThread.ts`; `packages/contracts/src/providerRuntime.ts`; `apps/server/src/provider/agentChat.ts` |
| Foreground/background multitasking | Users need to continue working while another task runs | Independent workers run concurrently and remain inspectable | Queue, steer, multitask, and child delegation must remain distinct intents | Orchestration commands and background policy; child runtime support exists in provider seams | Partial | ADAPT | Add no `/multitask` copy until queue/steer/child lifecycle acceptance is proven | `packages/contracts/src/orchestration.ts`; `packages/contracts/src/background.ts`; `docs/internals/specs/Rune/tasks/T04-execution-controller-queue-steer-edit.md` |
| Steering at a safe boundary | An interruption in the middle of a tool action can corrupt work | Follow-up waits until the provider reaches a safe boundary | Adapter must distinguish steer, pause, stop, and recovery | Turn interrupt/request contracts and adapter methods | Partial | ADAPT | Preserve intent-specific commands and expose the resulting receipt; do not implement a second provider control plane | `packages/contracts/src/orchestration.ts`; `apps/server/src/provider/Layers/ProviderService.ts` |
| Goal / long-lived objective | A session can lose its purpose across turns | A goal persists while work iterates toward it | Goal is durable thread state, not a repeated prompt or provider-only feature | Goal is specified by T16/T04; current source must be verified before claiming complete | Open | DEFER | Reuse the canonical RUNE goal contract when its owning task lands; do not add a T16-only duplicate | `docs/internals/specs/Rune/tasks/T04-execution-controller-queue-steer-edit.md`; `docs/internals/specs/Rune/tasks/T06-plan-spec-and-orchestration.md` |
| Browser/design feedback | Text-only reports make visual bugs hard to target | Select an element or inspect a live preview and attach concrete context | Browser context must be an inspectable Environment artifact with privacy boundaries | Environment/preview contracts and browser-related task scope exist | Partial | ADAPT | Reuse Environment and normal RUNE trace/diff surfaces; do not build a second browser | `packages/contracts/src/preview.ts`; `packages/contracts/src/environment.ts`; `docs/internals/specs/Rune/tasks/T12-environment-files-panels-and-actions-surface.md` |

### Synara

| Feature | User problem solved | Interaction model | Architecture implication | Current RUNE equivalent | RUNE status | Decision | RUNE improvement | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| One workspace around many runtimes | Users otherwise switch tools to inspect files, terminals, previews, and diffs | Project/thread/provider/session/workspace tools share one task surface | The control plane must be provider-neutral while provider auth stays local to each runtime | RUNE project, thread, provider instance, Environment, diff, and terminal contracts | Strong architectural match | RUNE_ALREADY_BETTER | Preserve one canonical task model and avoid provider-specific duplicate panels | `packages/contracts/src/project.ts`; `packages/contracts/src/providerInstance.ts`; `packages/contracts/src/environment.ts` |
| Handoffs and long-running Studio work | Work must survive a provider change or a later continuation | A task/result can be resumed or handed to another runtime | Handoff needs durable source/target IDs, scope, and result evidence | Provider instance routing and cross-thread capsules; handoff is owned by adjacent tasks | Partial | ADAPT | Use the existing thread/result/trace vocabulary and retain provider identity as metadata, not as the task identity | `packages/contracts/src/crossThread.ts`; `apps/server/src/provider/Layers/ProviderService.ts`; `docs/internals/specs/Rune/tasks/T08-real-child-agent-threads.md` |
| Visible setup and restore state | Workspace preparation failures otherwise look like a frozen agent | Setup steps and recovery states are visible in the task surface | Setup is an event/state projection, not a provider-specific toast | Project setup and runtime recovery tests exist | Partial | ADAPT | Project setup, provider health, and restore should report actionable semantic states through the normal activity/trace seam | `apps/server/src/project/ProjectSetupScriptRunner.test.ts`; `apps/server/src/serverRuntimeStartup.test.ts` |
| Outputs/artifacts surface | Long-running work can produce files that disappear in chat | Artifacts are discoverable next to the task and remain reviewable | Outputs need ownership, provenance, and privacy-aware export | File/environment and attachment contracts; no T16 artifact addition | Partial | DEFER | Generalize existing result/evidence references only when a concrete contract requires it | `packages/contracts/src/filesystem.ts`; `packages/contracts/src/assets.ts`; `apps/server/src/assets/AssetAccess.ts` |

### T3 Code

| Feature | User problem solved | Interaction model | Architecture implication | Current RUNE equivalent | RUNE status | Decision | RUNE improvement | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Open BYO-subscription control plane | Users want one interface without surrendering provider accounts or credentials | Local provider CLIs are orchestrated by a web/desktop/mobile control surface | Credentials remain with the provider runtime; the control plane carries typed, non-secret state | Provider instances, adapters, server/web/mobile surfaces | Core direction | ADOPT | Keep RUNE Native and external adapters behind the same capability and trace model | `packages/contracts/src/providerInstance.ts`; `apps/server/src/provider/Services/ProviderAdapter.ts`; `docs/internals/specs/Rune/tasks/T01-provider-instances-and-runtime-routing.md` |
| Remote/mobile supervision | Users need to inspect or steer work away from the host machine | A remote client attaches to a running environment and sees progress/diffs | Connection, scope, liveness, and secret handling must be explicit | Remote access, background leases, and client activity contracts | Strong architectural match | RUNE_ALREADY_BETTER | Treat mobile as a projection of the same thread state; do not fork execution semantics | `packages/contracts/src/remoteAccess.ts`; `packages/contracts/src/background.ts`; `packages/contracts/src/environment.ts` |
| Per-thread diff review and delivery | Users need confidence before committing or opening a PR | Review changes inline, then perform an explicit delivery action | Diff target, branch/worktree, and ownership cannot be inferred from raw dirtiness | Checkpoint/diff/review contracts and server queries | Strong architectural match | RUNE_ALREADY_BETTER | Preserve checkpoint evidence and label workspace-level Git views separately from thread ownership | `packages/contracts/src/review.ts`; `packages/contracts/src/orchestration.ts`; `apps/server/src/checkpointing/CheckpointDiffQuery.ts` |

### TRAE / TRAE Work

| Feature | User problem solved | Interaction model | Architecture implication | Current RUNE equivalent | RUNE status | Decision | RUNE improvement | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| One control spectrum from focused coding to autonomous work | Separate products/modes cause context loss | The same workspace switches execution profile while retaining project context | Mode is a policy/profile over one task model, not a second transcript system | Runtime mode, interaction mode, provider instance, and Environment contracts | Partial | ADAPT | Keep one RUNE chat/task architecture and make profile/capability differences explicit | `packages/contracts/src/orchestration.ts`; `packages/contracts/src/providerInstance.ts`; `docs/internals/specs/Rune/tasks/T06-plan-spec-and-orchestration.md` |
| Multi-agent collaboration and specialist agents | Complex work benefits from parallel expertise | Spawn specialized workers and review their results | Child identity, isolation, lifecycle, and result adoption are first-class | Agent attribution and provider child runtime seams | Partial | ADAPT | Use durable child threads and typed result receipts; do not add a TRAE-shaped mode split | `apps/server/src/provider/Layers/ProviderService.ts`; `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`; `docs/internals/specs/Rune/tasks/T08-real-child-agent-threads.md` |
| Built-in browser element selection and feedback | A screenshot or vague URL is insufficient UI context | Select an element in a live preview and attach its DOM/visual context | Browser observations need bounded, inspectable, privacy-aware evidence | Preview/browser Environment contracts | Partial | DEFER | Reuse the existing preview and trace seams once browser verification is explicitly owned by its task | `packages/contracts/src/preview.ts`; `docs/internals/specs/Rune/tasks/T12-environment-files-panels-and-actions-surface.md` |
| Mobile progress monitoring and worktrees | Users need remote visibility without risking local changes | Monitor long-running isolated tasks from a mobile client | Remote projection must preserve worktree and task identity | Remote access/background/client activity and worktree fields | Strong architectural match | ADAPT | Keep remote clients read/control projections over the same server state and preserve isolation metadata | `packages/contracts/src/remoteAccess.ts`; `packages/contracts/src/background.ts`; `packages/contracts/src/environment.ts` |

## Rejected / not worth it

These patterns are deliberately not harvest targets unless later evidence shows a
specific user problem:

| Rejected pattern | Reason |
| --- | --- |
| Settings toggles for state RUNE can derive from the selected provider, project, or client | They add configuration drift and make the visible mode disagree with runtime truth. |
| Duplicate provider-specific panels for the same task state | They fracture the provider-neutral contract and make remote/mobile parity expensive. |
| Always-visible cost, forecast, sparkline, or status metrics | Usage belongs in an inspectable cost/trace surface; decorative metrics compete with the task. |
| Agent spawning for trivial work | Parallelism has setup, review, and context cost; use a skill or direct turn when specialization is not needed. |
| Decorative status noise, fake progress, or frozen “working” labels | Activity must describe real semantic state and receipts, including waiting, approval, failure, and recovery. |
| A separate Security shell, scanner nav item, dormant security tables, or TODO buttons | T16 reserves architecture only. Shipping an unfinished surface would create a false product promise. |
| Copying competitor branding, layouts, or product mode names | The useful unit is the interaction principle; RUNE's identity and contracts remain canonical. |

## Decisions carried into RUNE

1. **Adopt the problem, not the competitor surface.** Parallel work, provider
   portability, scoped context, inspectable review, safe boundaries, and remote
   continuation are the durable principles.
2. **Use one RUNE task model.** Chat, child work, background work, handoff,
   preview, diff, verification, and future Security should project from the same
   thread/environment/receipt primitives.
3. **Make capability truth explicit.** A provider may lack a capability; the UI
   and routing layer must not imply support because another adapter has it.
4. **Evidence beats completion language.** A tool success, model statement, or
   green provider card is not verification. Verification must be explicit and
   mutation-aware.
5. **Defer Multitask and Security product surfaces.** T16 reserves compatibility
   only; the owning tasks must prove the underlying lifecycle before adding a new
   command or navigation surface.

## Sources

Official/current product sources consulted on 2026-08-28:

- [OpenAI — Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)
- [OpenAI — Work with Codex from anywhere](https://openai.com/index/work-with-codex-from-anywhere/)
- [Cursor — Multitask, Worktrees, and Multi-root Workspaces](https://cursor.com/changelog/04-24-26)
- [Cursor — Cloud Agents and Cursor Harness Improvements](https://cursor.com/changelog/08-19-26)
- [Cursor — Subagents](https://prod.cursor.com/docs/subagents)
- [Synara documentation](https://www.trysynara.com/docs)
- [Synara source repository](https://github.com/Emanuele-web04/synara)
- [T3 Code](https://t3.codes/)
- [T3 Code installation and provider documentation](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md)
- [TRAE](https://www.trae.ai/)
- [TRAE — Introducing the New SOLO](https://www.trae.ai/blog/new_solo_beta_0331)
- [TRAE — product changelog](https://www.trae.ai/changelog)
