---
task_id: T06
title: ASK → SPEC → PLAN → BUILD → REVIEW operating system
status: PARTIAL_WITH_EVIDENCE
depends_on: [T00, T01, T04, T05]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T06 — ASK → SPEC → PLAN → BUILD → REVIEW operating system

## Purpose

Implement provider-neutral role binding, Guided/Deep planning, durable specs/decision ledgers, vertical task DAGs, independent critics, deterministic orchestration, and cross-provider workers.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master Plan/Spec sections 132–158 plus Goal/command foundations 33–36.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 33. `/goal` must be a RUNE-native primitive

Build a provider-neutral Goal object owned by RUNE.

Conceptual:

```ts
interface ThreadGoal {
  id: GoalId;
  threadId: ThreadId;
  objective: string;
  status:
    | "active"
    | "paused"
    | "completed"
    | "cancelled";
  createdAt: string;
  updatedAt: string;
}
```

Map providers with native goal APIs onto it where useful.

For providers without one, RUNE injects/maintains goal context itself.

Do not make `/goal` Codex-only.

---

---

# 34. Goal composer UX

Commands:

```text
/goal <objective>
/goal
```

`/goal` without text should open/manage the current goal.

Also support actions equivalent to:

```text
inspect
update
pause
resume
complete
clear/cancel
```

Do not force all of those to be slash syntax if the UI can present them better.

When active, show a compact goal chip/strip **as part of the composer**:

```text
Goal · Finish provider settings architecture
```

Click it to inspect/edit/status/complete.

The model/runtime should know the active goal.

No extra model request is needed just to render goal state.

---

---

# 35. Build one canonical slash-command registry

Current built-ins are too small and provider commands/skills are fragmented.

Create one command registry that merges:

```text
RUNE built-in commands
provider-supported commands
explicit skills
project actions where appropriate
```

with:

```text
stable ID
name
aliases
description
source
availability predicate
execution handler
icon
```

Do not hard-code lists independently in multiple components.

---

---

# 36. Minimum useful RUNE commands

Do not blindly copy Cursor, but RUNE should at least evaluate/implement meaningful native equivalents for:

```text
/model
/plan
/default or /build
/goal
/ask
/debug
/review
/agents
/handoff
/trace
/skills
/resume
/fork
/summarize or /compact
```

Only show commands that really work in the current context.

Provider commands remain discoverable and labeled as provider-specific.

No dead slash commands.

---

---

# 132. RUNE PLAN / SPEC MODE — provider-neutral planning operating system

This is a flagship RUNE subsystem.

Do NOT implement Plan Mode as:

```text
same agent
→ writes markdown checklist
→ same agent immediately executes it
```

RUNE owns the planning lifecycle.

Planner, researcher, critic, orchestrator, executor, reviewer, and verifier are ROLES.

A role may be bound independently to any:

```text
harness
provider instance
service connection
model
effort level
skill profile
workspace policy
```

The model/harness that creates a plan must NOT be required to execute it.

Canonical example:

```text
Planner
RUNE Native
GPT-5.6 Sol · High

Plan Critic
Codex
GPT-5.6 Sol · XHigh

Default Workers
RUNE Native
GPT-5.6 Luna · High

Hard-task Workers
OpenRouter
GPT-5.6 Luna · XHigh

Frontend specialist
Claude Code
chosen service instance/model

Reviewer
different fresh worker/provider

Verifier
deterministic tools first
model only where useful
```

This separation is an architectural invariant.

---

---

# 133. User-facing planning lifecycle

Keep the product understandable:

```text
ASK
SPEC
PLAN
BUILD
REVIEW
```

These are lifecycle stages, not necessarily separate pages.

The primary composer may expose execution intent such as:

```text
Default
Plan
Ask
Review
```

Inside Plan, planning depth is:

```text
Quick
Guided
Deep / Team
Discovery Map
```

Recommended default:

```text
Guided
```

RUNE may recommend escalation when complexity/risk warrants it, but must never silently turn a tiny task into a multi-agent ceremony.

---

---

# 134. ASK — native RUNE Grill

The ASK stage exists to extract decisions from the user's head without making the user answer facts RUNE can discover itself.

Core rule:

> **Facts are RUNE's job to investigate. Decisions belong to the user.**

Before asking:

```text
search repository
inspect current architecture
read relevant docs/specs
inspect provider capabilities
resolve terminology
```

Only ask unresolved material decisions.

Use RUNE's canonical structured composer asker:

```text
Question 2 of 5

How should provider instances inherit credentials?

● Isolated per instance
  Recommended — prevents cross-instance leakage

○ Inherit harness native account

○ Hybrid

[Custom answer]

Back              Next
```

Do NOT dump numbered Q1/Q2/Q3 questionnaires into assistant prose.

Support:

```text
/grill
/grill-me
$grill-me
/ask
natural language "grill this plan"
```

All map to one native workflow.

---

---

# 135. Grill decision graph

The Grill engine maintains a dependency graph of unresolved decisions.

Example:

```text
Connection ownership
        ↓
Instance isolation
        ↓
Credential inheritance
        ↓
Subagent override policy
```

Ask prerequisite questions first.

Independent questions may be batched into a paginated native asker.

Dependent questions wait for prior answers.

Every settled decision becomes a structured Decision Ledger entry:

```ts
Decision {
  id
  question
  answer
  rationale
  source: "user" | "repository" | "policy"
  confidence
  decidedAt
}
```

Do not repeatedly ask the same resolved decision during Spec/Plan.

---

---

# 136. SPEC — turn aligned intent into a durable artifact

SPEC begins after enough alignment exists.

Do not restart the interview.

Produce a persistent editable specification containing:

```text
Goal
Context
User experience
Functional requirements
Non-functional requirements
Architecture constraints
Terminology
Decisions / ADRs
Non-goals
Failure/recovery behavior
Performance requirements
Security/privacy constraints
Acceptance criteria
Verification strategy
Open assumptions
```

RUNE stores:

```text
Requirement Ledger
Decision Ledger
Glossary
Constraints
Open Questions
```

as structured PlanSession state.

Markdown is an export/projection, not the only truth.

---

---

# 137. PlanSession contract

Use repository conventions, but conceptually:

```ts
interface PlanSession {
  id: PlanSessionId;
  threadId: ThreadId;
  goalId?: GoalId;

  stage:
    | "ask"
    | "spec"
    | "planning"
    | "reviewing-plan"
    | "approved"
    | "executing"
    | "reviewing-result"
    | "completed"
    | "paused"
    | "blocked";

  planningDepth:
    | "quick"
    | "guided"
    | "deep"
    | "discovery-map";

  planner: RoleBinding;
  researcherPolicy: RoleBindingPolicy;
  critic: RoleBinding | null;
  executorPolicy: RoleBindingPolicy;
  reviewerPolicy: RoleBindingPolicy;
  verifierPolicy: VerificationPolicy;

  specification: SpecificationRef | null;
  requirements: Requirement[];
  decisions: Decision[];
  glossary: GlossaryEntry[];

  tasks: PlanTask[];
  dependencyGraph: PlanDependencyGraph;

  version: number;
  approvals: PlanApproval[];
  createdAt: string;
  updatedAt: string;
}
```

Do not hardcode one provider into the PlanSession schema.

---

---

# 138. RoleBinding — core multi-provider abstraction

Planning/execution roles bind independently.

Conceptually:

```ts
interface RoleBinding {
  role:
    | "planner"
    | "researcher"
    | "critic"
    | "orchestrator"
    | "executor"
    | "reviewer"
    | "verifier";

  harnessKind:
    | "rune-native"
    | "codex"
    | "claude"
    | "cursor"
    | "opencode"
    | "antigravity"
    | string;

  providerInstanceId: ProviderInstanceId;
  modelId?: string;
  effort?: string;

  skillProfileId?: SkillProfileId;
  workspacePolicy?: "shared" | "isolated" | "read-only";

  requestBudget?: number;
}
```

