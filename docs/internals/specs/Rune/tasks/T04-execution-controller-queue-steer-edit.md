---
task_id: T04
title: Execution controller: Queue, Steer, Pause, Continue, Stop, Edit, Delete
status: PARTIAL_WITH_EVIDENCE
depends_on: [T00]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T04 — Execution controller: Queue, Steer, Pause, Continue, Stop, Edit, Delete

## Purpose

Replace split-brain chat orchestration with one durable execution controller whose behavior matches/exceeds Codex for queued follow-ups and historical message editing.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 7–13 and blocking queue/edit sections 297–332.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 7. Chat composer must become a real execution controller

This is a flagship surface.

Do not treat the composer as a text box plus buttons.

Its controls must reflect thread state.

Canonical states:

```text
IDLE
RUNNING
PAUSING
PAUSED
QUEUED
STEERING
RESUMING
WAITING_FOR_USER
WAITING_FOR_APPROVAL
VERIFYING
FAILED
CANCELLED
```

---

---

# 8. Fix Send-While-Running completely

## Required default

While a turn is running:

```text
User enters B
→ submit
→ B becomes queued
→ A keeps running
```

Do not:

```text
interrupt A
→ start B
```

unless the user explicitly chooses Steer.

## Required controls

While idle:

```text
Send
```

While running and draft has content:

```text
Queue
```

with an adjacent/options action:

```text
Steer now
```

While running with empty draft:

```text
Pause
```

or the active execution control.

Do not conflate queueing with interrupting.

## Existing interrupt-before-send path

Delete/replace the old logic at the architectural source.

Do not leave it as a hidden fallback.

Add regression tests that prove:

```text
phase=running + normal submit
→ interrupt command NOT called
→ queue item created

phase=running + steer
→ interrupt requested safely
→ steer item promoted

phase=running + explicit permanent stop
→ cancellation path
```

---

---

# 9. Queue must be authoritative, durable, and race-safe

Keep the existing good queue foundations, but verify end-to-end ownership.

Every submitted prompt must end in exactly one state:

```text
queued
running
completed
cancelled explicitly
superseded explicitly
failed recoverably
```

Never:

```text
lost
duplicated
silently dropped
executed twice
```

Support:

```text
edit queued prompt
delete
reorder
steer now
retry
persist across rerender
persist across thread switch
persist across supported reload/restart
```

Use stable IDs.

Do not identify queue items only by array position.

Test race cases:

```text
dequeue vs delete
dequeue vs reorder
steer vs completion
stop vs completion
reload during transition
rapid double submit
```

---

---

# 10. Pause, Resume, Steer, Stop are four different things

The current UX/runtime blurs these concepts.

Fix it.

## Pause

User wants to temporarily stop active work and be able to continue.

Primary visual while active should use a calm **Pause** metaphor where the provider/runtime can safely pause.

```text
Working
[ Pause ]
```

After safe interruption:

```text
Paused
[ Continue ▶ ]
```

Use top-tier micro-animation:

```text
pause glyph
→ state morph
→ play glyph
```

No cheesy bounce/glow.

## Resume

Continue the same task/session from preserved execution context.

Do not create a visible fake user message.

Use provider/session resume semantics where supported.

For providers without true resume:

```text
compile a structured continuation packet
→ send as internal continuation
```

but treat this distinctly from restart recovery.

## Steer

Temporary priority change.

```text
A running
→ steer B
→ pause A safely
→ execute B
→ resume A when relevant
```

Do not forget A.

## Stop & abandon

Explicitly ends active objective.

This may live in an overflow/secondary destructive action so the normal primary control can be Pause.

Never automatically resume a task explicitly abandoned.

---

---

# 11. Message Edit must feel native and safe

The current edit flow is not sufficient.

## Interaction

Click **Edit** on a sent user prompt.

The message itself enters inline edit mode **in place**, with the same high-quality text editing affordances as the composer where practical:

```text
original message bubble
→ editable state
→ Save / Cancel
```

Do not immediately mutate files or conversation history.

Do not silently rewind anything.

## On submit

If editing a historical prompt would require changing execution history, show a clear RUNE confirmation surface.

Provide safe choices:

### Rewind & resend

```text
restore conversation to before this prompt
restore files/checkpoint associated with newer work
use edited prompt
resume execution from there
```

### Keep current changes & send as new instruction

