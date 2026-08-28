---
task_id: T16
title: Competitive feature harvest + future security architecture reservation
status: TODO
depends_on: [T00]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T16 — Competitive feature harvest + future security architecture reservation

## Purpose

Harvest the best interaction principles from Codex/Cursor/Synara/T3/TRAE without copying filler, while reserving—not implementing—the future RUNE Security architecture.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 101–131.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 101. Competitive Feature Harvest — mandatory before final implementation

Do not treat the named competitors as visual inspiration only.

Perform a **current-product feature harvest** against the latest publicly available behavior/documentation for:

```text
Codex
Cursor
Synara
T3 Code
TRAE IDE / TRAE Work
```

Use official/current sources where possible.

Do not rely only on one-year-old system prompt dumps.

Create:

```text
docs/rune/RUNE-COMPETITIVE-FEATURE-HARVEST.md
```

For every meaningful competitor capability record:

```text
product
feature
user problem solved
interaction model
architecture implication
current RUNE equivalent
RUNE status
decision
RUNE improvement
verification
```

Decision must be one of:

```text
ADOPT
ADAPT
RUNE_ALREADY_BETTER
REJECT_AS_FILLER
DEFER
```

The goal is **not feature parity**.

The goal is:

> take the useful interaction principle, remove unnecessary complexity, combine it with RUNE's strengths, and ship a better unified experience.

---

---

# 102. Product Grill — interrogate RUNE, not the user

Before coding each major subsystem, run an internal **Product Grill**.

The Grill asks:

```text
Why does this feature exist?
What user problem does it solve?
What is the minimum surface?
What does Codex do well here?
What does Cursor do well here?
What does Synara do well here?
What does T3 Code do well here?
What does TRAE do well here?
What part is filler?
What is RUNE already better at?
Can RUNE unify several competitor ideas into one simpler primitive?
What is the failure state?
What is the recovery state?
What is the performance cost?
What is the measurable acceptance gate?
```

Do not send these questions to the user.

Answer them from:

```text
repository evidence
current product behavior
competitor research
benchmarks
existing approved RUNE product decisions
```

Only invoke the native structured asker when there is a real product decision that cannot be derived or safely assumed.

The user has explicitly asked not to receive a giant questionnaire for requirements that are already decided.

---

---

# 103. Competitor principles RUNE should explicitly harvest

This section is a starting hypothesis.

Verify current behavior before implementation and update the competitive harvest document.

## 103.1 Codex — harvest

Prioritize the interaction principles behind:

```text
multi-agent command center
parallel independent threads
isolated worktrees
agent changes review inside the thread
skills
automations/background work
goal mode
steering while working
clean execution progress
mobile/remote continuation
browser/app context capture
annotations
secure-by-default approvals/sandboxing
```

RUNE should improve these through:

```text
provider independence
RUNE Native API execution
shared semantic activity
clickable child-agent threads
cross-provider handoff
turn trace
request budgets
Environment cockpit
native structured asker
```

Do not copy Codex branding or layouts.

---

## 103.2 Cursor — harvest

Prioritize:

```text
specialized subagents with isolated context
foreground/background workers
model-per-subagent selection
async / multitask decomposition
worktree isolation
multi-root workspaces
goal
steering at safe tool boundaries
skills as custom modes
checkpoint/restore concepts
agent diff review
browser/computer-use verification patterns
```

RUNE should improve them by making:

```text
subagent selection model-aware
subagent execution observable
child threads first-class
provider-neutral
handoff-capable
request-budget-aware
skills progressive rather than bloated
```

---

## 103.3 Synara — harvest

Prioritize useful control-surface ideas:

```text
Environment panel
project actions
handoff
Studio / long-running work
outputs/artifacts surface
visible worktree setup steps
provider usage visibility
reliable session restore
```

Reject settings filler where RUNE can infer the right default.

RUNE's Environment cockpit should be smarter and more contextual rather than a list of user-controlled visibility toggles.

---

## 103.4 T3 Code — harvest

Preserve the strongest origin ideas:

```text
agent harness control surface
desktop + web + mobile
remote-ready architecture
bring-your-own-subscription/provider
multiple external coding agents under one UI
open source / forkable control plane
```

RUNE should go beyond T3 Code by providing:

```text
its own native harness
semantic execution UX
native provider routing
goal/task/queue orchestration
child-agent threads
skills
context intelligence
verification
handoff
turn trace
```

Do not regress T3 Code's cross-client strengths while making RUNE more sophisticated.