This enables:

```text
Sol plans
Luna executes
Codex reviews
Claude verifies UI
```

without architectural hacks.

---

---

# 139. Quick Plan

Use for focused moderate tasks.

```text
inspect repo
→ identify goal
→ 3–8 tasks
→ map verification
→ present plan
→ approve/build
```

No Grill unless a material decision blocks correctness.

One strong model may serve planner + critic in this mode if cost/latency justify it.

---

---

# 140. Guided Plan — flagship default

```text
Repository research
        ↓
Native Grill of unresolved decisions
        ↓
Specification
        ↓
Vertical task graph
        ↓
Independent plan critic
        ↓
Planner revision
        ↓
User review
        ↓
Build
```

This is the recommended default for serious coding work.

---

---

# 141. Deep / Team Plan

Use for architecture-scale work.

Example:

```text
Lead Planner
├─ Repository Mapper
├─ Architecture Researcher
├─ UX Researcher
├─ Performance Investigator
└─ Independent Plan Critic
```

Research workers return structured findings.

The user talks to ONE lead planner.

Do not dump five agents' transcripts into the parent.

Workers use the normal child-thread architecture and remain inspectable.

---

---

# 142. Discovery Map for work too uncertain to plan honestly

When RUNE cannot yet know implementation tasks, do not fabricate a detailed plan.

Use:

```text
Destination
  ↓
Unknowns
  ↓
Investigations
  ↓
Decisions
  ↓
Validated architecture
  ↓
Implementation plan
```

Example:

```text
Destination
Best provider-instance architecture

Unknown
How Claude Code resolves gateway config?
  → inspect adapter
  → reproduce .claude override vs instance

Unknown
How provider home isolation works?
  → inspect ClaudeHome/CodexHome
  → prototype isolated config

Unknown
How worker role model slots map?
  → inspect external harness slot behavior
```

Once uncertainty drops, synthesize a normal PlanGraph.

---

---

# 143. Plan tasks are vertical tracer-bullet slices

Avoid horizontal decomposition like:

```text
Task 1 schemas
Task 2 server
Task 3 UI
Task 4 tests
```

Prefer independently demonstrable slices:

```text
TASK-01
Claude/OpenRouter instance works end-to-end
contracts + adapter + UI + runtime + test

TASK-02
Custom Gateway persists and validates
contracts + settings + spawn manifest + test

TASK-03
Per-instance model role mapping works
settings + adapter + runtime + trace + test
```

Each task terminates in observable working behavior.

---

---

# 144. PlanTask contract

Conceptually:

```ts
interface PlanTask {
  id: PlanTaskId;
  title: string;
  outcome: string;
  rationale?: string;

  requirementIds: RequirementId[];
  dependencyIds: PlanTaskId[];

  likelyFiles?: string[];
  ownershipScope?: string[];

  risk: "low" | "medium" | "high";

  executionProfile: "auto" | RoleBinding;
  workspacePolicy: "shared" | "isolated" | "read-only";

  skillIds: SkillId[];
  verification: VerificationRequirement[];

  state:
    | "pending"
    | "ready"
    | "running"
    | "blocked"
    | "completed"
    | "failed"
    | "skipped";
}
```

Tasks must be provider-neutral.

---

---

# 145. Plan dependency graph and deterministic orchestrator

The plan is a DAG.

```text
        T1 Instance schema
        /              \
       ▼                ▼
T2 Claude gateway    T3 instance UI
       \                /
        ▼              ▼
          T4 routing
              │
              ▼
         T5 verification
```

RUNE code—not an LLM polling loop—determines which tasks are runnable.