```text
leave history/files intact
restore original historical message visually
send the edited text as a new prompt at the current end
```

This prevents transcript/workspace inconsistency.

### Cancel

No mutation.

Never visually rewrite history without also making the runtime history consistent.

## Important

The user explicitly said:

```text
ask whether to reverse/revert edits
do not automatically reverse them
```

Honor that.

---

---

# 12. Message Delete must have explicit semantics

Delete buttons must actually work.

For a historical message that owns subsequent execution state:

```text
Delete / rewind from here
```

must show a destructive confirmation explaining:

```text
which messages disappear
which file changes are restored
which queued items are affected
whether provider conversation is rolled back/forked
```

Do not silently delete a bubble while the provider still sees the message.

Do not immediately rewind before confirmation.

Add regression tests.

---

---

# 13. Checkpoint and restore semantics must be coherent

Cursor currently makes checkpoint restore a first-class safety affordance; RUNE should have a stronger provider-neutral model.

RUNE must distinguish:

```text
restore workspace files
rewind RUNE conversation state
rollback provider conversation if supported
fork conversation
```

One UI action may combine them, but internally they are distinct receipts.

Never imply rollback succeeded if a provider cannot rewind.

If provider conversation cannot rewind:

```text
fork/restart from compiled context
```

and disclose it in developer details.

---

---

# 297. BLOCKING UX — Codex-class queued follow-ups + historical message editing

This section is authoritative and supersedes any older queue/edit behavior that conflicts with it.

A current Codex interaction reference was recorded and reviewed.

The critical behaviors observed are:

```text
ACTIVE TURN
→ user submits another prompt
→ current turn KEEPS RUNNING
→ prompt appears immediately in a compact queue row ABOVE the composer
→ queue row has an explicit "Steer" action
→ queued prompt can be removed/managed
→ when current turn finishes, queued prompt becomes the next real user message
→ next turn begins automatically
```

and:

```text
SENT USER MESSAGE
→ Edit
→ that exact message bubble becomes an inline editor IN PLACE
→ Cancel / Send live inside the edited message
→ Send replaces/reruns from that historical point
→ it is NOT copied into the bottom composer
```

RUNE must match or exceed this interaction quality.

Do not copy Codex pixels.

Implement the interaction principle using RUNE's own premium composer/activity language.

---

---

# 298. The current RUNE behavioral defect to remove

The current/previous RUNE code path has contained logic equivalent to:

```text
phase === running
→ interrupt current turn before send
```

in/around:

```text
apps/web/src/components/ChatView.logic.ts
apps/web/src/components/ChatView.tsx
```

while RUNE also has separate queue state in areas such as:

```text
apps/web/src/promptQueueStore.ts
packages/client-runtime/src/state/promptQueue.ts
```

This produces split-brain behavior:

```text
UI says Queue exists
BUT
normal Send can interrupt the active turn
```

That is unacceptable.

There must be ONE execution-controller decision.

Default invariant:

> **Normal Send while a turn is active NEVER interrupts it. It queues.**

Explicit Steer is the only normal follow-up action that interrupts/reprioritizes the active objective.

Remove/deprecate every hidden fallback that still interprets ordinary Send as interrupt.

---

---

# 299. Composer state machine — exact behavior

Canonical composer behavior:

## IDLE

Draft + Enter/Send:

```text
create user message
→ start turn
```

Primary button:

```text
Send
```

## RUNNING + empty draft

Primary execution control:

```text
Pause
```

or the appropriate active-run control from the canonical execution state machine.

## RUNNING + non-empty draft

Normal Enter/Send:

```text
enqueue prompt
```

Primary submit meaning:

```text
Queue
```

The existing turn remains untouched.

Secondary explicit action:

```text
Steer now
```

## PAUSED

Primary:

```text
Continue ▶
```

Draft submission may queue or steer according to explicit user action.

## WAITING_FOR_USER / WAITING_FOR_APPROVAL

Composer asker/approval state takes precedence.

Do not render "Working" controls as if execution were still autonomous.

---

---

# 300. Codex-style queue rail — attached to the composer

Queued prompts should live immediately ABOVE the composer as a compact attached rail.

Single queued prompt:

```text
┌────────────────────────────────────────────────────────┐
│ ↳  don't respond with anything            [Steer] [×] │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ Ask RUNE…                                               │
│                                                        │
│ ...                                             [Pause] │
└────────────────────────────────────────────────────────┘
```