---

## 103.5 TRAE — harvest

Prioritize:

```text
IDE mode ↔ autonomous agent mode
multi-agent collaboration
custom specialist agents
built-in browser as a development tool
browser element selection / edit feedback
worktree isolation
mobile progress monitoring
remote task continuation
unified project workspace
visible task progress
```

Do not copy TRAE's product split blindly.

RUNE should provide the same control spectrum through execution profiles/modes inside one coherent system.

---

---

# 104. RUNE Agent Team must be Codex-class or better

Treat this as release-critical.

A RUNE child/subagent is a REAL durable child thread with identity, parent relation, objective, context scope, provider/model, execution state, semantic activity, tasks, messages, tools, changed files, diff, approvals, structured questions, Turn Trace, and result.

It is NOT a tool call, hidden promise, one-line log, copied summary, or fake transcript.

Combine Codex's multi-thread/worktree command-center clarity, Cursor's clean-context foreground/background/isolated subagents, and RUNE's provider independence, native harness, semantic activity, handoff, and trace.

---

---

# 105. Parent chat representation — compact inline collaborators

Subagents appear inline in the parent assistant execution flow as compact LIVE collaborator rows.

```text
Agents · 3

● Vega
  Tracing provider routing                     1m 12s

● Curie
  Verifying composer pause/resume              48s

✓ Hooke
  File-browser audit complete                  2m 03s
```

Rows are clickable and show live status, elapsed time, name/role, current semantic activity, blocked/failure/approval states, and useful secondary provider/model/file details.

Do not stream child tool spam into the parent. Details are one click away.

---

---

# 106. Clicking a child opens the REAL LIVE child chat in the right panel

Non-negotiable.

Do NOT expand a frozen/full child transcript inline in the parent response.

Clicking a collaborator opens the actual child thread using the same RUNE chat architecture in the existing IDE right panel.

Wide layout keeps parent and child side by side. Medium uses a resizable overlay/sheet. Narrow uses a full-width child conversation with Back.

Parent preserves scroll, draft, and state.

The child reuses the normal timeline, semantic activity, tasks, Queue, Steer, Pause/Continue, Stop, structured asker, approvals, changed files, Diff, and Developer Trace.

Do not build a second miniature chat implementation.

---

---

# 106A. SUBAGENT = REAL CHILD THREAD — canonical RUNE thread hierarchy

This is an authoritative product decision.

Every spawned subagent MUST be created as a **real persisted RUNE thread** attached beneath the thread that spawned it.

The canonical hierarchy is:

```text
Project
│
├─ Parent Chat — Fix provider architecture
│  │
│  ├─ Agent Thread — Audit provider routing
│  ├─ Agent Thread — Review composer state
│  └─ Agent Thread — Verify file browser
│      │
│      └─ Agent Thread — Accessibility review
│
└─ Another normal parent chat
```

A subagent is therefore BOTH:

```text
an execution worker
+
a real navigable conversation thread
```

It must not exist only as:

```text
a provider task
a tool event
a temporary card
a hidden runtime object
```

## Thread contract

Extend/reuse the canonical thread model rather than creating a parallel "agent conversation" database.

Conceptually each thread needs enough metadata to express:

```ts
threadKind:
  | "root"
  | "agent"

parentThreadId?: ThreadId
rootThreadId: ThreadId
spawnedByTurnId?: TurnId
agentId?: AgentId
agentRole?: string
agentProfileId?: string
depth: number

workspaceMode:
  | "shared"
  | "isolated"

providerBinding
modelBinding
createdAt
completedAt?
```

Use the repository's actual contract conventions rather than copying this shape literally.

There must be ONE thread identity for the child.

The following surfaces MUST reference the exact same child `threadId`:

```text
parent inline collaborator row
sidebar nested child row
Agents panel
right-panel live child chat
full-page child chat
Environment → Agents
Turn Trace
notifications
mobile/remote projection
```

Never manufacture one ID for "agent runtime" and another unrelated ID for "agent chat".

---

---

# 106B. Sidebar — parent thread with nested subagent threads

Use the strongest interaction principle from the attached Synara reference, but build it in RUNE's visual language.

A parent thread with agents should render conceptually like:

```text
Rune

Fix Provider Architecture                 ● Working
    ↳ Audit Provider Routing              ● Working
    ↳ Review Composer State               ● Working
    ↳ Verify File Browser                 ✓ Done

Release New App Version
```

The child rows are REAL THREADS.

