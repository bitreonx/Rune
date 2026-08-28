---
task_id: T09
title: Codex-class live Agent Activity + Cursor-class change visibility
status: PARTIAL_WITH_EVIDENCE
depends_on: [T00, T04]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T09 — Codex-class live Agent Activity + Cursor-class change visibility

## Purpose

Replace Work Log/tool spam with a continuously evolving semantic execution transcript, live code receipts, concise rationale, truthful long-running states, progressive disclosure, and zero-extra-LLM projection.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 14–23 and blocking activity redesign 333–363.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 14. Live Code Change Receipts — show the work as it happens

The user must NEVER wait through a long task looking at an unchanged screen and then suddenly receive a large final diff.

As soon as RUNE has real evidence of a code mutation, surface it in the active assistant execution flow.

The visual language should borrow the strongest interaction principles from modern Codex/Cursor-class IDEs:

```text
semantic activity
→ concrete file receipt
→ compact +/− evidence
→ expandable line diff
→ full Diff panel on click
```

Example while the agent is still working:

```text
● Updating provider routing

  src/providers/ProviderRouter.ts                +12 −4
  + route through selected instance
  - remove default-provider fallback

  src/providers/connectionState.ts              +7 −2
  + persist explicit custom-gateway mode

○ Verifying provider switching
```

A later edit to the same file should UPDATE that receipt rather than append six duplicate rows.

Requirements:
- additions and deletions come from real diff/checkpoint/mutation evidence;
- file path is always visible;
- renamed/deleted/created files have distinct treatment;
- compact line previews show the most informative changed hunks when available;
- expanding shows a bounded REAL diff, not a model-generated paraphrase;
- clicking opens the canonical Diff panel at the correct chat/turn/file scope;
- giant diffs collapse automatically;
- rapid streaming edits are coalesced so the UI does not flicker on every write;
- never fabricate +/− counts before the diff exists;
- never infer ownership from raw workspace dirtiness.

Do not build a second diff engine. Reuse canonical checkpoint / mutation / diff data.

---

---

# 15. Simplified Agent Activity Mode — make execution feel alive, precise, and calm

This is a flagship product system, not a cosmetic tool-call formatter.

Implement one shared activity architecture across:

```text
main threads
subagent child threads
parallel/background agents
plan mode
implementation mode
reviewers
RUNE Native
Codex
Claude Code
Cursor / ACP providers
future providers
```

The user must be able to glance at RUNE at any point in a 30-second or 30-minute task and answer:

```text
What is it doing now?
What did it just discover?
What changed?
What remains?
Is it waiting on me?
Is it stuck?
```

If the screen can sit on the same generic "Working" line for minutes while meaningful work is happening, this requirement is FAILED.

The simplified activity layer sits ABOVE the technical execution stream. Do not delete the raw stream.

---

---

# 16. Activity must be object-aware, intent-aware, and evidence-driven

`packages/shared/src/agentActivity.ts` may keep a deterministic fallback classifier, but regex/keyword labels are only the LAST RESORT.

Primary semantic activity must derive from structured state:

```text
turn goal
active task
plan step
tool semantic metadata
tool arguments
target files/symbols
command/action purpose
provider-native item metadata
subagent objective
checkpoint/diff evidence
verification stage
approval/user-input state
safe rationale summary
```

The label should usually answer:

> verb + concrete object + useful purpose

Bad:
```text
Exploring the project
Working
Using tools
Implementing the change
Running tests
```

Good:
```text
Tracing selected-instance routing
Reading Custom Gateway persistence
Updating the Claude service dispatcher
Applying the provider-selector fix
Checking Antigravity authentication
Running provider-routing tests
Reviewing the composer rewind diff
Waiting for approval to install dependencies
```

Use generic labels only when RUNE truly has no better structured information.

---

---

# 17. Canonical execution hierarchy and shared state model

Normalize execution into:

```text
JOB
  ↓
PHASE
  ↓
ACTIVITY
  ↓
RECEIPTS / OPERATION GROUPS
  ↓
RAW TRACE
```

Normal UI renders Job / Phase / Activity plus important receipts.

Expanded detail renders files, searches, commands, changed files, subagents, sources, rationale, and verification.

Developer Trace renders raw tool data, stdout/stderr, provider/model, request purpose, timing, TTFT, usage/cache, retry, and IDs where safe.