Multiple:

```text
Queued · 3

1  Fix the provider icon                       Steer  ×
2  Then verify the model picker                Steer  ×
3  Run the focused tests                       Steer  ×
```

The rail is physically/visually attached to the composer.

Do NOT put normal queued follow-ups in:

```text
a modal
a detached sidebar
a giant Tasks panel
a hidden toast
```

The user should see exactly what will happen next while continuing to type.

---

---

# 301. Queue row interaction

Each queued item supports:

```text
edit
delete
reorder
Steer now
```

Optional, once agent multitask is stable:

```text
Run in parallel
```

Do not expose dead controls.

Recommended compact controls:

```text
text
Steer
trash/remove
overflow
```

Edit can be invoked by:

```text
click text
pencil in overflow
keyboard action
```

Do not require copying the queued prompt back into the main composer just to change it.

---

---

# 302. Editing a queued prompt is cheap and local

A queued prompt has NOT entered provider conversation history yet.

Therefore:

```text
Edit queued prompt
→ inline queue-row editor
→ Save / Cancel
```

No checkpoint restore.

No provider rewind.

No model call.

No confirmation dialog unless editing changes some separately scheduled destructive metadata.

Persist the same stable queue item ID.

Do not delete + recreate it in a way that creates race conditions with dequeue.

---

---

# 303. Composer remains usable after queueing

After a user queues B while A is running:

```text
B moves into queue rail
composer clears
composer remains focused
```

The user can immediately type C.

Example:

```text
Current:
A · Working

Queued:
B
C

Composer:
[ type D... ]
```

This is a critical part of the Codex-quality experience.

Do not disable the composer while a turn is running.

---

---

# 304. Atomic dequeue → real user message

When active turn A reaches a terminal state that permits queue progression:

```text
A completes
→ atomically claim first queued item B
→ mark B DEQUEUING
→ materialize B as ONE normal user message
→ start turn B
→ remove queue projection only after authoritative transition
```

Never:

```text
render B as user message before it is claimed
start B twice
lose B during reload
leave duplicate queue copy + user bubble
```

Use stable queue/message/turn IDs and an idempotent transition.

---

---

# 305. Queue behavior after completion, failure, pause, and stop

Define explicitly.

## A completes normally

```text
run next queued prompt automatically
```

## A fails recoverably

Default:

```text
do NOT silently consume queue while the thread is in unresolved failure
```

Show:

```text
A failed
3 prompts queued

[Retry A]
[Run next queued]
```

A product policy may allow auto-continue for clearly isolated failures, but it must be explicit/tested.

## A pauses

Queue remains intact.

Do not execute next merely because active turn is paused.

## User chooses Stop & abandon

Preserve queue.

After stop settles, offer:

```text
Run next queued
```

or follow the user's explicit configured policy.

Never silently delete queued instructions.

---

---

# 306. Promote queued item to Steer

The `Steer` button observed in Codex is an excellent interaction.

RUNE behavior:

```text
A running
Queue: B, C, D

User clicks Steer on C
```

Canonical transition:

```text
C atomically removed/promoted from queue
→ safe-interrupt A
→ C becomes immediate steer turn/instruction
→ B and D remain queued in stable order
→ A becomes resumable if still relevant
```

Do not duplicate C in queue and steer stack.

Do not lose B/D.

---

---

# 307. Queue visual states

Canonical:

```text
queued
editing
promoting-to-steer
dequeueing
failed-to-start
```

Do not show fake states.

Animations:

```text
composer → queue row        160–200 ms
queue reorder              160–200 ms
queue → user bubble        semantic crossfade/position transition
row remove                 140–180 ms
Steer promotion            clear priority transition, no flashy animation
```

No paper-card rotation.

No springy stacks.

Use RUNE's restrained liquid-glass/compact IDE language.

Respect reduced motion.

---

---

# 308. Queue keyboard UX

Default while RUNNING:

```text
Enter
→ Queue
```

Explicit steer shortcut may be:

```text
Ctrl/Cmd + Enter
→ Steer
```

or the current platform-consistent inverse if RUNE's user setting chooses Steer as the default follow-up behavior.

The UI must communicate the current behavior.

If Settings contains:

```text
Follow-up behavior
Queue | Steer
```

then:

```text
Enter = selected default
Ctrl/Cmd+Enter = opposite action
```