Requirements:

- root/normal chats remain top-level project threads;
- subagent threads appear visually nested directly beneath their parent;
- nested agents recurse beneath their spawning child;
- indentation is clear but compact;
- use subtle hierarchy/connector treatment, not a noisy file-tree aesthetic;
- child rows show agent identity/role and live state;
- status examples: Working, Waiting, Needs you, Paused, Done, Failed;
- current semantic activity may appear as secondary text/tooltip where space permits;
- elapsed time may appear when useful;
- the parent can collapse/expand its child-thread group;
- expansion state persists locally/per workspace;
- when a child is active, its ancestors auto-reveal so the selected thread is never hidden;
- child threads must NOT also appear duplicated as unrelated top-level threads;
- completed children remain inspectable;
- large teams collapse intelligently rather than making the sidebar unusable.

Recommended density:

```text
Parent title
  Agent role/title
  Agent role/title
  +3 more agents
```

when many children exist.

The sidebar is a NAVIGATION projection of the thread tree, not the owner of the hierarchy.

---

---

# 106C. Clicking a nested child thread opens it as a normal full RUNE chat

When the user clicks a child thread in the sidebar:

```text
child thread
→ opens in the MAIN chat canvas
```

It should feel like opening any other RUNE conversation.

Header/breadcrumb should make ancestry obvious:

```text
Fix Provider Architecture
/
Audit Provider Routing
```

or an equally compact RUNE-native representation.

The full child thread supports:

```text
messages
streaming
Semantic Agent Activity
Tasks
Goal context
changed files
inline diff receipts
Queue
Steer
Pause / Continue
Stop
structured asker
approvals
Developer Trace
Environment
its own nested children
```

The child must remain usable after the parent turn has completed.

The user can send follow-up instructions directly to that child.

This makes the agent a durable collaborator rather than a disposable background function.

---

---

# 106D. Inline agent row = awareness; right panel = quick inspect; sidebar = full navigation

RUNE should support THREE views of the SAME child thread.

## 1. Parent inline collaborator row

Purpose:

```text
awareness
```

Example:

```text
▲ Vega · Working
  Tracing provider routing
```

Do NOT render the full transcript inline.

## 2. Click inline row → right-panel live child chat

Purpose:

```text
quick inspect / guide / message while keeping parent visible
```

This opens the REAL live child thread in the right panel.

## 3. Click nested sidebar row OR "Open full thread"

Purpose:

```text
focus completely on the child
```

This opens the same `threadId` in the main canvas.

The right-panel view and full-canvas view MUST NOT be different conversations.

State must remain identical:

```text
messages
draft
queue
activity
tasks
changed files
provider/model
approvals
```

Switching presentation cannot restart the child or clone it.

---

---

# 106E. Child-thread origin / delegation receipt

At the top of a newly spawned child thread, show a compact provenance receipt similar in spirit to the attached reference:

```text
Delegated by RUNE from
Fix Provider Architecture
```

or:

```text
Sent by parent thread
```

Clicking it returns to the parent.

Then show the child mission/objective in a clean mission block:

```text
Mission
Audit provider routing and report verified regressions.
```

The delegation receipt is SYSTEM UI / structured thread metadata.

Do not duplicate the whole parent's natural-language transcript.

The child receives scoped context separately through the harness.

---

---

# 106F. Parent ↔ child navigation

Every child needs obvious navigation back to its parent.

Support:

```text
breadcrumb
delegated-from receipt
Back to parent action
```

Parent may also have:

```text
Agents · 3
```

which focuses its nested child group or Agents panel.

For nested agents:

```text
Parent / Frontend / Accessibility
```

must be traversable.

Do not strand the user in an agent thread.

---

---

# 106G. Child lifecycle and persistence

Agent threads persist like normal threads.

They survive supported:

```text
rerender
thread switch
reload
desktop restart
remote/mobile re-entry
```

Persist:

```text
parent relation
root relation
agent identity
objective
messages
tasks
status
provider/model
workspace mode
result
change ownership
```

Do not persist unsafe provider process handles or secrets.

Completion does not delete the thread.

A completed child becomes:

```text
✓ Done
```

and remains searchable/inspectable.

---

---

# 106H. Archive / delete semantics for thread trees

Do not create destructive surprises.

## Archive parent

Default behavior:

```text
archive the parent conversation tree together
```

while preserving descendants.

Allow restoration of the tree.

## Delete parent

Require explicit confirmation that explains descendant impact:

```text
This thread has 4 agent threads.
Deleting it will remove the conversation tree from RUNE history.
```

Use actual project retention/checkpoint semantics.

Do not silently orphan descendants.

## Delete child

Only that child subtree is affected.

If its changes were already adopted into the parent workspace, deleting its conversation must NOT silently revert adopted code.

Conversation lifecycle and code rollback are separate concepts.

---

---

# 106I. Child-thread change ownership

Every child thread owns its own execution/change history.

This must integrate with the chat-scoped mutation-ledger architecture.

Shared-workspace child:

```text
mutation receipts carry child threadId + agentId
```

so RUNE knows which worker made which mutation.

Isolated-worktree child:

```text
child owns isolated diff
parent does not claim it yet
```

until:

```text
Apply / merge / adopt
```

After adoption, preserve provenance:

```text
Applied from Vega
```

The parent may show an aggregate team-change summary, but it must never destroy child attribution.

Example:

```text
Parent changes
3 files

Agent contributions
Vega       2 files
Curie      read-only
```

Do not calculate agent ownership from raw `git status`.

---

---

# 106J. Parent completion must not erase active child work

If parent reasoning/final response reaches a completion point while background children still run:

either:

```text
parent remains Working / Waiting for agents
```

when their results are required,

or:

```text
parent can complete independently
children continue as background agent threads
```

when they are explicitly non-blocking.

The state must be intentional and visible.

Never terminate all children merely because the parent produced text.

Never falsely say "Done" if required child results are still pending.

---

---

# 106K. Child thread composer

A full child thread and an opened right-panel child must have a real composer.

User may:

```text
message child
queue instruction
steer child
pause child
continue child
stop child
answer structured question
approve action
```

These controls affect ONLY that child unless explicitly routed to parent/team.

The parent composer remains independent.

Do not route a child message accidentally to the root thread.

---

---

# 106L. Parent can delegate to existing child

Do not force a new agent thread for every follow-up.

If Vega already owns provider routing, parent may send:

```text
Continue investigating the model discovery fallback.
```

to Vega's existing child thread.

Reuse capable children before spawning duplicates.

Create a new child only when:

```text
fresh context
independent verification
parallel ownership
different specialist
```

makes it useful.

---

---

# 106M. Thread-tree performance

A project may accumulate many agent threads.

Do not subscribe/render the entire recursive transcript tree in the sidebar.

Sidebar needs only lightweight thread-shell projections:

```text
id
title
parent
depth
status
semantic activity summary
updatedAt
unread/attention
```

Full messages/activity hydrate only when the thread is opened.

Use normalized parent/child indexes.

Avoid recursive O(n²) derivation on every token.

Bench:

```text
50 root threads
200 child agent threads
live updates from 10 running agents
```

The sidebar must remain smooth.

---

---

# 106N. Required subagent-thread tests

Add explicit tests proving:

```text
1. spawning a subagent creates a REAL persisted child Thread.
2. child has correct parentThreadId/rootThreadId.
3. parent sidebar row nests the child.
4. child is NOT duplicated at top level.
5. clicking nested child opens that exact thread in main canvas.
6. clicking inline collaborator opens that exact thread in right panel.
7. right-panel and full-page views share the same thread/messages/state.
8. child keeps running when either view closes.
9. child has its own queue/steer/pause/continue.
10. sending to child never sends to parent.
11. parent can message/reuse an existing child.
12. completed child remains inspectable.
13. failed child remains inspectable.
14. reload restores the hierarchy.
15. desktop restart restores hierarchy where thread persistence supports it.
16. nested child-of-child renders correctly.
17. selecting nested child auto-expands its ancestors.
18. collapsing parent does not stop its children.
19. archiving parent preserves/restores descendants coherently.
20. deleting child does not revert already-adopted code.
21. isolated child diff remains separate until adoption.
22. shared-workspace mutation receipts preserve child ownership.
23. parent aggregate does not steal child attribution.
24. required child still running prevents false parent completion.
25. many child threads do not create sidebar rendering jank.
```

Manual acceptance MUST include the exact interaction shown by the reference concept:

```text
Parent thread
  child reviewer
  child bug hunter
  child worker
```

Each child is clickable and opens a normal live conversation.



---

---

# 107. Child rendering must be live when open, cheap when closed

When open, stream messages, activity, tasks, file receipts, approvals, and questions live.

When closed, do NOT render a hidden full transcript token-by-token. Project only compact structured status into the parent: state, current activity, elapsed, files, tasks, blocker, result.