Create ONE canonical activity/event projection consumed by main chat, child-agent chat, parent collaborator rows, Environment, notifications, mobile/remote projections, and Developer Trace.

No provider-specific alternate activity UI.

---

---

# 18. Live rationale — useful context without hidden chain-of-thought

Surface concise user-useful rationale as execution evolves.

Examples:

```text
The Custom Gateway mode is inferred from empty env vars,
so it resets to Native after rerender. I’m moving the mode
into explicit persisted configuration.
```

```text
The first patch fixes desktop width, but the mobile anchor
still points at the old container. I’m moving the positioning
boundary instead of stacking another width override.
```

Good rationale categories:

```text
discovery
decision
hypothesis
plan change
reason for changing direction
verification finding
blocker
provider-supported visible reasoning summary
```

Do NOT expose hidden/private chain-of-thought.
Do NOT narrate mechanical actions runtime events already prove.

---

---

# 19. Immediate feedback and anti-stall execution UX

The moment a send is accepted, the UI must change immediately.

Target:

```text
Send accepted
<100 ms
→ Preparing / Queued / Steering / Resuming
```

Then evolve as evidence arrives:

```text
Preparing context
→ Inspecting provider routing
→ Found fallback to default instance
→ Updating service connection state
→ ProviderRouter.ts +12 −4
→ Running focused tests
→ 18 tests passed
→ Reviewing final diff
→ Done
```

If provider semantic output has not arrived, show deterministic runtime state:

```text
Preparing request
Waiting for provider
Restoring session
Waiting for tool result
Waiting for approval
Waiting for your answer
```

Do NOT fake percentages, rotate generic timer-based phrases, or leave a spinner with no stage for minutes.

Add a stagnant-UI watchdog: if execution is alive but no visible semantic state changed for a threshold, expose the actual blocking stage from Turn Trace, e.g. `Still waiting for provider · 42s`.

---

---

# 20. Task rail + activity rail + receipts must read as one story

Task = stable objective / remaining work.
Activity = current live intent.
Receipt = concrete evidence of what just happened.

Example:

```text
Tasks · 2/4

✓ Find Custom Gateway reset
✓ Persist explicit service mode
● Route runtime through selected connection
  Updating ClaudeAdapter dispatch

  ClaudeAdapter.ts                         +21 −8

○ Verify native/OpenRouter/custom paths
```

Rules:
- active task may have one changing semantic sub-line;
- completed tasks compress;
- receipts sit beneath the activity that produced them;
- no duplicate task/activity copy;
- plan changes are explicit;
- blocked/failed tasks remain visible;
- approvals/questions immediately replace Working.

---

---

# 21. Codex/Cursor-class activity motion and visual choreography

The experience should feel alive because state changes are beautifully staged, not because everything continuously animates.

Use restrained motion:

```text
new activity row          160–190 ms fade + 2–4px rise
pending → active          icon/dot morph + text crossfade
active → done             dot → check + opacity settle
file receipt appear       140–180 ms height/fade
diff count update         numeric crossfade, no bounce
completed phase collapse  180–220 ms
right-panel child open    220–280 ms
pause ↔ continue icon     160–200 ms morph/crossfade
```

A tiny active dot may opacity-step/pulse. No full-card neon glow, no continuous gradient sweep, no springy queue cards, no large blur animation, no layout animation for every token.

Use transform/opacity where possible. Respect reduced motion. Semantic state renders first; motion decorates it.

---

---

# 22. Progressive disclosure and Developer Trace

Every semantic activity row supports depth without clutter.

Level 1:
```text
● Updating Custom Gateway persistence
```

Level 2:
```text
2 files changed
4 files inspected
3 searches
1 command
Reason: connection mode was inferred from empty env vars
```

Level 3 — Developer Trace:
```text
apply_patch
arguments
exact file
stdout/stderr
request #2
OpenRouter
GPT-5.6 Luna
TTFT
tokens
cache
retry
duration
```

Simplified Activity=ON must remain compatible with Developer Trace=ON. Turning on Developer Trace must not revert the default timeline to raw tool spam. Redact secrets.

---

---

# 23. Turn Trace and activity are connected, but not the same thing

Turn Trace is the exact diagnostic timeline. Agent Activity is the human-facing semantic projection.

Instrument send accepted, queue wait, prompt compile, context planning, provider resolve, session acquire, request start, first byte/token, tool start/end, first useful activity, first edit, checkpoint/diff, verification, completion, UI settled.