The deterministic orchestrator:

```text
reads DAG
checks dependencies
checks workspace ownership
checks provider availability
selects/creates workers
starts ready tasks
waits for structured results
unlocks downstream tasks
```

Use an LLM only for real judgment, not for deciding which already-defined DAG node comes next.

---

---

# 146. PLAN approval boundary

Plan Mode must never silently become Build Mode.

Before implementation:

```text
Plan ready

12 tasks
5 phases
4 parallelizable
17/17 requirements mapped
2 isolated worktrees

[Review plan]
[Build plan]
```

The user explicitly triggers Build unless an already-approved automation/profile says otherwise.

No code mutation in pure PLAN stage except explicitly approved investigative prototypes in isolated/scratch space.

---

---

# 147. Interactive Plan Editor

Users can:

```text
edit task
add task
delete
split
merge
reorder
add/remove dependency
change executor
change harness
change provider instance
change model
change skill profile
change workspace mode
mark manual
change verification
```

Example:

```text
TASK-04 · Fix Custom Gateway runtime

Executor
Luna High

Harness
RUNE Native

Provider instance
OpenRouter — Main

Workspace
Isolated

Review
Sol High
```

Edits update PlanSession structurally.

Do not parse markdown diffs to infer every edit.

---

---

# 148. Plan versioning

Every meaningful plan revision increments:

```text
Plan v1
Plan v2
Plan v3
```

Show semantic changes:

```text
v3

+ Added Claude gateway compatibility task
+ Added per-instance config isolation
~ TASK-04 now depends on runtime-manifest task
- Removed redundant global-provider task
```

Keep previous versions inspectable.

---

---

# 149. Independent Plan Critic

For Guided/Deep plans, use a fresh-context critic.

Critic receives:

```text
goal
spec
requirements
plan graph
selected repository facts
```

not the planner's full reasoning transcript.

Review for:

```text
missing requirements
unsupported assumptions
bad dependencies
tasks too broad
tasks too tiny
horizontal slicing
unverifiable outcomes
workspace collisions
provider incompatibility
unnecessary work
parallelization opportunities
```

Return structured findings.

Planner revises.

---

---

# 150. BUILD — tasks become real child agent threads

When execution starts:

```text
PlanSession
→ Task Scheduler
→ Worker Router
→ child agent threads
```

Each executed task becomes a REAL child thread beneath the plan parent/root thread.

Example:

```text
Implement Provider Architecture
│
├─ ✓ TASK-01 Instance runtime manifest
│    Luna High
│
├─ ● TASK-02 Claude/OpenRouter bridge
│    Luna XHigh
│
├─ ● TASK-03 Instance manager UI
│    Claude Code
│
└─ ○ TASK-04 Verification
```

Click behaves exactly like normal RUNE child threads:

```text
inline collaborator
→ right-panel live child
→ full child thread from sidebar
```

No separate plan-worker log UI.

---

---

# 151. Planner remains architect during BUILD

Do not discard the planner after approval.

Planner/architect receives structured escalations:

```text
assumption invalid
dependency missing
scope conflict
new architectural fact
verification requires plan amendment
```

Example:

```text
TASK-04 BLOCKED

Assumption invalid:
Claude service mode is not the only source of runtime config.

Evidence:
global CLAUDE_CONFIG_DIR + environment inherited.

Recommended:
add instance runtime-isolation task.
```

Minor implementation details can be resolved autonomously.

Major scope/product changes become `Needs you` through the structured asker.

---

---

# 152. REVIEW separates spec compliance from code quality

Use separate axes:

```text
Spec Review
Did implementation satisfy requirements?

Code Review
Is implementation maintainable/correct?

Verification
Do tests/runtime evidence prove it?
```

Optionally activate relevant specialist reviews:

```text
security
performance
design
accessibility
```

only when the task needs them.

---

---

# 153. Planning skill pipeline