Opening mounts/hydrates the real child history and continues live. Use events/subscriptions, not polling.

---

---

# 108. Child-agent context is intentionally scoped

Workers normally receive objective, relevant facts/files, constraints, tools, active skills, expected result contract, and parent-goal reference—not the entire parent transcript.

Clean context is a feature. Allow wider inheritance only when required. Record the scope decision in Developer Trace.

---

---

# 109. Subagent execution modes

Support Foreground, Background, Isolated worktree/environment, and Shared workspace.

Use isolated mode for parallel writers, independent experiments, risky changes, and fresh verification. Shared workspace suits read-heavy or coordinated non-conflicting work.

The orchestrator chooses by risk/ownership. User can inspect/override where useful.

---

---

# 110. Capability-aware worker routing

Do not spawn every child with the parent's expensive model.

Examples:
```text
repo exploration        → fast capable model
log/command analysis    → fast model
UI implementation       → high-quality coding model
fresh verification      → independent capable model
security review         → strong reasoning/security profile
```

Respect user/provider restrictions. Record why the worker/model/workspace mode/skills were chosen.

---

---

# 111. Parent consumes structured worker state, not transcript polling

Maintain one canonical AgentThreadRegistry/equivalent containing running/waiting/paused/completed/failed, objective, current semantic activity, tasks, findings, changed files, verification, blockers, question/approval state, and result summary.

Push updates to parent orchestration. The parent must not burn inference calls repeatedly asking workers what they did.

---

---

# 112. Parallel writers must not collide

Estimate likely file/scope ownership before spawning parallel writers.

If overlap is likely, prefer isolated worktrees, serialize, or make one worker review/read-only.

Never allow silent overwrite races. Surface conflicts, preserve both histories, and allow review/adoption.

---

---

# 113. Child result adoption must be first-class

For isolated work: Review changes / Apply or merge / Ask to revise / Open worktree / Discard.

Adoption uses canonical diff/checkpoint/worktree primitives. Normal users should not need obscure Git commands.

---

---

# 114. Agent switcher and nested hierarchy

Right panel includes a fast agent switcher with live states. Switching preserves scroll, draft, panel width, and thread state.

Nested workers display hierarchy rather than appearing as unrelated top-level sessions.

---

---

# 115. One registry, multiple projections

The same canonical child-agent registry drives parent inline rows, Agents right panel, Environment → Agents, notifications, Turn Trace, and mobile/remote status.

Inline row and right-panel child chat must always agree on status, activity, elapsed, tasks, changed files, blockers, and completion.

---

---

# 116. Queue, Steer, and Multitask are three different intents

Queue = do this after current work.
Steer = redirect current agent at the next safe boundary.
Multitask = run independently in parallel.

Once Queue/Steer/Subagents are stable, a queued item may offer `Run in parallel` when safe, creating a background isolated child where appropriate. Never auto-parallelize every queued message.

---

---

# 117. Agent profiles

Support reusable specialist profiles: name, role, description, model policy, tools, skills/mode, workspace policy, approval policy, result contract.

Keep built-in defaults few and excellent: Explorer, Reviewer, UI specialist, Performance investigator, Security reviewer, Test fixer.

---

---

# 118. Parent execution stays visually calm

Three child agents must not create three raw-log streams in the parent.

Normal parent view stays compact (`Agents · 3`, `● 2 working`, `✓ 1 done`) or shows the collaborator rows.

Clicking a child is the doorway to the real details. Progressive disclosure is a core RUNE advantage.

---

---

# 119. Adopt the best current Goal behavior

A long-lived goal should survive many turns and keep the orchestrator on course.

Goal should interact with workers:

```text
parent goal
→ derived worker objectives
→ worker result
→ parent requirement ledger
→ goal progress
```

Do not let subagents overwrite the user-owned goal.

---

---

# 120. Add a RUNE "Multitask" primitive

Do not implement merely because competitors have `/multitask`.

Implement only after Queue/Steer/Subagents are stable.

Potential UX:

```text
/multitask
```

or:

```text
queued item menu
→ Run in parallel
```

RUNE:

```text
decomposes independent parts
selects workers
assigns worktrees when needed
runs concurrently
merges structured results
verifies combined result
```

Keep this feature behind capability/risk checks.

---

---

# 121. Browser-driven visual feedback — harvest Codex/Cursor/TRAE principles

For frontend work, RUNE should eventually allow:

```text
browser screenshot/context capture
select element
annotate
attach selected UI context to chat
agent inspects console/errors
agent tests actual interaction
```

Use existing browser/preview infrastructure if present.

Do not build a second browser.

This should integrate with RUNE Design Anti-Slop verification.

---

---

# 122. Remote / mobile supervision

Preserve RUNE/T3 Code's cross-client advantage.

Long-running work should be inspectable from other clients where the current architecture permits:

```text
status
questions
approvals
activity
agent list
diff summary
completion
```

Do not compromise local secrets.

Remote client should receive projected state, not raw credentials.

---

---

# 123. Automations / background work — deferred but architecture-compatible

Codex and Cursor increasingly support scheduled/event-driven background work.

Do not implement a full automation platform in this pass unless it already exists and is directly affected.

But ensure:

```text
turns
goals
actions
agents
handoffs
results
```

have durable IDs/state so a future scheduler/event trigger can start them cleanly.

No UI dead-end or schema that assumes every turn begins from a foreground composer click.

---

---

# 124. Feature Harvest acceptance gate

Before final completion, the competitive harvest document must contain at least:

```text
Codex
Cursor
Synara
T3 Code
TRAE
```

and for every adopted capability:

```text
why RUNE adopts it
how RUNE makes it simpler/better
which requirement tests it
```

Do not add features merely to increase the list.

---

---

# 125. Explicitly reject competitor filler

The competitive harvest must include a **Rejected / Not Worth It** section.

Examples may include:

```text
settings toggles RUNE can infer
duplicate panels
provider-specific UI duplicated across the app
always-visible metrics users rarely need
agent spawning on trivial work
decorative status noise
```

This prevents feature creep.

---

---

# 126. Future architecture reservation — RUNE Security

**DO NOT IMPLEMENT THE SECURITY PRODUCT IN THIS PASS.**

The user explicitly wants this later.

However, do not paint the architecture into a corner.

Reserve compatibility for a future first-class subsystem tentatively called:

```text
RUNE Security
```

or another final product name.

Do not add visible unfinished UI.

---

---

# 127. Codex Security baseline to surpass later

Current Codex Security publicly centers on:

```text
repository-specific threat modeling
finding discovery
repository/history context
attack-path reasoning
validation/reproduction
isolated execution
remediation/fix proposals
human review
```

RUNE Security should eventually target this baseline and go further.

Again:

```text
ARCHITECTURE HOOK ONLY NOW
NO SECURITY SCANNER IMPLEMENTATION
```

---

---

# 128. Future RUNE Security differentiators

Design future compatibility for:

## 128.1 Evidence graph

Every finding should be traceable:

```text
source
→ data flow
→ sink
→ exploit preconditions
→ attack path
→ observed evidence
→ validation
→ severity rationale
→ fix
→ fix verification
```

A user can inspect why the system believes the finding is real.

---

## 128.2 Multi-pass independent discovery

Future deep scans may use multiple independent security workers to reduce model variance.

Concept:

```text
independent scan A
independent scan B
independent scan C
→ dedupe
→ validate
→ severity calibration
```

This should use the same child-agent/worktree infrastructure, not a security-specific orchestration engine.

---

## 128.3 Threat-model-first scans

Repository/component threat models become durable project artifacts.

Security discovery uses them as context.

Threat models update incrementally as architecture changes.

---

## 128.4 Differential security review

Support later:

```text
PR
commit
branch
working tree
```

Scan only new/relevant attack surface where appropriate.

This should reuse RUNE's diff/checkpoint system.

---

## 128.5 Finding lifecycle

Future common contract:

```text
candidate
validated
false_positive
accepted_risk
fixed
fix_verified
regressed
```

No separate disconnected security state store if existing requirement/finding contracts can be generalized cleanly.

---

## 128.6 Fix verification

A finding is not closed because an agent wrote a patch.

Future flow:

```text
finding
→ exploit/validation evidence
→ fix
→ re-run validation
→ prove path is closed
```

---

## 128.7 Continuous security

Future architecture may support:

```text
baseline scan
diff scan
scheduled scan
new dependency trigger
security advisory trigger
PR review
```

This should plug into future background/automation infrastructure.

---

## 128.8 Provider-neutral security

RUNE Security should not require one model vendor.

Use the RUNE capability registry and specialist routing.

Allow:

```text
discovery model
validation model
review model
```

when useful.

---

## 128.9 Local-first / privacy-aware execution

Security-sensitive repository analysis should support local execution boundaries where possible.