Every inference request is attributed as main/tool-followup/repair/verification/subagent/compaction/utility/retry/handoff.

Every visible long wait must be explainable from this trace.

Developer Trace may summarize:

```text
Model             31.2s
Tools               8.4s
Verification        5.1s
RUNE overhead       0.9s
Waiting/approval    0.0s
```

An unexplained inference request or unexplained multi-minute wait is a defect.

---

---

# 333. BLOCKING UX — Replace RUNE "Work Log" with a Codex-class Live Execution Transcript

This section is authoritative.

Current RUNE screenshots show an execution experience like:

```text
Worked for 52s

Work Log

✓ Working through the task

× Exploring the project
  Failed: raw PowerShell command...

Work Log

✓ Working through the task (2 operations)

  2 operations

Show fewer activities
```

followed by long assistant prose / Grill questions.

This is NOT acceptable.

The problem is architectural:

> RUNE is rendering low-level operation grouping as the primary user experience instead of projecting a coherent live execution narrative.

Codex-class execution UX demonstrates a much better interaction:

```text
Working for 6m 27s

I’m moving from the specification into implementation...
[concise meaningful rationale]

Edited files, ran commands
[real inline diff preview]

Context automatically compacted

I’m continuing the implementation pass now...
[meaningful update]

Implementing attachment info in menu
```

The user sees a continuously evolving story of the work.

RUNE must reach or exceed this quality.

---

---

# 334. Remove "Work Log" as the primary execution concept

Do NOT present repeated generic sections titled:

```text
Work Log
Working through the task
Exploring the project
2 operations
13 operations
```

as the normal transcript.

These are implementation/debug concepts.

The normal chat should instead show a sequence of meaningful execution updates:

```text
Working for 1m 12s

I found the Custom Gateway selection is stored separately
from the runtime dispatch mode, so the UI can say OpenRouter
while Claude still launches Native.

● Updating provider-instance routing

  UniversalServiceSettings.tsx       +18 −9
  ClaudeAdapter.ts                    +26 −11

● Running provider-routing tests

  18 focused tests passed

● Checking packaged desktop behavior
```

No generic "Working through the task" wrapper is needed.

---

---

# 335. The execution transcript has four semantic layers

Normal user-facing activity:

```text
1. concise rationale / discovery
2. semantic current activity
3. concrete evidence receipt
4. next meaningful state
```

Example:

```text
The first fix repaired the settings state, but the actual Claude
spawn still reads the old service flag. I’m fixing the runtime
compiler rather than adding another UI workaround.

● Updating Claude runtime routing

  ClaudeAdapter.ts                     +21 −8

✓ Provider routing tests               18 passed

● Verifying OpenRouter instance isolation
```

Developer Trace may expose:

```text
read_many
rg
PowerShell
Get-Content
apply_patch
stdout
stderr
request metadata
```

but default chat must not.

---

---

# 336. Do not render raw shell/tool syntax as the primary failure

Current RUNE can show:

```text
Failed: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content ..."
```

This is developer-trace material.

Default failure should be translated to the semantic operation:

```text
Couldn’t read the project guidance

PowerShell exited before returning the file.

[Retry]
[Open trace]
```

or, when RUNE can recover automatically:

```text
Reading project guidance failed with PowerShell.
Retrying through the native file reader.
```

Then continue.

Do not interrupt the whole execution transcript with a giant raw command unless the user opens Developer Trace.

---

---

# 337. Group operations by intent, not count

Bad:

```text
13 operations
2 operations
+1 more tool calls
```

Good:

```text
Read 6 provider files
Searched 4 routing references
Ran 3 focused tests
```

Even better when the object is known:

```text
Inspected provider-instance routing · 6 files
Checked Claude service dispatch · 4 references
Verified provider settings · 18 tests
```

Only show the raw operation count in expanded technical details.

---

---

# 338. Inline diffs must appear during execution, like a real coding IDE

When a file is changed, the transcript should immediately show a compact real diff receipt.

Example:

```text
● Updating provider runtime

  serverSettings.ts                     +8 −1

  + providerInstanceId: instance.id
  - useGlobalOpenRouterFallback()
```

For a larger edit:

```text
Edited serverSettings.ts                +61 −0
Edited serverSettings.tests.ts          +37 −0

[View changes]
```