and labels/tooltips update immediately.

RUNE's recommended/default setting is:

```text
Queue
```

---

---

# 309. Queue is thread-scoped and durable

Queued prompts belong to one thread.

Persist enough authoritative semantic state to survive supported:

```text
rerender
switch to another thread
return
reload
desktop restart
```

Never accidentally show Thread A's queued prompts in Thread B.

A child-agent thread has its OWN queue.

Parent and child queues remain independent.

---

---

# 310. Historical sent-message Edit — exact visual behavior

For an already-sent USER message:

```text
hover / context action
→ Edit
```

The exact message surface transforms IN PLACE into an editor.

Reference interaction:

```text
Before

                         don't respond with anything

Edit

        ┌───────────────────────────────────────────┐
        │ don't respond with anything█              │
        │                           Cancel     Send │
        └───────────────────────────────────────────┘
```

Requirements:

```text
same horizontal location
same conversation position
same approximate width/density
auto-grow editor
existing content selected/cursor available
Cancel
Send
Escape = Cancel
Cmd/Ctrl+Enter or button = Send according to platform conventions
```

Do NOT:

```text
copy message into bottom composer
scroll user away from historical position
open a full modal for ordinary text editing
create a new bottom draft by default
```

This is a correction to history, so edit where history lives.

---

---

# 311. Sent-message edit is NOT a simple mutable string update

The UI looks like editing the same message.

Internally, conversation/provider execution history may require:

```text
rewind
fork
new provider session
checkpoint restore
```

Do not naïvely mutate one database row while leaving later provider/tool history based on the old prompt.

Treat historical edit as a structured timeline operation.

Conceptually:

```text
EditRevision {
  originalMessageId
  editedText
  editPointTurnId
  chosenWorkspacePolicy
  newBranch/fork identity if required
}
```

The UI may continue showing one coherent conversation branch.

Preserve enough provenance for recovery/Developer Trace.

---

---

# 312. Smart edit path — no unnecessary confirmation

Codex can make simple message edits feel instant.

RUNE should too.

If all of these are true:

```text
no workspace mutation exists after edit point
no destructive external side effects
no conflicting active descendant turn
no queued prompt dependency requiring intervention
```

then:

```text
Send edited message
→ rewind/fork conversation internally
→ remove/supersede descendant assistant output
→ edited user message remains in the same visible location
→ rerun immediately
```

No confirmation dialog is necessary.

This covers cases like the reference video:

```text
"don't respond with anything"
→ edit text
→ Send
→ old assistant continuation disappears/supersedes
→ new run begins
```

Do not burden harmless chat-only edits with a scary rollback dialog.

---

---

# 313. Historical edit with code/file changes — ask what to do

The user has explicitly required:

> **Never auto-revert code changes merely because a sent prompt was edited. Ask first.**

If execution after the edited message produced workspace changes, show RUNE's native structured confirmation.

Example:

```text
Edit this earlier instruction?

Work after this message changed 7 files.

What should RUNE do with those changes?

● Rewind conversation + restore files
  Recommended when correcting the original task.

○ Keep current files + rerun edited instruction
  Start from the workspace as it exists now.

○ Keep everything + send edited text as a new instruction
  Do not rewrite history.

Cancel
```

No automatic file reversal.

No modal if there are no affected changes.

---

---

# 314. Rewind conversation + restore files

When selected:

```text
identify checkpoint immediately before edited message/turn
→ stop/cancel descendant active execution safely
→ restore chat execution branch
→ restore thread-owned workspace changes after the checkpoint
→ preserve unrelated other-thread changes
→ edit message
→ rerun
```

This MUST use the chat-scoped change ownership/mutation-ledger architecture.

Do NOT:

```text
git reset --hard
restore other chat's modifications
restore entire workspace from HEAD
```

Only revert changes truly owned by the rewound branch/thread/agent scope.

---

---

# 315. Keep current files + rerun edited instruction

When selected:

```text
conversation reruns from edited intent
BUT
workspace remains at current state
```

RUNE must clearly include current workspace state/context.

Internally this may require a fork rather than literal provider conversation rewind.

The user-facing mental model remains simple.

Developer Trace may explain:

```text
Conversation forked at message X
Workspace checkpoint retained
```

This option is powerful for:

```text
"I worded the request badly but I want to keep the code already produced."
```

---

---