Do not concatenate dozens of skills into the planner prompt.

RUNE selects a pipeline.

Guided Plan example:

```text
Understanding
→ native Grill / brainstorming principles

Specification
→ to-spec principles

Task slicing
→ tracer-bullet / to-tickets principles

Implementation
→ TDD / systematic debugging where relevant

Review
→ spec review + code review

Completion
→ verification-before-completion
```

Study useful current skill ecosystems such as:

```text
mattpocock/skills
superpowers
Caveman
ECC
Impeccable
no-ai-slop
APEX
```

Normalize useful principles into RUNE's native Skill Registry.

Respect licenses/attribution when directly adapting content.

Progressively load only activated skill bodies.

---

---

# 154. Plan Mode composer UX

Default view remains simple:

```text
┌──────────────────────────────────────────────┐
│ PLAN                                         │
│                                              │
│ Describe what you want...                    │
│                                              │
├──────────────────────────────────────────────┤
│ Guided Plan                                  │
│ Planner       Sol · High                     │
│ Executors     Auto · Luna High default       │
│ Review        Independent                    │
│ Skills        Grill · Spec · Verify          │
├──────────────────────────────────────────────┤
│                           Start planning →    │
└──────────────────────────────────────────────┘
```

Advanced settings opens:

```text
planning depth
planner role binding
research routing
worker routing
critic
review
worktree policy
cost/latency policy
question policy
skill profile
```

Do not show all of this by default.

---

---

# 155. Plan live activity

Plan Mode uses the SAME Semantic Activity system.

Example:

```text
Planning · 1m 34s

✓ Mapped provider architecture
✓ Inspected 14 relevant files

● Resolving provider-instance ownership
  Found 2 decisions that need confirmation

○ Draft specification
○ Build task graph
○ Independent plan review
```

Then:

```text
✓ 4 decisions clarified
● Writing specification

Requirements       17
Decisions           5
Open blockers       0
```

Then:

```text
● Building execution graph

12 tasks
4 parallel groups
2 isolated worktrees
```

Never leave Plan Mode on `Thinking` for minutes.

---

---

# 156. Plan completeness gate

Before Build is recommended:

```text
Requirements mapped        17/17
Decisions settled            5/5
Unknown blockers             0
Verification mapped         12/12
```

Do not fake certainty.

If unresolved:

```text
2 assumptions remain
```

The user may still force Build after explicit acknowledgement.

---

---

# 157. Plan persistence

PlanSession survives:

```text
thread switch
reload
desktop restart
remote/mobile re-entry
```

where project persistence supports it.

User can later:

```text
Continue planning
Build remaining
Pause execution
Replan
Fork plan
Review result
```

Export is optional:

```text
Markdown
JSON
tickets/issues later
```

but internal structured state is canonical.

---

---

# 158. Plan Mode required tests

At minimum:

```text
1. planner and executor can use different harnesses.
2. planner and executor can use different provider instances.
3. planner Sol can create plan executed by Luna.
4. plan tasks remain provider-neutral.
5. Guided mode invokes native structured Grill only for real decisions.
6. Spec does not re-ask settled Grill decisions.
7. vertical task slicing is preserved by fixtures.
8. Plan critic uses fresh context.
9. Build does not begin without approval.
10. DAG unlocks only satisfied dependencies.
11. independent tasks can run concurrently.
12. overlapping writers receive isolated worktrees or serialization.
13. every executing task creates a real child thread.
14. child task thread inherits correct goal/spec/task contract.
15. child can use different provider/harness from planner.
16. planner can amend plan after structured escalation.
17. plan version increments and semantic diff is correct.
18. user edits task executor/model/workspace and execution respects it.
19. review separates spec compliance from code quality.
20. PlanSession survives reload/restart.
21. tiny Quick Plan does not spawn unnecessary agents.
22. Discovery Map does not invent implementation tasks before uncertainty is resolved.
```

---