The user should SEE code movement while the agent is working.

Do not wait until the final answer to reveal that files changed.

Do not show only:

```text
Edited file
```

without useful scope.

---

---

# 339. One changing current activity, not many simultaneous fake statuses

At any moment, there should normally be ONE primary current semantic activity for the active agent.

Example progression:

```text
● Tracing provider-instance routing

then

✓ Found the native fallback
● Updating instance runtime manifest

then

✓ Updated instance runtime manifest
● Running focused tests
```

Old completed activities compress naturally.

Do not leave five unrelated rows marked active.

Subagent work is shown separately through the canonical Agent Team rows.

---

---

# 340. Current activity should sit at the end of the live transcript

The user's eye naturally follows the newest progress.

The final visible live row should be the current state:

```text
Implementing attachment info in menu
```

or:

```text
Running desktop smoke checks
```

not a stale completed block above the composer.

As new evidence arrives:

```text
current activity
→ settles
→ becomes compact history
→ new current activity appears beneath
```

This should feel like a living execution transcript.

---

---

# 341. Rationale messages should be sparse but high value

Codex-quality execution uses occasional prose updates to explain meaningful direction changes.

RUNE should do the same.

Good:

```text
The provider UI is already correct; the remaining bug is in the
spawn manifest. I’m moving the fix into the adapter so every
instance inherits it.
```

Bad:

```text
I will now inspect the files.
I am going to run tests.
Now I will continue working.
```

The runtime already communicates mechanical actions.

Use assistant prose only for:

```text
important discovery
reason for changing approach
meaningful implementation decision
unexpected constraint
verification finding
```

---

---

# 342. Context compaction should be visible but quiet

When RUNE compacts context:

```text
Context automatically compacted
```

may appear as a small neutral system receipt.

Do not turn compaction into:

```text
Work Log
2 operations
```

It is system state, not a user task.

Developer Trace may show:

```text
tokens before
tokens after
compaction request
cache
```

Normal view remains quiet.

---

---

# 343. Step progress should integrate with the composer

Codex-class screenshots show a compact execution-progress chip near the composer:

```text
Step 1 / 5 · 5 files changed +179 −20
```

RUNE should build a better version using the same canonical Task/Plan state.

Example:

```text
● 2 / 5 · Provider routing
  5 files · +179 −20
```

or, compact:

```text
2/5 · 5 files changed · +179 −20
```

This is a GLANCEABLE summary.

Click opens the full Tasks rail.

Do not expose fake total steps if no real task plan exists.

If the agent is operating without a task graph:

```text
Working · 5 files changed
```

is better than inventing `Step 1/5`.

---

---

# 344. Activity transcript must derive from actual state, not assistant prose parsing

Do not build this by regex-extracting the assistant's text.

Canonical sources:

```text
task/plan state
tool semantic metadata
file mutation receipts
command/action receipts
provider events
verification receipts
reasoning/rationale summaries
subagent events
context-compaction events
approval/user-input state
```

Assistant prose is one input, not the execution-state database.

---

---

# 345. Event projection contract

Create/finish a provider-neutral semantic event layer.

Conceptually:

```ts
type ExecutionEvent =
  | ActivityStarted
  | ActivityUpdated
  | ActivityCompleted
  | ActivityFailed
  | RationaleEmitted
  | FileChanged
  | CommandStarted
  | CommandCompleted
  | VerificationStarted
  | VerificationCompleted
  | ContextCompacted
  | AgentSpawned
  | AgentUpdated
  | AgentCompleted
  | WaitingForUser
  | WaitingForApproval
  | TurnCompleted;
```

Provider adapters translate their native streams into these events.

RUNE Native emits them directly.

The chat transcript renders from this event model.

No provider-specific execution UI.

---

---

# 346. Semantic event coalescing

High-frequency events must not spam the timeline.

Example:

```text
Read file A
Read file B
Read file C
rg query 1
rg query 2
```

coalesce into:

```text
Inspecting provider routing
  3 files read · 2 searches
```

If one read leads to an important discovery:

```text
Found runtime dispatch still uses `claudeService`
```

surface the discovery.

The renderer should continuously update one semantic group rather than appending 20 rows.

---

---

# 347. Active-file diff streaming

For file mutation activity, maintain one receipt per active file/semantic change group.

Example sequence:

```text
ClaudeAdapter.ts +5 −1

then additional patch

ClaudeAdapter.ts +21 −8
```

Update the same receipt.

Do not append:

```text
Edited ClaudeAdapter.ts
Edited ClaudeAdapter.ts
Edited ClaudeAdapter.ts
```

unless separate logically meaningful edits warrant distinct history.

---

---

# 348. Failed operation that self-recovers should not look like failed task

If one low-level command fails but RUNE automatically recovers:

Bad:

```text
× Exploring project
Failed
```

while the overall task continues.

Good:

```text
Reading project guidance
  PowerShell reader failed; recovered with native file read.
```

or hide the transient failure entirely from Level 1 when it has no user impact.

Developer Trace retains it.

A red task failure is reserved for:

```text
semantic activity failed
user intervention required
turn cannot proceed
```

This prevents false alarm fatigue.

---

---

# 349. Activity visual hierarchy

Normal transcript hierarchy:

```text
Working for 6m 27s

[meaningful rationale]

● Semantic activity

  concrete file/test/action receipt

[meaningful rationale if needed]

● Next semantic activity
```

Use:

```text
muted timestamps/elapsed
small status icon
high-contrast activity title
quiet secondary evidence
subtle separators only where needed
open canvas
```

Do NOT use:

```text
nested cards
repeated "Work Log" headings
big bordered activity containers
giant operation counters
heavy accordions
```

The transcript should feel native to the chat, not bolted on.

---

---

# 350. Activity expansion

Click/expand an activity:

Default detail:

```text
Files inspected
Searches
Commands
Changed files
Reasoning summary
Verification
```

Developer Trace:

```text
raw tool calls
raw command
stdout/stderr
timings
request IDs
provider/model
tokens/cache
```

Use progressive disclosure.

The default view should stay readable for non-experts.

---

---

# 351. Activity animation

Use premium restrained motion inspired by the best IDEs.

Recommended:

```text
new current activity          150–180ms fade + 3px rise
activity completion           dot → check crossfade
new diff receipt              140–180ms height/fade
diff count change             numeric crossfade
completed group compression   170–220ms
failure state                 immediate, no theatrical shake
```

No:

```text
spinners everywhere
shimmering cards
neon glows
large sliding panels for every operation
spring animations
```

The screen feels alive because the INFORMATION changes continuously.

---

---

# 352. Long-running single stage

Sometimes a real command takes minutes:

```text
desktop build
dependency install
test suite
package/sign
```

Do not invent new activity merely to keep the UI moving.

Show:

```text
● Building Windows desktop
  2m 14s
```

and, where actual process output gives meaningful milestones:

```text
✓ Web bundle
● Packaging Electron app
○ Installer
```

If there are no meaningful sub-stages, keep the truthful stage and elapsed time.

The key rule:

> **Never fake progress; never hide real progress.**

---

---

# 353. Grill / structured questions must NEVER dump into assistant prose

The RUNE screenshot shows a Grill workflow producing:

```text
Now answer these hard questions:
1. ...
2. ...
```

inside the assistant transcript.

This violates the native asker architecture.

If Grill or another skill needs user decisions:

```text
Execution activity
→ Waiting for your input

Composer transforms into structured asker
```

The transcript may show a compact receipt:

```text
Needs you · 4 design decisions
```

but NOT the full questionnaire.

This is a blocking regression.

---

---

# 354. Activity state during structured ask

When waiting for answers:

```text
Working
```

must stop.

State becomes:

```text
Needs you
```

Current activity:

```text
Clarifying folder ownership
```

Composer displays the native question UI.

After answer:

```text
✓ 3 decisions clarified
● Writing specification
```

This creates continuity without chat spam.

---

---

# 355. Plan/Task/Activity synchronization

If a real PlanGraph exists:

```text
PlanTask
→ current Activity
→ concrete receipts
```

Example:

```text
TASK-04 · Fix provider isolation

● Updating runtime manifest

  ProviderInstance.ts                +32 −4
  ClaudeAdapter.ts                   +18 −7

✓ 18 focused tests
```

The composer chip might show:

```text
4/12 · Provider isolation
```

No duplicate independent "task progress" and "activity progress" guesses.

---

---

# 356. Subagent activity synchronization

Parent inline row:

```text
● Vega
  Verifying provider routing
```

Click opens the real child thread.

Inside child:

```text
Working for 1m 42s

The settings fix is correct, but the runtime manifest still
inherits the native Anthropic key...

● Scrubbing inherited Claude auth

  ClaudeRuntime.ts                  +12 −3

● Running isolation tests
```

Same execution transcript architecture.

No "subagent log" special UI.

---

---

# 357. Final response transition

At turn completion:

```text
current activity
→ completes
```

Then the final assistant result appears immediately below the execution transcript.

Example:

```text
✓ Verification complete

Done

Fixed provider-instance isolation and OpenRouter routing.

Changed
3 files

Verified
18 focused tests
desktop smoke
```

Do not duplicate every activity in the final answer.

---

---

# 358. Exact screenshot-comparison acceptance test

Use the supplied Codex/RUNE comparison as a manual UX test.

For a task lasting >3 minutes, RUNE must show throughout execution:

```text
meaningful rationale changes
semantic active state
real file changes
real command/test receipts
context compaction receipt if it occurs
current activity at bottom
compact task/step chip near composer when real tasks exist
```

RUNE must NOT primarily show:

```text
Work Log
Working through the task
Exploring the project
2 operations
13 operations
raw PowerShell path
Show fewer activities
```

unless the user explicitly expands technical details.

If an evaluator looking at the screen for 30 seconds cannot tell what changed in the last 30 seconds, Activity UX is FAILED.

---

---

# 359. Exact long-task no-freeze requirement

During a healthy 10-minute coding turn:

at any point the user should be able to identify one of:

```text
what is being investigated
what was discovered
what file is changing
what command is running
what test is running
what agent is working
what is waiting/blocking
```

The screen must not remain perceptually unchanged for minutes if any new semantic evidence exists.

This does NOT mean forcing fake updates every N seconds.

It means RUNE must PROJECT real runtime events promptly.

---

---

# 360. Performance requirements

The improved Activity UX must not slow execution.

Requirements:

```text
semantic projection local/deterministic where possible
0 extra LLM calls merely to name routine activity
completed rows memoized
high-frequency tool events coalesced
diff receipts incrementally updated
hidden raw trace not rendered eagerly
child transcripts not rendered when closed
timeline virtualization for very long threads
```

Measure:

```text
event → visible activity latency
render cost
token stream FPS / responsiveness
```

Target normal local event projection:

```text
<100 ms
```

---

---

# 361. Activity regression test matrix

At minimum:

```text
1. multiple reads coalesce into one semantic investigation.
2. multiple searches coalesce.
3. known target file appears in semantic label.
4. low-level command failure + automatic recovery is not shown as whole-task failure.
5. unrecovered command failure is actionable.
6. file edit receipt appears before final answer.
7. repeated edits update one file receipt.
8. real diff counts update.
9. tests show semantic test state.
10. context compaction shows a quiet receipt.
11. approval replaces Working.
12. structured question replaces Working.
13. Grill never dumps questionnaire into chat.
14. current activity remains the newest visible execution row.
15. completed activities compress.
16. Developer Trace retains raw operations.
17. normal view hides raw PowerShell syntax.
18. subagent uses same activity transcript.
19. Plan task and activity stay synchronized.
20. no extra model request for semantic naming.
21. long build shows truthful elapsed/stages.
22. turn completion transitions cleanly into final result.
```

---

---

# 362. Remove legacy/dump activity path after migration

Once the canonical semantic transcript is verified:

remove or demote legacy components/state that primarily render:

```text
Work Log
operation-count groups
raw tool rows
generic hard-coded phase wrappers
```

Do not maintain two competing default activity experiences indefinitely.

Keep raw technical data ONLY as Developer Trace.

If legacy components are still required for compatibility, route them through the new projection and mark them internal/deprecated.

---

---

# 363. Updated Activity completion gate

Do NOT complete the master pass if:

```text
RUNE still shows "Work Log" as a major default heading.
generic "Working through the task" dominates the transcript.
raw command paths appear as primary UI.
operation counts replace semantic activity.
file edits are invisible until final response.
current activity is not obvious.
Grill questions are printed into chat instead of native asker.
subagent activity uses a separate inferior UI.
Developer Trace is not available for experts.
Activity naming causes extra model requests.
long tasks appear frozen despite incoming semantic events.
```

The standard is:

> **Codex-class clarity, Cursor-class code-change visibility, RUNE-class provider-neutral execution and progressive disclosure.**