Secrets must not be copied into trace exports.

---

## 128.10 Security work should remain inspectable like normal RUNE work

Future security scans should use:

```text
normal RUNE Agent Threads
Semantic Activity
Tasks
Environment
Turn Trace
Diff
Approvals
Handoff
```

not a completely separate product shell.

---

---

# 129. Generalize contracts now only where justified

During this pass, if a core contract is obviously security-hostile, prefer a small generalization.

Examples:

```text
Requirement / Finding references
Evidence references
Verification receipts
Agent result contracts
Diff target contracts
Automation-compatible turn creation
```

But:

```text
do not add dormant security tables
do not build scanner UI
do not ship fake Security nav
do not add TODO buttons
```

YAGNI still applies.

---

---

# 130. Updated flagship RUNE product hierarchy

After this pass, the core system should feel like:

```text
RUNE
│
├─ Chat / Agent
│  ├─ Send
│  ├─ Queue
│  ├─ Steer
│  ├─ Pause / Continue
│  ├─ Goal
│  ├─ Grill / structured asker
│  └─ Semantic Activity
│
├─ Agent Team
│  ├─ Child threads
│  ├─ Parallel workers
│  ├─ Worktrees
│  ├─ Agent profiles
│  └─ Result adoption
│
├─ Environment
│  ├─ Files
│  ├─ Diff
│  ├─ Terminal / Actions
│  ├─ Preview / Browser
│  ├─ Repository
│  └─ Processes / Servers
│
├─ Harness
│  ├─ RUNE Native
│  ├─ Codex
│  ├─ Claude
│  ├─ Cursor
│  ├─ Antigravity
│  └─ other providers
│
├─ Intelligence
│  ├─ Prompt compiler
│  ├─ Context planner
│  ├─ Tool compiler
│  ├─ Skills
│  ├─ Memory
│  └─ Verification
│
└─ Observability
   ├─ Activity
   ├─ Developer Trace
   ├─ Turn Trace
   └─ Benchmarks
```

Future:

```text
RUNE Security
→ built on these same primitives
```

not bolted beside them.

---

---

# 130A. Latest Chat Surface architecture is mandatory

Use `chat-surface(1).md` as the current visual direction with these authoritative clarifications:

```text
User message → restrained contained surface
Assistant message → open canvas, no assistant card soup
Agent Activity → inline semantic rail
Code changes → inline real diff receipts
Subagent → compact inline collaborator row → click opens live child chat in right panel
Composer → primary premium liquid-glass card
Goal → integrated at composer top
Queue → compact layered list inside composer
```

Reject paper-stack message metaphors, assistant cards, frozen inline child transcripts, crooked/rotated queue gimmicks, and duplicated goal banners.

---

---

# 130B. Chat-scoped change ownership — correct the baseline-only trap

Use `chat-scoped-changes.md` as the basis, but do NOT define final chat diff as union(per-turn files)+summed counts. That is mutation history, not final cumulative state.

Maintain:

```text
turnDiff → previous turn checkpoint → current turn checkpoint
chatDiff → thread baseline → latest thread-owned state
mutationHistory / ownership ledger → every attributable file mutation
```

A baseline-to-current-workspace Git diff is insufficient if multiple chats mutate the same physical working tree concurrently.

Ownership must use thread/turn mutation receipts + provider-reported file changes + RUNE patch/checkpoint evidence + isolated worktrees for parallel writers when appropriate.

Raw `git status` / workspace dirtiness NEVER proves chat ownership.

Persist a mutation ledger conceptually containing threadId, turnId, agentId, operationId, filePath, beforeHash, afterHash, checkpoint, patch/diff evidence, timestamp.

Every changed-files surface reads canonical thread ownership. Workspace Git views remain available but clearly labeled workspace/branch scope.

---

---

# 130C. Settings / provider architecture reconciliation

Use `settings-polish(1).md` with hierarchy:

```text
Harness
→ Provider Instance
   → Service Connection
   → Account/Auth
   → Models
   → Advanced
```

Connection configuration belongs to the selected INSTANCE. Custom Gateway dispatch is explicit durable runtime configuration. UI selection and actual routing must agree.

---

---

# 130D. Skills architecture reconciliation

Use `skills-folder-redirector(1).md` with:

```text
Skill files → source of CONTENT truth
RUNE Skill Registry → source of DISCOVERY / ACTIVATION / RUNTIME truth
```

