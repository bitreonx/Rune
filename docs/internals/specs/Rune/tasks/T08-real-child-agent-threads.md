---
task_id: T08
title: Codex-class real child-agent threads
status: TODO
depends_on: [T00, T01, T04]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T08 — Codex-class real child-agent threads

## Purpose

Every subagent becomes a persisted nested child thread with inline parent awareness, live right-panel chat, full sidebar navigation, scoped context, worktree ownership, and cross-provider bindings.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master subagent sections 57–60, 104–120 including 106A–106N.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 57. First-class Sub-Agent Threads

Treat the full previously supplied Sub-Agent Threads specification as mandatory.

A child agent is a real persistent child conversation.

Parent UI:

```text
Agents · 2

● Chandrasekhar
  Refining web sidebar

✓ Hooke
  Desktop review complete
```

Click opens the **real live child thread** in the right panel.

Not reconstructed text.

---

---

# 58. Subagent panel requirements

Support:

```text
live streaming
semantic activity
tasks
changed files
tools/details
approvals
errors
provider/model details
queue
steer
pause/resume/stop where supported
conversation history
nested agents
```

Wide:

```text
split view
```

Medium:

```text
resizable overlay/sheet
```

Narrow:

```text
full-width child conversation
```

Parent state remains alive.

---

---

# 59. Parent ↔ child structured communication

Parent can:

```text
spawn
instruct
steer
pause
cancel
read progress
receive result
```

Child returns a structured result:

```text
summary
findings
changed files
tasks
verification
blockers
```

Do not make parent re-read the child's whole transcript.

---

---

# 60. Hidden subagents must be cheap to render

When a child panel is closed:

```text
do not render every token into a hidden React tree
```

Only project compact semantic status.

When opened:

```text
mount/load full selected thread
```

Avoid polling.

Use events.

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