# 316. Keep everything + send as new instruction

This is not historical mutation.

Behavior:

```text
Cancel inline history rewrite
→ restore original user message
→ send edited text as a NEW current user instruction
```

The user keeps:

```text
conversation
assistant output
file changes
```

This should be one explicit choice when history has meaningful descendants.

---

---

# 317. Descendant assistant messages after historical edit

If historical edit reruns from message M:

all descendant execution/output on the chosen conversation branch must be treated coherently.

Do not leave:

```text
old response to old M
+
new response to edited M
```

as if both belong sequentially to the same branch.

Use:

```text
superseded branch
fork
rewind
```

according to provider capabilities.

The normal visible chat should show the selected current branch.

Optionally retain historical branch/version in Developer Trace/history if RUNE supports it.

---

---

# 318. Active turn while editing history

If a later turn is actively running and the user edits an older message:

do not mutate underneath the running provider session.

On Send edited message:

```text
request safe cancellation/interrupt of descendant active turn
→ settle it
→ execute chosen rewind/fork policy
```

Before Send:

```text
the active turn may continue while the user is merely typing the edit
```

unless the user explicitly pauses/stops it.

This matches the principle:

> Editing text is not itself an execution command.

---

---

# 319. Queued prompts during historical edit

Queued prompts are attached to the current branch/timeline.

If the user rewinds before them:

RUNE must not blindly execute queued prompts whose context may no longer exist.

Default safe policy:

```text
preserve them
mark them "Needs review after rewind"
```

Then allow:

```text
Keep queued
Edit
Delete
```

For simple chat-only edits where semantic context remains compatible, RUNE may preserve them automatically if a deterministic policy can prove it safely.

Never silently lose them.

---

---

# 320. Historical message Delete

Use the same timeline/checkpoint architecture as Edit.

Delete is NOT:

```text
remove bubble only
```

If descendants exist, explain impact.

If workspace changes exist after that message:

```text
ask whether to restore those changes
```

using the same native confirmation model.

Conversation deletion and code rollback are separate decisions.

---

---

# 321. Message action UI

Normal user-message action affordances should be quiet.

On hover/focus/context:

```text
Copy
Edit
More
```

More may contain:

```text
Delete
Fork from here
```

where supported.

Do not permanently clutter every user bubble with five icons.

Touch/narrow layouts must have an accessible menu.

---

---

# 322. Queue + message editing use one execution-history architecture

Do NOT implement:

```text
queue state in React local store
historical edit directly mutating message DB
checkpoint rewind in a third subsystem
provider session in a fourth unrelated subsystem
```

Canonical relationships:

```text
Thread
  ↓
Message timeline
  ↓
Turns
  ↓
Queue
  ↓
Provider execution
  ↓
Checkpoints / mutation ledger
  ↓
Branches / revisions
```

The Execution Controller owns state transitions.

UI projects them.

---

---

# 323. Queue + edit telemetry / trace

Turn Trace should record:

```text
prompt.queued
prompt.edited
prompt.reordered
prompt.promoted_to_steer
prompt.dequeued
message.edit_started
message.edit_cancelled
message.edit_committed
timeline.rewind_started
timeline.rewind_completed
workspace.restore_started
workspace.restore_completed
conversation.forked
```

No model call is required for these deterministic state operations.

This makes queue/edit bugs diagnosable.

---

---

# 324. Do not count queue operations as AI work

Queue/reorder/edit/delete before execution are local orchestration operations.

Expected inference calls:

```text
queue prompt            0
edit queued prompt      0
reorder queue           0
delete queued prompt    0
open inline sent edit   0
cancel sent edit        0
```

Only rerunning the edited message invokes the provider.

This saves tokens and improves responsiveness.

---

---

# 325. Queue and edit rendering performance

Requirements:

```text
queue item update does not rerender full chat timeline
typing inline historical edit does not rerender every completed assistant message
reordering queue is local and smooth
dequeue materialization has stable IDs
long queue virtualizes/collapses if necessary
```

Target common interaction latency:

```text
queue appear after Send
< 100 ms local feedback

inline editor open
< 100 ms

queue edit save
immediate local
```

Remote/persistence acknowledgement may complete asynchronously.

---

---

# 326. Queue accessibility

Support:

```text
keyboard traversal
screen-reader queue position
reorder without drag
Steer label
Remove label
edit label
visible focus
reduced motion
```