Define Discovery Adapter (`provider/filesystem → registry`) separately from Execution Bridge (`registry → provider runtime`). Do not silently rewrite original skills. Do not ship speculative provider config keys without verified upstream support.

---

---

# 130E. Usage architecture reconciliation

Use `usage-page(1).md`. Usage is a developer cost inspector, not a dashboard billboard.

Prefer total + provenance + provider/model/time breakdown + click-through to real work + live turn/subagent cost.

Reject decorative forecast/top-three/micro-sparkline filler and fake zero-cost coverage.

Provider coverage must be capability-driven: cost available / tokens available / session telemetry available / unavailable. Never claim telemetry exists without evidence.

---

---

# 130F. Dashboard reconciliation

Use `dashboard-shell(1).md` for performance/layout direction with two corrections:

1. Do not depend on removed historical `usageOverview` trend concepts. Current-turn shell cost can read runtime usage; historical cost belongs on `/usage`.
2. Do not depend on an assistant `MessageCard`; assistant chat is open-canvas.

The polished-shell beta flag is a rollout mechanism, not permanent dual-shell maintenance: opt-in dogfood → release candidate → stable default → temporary rollback window → remove legacy duplication after confidence.

---

---

# 130G. Live Activity acceptance walkthrough

Before completion, manually run a task long enough to exercise real execution. The screen must visibly evolve throughout the task.

Expected example:

```text
0.0s  Preparing
0.2s  Inspecting provider settings
1.4s  Reading UniversalServiceSettings.tsx
3.1s  Found mode inference fallback
3.4s  Updating explicit service mode
      UniversalServiceSettings.tsx           +18 −9
5.8s  Updating ClaudeAdapter dispatch
      ClaudeAdapter.ts                       +26 −11
9.2s  Running provider-routing tests
13.8s ✓ 18 focused tests passed
14.2s Reviewing final diff
15.1s Done
```

A long real stage may last minutes, but the UI must say what stage:

```text
Waiting for provider · 38s
Running full desktop build · 2m 14s
Waiting for Windows signer · 1m 07s
```

not frozen `Working`.

Verify semantic state changes, live file receipts, coalesced counts, active row visibility, collapsed old activities, immediate approval/question states, pause/continue clarity, live subagent rows, live child panel, and Developer Trace for long waits.

---

---

# 130H. Performance budget for live activity

The new execution UX must not slow the harness.

```text
activity projection local/deterministic where possible
no auxiliary LLM request just to name routine activity
no per-token full timeline rerender
no hidden child transcript rendering
coalesce high-frequency diff/tool updates
stable activity IDs
memoize completed rows
virtualize long histories where useful
```

Use existing model/provider semantic metadata if available, but do not call an extra model just to rename `read_many` when runtime knows the files/objective.

Benchmark before/after.

---

---

# 130I. Current competitor principles verified for this pass

Use current official product behavior only as interaction evidence.

Codex currently emphasizes multiple independent agent threads/projects, in-thread change review, and worktree isolation for parallel work.

Cursor currently documents clean-context subagents, foreground/background modes, isolated environments, `/goal`, multitask/worktrees, and steering that waits for safe tool boundaries instead of cutting an action mid-flight.

RUNE combines these with provider independence, RUNE Native, live semantic activity, inline change receipts, real child chats, cross-provider handoff, Turn Trace, structured asker, and chat-scoped ownership.

Do not claim superiority without benchmark/UX evidence.

---

---

# 131. Competitive product rule

For every competitor feature:

```text
DO NOT ASK:
"Can we copy it?"

ASK:
"What user problem does it solve,
what is the smallest correct primitive,
and how can RUNE combine it with our architecture
so the result is simpler, faster, more inspectable,
and provider-independent?"
```

That is the standard.

\n\n---\n\n# Current official product references used for this v3.0 update\n\nRe-check during implementation if product behavior changes:\n\n```text\nOpenAI — Introducing the Codex app\nhttps://openai.com/index/introducing-the-codex-app/\n\nOpenAI — Codex\nhttps://openai.com/codex/\n\nCursor — Cloud Agents and Cursor Harness Improvements (2026-08-19)\nhttps://cursor.com/changelog/08-19-26\n\nCursor — Multitask, Worktrees, and Multi-root Workspaces (2026-04-24)\nhttps://cursor.com/changelog/04-24-26\n\nCursor Docs — Subagents\nhttps://prod.cursor.com/docs/subagents\n```\n\nThese validate interaction principles only. RUNE remains its own product.\n

---