Announce:

```text
"Queued message 2 of 3"
```

where appropriate.

Do not rely only on icon/color.

---

---

# 327. Exact video-reference acceptance scenario

Reproduce this manual scenario in RUNE:

```text
1. Start a thread.
2. Send "hi".
3. While assistant is still working, type:
   "don't respond with anything"
4. Press normal Send.
```

Expected:

```text
"hi" turn keeps working.
No interrupt command is fired.
Second prompt appears as queue row directly above composer.
Queue row exposes Steer + remove/manage controls.
Composer clears and remains usable.
```

Then:

```text
5. Let "hi" finish.
```

Expected:

```text
queued prompt materializes exactly once as the next normal user message.
next assistant turn starts automatically.
queue row disappears atomically.
```

Then:

```text
6. Edit that sent prompt.
```

Expected:

```text
exact user bubble transforms in place.
Cancel + Send appear inside it.
bottom composer is untouched.
```

Then:

```text
7. Change the wording and Send.
```

For the chat-only case:

```text
old descendant assistant output is superseded/rewound.
edited user message remains at the same timeline position.
new assistant run starts.
no duplicate user message.
```

This test is a BLOCKING acceptance test.

---

---

# 328. Exact file-changing historical-edit acceptance scenario

Run:

```text
1. User sends task A.
2. A changes files and completes.
3. User sends task B.
4. User edits historical A.
```

Expected when pressing Send:

RUNE native confirmation asks what to do with the file changes.

Test all three:

```text
Rewind + restore files
Keep files + rerun
Keep everything + send as new
```

Verify:

```text
other thread changes are never reverted
queue remains coherent
no duplicate provider turns
message timeline is coherent
DiffPanel/chat ownership remains correct
```

---

---

# 329. Exact queue race suite

Add deterministic tests:

```text
1. A running, B queue.
2. A running, B/C/D queue.
3. edit B while A running.
4. reorder D before B.
5. delete C.
6. promote B to steer while A completes simultaneously.
7. A completion and dequeue race.
8. delete B while dequeue starts.
9. reload with A running + B/C queued.
10. restart with durable B/C queue.
11. A fails with B queued.
12. A pauses with B queued.
13. stop A with B queued.
14. rapid double Enter does not duplicate.
15. child thread queue independent from parent.
16. thread switch never leaks queue.
17. historical edit while B queued.
18. historical edit while descendant turn running.
19. queued item remains exactly-once through provider startup failure.
20. provider retry does not rematerialize the same queued user message.
```

No prompt may disappear or execute twice.

---

---

# 330. Remove the "fake Queue" completion loophole

The feature is NOT complete if:

```text
a queue badge exists
but normal Send still interrupts

a queue row renders
but item is not durable

queued message is copied into chat before current turn settles

Steer is just Stop + new Send

editing a sent message copies it to bottom composer

historical edit changes UI text but provider history remains old

message Delete hides bubble but leaves old provider context

rewind restores all workspace dirtiness from HEAD

queued prompts disappear during restart

queue/edit requires an LLM call
```

Every one of these is a blocking failure.

---

---

# 331. Updated product mental model

The final interaction must feel obvious:

```text
I send while RUNE is working
→ it waits in Queue

I need it considered immediately
→ Steer

I want to change a queued prompt
→ edit it right there

I want to correct something I already said
→ edit that exact message right there

My old task changed code
→ RUNE asks whether I want those changes restored

I do not want to lose the code
→ Keep files + rerun

I actually mean this as a new instruction
→ Keep everything + send as new
```

The user should never need to understand provider session internals to use these correctly.

---

---

# 332. Updated blocking completion gate

In addition to all prior gates, do NOT complete the master pass while:

```text
normal follow-up Send interrupts an active turn
queued prompt is not visibly attached to composer
queue row cannot be edited/removed/steered
composer becomes unusable while active
queued item can execute twice
queued item can disappear
sent-message Edit is not inline
sent-message Edit copies to bottom composer
historical edit auto-reverts code without asking
historical edit leaves old descendant output in same branch
message Delete is UI-only
queue/edit state leaks across threads
child queue affects parent
```

Codex-level interaction behavior is the minimum baseline.

RUNE should exceed it through:

```text
chat-scoped rollback safety
provider-neutral execution
durable queue state
Turn Trace
structured native confirmation
child-thread integration
```



---
