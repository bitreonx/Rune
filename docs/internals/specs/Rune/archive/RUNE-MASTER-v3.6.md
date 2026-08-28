# RUNE — Luna High Master Repair, Product Polish, Live Execution UX & Harness Maxxing Pass

**Prompt version:** 3.6  
**Target:** the latest RUNE checkout, not an older snapshot  
**Execution model:** Luna High  
**Goal:** take the current partially implemented RUNE and finish the product so the architecture, runtime behavior, UX, performance, provider integration, skills, and visual polish actually work end-to-end.

---

# 0. Read this as a release contract, not a feature suggestion

You are not being asked to add one feature.

You are being asked to perform a **full product correctness + execution UX + native harness + provider + skills + performance + release-readiness pass** on the current RUNE repository.

The repository already contains partial implementations of many requested systems. That makes this task harder, not easier.

**Do not assume that code existing means the feature is correct.**

For every requirement in this prompt:

```text
inspect existing implementation
→ reproduce actual behavior
→ classify status
→ find root cause of gaps
→ repair shared architecture
→ verify real UX
→ benchmark
→ only then mark complete
```

Possible statuses:

```text
VERIFIED_COMPLETE
PARTIAL
BROKEN
REGRESSED
UI_ONLY
BACKEND_ONLY
DEAD_CODE
MISSING
```

Do not mark something implemented merely because:

- a component exists,
- a setting exists,
- a test mocks the happy path,
- a server contract exists,
- a button renders,
- a comment says it works,
- a provider reports a status,
- the build passes.

The user wants the **real application behavior**.

---

# 1. Required source material

Before editing anything, read and reconcile:

```text
RUNE-EXECUTION-UX-HARNESS-MAXXING-SPEC-v1.0.md
T3CODE-HARNESS-MAXXING-BLUEPRINT.md
RUNE_IMPLEMENTED.md / implementation status files if present
RUNE work ledgers / release checks if present
docs/internals/*
current provider docs
current chat/composer/activity/task/subagent code
current right-panel/file-browser/diff code
current settings/provider-instance code
current native API harness code
current external provider adapters
current skills directories
current assets/

LATEST SURFACE SPECS — these supersede older conflicting drafts:
settings-polish(1).md
skills-folder-redirector(1).md
usage-page(1).md
chat-scoped-changes.md
chat-surface(1).md
dashboard-shell(1).md
```

Also inspect the latest source itself rather than trusting the older spec's file map.

Research **current 2026** official behavior of relevant coding products when comparison clarifies the interaction:

```text
Codex
Cursor
Claude Code
Agent Skills standard
ACP where RUNE uses it
```

Do not copy competitors pixel-for-pixel.

Learn the interaction principle and build the best RUNE-native version.

## 1.1 Authority / conflict resolution

When this master prompt conflicts with an older draft, use this precedence:

```text
1. current repository truth
2. this v3.0 master prompt
3. latest *-(1).md / chat-scoped-changes.md surface specs
4. RUNE-EXECUTION-UX-HARNESS-MAXXING-SPEC-v1.0.md
5. older drafts / implementation notes
```

Do not mechanically implement a stale design simply because a file exists.

Resolved product decisions:

```text
Assistant responses use an OPEN CANVAS, not card soup.
The COMPOSER is the primary liquid-glass card.
Goals stay integrated with the composer.
Subagents appear inline as compact live collaborator rows.
Clicking a subagent opens its REAL LIVE CHILD CHAT in the right panel.
The child transcript does NOT expand/freeze inside the parent response.
Agent Activity is semantic, live, evidence-driven, and continuously informative.
Changed-file ownership is thread/turn aware; raw workspace dirtiness is never treated as chat ownership.
Usage is a developer cost inspector, not an analytics-dashboard billboard.
Skills use one RUNE registry with discovery adapters + runtime bridges.
Provider connection belongs to the selected provider INSTANCE.
```

---

# 2. Important facts already found in the latest checkout

Treat these as investigation leads that must be verified against the current working tree before changing them.

## 2.1 Running-send behavior currently contradicts Queue

Current code contains:

```text
apps/web/src/components/ChatView.logic.ts
```

with a helper equivalent to:

```ts
shouldInterruptRunningTurnBeforeSend(...)
→ true when phase === "running"
```

and the send path in:

```text
apps/web/src/components/ChatView.tsx
```

interrupts the current turn before sending the next prompt.

That is **not** the requested behavior.

Default behavior while running must be:

```text
new prompt
→ QUEUED
→ existing task continues
```

Only explicit **Steer** may interrupt current work.

Do not leave both behaviors fighting each other.

---

## 2.2 Simplified Activity exists but is currently too primitive

Current shared activity logic includes:

```text
packages/shared/src/agentActivity.ts
```

and currently relies heavily on:

```text
regex / keyword classification
generic hard-coded labels
same-phase merging
```

such as:

```text
Exploring the project
Researching the repository
Implementing the change
Running tests
Fixing remaining errors
Reviewing the result
```

Those labels are valid **fallback vocabulary**, not a complete semantic execution system.

RUNE must describe the **actual objective/object** where possible:

```text
Tracing selected-instance routing
Reading the provider service resolver
Updating custom gateway persistence
Checking Antigravity model discovery
Verifying message rewind behavior
```

Do not “complete” Simplified Activity by merely hiding raw tools behind generic labels.

---

## 2.3 Developer Trace setting exists; prove the actual trace experience exists

Settings currently expose concepts like:

```text
Simplified activity
Show developer trace
```

Do not assume the second one provides a real progressive-disclosure trace.

Verify that a user can actually inspect:

```text
raw tool name
parameters
stdout/stderr
timing
request purpose
provider
model
retry
cache
agent
turn
```

without turning off Simplified Activity.

If the setting is merely cosmetic or incomplete, finish it.

---

## 2.4 `/goal` is absent from RUNE's built-in composer command list

The composer currently has a built-in command union/list centered on:

```text
/model
/plan
/default
```

while the generated Codex app-server schema in the repo already exposes:

```text
thread/goal/set
thread/goal/get
thread/goal/clear
thread/goal/updated
thread/goal/cleared
```

Do not merely expose Codex's raw method.

Build a provider-neutral **RUNE Goal** system and map providers that support native goal semantics onto it.

---

## 2.5 Custom Gateway mode has a concrete persistence flaw to verify

Current service connection logic in:

```text
apps/web/src/components/settings/UniversalServiceSettings.tsx
```

infers connection mode from environment variable contents.

Selecting **Custom Gateway** currently creates empty URL/key environment rows.

The read function then sees:

```text
baseUrl empty
stored key absent
```

and can infer:

```text
native
```

on the next render.

This explains the reported behavior where selecting Custom Gateway falls back to the default/native option.

**Fix the data model.**

Do not patch the UI with a local boolean.

Connection mode must be explicit durable configuration.

Legacy inference may be used only as migration/fallback.

---

## 2.6 File Browser currently starts expanded

Current:

```text
apps/web/src/components/files/FileBrowserPanel.tsx
```

uses a tree configuration with:

```text
initialExpansion: 1
```

and its right-click menu currently exposes only a very small set of actions such as:

```text
Copy mention
Add to chat
```

The desired behavior is:

```text
collapsed by default
only reveal ancestors when a file is explicitly opened
remember intentional expansion
rich context menu
```

Verify exact current Pierre Trees behavior before changing APIs.

---

## 2.7 Pause/Continue is partly simulated through restart recovery

Current code has a pause-looking UI, but intentional interruption currently sets local paused state and Continue routes through the same hidden-nudge mechanism used for restart recovery.

That is not a sufficient long-term execution model.

Separate:

```text
Pause
Resume
Steer
Stop & abandon
Restart recovery
```

semantically and in the runtime.

Do not pretend a hidden user message is always equivalent to provider/session resume.

---

## 2.8 Structured native asker already has foundations

The current repo includes structured user-input flows for multiple adapters, including concepts such as:

```text
native ask_user
Claude AskUserQuestion
Codex request_user_input instructions
Cursor ask_question
xAI/Grok ask_user_question
user-input.requested
respondToUserInput
```

So the solution is **not** to build a second question system.

Finish the normalization so RUNE's composer-native asker is the canonical user experience.

---

## 2.9 Antigravity server-side diagnostics are more detailed than the current UX

The provider layer already distinguishes states such as:

```text
CLI missing
disabled
health check failed
version probe timeout
authentication needed
model discovery failed
model discovery timeout
no usable models
ready
```

Yet the product can still reduce this to a vague:

```text
Needs attention
```

Finish the UI so the exact remediation is obvious.

---

## 2.10 Latest RUNE assets are already in `assets/`

The latest source contains the new RUNE asset kit under paths similar to:

```text
assets/prod/
assets/dev/
assets/nightly/
assets/light/
assets/mark-png/
assets/svg/rune-mark.svg
assets/svg/rune-mark-white.svg
assets/svg/rune-mark-silver.svg
assets/svg/rune-animated-loader.svg
```

Use these as the canonical **RUNE product-brand assets**.

Do not replace provider logos, file-type icons, or functional icons with the RUNE logo.

Remove old/duplicate **product-owned branding** only after proving no required build/package target depends on it.

---

# 3. User decisions are already made — do not grill them again

The following decisions are approved.

Do not ask the user to answer them again.

```text
YES — RUNE Native should be the preferred execution path for raw API providers such as OpenRouter and custom gateways.

YES — Custom Gateway opens/persists a real editable provider/service configuration instead of falling back to default.

YES — file-tree folders should be collapsed by default and expose proper expand/collapse context actions.

YES — redesign affected side panels/provider surfaces around RUNE's current premium liquid-glass / metallic language.

YES — /goal should be a first-class RUNE composer command and goal state should be visible in the composer.

YES — Antigravity needs guided, actionable health/setup/recovery UX.

YES — this should be implemented as one integrated product pass, using internal checkpoints/phases rather than asking for permission after each phase.
```

Do not invoke `/grill-me` on this task.

The requirements are explicit.

The user previously experienced a provider/skill dumping questions like:

```text
Q1
Q2
Q3
...
```

into the chat.

That is exactly what we are fixing.

If a genuinely non-discoverable decision blocks implementation:

1. explore the repository first;
2. make a safe reversible assumption when possible;
3. only if a real user decision is unavoidable, use RUNE's **structured composer asker**;
4. never dump a numbered questionnaire into assistant prose when structured input is available.

---

# 4. Build a requirement ledger before implementation

Create:

```text
docs/rune/RUNE-MASTER-REQUIREMENTS-LEDGER.md
```

or the closest existing canonical RUNE docs location.

Each requirement gets:

```text
ID
Area
Requirement
Current state
Evidence
Root cause / gap
Implementation owner/files
Verification method
Final status
```

Example:

```text
CHAT-001
Send while running queues instead of interrupts
BROKEN
ChatView.logic.ts explicitly returns true for interrupt-before-send
...
```

The ledger must include **every section in this prompt**.

No requirement can disappear because the task is large.

At the end, all entries must be one of:

```text
VERIFIED_COMPLETE
BLOCKED_WITH_EVIDENCE
OUT_OF_SCOPE_WITH_EXPLICIT_REASON
```

There should be **zero silent TODOs**.

---

# 5. Git/worktree safety first

Before edits:

```text
git status
git branch --show-current
git log --oneline -20
git worktree list
```

Inspect all worktrees and uncommitted changes.

Do not:

```text
reset --hard
clean -fd
delete a worktree
discard untracked files
overwrite another agent's changes
```

If two worktrees contain unique valid RUNE changes:

```text
inventory
→ compare
→ test
→ reconcile safely into the intended branch/main
→ verify
```

Never use “clean tree” as an excuse to destroy work.

---

# 6. Gate Zero — the real app must run

Before broad polish, reproduce the current application.

Use the repository-required toolchain.

Current root package specifies approximately:

```text
Node ^24.13.1
pnpm 11.10.0
```

Use the actual current package metadata if it changed.

Run the relevant development app and capture:

```text
renderer errors
Electron main errors
server errors
provider errors
console warnings that indicate broken flows
```

Also verify the packaged desktop path before final completion.

If the earlier startup failure still exists:

```text
PrimaryEnvironmentRequestError
```

debug it root-cause-first.

Do not hide it with retries/sleeps.

The final release gate requires:

```text
development desktop launches
packaged Windows app launches
chat can create/open a thread
provider settings can load
native harness can run at least one real/fixture turn
```

where credentials/environment permit.

---

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

# 24. Fast path must be enforced

Targets:

## Greeting / trivial chat

```text
1 model request
0 auxiliary LLM calls
0 subagents
0 title model call
0 tool call
```

## Simple repository question

Minimal retrieval and typically 1 request.

## Tiny edit

Normally:

```text
1–3 requests
focused tools
focused verification
```

## Normal native coding turn

Default hard budget:

```text
≤ 4 logical requests
```

unless explicitly escalated by policy with a visible reason.

Do not use the selected expensive model for deterministic utility work.

---

# 25. Benchmark RUNE vs the external paths

Build/extend a repeatable benchmark suite.

At minimum compare:

```text
RUNE Native
Codex through RUNE
Claude Code through RUNE
previous RUNE baseline
```

Measure:

```text
verified correctness
wall time
TTFT
requests
retries
tool calls
context tokens
cache hit
time to first edit
verification time
RUNE overhead
cost where known
```

Use the same representative tasks.

Do not claim “1000x better”.

Make the **measured experience** radically better.

---

# 26. Native harness must become the preferred API path

For raw inference services:

```text
OpenRouter
OpenAI
Anthropic
Google
DeepSeek
OpenAI-compatible endpoints
custom gateways
```

the preferred architecture is:

```text
RUNE
→ RUNE Native Harness
→ raw provider API
```

not:

```text
RUNE
→ Claude Code
→ OpenRouter
→ model
```

unless the user explicitly selected Claude Code as the harness.

Keep external harnesses first-class, but separate:

```text
MODEL PROVIDER != AGENT PROVIDER
```

---

# 27. Finish the RUNE Native Harness end-to-end

Audit and repair:

```text
streaming
interrupt
pause/resume
queue/steer
structured user input
approvals
tool calls
parallel safe reads
ordered mutations
atomic patching
context compaction
request budget
retry policy
loop detection
verification
session continuation
usage telemetry
prompt cache telemetry
image input when model supports it
provider capability registry
custom gateway support
```

Do not leave “foundation” code disconnected.

A feature is not complete until a real thread can use it.

---

# 28. External harness request inflation

For Claude Code/OpenRouter and similar compatibility paths:

do not pin every internal role to the same expensive main model.

Separate:

```text
main model
fast utility model
subagent model
review model
```

when the external harness requires those roles.

Measure request count.

A simple prompt must not fan out into unexplained expensive calls.

---

# 29. Custom Gateway — fix the architecture

Do not infer durable gateway mode solely from whether URL/key strings are currently non-empty.

Add/extend a canonical connection/service config with explicit fields conceptually like:

```ts
mode:
  | "native"
  | "openrouter"
  | "api-provider"
  | "custom"

protocol:
  | "openai-compatible"
  | "anthropic-compatible"
  | ...

baseUrl
credentialRef
customHeaders
customModels
catalogStrategy
```

Use the existing RUNE settings/contracts style.

Secrets must remain securely stored/redacted.

## UX

Click Custom Gateway:

```text
selection stays Custom Gateway immediately
form opens
user can enter URL
user can enter credential
user can choose protocol
user can test connection
user can discover/add models
user can save/cancel
```

Do not fall back to default while the form is incomplete.

Add migration from old env-var-inferred config.

Add tests reproducing the current empty-value fallback.

---

# 30. Provider chooser architecture

Audit the entire flow:

```text
provider/harness chooser
→ instances list
→ selected instance
→ service connection
→ model picker
```

Expected:

- clicking a harness/provider management arrow opens its instances/management surface;
- it should not force immediate Add Instance unless no alternative UX is possible;
- Add Instance is explicit;
- each instance owns its connection/service configuration;
- multiple accounts are supported;
- each model picker entry resolves the correct instance;
- subagents inherit or explicitly override provider/service rather than silently using defaults.

Never let UI selection and runtime routing disagree.

---

# 31. Antigravity — replace “Needs attention” with a guided state machine

The server already detects useful states.

Expose them directly.

Canonical states:

```text
Disabled
Checking
CLI not installed
CLI path invalid
Version probe failed
Version probe timed out
Sign-in required
Authenticated
Model discovery failed
Model discovery timed out
No usable models
Ready
```

For every non-ready state show:

```text
what is wrong
what RUNE checked
what the user should do
one primary recovery action
secondary details
Retry / Refresh
```

Examples:

```text
Antigravity needs sign-in
[Open terminal and run agy] [Retry]
```

```text
Antigravity CLI not found
Expected: agy
[Install guide] [Choose binary] [Retry]
```

Do not show only “Needs attention”.

Do not make users read provider documentation to infer the problem RUNE already knows.

---

# 32. Provider icons

Audit all provider cards/model menus/instance selectors.

Requirements:

- actual provider icon where available,
- reliable local/fallback icon,
- no missing/broken image placeholders,
- no RUNE logo pretending to be a provider,
- consistent sizing,
- accessible label,
- no icon network request required for core UI if avoidable.

---

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

# 37. Native RUNE Grill / Grill Me workflow

Implement a **RUNE-native** interrogation workflow inspired by the best current `grill-me` / `grilling` interaction principles.

Do not vendor random GPL code into an incompatible repository.

If copying/adapting MIT-licensed content such as Matt Pocock's skills, preserve required attribution/license notices.

Prefer implementing the principles natively.

Aliases should include:

```text
/grill-me
/grill
$grill-me
natural language triggers such as "grill me"
```

where the parser architecture supports them safely.

---

# 38. Grill must use the native composer asker, not chat spam

This is non-negotiable.

Bad:

```text
assistant:
Q1 ...
Q2 ...
Q3 ...
Q4 ...
```

Good:

```text
RUNE native question panel in composer
Question 1 of N
recommended option
choices
custom answer
Back
Next
```

Questions arrive through the canonical:

```text
user-input.requested
```

flow.

Answers return as structured responses.

The transcript may show a compact event such as:

```text
✓ Clarified 4 design decisions
```

rather than polluting chat with a questionnaire.

---

# 39. Grill reasoning behavior

The workflow should:

1. inspect the plan/design;
2. build an internal decision tree;
3. discover facts from the repository instead of asking the user;
4. ask only real decisions/unknowns;
5. provide a recommended answer for each;
6. ask one dependent question at a time;
7. optionally batch only truly independent frontier questions through the native paginated asker;
8. adapt later questions to previous answers;
9. stop when the decision frontier is empty;
10. produce a compact decision ledger;
11. optionally hand that ledger to Plan/Goal.

Do not auto-run Grill on normal coding tasks.

It is a deliberate workflow.

---

# 40. Structured asker is a RUNE platform capability

Normalize:

```text
RUNE Native ask_user
Codex request_user_input
Claude AskUserQuestion
Cursor ask_question
xAI/Grok ask_user_question
future ACP question methods
```

into:

```text
UserInputRequest
```

The UI must not care which provider produced it.

All question-capable providers use the same composer-native answer surface.

If a provider cannot support structured user input, use a documented fallback—but do not regress providers that do.

---

# 41. Prompt/provider instructions must prefer structured asking

Current Codex developer instructions already attempt this.

Audit every provider/system prompt.

When structured asker is available:

```text
use it for material decisions
do not print numbered questionnaires
```

If the model can discover the answer from files/tools:

```text
discover it
```

instead of asking.

The runtime should expose the tool clearly enough that models actually use it.

Test with real provider fixtures.

---

# 42. Native Skills system — make it real

The latest checkout has only a small project skill set compared with the desired RUNE experience.

Build/finish a provider-neutral RUNE Skills Registry.

Discover compatible skills from:

```text
.agents/skills/
.cursor/skills/
.claude/skills/
.codex/skills/
supported user-global skill roots
```

without injecting every body into every prompt.

Use progressive disclosure.

---

# 43. Canonical skill metadata

At minimum:

```text
id
name
description
version
source
scope
paths
explicit-only / auto-invocable
aliases
required tools
optional tools
references
scripts
assets
license
compatibility
dependencies if RUNE supports them
```

Deduplicate the same skill discovered through multiple compatibility roots.

The composer screenshot must never show duplicate skill chips because the same capability was discovered twice.

---

# 44. Skill invocation

Support:

```text
/skill-name
@skill where RUNE already supports this convention
explicit skill picker
automatic activation when allowed
```

The UI shows active skills compactly.

Do not flood the composer with every available skill.

---

# 45. Native high-value coding skills

RUNE should ship/normalize a small high-value set rather than hundreds of filler skills.

Evaluate native RUNE equivalents for:

```text
systematic debugging
test-driven development
verification before completion
brainstorm / design discovery
grill-me
security review
performance investigation
frontend/design quality
accessibility review
code review
plan writing / execution
```

Do not force heavyweight process onto tiny tasks.

Activation depends on task complexity.

---

# 46. Integrate the external skill ecosystems intelligently

The user has previously identified:

```text
https://github.com/JuliusBrussee/caveman
https://github.com/petergyang/no-ai-slop
https://github.com/hardikpandya/stop-slop
https://github.com/affaan-m/ECC
https://github.com/pbakaus/impeccable
https://github.com/aws-samples/sample-apex-skills
```

Study the current versions and licenses.

Do not concatenate all prompts.

Extract reusable patterns into RUNE-native capabilities:

```text
context-efficient communication
anti-slop writing
anti-slop design
verification
workflow discipline
skill packaging
specialized references/scripts
```

If license terms do not permit direct code/content migration, reimplement the general idea without copying protected text/code.

Preserve notices when required.

---

# 47. Design anti-slop must be a runtime quality system

For UI work, do not rely on:

```text
"make it beautiful"
"don't make AI slop"
```

Activate relevant design guidance and verify the output.

Detect/avoid:

```text
card-in-card soup
random gradients
meaningless glass
giant radii everywhere
too many pills
weak hierarchy
template dashboard composition
low information density
duplicated labels
unnecessary icon noise
inconsistent spacing
bad responsive collapse
```

Then perform:

```text
render/browser check
responsive check
keyboard/focus check
accessibility check
visual hierarchy review
repair
```

---

# 48. RUNE brand assets — make `assets/` authoritative

Audit all product-owned branding targets:

```text
desktop icon
Windows icon
web favicon
apple touch icon
PWA
marketing favicon/icon
splash/loading
titlebar/product logo
installer/package artwork where relevant
```

Derive them from the latest `assets/` kit.

Use the existing export script or improve it into the canonical pipeline.

Run:

```text
pnpm icons:export
pnpm icons:check
```

or current equivalents.

Do not manually maintain drifting duplicate icons.

---

# 49. Animated RUNE loader

Use:

```text
assets/svg/rune-animated-loader.svg
```

for appropriate **brand-level loading moments**:

```text
app startup
primary environment boot
major workspace restore
```

Do not use a giant RUNE animation for every tiny spinner/button.

Small local operations should keep lightweight spinners/progress affordances.

Respect reduced motion.

---

# 50. Remove stale product branding carefully

Search for:

```text
T3
Synara
upstream product logo
old RUNE mark variants
obsolete favicons
old desktop icons
```

Distinguish:

```text
product-owned branding
third-party attribution/provider branding
internal compatibility names
```

Remove/replace only product-owned stale visuals/strings that should be RUNE.

Do not break required upstream license/attribution or provider identity.

---

# 51. Right-side panels need one premium RUNE shell

Audit all current right-panel surfaces:

```text
Environment
Files
Diff
Terminal
Browser/Preview
Pull Request
Agents
other current panels
```

They should feel like parts of one professional IDE.

Unify:

```text
header geometry
icon buttons
resizing
close/back behavior
keyboard focus
section spacing
scrollbars
loading state
empty state
error state
motion
liquid-glass treatment
```

Do not put every panel inside a heavy floating card.

The UI must remain dense and useful.

---

# 52. Environment Cockpit

Complete the Environment overview described in the existing spec.

Contextual sections:

```text
Changes
Workspace
Actions
Servers
Agent
Agents
Repository
Pull Request
Recap
```

Only show relevant sections.

Do not create ten settings toggles.

Default:

```text
Smart
```

Optional:

```text
Compact
Custom
```

---

# 53. File Browser — correct expansion behavior

Default open:

```text
root visible
folders collapsed
```

Do not auto-expand the first level.

When an external action opens:

```text
src/foo/bar.ts
```

expand only:

```text
src/
src/foo/
```

to reveal that file.

Do not expand unrelated siblings.

Remember user expansion state per workspace/session where appropriate.

Search mode must not destroy expansion state.

Refresh must not explode the tree open.

---

# 54. File Browser right-click menu

Add icons and context-aware actions.

For folders, useful actions may include:

```text
Open / focus
Add folder to chat
Copy mention
Copy relative path
Reveal in Explorer/Finder
Expand
Collapse
Expand descendants / Expand all
Collapse descendants / Collapse all
Refresh
```

For files:

```text
Open
Open preview/editor
Add to chat
Copy mention
Copy relative path
Reveal in Explorer/Finder
Open diff if changed
```

Only show actions that are actually available.

Use icons consistently.

Keyboard accessible equivalents must exist for essential actions.

Do not create a giant context menu full of dead items.

---

# 55. Side-panel buttons

Audit unclear icon-only buttons.

Every important button needs:

```text
clear icon
tooltip
accessible name
hover/focus state
pressed/selected state when relevant
```

Use existing functional icon sets.

Use RUNE brand art only for RUNE identity.

---

# 56. Actions 2.0

The repo already has project scripts/actions foundations.

Do not rebuild from scratch.

Finish:

```text
auto-discovery from package.json/rune.json/workspaces
categories
icons
keybindings
run-on-worktree creation
process registry
live status
terminal/output
preview URL
agent-callable semantic action ID
approval policy
```

Example:

```text
Test
Build
Typecheck
Lint
Dev server
Storybook
Database
Custom
```

Agent should be able to call:

```text
run_action("test")
```

instead of rediscovering the shell command every time.

---

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

# 61. Provider Handoff

Finish the Handoff concept.

User can move active work between:

```text
RUNE Native
Codex
Claude Code
OpenCode
Antigravity
Pi
other supported harnesses
```

Compile a structured handoff packet:

```text
goal
current objective
completed tasks
pending tasks
findings
decisions
relevant files
changed files
diff
commands
verification
workspace/worktree
checkpoint
active skills
```

Do not paste the full transcript blindly.

Source session remains inspectable.

---

# 62. Prompt / Context / Tool compiler

Finish the intelligence multiplier architecture.

Do not use one giant universal system prompt.

Compile:

```text
base RUNE contract
provider/model dialect
execution profile
task bundle
project rules
selected skills
minimal tool schemas
context packet
turn/goal state
```

Stable prefix first for caching.

Dynamic content later.

---

# 63. Context planner

Retrieval order:

```text
exact file/path
→ ripgrep
→ symbols/LSP
→ AST/import graph
→ diagnostics/tests
→ semantic retrieval
→ graph expansion
```

Do not semantic-search everything.

Cache repository intelligence by revision/hash.

Avoid repeated unchanged reads.

---

# 64. Tool compiler

Expose only tools relevant to the task/profile.

Prefer compound tools:

```text
workspace_snapshot
search_many
read_many
symbol_query
apply_patch
run_checks
diff
git_status
run_action
ask_user
```

Do not make models choose between 70 irrelevant tools.

---

# 65. Observation store / context hygiene

Do not resend giant logs and repeated tool results.

Store observations by:

```text
ID
hash
source
revision
size
secret classification
```

Inject:

```text
bounded excerpt
structured summary
reference
```

Expand only when needed.

---

# 66. Provider-neutral errors

Create/finish a useful error taxonomy.

Examples:

```text
provider_transport
provider_auth
provider_rate_limit
provider_model
provider_setup
tool_validation
tool_execution
approval_denied
patch_conflict
verification_failed
session_lost
queue_recovery
handoff_failure
environment_boot
internal_runtime
```

UI should translate these to actionable states.

Do not show raw minified stacks as the primary experience.

Developer details remain available.

---

# 67. Recoverable UX

Examples:

```text
Provider connection was lost.

Queued prompts are safe.
Current file changes are preserved.

[Retry] [Switch provider] [Open trace]
```

```text
Antigravity needs authentication.

[Open terminal] [Retry]
```

```text
Custom gateway could not discover models.

[Edit connection] [Use custom model slug] [Retry]
```

No dead-end “Something went wrong”.

---

# 68. Settings cleanup

Audit all settings added during RUNE development.

Classify:

```text
meaningful
advanced but useful
duplicate
debug-only
filler
dead
```

Keep the product curated.

Do not add a toggle for every environment subsection/activity row.

Advanced diagnostic controls belong in Diagnostics/Developer areas.

---

# 69. UX audit — find bad states, not just listed bugs

Run the actual product and inspect:

```text
first launch
new chat
existing chat
long-running turn
queued turn
paused turn
failed turn
message edit
message delete
goal
slash commands
structured question
approval
provider settings
custom gateway
Antigravity
model picker
skills
right panels
file browser
diff
subagents
handoff
app restart
```

For each, inspect:

```text
empty state
loading state
error state
success state
focus
keyboard
hover
narrow layout
dark theme
light theme where supported
reduced motion
```

Fix obvious broken UX in the affected architecture.

Do not use this as permission for unrelated redesign.

---

# 70. UI bar

RUNE should feel:

```text
professional IDE
premium minimal
high information density
quiet liquid glass
restrained violet
crisp separators
clear hierarchy
low visual noise
fast motion
```

Not:

```text
AI dashboard
giant cards
excess glass
glowing borders
random gradients
tons of pills
```

---

# 71. Performance — UI

Measure before and after.

Do not allow:

```text
full timeline rerender on every token
all hidden child chats rendering live
large-panel blur repainting continuously
file-tree full rebuild on unrelated activity
provider list polling every render
```

Use:

```text
localized subscriptions
memoization
stable IDs
batching
virtualization where useful
event-driven updates
```

---

# 72. Performance — background traffic

Audit current background activity/presence/health requests.

The hosted metrics previously showed significant Edge Requests / Function Invocations.

Do not equate those with model requests.

Classify them:

```text
interactive API
WebSocket/subscription
presence/lease
provider health
VCS
telemetry
preview
background refresh
```

Measure route frequency.

Prefer piggybacking presence/state changes on existing persistent connections where safe.

Do not blindly delete health checks.

---

# 73. Startup/release errors

Run the application often during this pass.

Any startup error, router error, provider crash, unhandled promise rejection, hydration issue, or desktop IPC error encountered in affected flows must be:

```text
reproduced
root-caused
regression-tested
fixed
```

Do not accumulate “known harmless console errors”.

If genuinely harmless, prove why and remove/noise-suppress at the correct boundary.

---

# 74. Test strategy

For bugs:

```text
reproduce
→ failing regression test
→ minimal root-cause repair
→ pass
```

For new architecture:

```text
contract test
→ state-machine test
→ component interaction test
→ end-to-end/smoke verification
```

Do not test only snapshots.

---

# 75. Required queue/message tests

At minimum:

```text
normal send while running queues
normal send does not interrupt
steer interrupts safely
pause produces resumable state
continue resumes same objective
stop-abandon does not resume
queue order
queue reorder
queue edit
queue delete
queue reload persistence
rapid double submit
message inline edit cancel
message edit → rewind & resend
message edit → keep changes & new prompt
message delete confirm
message delete cancel
```

---

# 76. Required activity tests

Fixture real event streams.

Verify:

```text
repeated searches group semantically
reads + search can resolve to one discovery
file patch shows actual file/object
verification gets specific label
failed operation stays visible
waiting for approval is not Working
waiting for user is not Working
paused is not Working
subagent uses same renderer
raw trace remains available
```

No test should only assert the words “Exploring the project”.

---

# 77. Required goal tests

```text
/goal creates goal
goal chip appears
goal survives rerender
goal survives supported reload
goal updates
goal completes
goal clears
Codex-native goal mapping works where available
non-Codex provider still receives RUNE-owned goal
no dead command on unsupported provider
```

---

# 78. Required Grill / asker tests

```text
/grill-me invokes RUNE workflow
question renders in composer-native asker
no numbered Q list in chat
recommended answer visible
custom answer works
back/next works
repo-discoverable fact is not asked
answers change later questions
exit works
decision summary emitted
provider-native ask tools normalize into same UI
```

---

# 79. Required Custom Gateway tests

Reproduce the known bug:

```text
select Custom Gateway
URL empty
key empty
rerender
```

Expected:

```text
still Custom Gateway
```

Then:

```text
save valid OpenAI-compatible URL
save credential
select model
start RUNE Native thread
request goes to chosen gateway
```

Also:

```text
invalid URL
auth failure
model discovery failure
manual model slug
cancel edit
legacy config migration
```

---

# 80. Required Antigravity tests

Fixture:

```text
binary missing
version failure
timeout
unauthenticated
models failure
models timeout
empty model list
ready
```

For each:

```text
server snapshot correct
UI headline specific
UI detail specific
recovery action present
retry works
```

No generic-only “Needs attention” acceptance.

---

# 81. Required file-browser tests

```text
opens collapsed
selected external file expands only ancestors
refresh does not expand everything
search does not corrupt expansion state
right-click folder shows expand/collapse actions
right-click file has correct actions
expand all works
collapse all works
keyboard/focus remains sane
```

---

# 82. Required assets tests

Run canonical export/check.

Verify all actual app targets use current RUNE assets.

No stale product icon in:

```text
desktop taskbar/dock
installer
web favicon
PWA
marketing
startup/loading
```

where those targets are part of this checkout.

---

# 83. Required native harness tests

```text
hi = 1 inference request
simple question = no utility LLM
tiny edit = bounded requests
request budget cannot silently overflow
duplicate reads dedupe
parallel safe reads actually parallelize
mutations stay ordered
ask_user works
approval works
interrupt works
pause/resume works
custom gateway works
OpenRouter direct works with fixture/real credential when available
errors are recoverable
```

---

# 84. Required provider-routing tests

```text
selected instance stays selected
service connection stays selected
subagent inherits intended instance
explicit override works
Custom Gateway does not revert to default
OpenRouter native path does not unnecessarily invoke Claude Code
external Claude Code path still works when explicitly chosen
```

---

# 85. Required subagent tests

Treat the previously supplied 23-point Sub-Agent acceptance list as mandatory, including:

```text
two agents appear
live status
click A opens real child
A keeps running when closed
B independent
message goes only to B
steer B
A unaffected
results flow to parent
failure inspectable
reload persistence
nested agent inspectable
```

Stress:

```text
rapid spawn
simultaneous completion
approval
provider failure
many agents
thread switch
restart
```

---

# 86. Accessibility

All new/changed core controls require:

```text
keyboard operation
visible focus
screen-reader label
status not encoded only by color
reduced motion
contrast
```

Context menus need keyboard equivalents for essential actions.

---

# 87. Do not ask the model to narrate what runtime already knows

System/prompt/compiler instructions should discourage repetitive prose:

Bad:

```text
Now I am going to read the files.
Now I will run tests.
```

Runtime already knows that.

Use assistant prose for:

```text
important reasoning
discovery
decision
blocker
result
```

Activity UI handles mechanical status.

---

# 88. Final response quality

RUNE's agent final response should be compact and evidence-based.

Example:

```text
Done

Fixed custom gateway persistence and provider-instance routing.

Changed
3 files

Verified
18 focused tests
typecheck
desktop smoke

Not verified
live Antigravity account
```

Do not repeat every activity.

---

# 89. Implementation ordering

Use internal checkpoints/commits in this dependency order unless current code proves a better one:

```text
0 baseline + startup health
1 requirement ledger
2 execution state correctness
   queue / pause / resume / steer / stop
3 message edit/delete/checkpoints
4 native harness/provider correctness
5 Custom Gateway + provider routing
6 structured asker + goal + command registry
7 native skills + Grill
8 semantic activity + inline diff receipts
9 subagent child threads
10 Environment/right panels/file browser/actions
11 Antigravity guided UX
12 assets/branding/loading
13 performance optimization
14 full UX/accessibility sweep
15 packaged release verification
```

Do not polish UI on top of incorrect runtime state.

---

# 90. Parallelism policy

You may use subagents for independent audits such as:

```text
provider routing
chat state machine
activity UI
file browser
skills
```

but:

- no two writer agents own the same files simultaneously;
- parent retains requirement ledger;
- reuse before spawning more;
- subagents return structured findings;
- no agent swarm for simple work.

---

# 91. No fake completion

Before saying a requirement is done, show its evidence in the ledger.

Examples:

```text
code path
test name
manual scenario
benchmark
screenshot if relevant
```

If something cannot be verified because credentials/platform are unavailable:

```text
BLOCKED_WITH_EVIDENCE
```

and provide the exact remaining verification command/scenario.

Do not change it to “done”.

---

# 92. Full verification commands

Use current scripts, likely including:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:desktop
pnpm test:desktop-smoke
pnpm release:smoke
pnpm icons:check
```

Run focused suites during development before expensive full gates.

Use the repository's actual current commands if changed.

Do not run broad expensive checks after every tiny edit.

---

# 93. Packaged app verification

The final proof is not Vite/unit tests.

Build the normal Windows artifact if the environment supports it:

```text
pnpm dist:desktop:win:x64
```

or current release command.

Launch it.

Verify:

```text
startup
thread open/create
composer
provider selection
right panels
settings
native harness fixture/real path where available
```

The packaged `rune://app` path must not break behavior that dev mode passes.

---

# 94. Before/after benchmark report

Create:

```text
docs/rune/RUNE-MAXXING-BENCHMARK-REPORT.md
```

Include before/after for representative tasks:

```text
Greeting
Repository question
Tiny edit
Normal bugfix
Frontend task
```

Report:

```text
wall time
TTFT
model requests
tool calls
RUNE overhead
verification time
context tokens
retry count
```

Do not fabricate missing provider telemetry.

---

# 95. Final implementation report

Create:

```text
docs/rune/RUNE-MASTER-IMPLEMENTATION-REPORT.md
```

Include:

```text
requirements total
verified complete
blocked
major root causes fixed
architecture changes
files/modules created
tests
benchmarks
remaining risks
packaged-app verification
```

Link every blocked item back to the ledger ID.

---

# 96. Completion gate

Do not stop while any of these are known broken:

```text
normal send interrupts previous work
queue loses prompts
pause cannot continue
edit/delete controls are nonfunctional
edit automatically rewinds without user choice
Custom Gateway reverts to default
/goal absent/nonfunctional
structured question renders as chat questionnaire
/grill-me bypasses native asker
Simplified Activity is only generic regex labels
developer trace inaccessible
changed lines invisible from the execution flow
file browser explodes folders open
Antigravity says only Needs attention
provider icon is missing
subagent is not a real persisted nested child thread
subagent card cannot open the same real child thread in the right panel
nested child thread cannot open as a normal full chat from the sidebar
RUNE Native cannot run direct API models correctly
simple native prompt fans out into unnecessary requests
stale product branding is shipped
packaged desktop app fails startup
```

---

# 97. Final manual experience script

Before completion, perform this walkthrough in the real app:

```text
1. Launch RUNE.
2. Open a repository.
3. Confirm file tree starts calm/collapsed.
4. Open a file from search and verify only its ancestors expand.
5. Create a chat.
6. Send a coding task.
7. Observe specific semantic activity, not raw tools.
8. Observe actual changed-file / line-diff receipt.
9. While it is running, submit a second prompt normally.
10. Confirm it queues and first task continues.
11. Promote queued prompt to Steer.
12. Confirm safe steer and previous objective remains.
13. Pause.
14. Confirm play/Continue state.
15. Continue and confirm real continuation.
16. Edit an earlier user message inline.
17. Choose Keep changes & send as new.
18. Repeat and choose Rewind & resend.
19. Delete a message and confirm destructive behavior is explicit.
20. Run /goal and confirm goal appears in composer.
21. Run /grill-me and answer through native composer UI.
22. Open Developer Trace and inspect actual tool/request details.
23. Spawn at least 3 subagents from one parent.
24. Confirm each is created as a real nested child thread under that parent in the sidebar.
25. Click one child from the parent's inline collaborator row and inspect the live child chat in the right panel.
26. Click the same child in the sidebar and confirm the SAME thread opens as a normal full chat.
27. Send a message directly to the child and prove the parent does not receive it.
28. Spawn a nested child from that child and verify recursive hierarchy.
29. Return to the parent and verify all child statuses update live.
24. Open Environment.
25. Open Files/Diff/Terminal and verify consistent panel shell.
26. Right-click folder and use collapse/expand.
27. Open provider settings.
28. Select Custom Gateway and verify it does not revert.
29. Inspect Antigravity; verify exact remediation.
30. Select RUNE Native + API/OpenRouter fixture or real connected model.
31. Run "hi" and prove one inference request.
32. Restart RUNE and confirm persisted queue/goal/thread state where specified.
```

Record failures and fix them.

---

# 98. Quality bar

This is not complete when RUNE “has the same feature”.

It is complete when the experience is coherent.

The final mental model should be:

```text
Send while busy
→ Queue

Need immediate redirect
→ Steer

Need temporary break
→ Pause

Want to resume
→ Continue

Want to abandon
→ Stop

Need clarification
→ Native asker

Need long-lived objective
→ Goal

Need design interrogation
→ Grill

Need details
→ Expand activity

Need raw internals
→ Developer Trace

Need another worker
→ Subagent

Need another harness
→ Hand off

Need workspace state
→ Environment
```

If any interaction violates that mental model, fix it.

---

# 99. Product principle

RUNE should feel:

> **Simple on the surface, extremely sophisticated underneath.**

A vibe coder sees:

```text
● Fixing provider routing
```

A developer expands:

```text
✓ Found gateway fallback
● Persisting connection mode
○ Verify
```

An expert opens:

```text
Request #2
OpenRouter
GPT-5.6 Luna
TTFT 612ms
17.8k cache hit
search_many 71ms
apply_patch 12ms
```

Same runtime.

Three depths.

---

# 100. Final response to the user

When all work is complete, do not send a giant narrative.

Return:

## Completed
Number of requirements verified.

## Major fixes
The 8–15 highest-impact repairs.

## Performance
Before → after benchmark table.

## Verification
Exact high-level pass counts and packaged-app result.

## Blocked
Only genuinely unverified items with reason.

## Artifacts
Paths to:

```text
RUNE-MASTER-REQUIREMENTS-LEDGER.md
RUNE-MAXXING-BENCHMARK-REPORT.md
RUNE-MASTER-IMPLEMENTATION-REPORT.md
```

Do not say “everything is fixed” unless the ledger proves it.

---

# Absolute implementation rules

```text
NO symptom patch without root-cause evidence.
NO UI-only fake for execution state.
NO duplicate orchestration architecture.
NO silent prompt loss.
NO silent rollback.
NO fake progress.
NO fake quota.
NO fake provider readiness.
NO hidden auxiliary LLM fan-out.
NO generic "Needs attention" when exact cause exists.
NO raw tool spam in default UI.
NO missing raw trace for experts.
NO hard-coded provider branching leaking across app layers.
NO giant skill prompt injection.
NO duplicate skill chips.
NO dead slash commands.
NO auto-expanded file tree.
NO stale RUNE branding.
NO completion without real app verification.
```

Proceed autonomously until the requirement ledger is closed.


---

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

# 104. RUNE Agent Team must be Codex-class or better

Treat this as release-critical.

A RUNE child/subagent is a REAL durable child thread with identity, parent relation, objective, context scope, provider/model, execution state, semantic activity, tasks, messages, tools, changed files, diff, approvals, structured questions, Turn Trace, and result.

It is NOT a tool call, hidden promise, one-line log, copied summary, or fake transcript.

Combine Codex's multi-thread/worktree command-center clarity, Cursor's clean-context foreground/background/isolated subagents, and RUNE's provider independence, native harness, semantic activity, handoff, and trace.

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

# 106. Clicking a child opens the REAL LIVE child chat in the right panel

Non-negotiable.

Do NOT expand a frozen/full child transcript inline in the parent response.

Clicking a collaborator opens the actual child thread using the same RUNE chat architecture in the existing IDE right panel.

Wide layout keeps parent and child side by side. Medium uses a resizable overlay/sheet. Narrow uses a full-width child conversation with Back.

Parent preserves scroll, draft, and state.

The child reuses the normal timeline, semantic activity, tasks, Queue, Steer, Pause/Continue, Stop, structured asker, approvals, changed files, Diff, and Developer Trace.

Do not build a second miniature chat implementation.

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

# 107. Child rendering must be live when open, cheap when closed

When open, stream messages, activity, tasks, file receipts, approvals, and questions live.

When closed, do NOT render a hidden full transcript token-by-token. Project only compact structured status into the parent: state, current activity, elapsed, files, tasks, blocker, result.

Opening mounts/hydrates the real child history and continues live. Use events/subscriptions, not polling.

---

# 108. Child-agent context is intentionally scoped

Workers normally receive objective, relevant facts/files, constraints, tools, active skills, expected result contract, and parent-goal reference—not the entire parent transcript.

Clean context is a feature. Allow wider inheritance only when required. Record the scope decision in Developer Trace.

---

# 109. Subagent execution modes

Support Foreground, Background, Isolated worktree/environment, and Shared workspace.

Use isolated mode for parallel writers, independent experiments, risky changes, and fresh verification. Shared workspace suits read-heavy or coordinated non-conflicting work.

The orchestrator chooses by risk/ownership. User can inspect/override where useful.

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

# 111. Parent consumes structured worker state, not transcript polling

Maintain one canonical AgentThreadRegistry/equivalent containing running/waiting/paused/completed/failed, objective, current semantic activity, tasks, findings, changed files, verification, blockers, question/approval state, and result summary.

Push updates to parent orchestration. The parent must not burn inference calls repeatedly asking workers what they did.

---

# 112. Parallel writers must not collide

Estimate likely file/scope ownership before spawning parallel writers.

If overlap is likely, prefer isolated worktrees, serialize, or make one worker review/read-only.

Never allow silent overwrite races. Surface conflicts, preserve both histories, and allow review/adoption.

---

# 113. Child result adoption must be first-class

For isolated work: Review changes / Apply or merge / Ask to revise / Open worktree / Discard.

Adoption uses canonical diff/checkpoint/worktree primitives. Normal users should not need obscure Git commands.

---

# 114. Agent switcher and nested hierarchy

Right panel includes a fast agent switcher with live states. Switching preserves scroll, draft, panel width, and thread state.

Nested workers display hierarchy rather than appearing as unrelated top-level sessions.

---

# 115. One registry, multiple projections

The same canonical child-agent registry drives parent inline rows, Agents right panel, Environment → Agents, notifications, Turn Trace, and mobile/remote status.

Inline row and right-panel child chat must always agree on status, activity, elapsed, tasks, changed files, blockers, and completion.

---

# 116. Queue, Steer, and Multitask are three different intents

Queue = do this after current work.
Steer = redirect current agent at the next safe boundary.
Multitask = run independently in parallel.

Once Queue/Steer/Subagents are stable, a queued item may offer `Run in parallel` when safe, creating a background isolated child where appropriate. Never auto-parallelize every queued message.

---

# 117. Agent profiles

Support reusable specialist profiles: name, role, description, model policy, tools, skills/mode, workspace policy, approval policy, result contract.

Keep built-in defaults few and excellent: Explorer, Reviewer, UI specialist, Performance investigator, Security reviewer, Test fixer.

---

# 118. Parent execution stays visually calm

Three child agents must not create three raw-log streams in the parent.

Normal parent view stays compact (`Agents · 3`, `● 2 working`, `✓ 1 done`) or shows the collaborator rows.

Clicking a child is the doorway to the real details. Progressive disclosure is a core RUNE advantage.

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

# 130D. Skills architecture reconciliation

Use `skills-folder-redirector(1).md` with:

```text
Skill files → source of CONTENT truth
RUNE Skill Registry → source of DISCOVERY / ACTIVATION / RUNTIME truth
```

Define Discovery Adapter (`provider/filesystem → registry`) separately from Execution Bridge (`registry → provider runtime`). Do not silently rewrite original skills. Do not ship speculative provider config keys without verified upstream support.

---

# 130E. Usage architecture reconciliation

Use `usage-page(1).md`. Usage is a developer cost inspector, not a dashboard billboard.

Prefer total + provenance + provider/model/time breakdown + click-through to real work + live turn/subagent cost.

Reject decorative forecast/top-three/micro-sparkline filler and fake zero-cost coverage.

Provider coverage must be capability-driven: cost available / tokens available / session telemetry available / unavailable. Never claim telemetry exists without evidence.

---

# 130F. Dashboard reconciliation

Use `dashboard-shell(1).md` for performance/layout direction with two corrections:

1. Do not depend on removed historical `usageOverview` trend concepts. Current-turn shell cost can read runtime usage; historical cost belongs on `/usage`.
2. Do not depend on an assistant `MessageCard`; assistant chat is open-canvas.

The polished-shell beta flag is a rollout mechanism, not permanent dual-shell maintenance: opt-in dogfood → release candidate → stable default → temporary rollback window → remove legacy duplication after confidence.

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

# 130I. Current competitor principles verified for this pass

Use current official product behavior only as interaction evidence.

Codex currently emphasizes multiple independent agent threads/projects, in-thread change review, and worktree isolation for parallel work.

Cursor currently documents clean-context subagents, foreground/background modes, isolated environments, `/goal`, multitask/worktrees, and steering that waits for safe tool boundaries instead of cutting an action mid-flight.

RUNE combines these with provider independence, RUNE Native, live semantic activity, inline change receipts, real child chats, cross-provider handoff, Turn Trace, structured asker, and chat-scoped ownership.

Do not claim superiority without benchmark/UX evidence.

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

# 159. PROVIDER INSTANCE SYSTEM — root-cause repair and redesign

This section is release-critical.

The current instance/provider behavior is proven confusing and broken for at least the Claude Code → OpenRouter path.

Observed behavior:

```text
With project/user Claude config manually pointing Claude Code to OpenRouter
→ Claude Code through RUNE works.

Remove that manual .claude settings configuration.

Create a RUNE Claude instance.
Select OpenRouter in RUNE.
Add OpenRouter credential.
Use that Claude instance.
→ runtime does not correctly use OpenRouter / behaves Native / fails.
```

Do not patch this by telling the user to recreate `.claude/settings.local.json`.

RUNE must own the instance runtime configuration.

---

# 160. Concrete code-level root-cause hypotheses to prove

Current repository review already identifies one direct defect:

```text
UniversalServiceSettings
→ writes service/env configuration

BUT

ClaudeAdapter runtime dispatch
→ reads separate `claudeService`
```

Therefore UI state and runtime routing can disagree.

The reviewed settings code explicitly identifies that Custom/OpenRouter values can be stored while runtime remains Native because the dispatch flag is incoherent.

Treat this as a known high-confidence bug and reproduce it with a failing test.

Investigate additional causes before declaring the whole issue fixed.

---

# 161. Current OpenRouter/Claude Code compatibility profile is richer than base URL + token

Current OpenRouter guidance for Claude Code shows gateway use may require more than:

```text
ANTHROPIC_BASE_URL
ANTHROPIC_AUTH_TOKEN
```

A robust OpenRouter Claude Code profile currently includes concepts such as:

```text
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN=<credential>
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=<credential>

CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK=1
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1

gateway/model slot mappings
tool-search/system-prompt compatibility settings where model capability supports them
```

Do NOT blindly hardcode every environment variable forever.

Create a versioned provider/harness compatibility profile owned by the Claude adapter.

The profile is capability-aware and updateable.

Important endpoint distinction:

```text
OpenRouter OpenAI-compatible API
https://openrouter.ai/api/v1

OpenRouter Anthropic-compatible Claude Code gateway
https://openrouter.ai/api
```

The instance UI should not force users to know this distinction.

The adapter compiles the correct endpoint based on protocol/harness.

---

# 162. Why manual `.claude/settings.local.json` likely worked

Treat this as a hypothesis to verify through reproduction.

The manual file may have supplied some combination of:

```text
gateway base URL
authentication token
cleared conflicting Anthropic API key
model aliases
gateway discovery flag
tool-search/system-prompt compatibility flags
```

while the RUNE-created instance currently supplies only part of that runtime environment or fails to select the OpenRouter dispatch mode at all.

Therefore the process can fall back to native Claude account/config or start with an invalid/incomplete gateway runtime.

Reproduce with a spawn-manifest diff:

```text
WORKING manual configuration
vs
BROKEN RUNE instance configuration
```

Redact secrets.

Compare every:

```text
environment variable name/config source
config root
CLI argument
model
cwd
home/config path
service mode
credential source
```

This diff should reveal the exact missing/overridden inputs.

---

# 163. External harness instance isolation

A RUNE instance must be a real isolated execution identity.

Do not define "instance" as merely:

```text
display name + selected service
```

Canonical hierarchy:

```text
Harness Definition
        ↓
Provider Instance
        ├─ Runtime home/config
        ├─ Service Connection
        ├─ Credential reference
        ├─ Model role profile
        ├─ Capability overrides
        └─ Environment policy
```

Example:

```text
Claude Code

├─ Claude Personal
│  Native Anthropic login
│  Sonnet
│
├─ Claude OpenRouter
│  OpenRouter connection
│  ox-alpha
│
└─ Claude Corporate
   Custom Anthropic-compatible gateway
   company credential
```

These instances must not overwrite each other.

---

# 164. Native means native — managed means managed

## Native harness account

```text
Claude Code
Service: Native
```

RUNE intentionally allows the harness to use the user's existing native auth/config.

Do not inject gateway credentials.

## RUNE-managed connection

```text
Claude Code
Service: OpenRouter
```

RUNE compiles the complete OpenRouter-compatible runtime environment for this specific instance.

Do not accidentally inherit conflicting native endpoint/auth variables.

## Custom Gateway

RUNE compiles the selected protocol/profile.

Never infer mode only from whether URL/key happens to be non-empty.

---

# 165. ProviderInstance model — one source of truth

Conceptually:

```ts
interface ProviderInstance {
  id: ProviderInstanceId;
  name: string;

  harnessKind: HarnessKind;
  connectionId: ServiceConnectionId | null;

  authMode: "native" | "rune-managed";
  runtimeHomePolicy: "native" | "isolated";

  modelProfileId: ModelProfileId | null;
  environmentOverrides: SafeEnvironmentOverride[];

  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Do not encode dispatch truth in one UI field plus unrelated env vars plus hidden adapter defaults.

---

# 166. ServiceConnection is reusable, but binding belongs to the instance

Conceptually:

```ts
interface ServiceConnection {
  id: ServiceConnectionId;
  name: string;

  kind:
    | "anthropic"
    | "openrouter"
    | "openai"
    | "custom";

  protocol:
    | "anthropic-compatible"
    | "openai-responses"
    | "openai-chat"
    | "provider-native";

  baseUrl?: string;
  credentialRef?: SecretRef;
  headers?: SafeHeaderTemplate[];
  modelCatalogPolicy?: ModelCatalogPolicy;
  compatibilityProfileId?: string;
}
```

A connection may be reusable across multiple instances.

But each instance explicitly binds to one.

Changing one instance must not silently reroute all instances unless they intentionally share the edited connection.

---

# 167. Model Role Profile

External harnesses often have internal model roles/aliases.

Do not force all of them to the same expensive model.

Conceptually:

```ts
interface ModelRoleProfile {
  main?: ModelBinding;
  fast?: ModelBinding;
  small?: ModelBinding;
  subagent?: ModelBinding;
  reviewer?: ModelBinding;
}
```

For Claude Code through OpenRouter, compile appropriate main/fast/family slots according to selected user policy and actual model capability.

If a non-Claude OpenRouter model cannot faithfully support a Claude-specific capability such as tool search, disable/adapt that capability rather than sending incompatible settings.

Record these decisions in Developer Trace.

---

# 168. Compiled Instance Runtime Manifest

Before spawning any external harness session, compile an immutable runtime manifest.

Conceptually:

```ts
interface InstanceRuntimeManifest {
  instanceId: ProviderInstanceId;
  harnessKind: HarnessKind;

  binaryPath: string;
  cwd: string;
  configHome: string | null;

  serviceConnectionId: ServiceConnectionId | null;
  protocol: string;

  modelBindings: Record<string, string>;

  environmentKeys: string[];
  environmentHash: string;

  credentialSource: "native" | "secret-ref";
  compatibilityProfileVersion: string;

  generatedAt: string;
}
```

The actual secret-bearing environment remains private.

Every session stores the manifest fingerprint.

Developer Trace can safely show:

```text
Instance       Claude OpenRouter
Harness        Claude Code
Service        OpenRouter
Protocol       Anthropic-compatible
Endpoint       https://openrouter.ai/api
Credential     rune-secret:openrouter-main
Model          stealth/ox-alpha
Config home    isolated
Profile        claude-openrouter@2026-08
```

without revealing the key.

This makes "why did it use Native?" immediately diagnosable.

---

# 169. Isolated config home per managed instance

For RUNE-managed external harness instances, avoid accidental global config bleed.

Where upstream supports it:

```text
instance
→ RUNE-managed isolated config/home
→ explicit safe projection of required user settings
→ explicit project cwd
```

For Claude Code, inspect current `CLAUDE_CONFIG_DIR` / `ClaudeHome` behavior and build on the existing home/config infrastructure rather than creating another ad-hoc home system.

Do not mutate the user's real `~/.claude` to switch instances.

Native-mode instance may intentionally use the user's normal native config.

Managed OpenRouter/custom instances should be isolated enough that:

```text
global native credentials
global base URL
old project settings
another RUNE instance
```

cannot silently override their routing.

Document any upstream config that cannot be isolated.

---

# 170. Environment precedence contract

Define and test exact precedence.

Recommended conceptual precedence for a RUNE-managed instance:

```text
1. mandatory RUNE instance compatibility env
2. instance explicit overrides
3. service connection compiled env
4. safe project environment
5. safe process environment
```

Conflicting sensitive routing variables from lower layers must be scrubbed when the managed instance owns them.

Examples:

```text
ANTHROPIC_BASE_URL
ANTHROPIC_AUTH_TOKEN
ANTHROPIC_API_KEY
OPENROUTER_API_KEY
model alias variables
```

Do not let an inherited global variable silently win.

For Native mode, preserve native harness behavior.

---

# 171. Session pinning

When a thread/session is created, resolve and pin:

```text
providerInstanceId
serviceConnectionId
model profile/version
runtime manifest fingerprint
```

Changing the default instance later must NOT silently change an existing thread.

User may explicitly:

```text
Switch instance
Hand off
Fork with another instance
```

Subagents inherit the parent instance by default unless the plan/task/agent profile overrides it.

---

# 172. Instance Manager UX

The instance menu should feel like managing execution identities, not environment variables.

Example:

```text
Claude Code
────────────────────────────

Claude Personal                       Ready
Native Anthropic
Sonnet

Claude OpenRouter                     Ready
OpenRouter
ox-alpha

Claude Corporate                      Needs setup
Custom Gateway
No credential

+ New instance
```

Click instance:

```text
Overview
Connection
Models
Permissions
Advanced
Diagnostics
```

Do not immediately open Add Instance when the user clicks the provider arrow.

The provider arrow opens the existing-instances list first.

---

# 173. New Instance Wizard

Flow:

```text
1. Choose harness
2. Name instance
3. Choose connection
   Native / OpenRouter / Custom / other compatible service
4. Authenticate / select credential
5. Choose model profile
6. Validate runtime
7. Save
```

RUNE auto-fills:

```text
correct protocol
correct base URL
compatibility profile
recommended environment
```

for known connections.

Advanced users may inspect/override safe fields.

Do not ask normal users to manually type known OpenRouter Claude-Code compatibility variables.

---

# 174. Validate Instance — real runtime validation

Add a provider-specific validation operation.

It validates the SAME compiled runtime manifest used by real sessions.

Do not validate one code path and execute another.

Success:

```text
Ready · 428 ms

Harness       Claude Code
Service       OpenRouter
Auth          Valid
Gateway       Reachable
Model         Available
Capabilities  Tool use ✓
```

Conflict:

```text
Configuration conflict

ANTHROPIC_API_KEY is inherited from the native environment
and conflicts with this OpenRouter-managed instance.

[Fix automatically]
[View diagnostics]
```

Do not expose secret values.

A validation may use a tiny real provider request when that is the only honest proof, but disclose that it can consume provider quota.

Prefer metadata/probe APIs where available.

---

# 175. Runtime diagnostics — show why routing happened

Every external-harness session gets a safe Routing section in Developer Trace:

```text
Requested
Claude OpenRouter

Resolved
Harness: Claude Code
Instance: claude-openrouter-1
Service: OpenRouter
Model: stealth/ox-alpha

Runtime
Config isolation: yes
Compatibility profile: claude-openrouter@2026-08
Endpoint: https://openrouter.ai/api

Source
Thread pinned instance
```

If fallback would occur, prevent/surface it explicitly.

---

# 176. No silent Native fallback

Hard invariant:

If user selected:

```text
Claude OpenRouter
```

and that instance is invalid:

```text
FAIL / Needs setup
```

Do NOT use native Claude account.

Silent fallback can charge the wrong account, use the wrong model, break privacy expectations, and make debugging impossible.

Fallback is allowed only when the user selected an explicit Auto/fallback policy.

---

# 177. Multi-instance scale

Support many instances without a wall of cards.

Provide:

```text
search
group by harness
favorite/pin
recent
status filter
duplicate instance
export safe config without secrets
```

Allow:

```text
5 Codex accounts
3 Claude connections
2 OpenRouter profiles
corporate gateways
```

without naming collisions.

Use human display names plus stable IDs.

---

# 178. Planner / Agent role bindings use provider instances

Plan Mode directly consumes the instance system.

Example:

```text
Planner
GPT-5.6 Sol · High
Instance: OpenRouter Planning

Workers
GPT-5.6 Luna · High
Instance: OpenRouter Build

Reviewer
Codex
Instance: Codex Account 3
```

Plan RoleBinding points to `providerInstanceId` and optionally overrides model/effort.

Planner and executor do not need the same harness/service/account.

---

# 179. Provider/harness compatibility matrix

Maintain a capability matrix.

Example concepts:

```text
Claude Code
  Native Anthropic              supported
  OpenRouter Anthropic gateway  supported
  Custom Anthropic gateway      supported
  arbitrary OpenAI-compatible   not automatically compatible

Codex
  OpenAI native                 supported
  OpenRouter Responses          supported
  custom Responses-compatible   capability-dependent

RUNE Native
  OpenRouter                    supported
  OpenAI                        supported
  Anthropic                     supported
  custom compatible APIs        protocol-dependent
```

Do not let the UI offer a combination the adapter cannot actually compile.

If experimental, label it and show the exact limitation.

---

# 180. Provider-specific compatibility profiles

Do not scatter gateway setup variables through UI components.

Create adapter-owned versioned profiles:

```text
ClaudeNativeProfile
ClaudeOpenRouterProfile
ClaudeCustomAnthropicProfile

CodexNativeProfile
CodexOpenRouterProfile
```

Profile responsibilities:

```text
protocol
known endpoint
required env
env variables to scrub
model-slot mapping
capability flags
validation strategy
diagnostic labels
```

UI chooses profile/connection.

Adapter compiles runtime.

---

# 181. Migration from existing instances

Inventory current:

```text
claudeService
environment variables
custom base URL
API-provider credentials
providerInstanceId
model selection
```

Migrate deterministically into:

```text
ProviderInstance
ServiceConnection
ModelRoleProfile
```

If ambiguous, mark `Needs review`.

Do not guess a credential source.

Preserve native instances.

---

# 182. Regression for the user's exact Claude/OpenRouter failure

Add a permanent regression fixture.

### Phase A — control

Project/user `.claude/settings.local.json` supplies OpenRouter-compatible environment.

Claude Code request succeeds.

Capture redacted spawn manifest.

### Phase B — remove manual file

Remove/ignore that project-local routing config.

Create RUNE instance:

```text
Harness: Claude Code
Connection: OpenRouter
Credential: fixture
Model: fixture model
```

Before fix, reproduce failure/native misrouting.

### Phase C — after fix

Same RUNE instance:

```text
compiled manifest uses OpenRouter profile
conflicting native routing env scrubbed
correct endpoint used
correct model mapping used
request reaches OpenRouter fixture
```

No project `.claude/settings.local.json` required.

---

# 183. Spawn-manifest differential test

Compare:

```text
working manual config
vs
RUNE compiled config
```

Post-fix RUNE manifest must contain required semantic properties.

Never assert raw secrets.

Assert:

```text
service mode
protocol
endpoint
credential source
required env key names present
conflicting env keys scrubbed
model role mapping
config-home policy
```

---

# 184. Instance isolation tests

At minimum:

```text
1. Claude Native and Claude OpenRouter coexist.
2. starting Native does not change OpenRouter config.
3. starting OpenRouter does not modify ~/.claude.
4. OpenRouter does not inherit conflicting Anthropic API key.
5. two OpenRouter instances can use different credentials.
6. two instances can use different model profiles.
7. switching default does not mutate existing thread.
8. new thread uses selected instance.
9. subagent inherits parent instance by default.
10. Plan task can override to another instance.
11. failed managed instance never silently falls back Native.
12. restart preserves all bindings.
13. secret values never appear in logs/trace.
14. validation and real spawn use same manifest compiler.
15. deleting one instance does not delete a shared connection still referenced elsewhere.
```

---

# 185. Claude/OpenRouter compatibility tests

Use current adapter behavior and a fixture/mock gateway where real credentials are unavailable.

Verify:

```text
correct Anthropic-compatible OpenRouter endpoint
auth token reaches child process
native Anthropic key is scrubbed for managed gateway mode
gateway model discovery flag where current Claude version requires/supports it
main model mapping
fast/small model role mapping
tool-search compatibility based on selected model capability
CLI arguments correct
working cwd correct
isolated/native config-home policy correct
```

Test current Claude Code version compatibility rather than assuming one static profile forever.

---

# 186. RUNE Native vs external harness choice

For a raw OpenRouter model, preferred:

```text
RUNE Native
→ OpenRouter
```

because RUNE controls tools, request count, context, subagents, and verification.

For a user who explicitly wants Claude Code behavior:

```text
Claude Code instance
→ OpenRouter compatibility profile
→ OpenRouter
```

Both must work.

Do not force raw API use through Claude Code.

Do not remove external-harness compatibility.

---

# 187. Instance management completion gate

Do not mark provider-instance work complete until:

```text
✓ UI selection equals runtime routing.
✓ manual .claude OpenRouter config is no longer required.
✓ reported Claude/OpenRouter failure is reproduced then fixed.
✓ OpenRouter connection uses current Claude-Code compatibility profile.
✓ managed instance routing cannot be overridden by unrelated native env.
✓ Native instance still uses native Claude auth correctly.
✓ multiple Claude instances work simultaneously.
✓ many accounts have stable independent IDs.
✓ threads are pinned to instances.
✓ subagents inherit/override correctly.
✓ Plan Mode role bindings can target any instance.
✓ no silent Native fallback.
✓ safe runtime manifest visible in Developer Trace.
✓ secrets are redacted.
✓ migration preserves existing users.
✓ focused tests pass.
✓ packaged desktop path uses same behavior.
```

---

# 188. Updated implementation ordering

Provider instance correctness is foundational for multi-model Plan Mode.

Use:

```text
0  startup health + baseline
1  requirement ledger
2  provider-instance runtime compiler
3  Claude/OpenRouter exact regression + fix
4  service connections + instance manager UX
5  native harness/provider correctness
6  queue / steer / pause / resume / stop
7  child-thread agent system
8  native asker / Grill
9  PlanSession + RoleBinding + Spec
10 PlanGraph + critic + plan editor
11 deterministic orchestrator
12 plan tasks → child workers
13 review / verification
14 semantic activity + diff receipts
15 Environment/right panels/files/actions
16 skills registry/pipelines
17 usage/trace
18 full UX/accessibility/performance
19 packaged release verification
```

Do not build sophisticated multi-provider planning on top of broken instance routing.

---

# 189. Required implementation artifacts

Create:

```text
docs/rune/PLAN-MODE-ARCHITECTURE.md
docs/rune/PROVIDER-INSTANCE-RUNTIME-ARCHITECTURE.md
docs/rune/CLAUDE-OPENROUTER-REGRESSION.md
```

The regression report contains:

```text
observed old behavior
reproduction
redacted manifest diff
root cause(s)
fix
tests
real/fixture verification
```

Do not include secrets.

---

# 190. Current external reference notes for implementer

Re-check these at implementation time because gateway/harness behavior changes.

Current OpenRouter material used when writing this requirement:

```text
Ori Harness announcement (2026-08-04)
https://openrouter.ai/blog/announcements/ori-harness/

Using OpenRouter with coding agents (2026-06-16)
https://openrouter.ai/blog/tutorials/any-coding-agent/
```

The important lesson is NOT "copy Ori".

The lesson is:

> external harness gateway compatibility is a versioned adapter concern, not a handful of fields the user must guess.

RUNE should compile and validate the right configuration for the selected harness/service/model.


---

# 191. RUNE LEARNED ACTIONS — repeated work becomes deterministic

This is a flagship efficiency subsystem.

The user should not spend model tokens rediscovering the same successful workflow repeatedly.

RUNE must be able to recognize:

```text
"release latest version"
"build the newest installer"
"ship the next Windows release"
"make another release"
```

as likely variants of the same reusable intent.

After a successful execution, RUNE may propose:

```text
You have completed a similar workflow 3 times.

Save as Action?

Release Windows version
Build → smoke test → package → verify

[Save Action]
```

Do NOT automatically create persistent Actions without user approval.

The central rule is:

> **Known deterministic work should be executed by RUNE code, not repeatedly re-planned by an LLM.**

---

# 192. Public product concept stays simple: Actions

Do not introduce a confusing taxonomy of:

```text
Macros
Recipes
Playbooks
Routines
Workflows
```

as five separate user-facing products.

Public surface:

```text
Actions
```

Internally, Actions may have execution kinds:

```ts
type ActionKind =
  | "command"
  | "recipe"
  | "agent"
  | "automation";
```

Examples:

```text
Command
Run tests

Recipe
Release Windows version

Agent Action
Review current branch

Automation
Run nightly verification
```

All share one Action Registry and consistent UI.

---

# 193. Actions 2.0 becomes the foundation

Do not build Learned Actions beside the existing project-script architecture.

Extend the current RUNE Actions / ProjectScripts system into one canonical provider-neutral Action Registry.

Current foundations such as:

```text
ProjectScriptsControl
rune.json actions/scripts
keybindings
run-on-worktree creation
preview URL metadata
```

should be migrated/extended rather than duplicated.

Canonical flow:

```text
Action Registry
        ↓
Action Executor
        ↓
Process Registry
        ↓
Environment
        ↓
Agent Activity / Turn Trace
```

The same action object must power:

```text
topbar Add action
composer suggestions
command palette
slash commands
Plan tasks
automations later
Environment → Actions
agent-callable run_action(...)
```

---

# 194. Learned Action lifecycle

Canonical lifecycle:

```text
USER REQUEST
     ↓
No matching Action
     ↓
Agent performs task normally
     ↓
RUNE records structured execution receipts
     ↓
Task verifies successfully
     ↓
Repeatability Analyzer
     ↓
Reusable candidate?
     ↓
User approves Save as Action
     ↓
Action Recipe created
     ↓
NEXT RUN
     ↓
Preconditions
     ↓
Deterministic execution
     ↓
Verification
     ↓
Done
```

Do not learn from failed/unverified execution as if it were canonical.

Failures may contribute negative evidence or repair knowledge, but never become the successful recipe by default.

---

# 195. Save the procedure, not the transcript

Never persist:

```text
assistant narration
raw chain-of-thought
generic "I will inspect..."
temporary tool chatter
provider-specific prose
```

as the reusable workflow.

Compile successful execution into a structured recipe.

Conceptual example:

```yaml
name: Release Windows version
scope: project

parameters:
  version:
    type: semver
    strategy: next_patch

preconditions:
  - repository_available
  - clean_or_acknowledged_worktree
  - required_toolchain_available

steps:
  - id: status
    action: git_status

  - id: version
    action: resolve_next_version

  - id: build
    action: run
    command: pnpm build:desktop

  - id: smoke
    action: run
    command: pnpm test:desktop-smoke

  - id: package
    action: run
    command: pnpm dist:desktop:win:x64

  - id: artifact
    action: verify_artifact
    pattern: "*.exe"

outputs:
  - installer
  - sha256
```

Use actual RUNE schema conventions; this is conceptual.

---

# 196. Action Recipe contract

Conceptually:

```ts
interface RuneAction {
  id: ActionId;
  name: string;
  description?: string;

  scope:
    | "project"
    | "workspace"
    | "global";

  kind:
    | "command"
    | "recipe"
    | "agent"
    | "automation";

  intentSignatures: IntentSignature[];

  parameters: ActionParameter[];

  preconditions: ActionPrecondition[];

  steps: ActionStep[];

  outputs: ActionOutput[];

  verification: VerificationRequirement[];

  approvalPolicy: ApprovalPolicy;

  fallbackPolicy: ActionFallbackPolicy;

  provenance: ActionProvenance;

  version: number;

  enabled: boolean;

  createdAt: string;
  updatedAt: string;
}
```

Actions must be owned by RUNE, not by one model/provider.

---

# 197. Provider and harness independence

A saved Action belongs to the project/RUNE runtime.

It must not depend on the provider that originally discovered it unless a step explicitly requires that provider.

Example:

```text
First discovered by
Codex

Later executed by
RUNE deterministic runtime

Later repaired by
Luna

Later invoked from
Claude Code thread
```

Same Action.

Deterministic steps execute through RUNE primitives:

```text
filesystem
git
process runner
project Actions
checks
artifact verification
Environment
```

not through provider-specific natural-language prompts.

---

# 198. Execution priority — deterministic before agentic

For every PlanTask or direct user request, RUNE should check:

```text
1. exact deterministic Action
2. compatible Recipe
3. known project Action
4. known Skill/tool workflow
5. agent execution
```

Use agents for uncertainty, judgment, adaptation, or missing procedures.

Do not assign Luna to:

```text
run the same verified release process again
```

if RUNE already owns a valid deterministic Action.

This is a major token/latency optimization.

---

# 199. Three Action execution modes

## 199.1 Deterministic

Preconditions pass.

Recipe version matches repository/tooling expectations.

Flow:

```text
run recipe
→ verify
→ done
```

Target model calls:

```text
0
```

## 199.2 Assisted repair

Small drift is detected.

Example:

```text
pnpm release:win no longer exists

Likely replacement:
pnpm dist:desktop:win:x64
```

RUNE may invoke one focused repair agent.

After successful verification:

```text
Update saved Action?
```

User approves recipe version update.

## 199.3 Agent fallback

The repository/workflow changed too much.

RUNE says:

```text
Saved Action no longer matches this project.

[Adapt with RUNE]
```

The agent investigates normally.

After successful verified execution, RUNE may propose a repaired recipe.

---

# 200. Preconditions are first-class

Never blindly replay shell history.

A recipe declares conditions.

Examples:

```text
repository exists
correct project
required binary available
supported OS
required branch policy
worktree cleanliness
credential available
release version not already published
server not already bound to conflicting port
```

Precondition results appear before execution:

```text
Release Windows version

✓ Repository
✓ Node 24
✓ pnpm 11
! Working tree has 3 uncommitted files

[Review changes]
[Run anyway]
```

Policy decides which conditions block.

---

# 201. Parameters replace unnecessary natural-language reasoning

Actions can expose typed parameters.

Example:

```text
Release Windows version

Version
● Next patch → 0.0.43
○ Next minor → 0.1.0
○ Custom

Targets
☑ Windows x64
☐ Windows arm64

Push release
☑ Yes

[Run]
```

Parameter types may include:

```text
string
number
boolean
enum
path
branch
semver
model
provider instance
secret reference
```

No model call is needed merely to parse known structured options.

---

# 202. Intent matching for repeated work

Do not rely only on exact prompt text.

Build a local/deterministic intent signature from evidence such as:

```text
normalized user intent
project identity
action topology
commands used
files typically touched
outputs
verification pattern
known parameters
```

Examples that may map together:

```text
release latest version
ship next Windows build
build the newest installer
make another RUNE release
```

Do not overmatch unrelated requests.

Use confidence thresholds.

---

# 203. Repeatability Analyzer

After a verified successful task, RUNE evaluates whether the workflow is reusable.

Signals:

```text
same/similar intent seen before
same action topology
stable commands
stable outputs
stable verification
low judgment requirement
few dynamic code edits
successful execution
```

Suggested policy:

```text
1 successful execution
→ record private candidate fingerprint

2 similar successes
→ increase confidence

3 strong matches
→ suggest Save as Action
```

The user can explicitly bypass the threshold:

```text
Save this workflow
```

or click:

```text
Save as Action
```

after any successful turn.

Do not send an LLM request just to decide whether a simple deterministic operation repeated.

Use local fingerprints/rules first.

---

# 204. Candidate preview before saving

When proposing a learned Action, show what RUNE actually intends to save.

Example:

```text
Save as Action?

Release Windows version

6 steps
✓ Check release state
✓ Resolve version
✓ Build desktop
✓ Smoke test
✓ Package installer
✓ Verify artifact

Parameters
Version

Approvals
Publish / push

[Edit]
[Save Action]
```

The user can remove dangerous/unwanted steps.

Never silently preserve an accidental command from one execution.

---

# 205. Action provenance

Every learned recipe stores provenance:

```text
created from thread
created from turn
created from provider/harness
successful run IDs
verification evidence
repository revision
user who approved
```

Developer details may show:

```text
Learned from 3 successful runs
Last validated at commit abc123
```

Do not bind future execution to that provider.

---

# 206. Recipe versioning and drift

Actions are versioned:

```text
Release Windows version v1
v2
v3
```

When repaired:

```text
v3

~ Build command updated
+ Added desktop smoke check
- Removed obsolete vp preflight
```

Keep previous versions for inspection/rollback.

A repository change may invalidate an old version without deleting it.

---

# 207. Compatibility fingerprint

Each Action may store a compatibility fingerprint containing non-secret structural facts:

```text
package manager
relevant package.json script hashes
tool versions
OS family
important config hashes
expected output locations
```

At run time:

```text
fingerprint still compatible
→ deterministic run

small drift
→ assisted repair

large drift
→ agent fallback
```

Do not hash the entire repository unnecessarily.

---

# 208. Failure memory without bad automation

Repeated failures are useful, but must not become recipe steps blindly.

Example first run:

```text
vp failed because executable was not on PATH
repo-local binary worked
```

A future recipe may encode:

```text
resolve executable from repo-local bin first
```

if verification proves that is the correct stable solution.

Do NOT encode:

```text
try broken command
wait for failure
then retry
```

unless failure itself is meaningful.

Learn the repaired procedure, not the accidental mistake.

---

# 209. Action step types

Prefer semantic RUNE steps over arbitrary shell blobs when possible.

Conceptual kinds:

```text
run_command
run_action
git_status
git_commit
git_push
read_file
write_file_template
resolve_version
verify_file
verify_artifact
run_checks
start_server
stop_server
open_url
wait_for_process
request_approval
agent_step
```

Raw command remains available as fallback.

Semantic steps improve:

```text
portability
observability
security
repairability
UI
validation
```

---

# 210. Agent steps inside Actions

A Recipe may include an agentic step only where judgment is inherently needed.

Example:

```text
Generate changelog from commits
```

could be:

```text
agent_step
profile: Release Writer
```

while build/test/package remain deterministic.

Do not make the whole recipe agentic because one step needs language generation.

Action trace should clearly show:

```text
5 deterministic steps
1 agent step
```

---

# 211. Security / approvals

Never learn/persist raw:

```text
API keys
tokens
passwords
cookies
secret env values
```

Store:

```text
credentialRef
```

Dangerous steps require explicit policy:

```text
push
publish
deploy
delete
production migration
secret mutation
```

Example:

```text
✓ Build
✓ Test
✓ Package

Needs approval

Publish release 0.0.43?

[Publish]
```

A saved Action is not permission to bypass safety.

---

# 212. Action-scoped permissions

Each Action declares required capability classes:

```text
filesystem read
filesystem write
git commit
git push
network
package install
deploy
secret access reference
```

The user can inspect them before saving/running.

A recipe cannot silently grow permissions on update.

Permission expansion requires review/approval.

---

# 213. Action Activity UI

A saved recipe must use the same Semantic Agent Activity system.

Example:

```text
Release Windows version                         3/6

✓ Check release state
✓ Prepare 0.0.43
● Build desktop                                1m 12s
○ Run smoke checks
○ Package installer
○ Verify artifact
```

Then:

```text
✓ Build desktop                                1m 34s
● Run smoke checks

18 checks running
```

Final:

```text
✓ Released 0.0.43

RUNE-Code-0.0.43-x64.exe
SHA-256  6A0B...

6/6 steps passed
```

No generic AI narration is required.

Developer Trace shows actual commands/processes.

---

# 214. Action UI — composer suggestions

If RUNE confidently recognizes a known Action:

```text
┌──────────────────────────────────────────┐
│ release the latest version               │
├──────────────────────────────────────────┤
│ Suggested Action                         │
│ ▶ Release Windows version                │
│   Usually ~4m · 0 model calls            │
└──────────────────────────────────────────┘
```

The user may:

```text
Run Action
Run with Agent instead
Dismiss
```

Never auto-run a consequential action merely because intent matched.

---

# 215. Command palette / slash integration

Actions are discoverable through:

```text
Command Palette
Run Action → Release Windows version

/actions

/release
```

where an Action explicitly owns an alias.

Do not create slash aliases for every random Action automatically.

Avoid collisions with built-in RUNE commands.

---

# 216. Topbar Actions

The existing:

```text
+ Add action
```

becomes the management entry point.

It should open:

```text
Actions

Release Windows version
Test
Dev server
Build
Typecheck

+ New Action
```

Users may:

```text
create
edit
duplicate
disable
delete
run
assign shortcut
view history
```

Learned Actions and manual Actions live together.

---

# 217. Environment → Actions

Environment cockpit shows current/recent Actions:

```text
Actions

● Dev server               Running
✓ Tests                    Passed
▶ Release Windows version
```

Click opens details/output.

Do not duplicate process state.

Read from the canonical Action/Process Registry.

---

# 218. Plan Mode integration

This is a major architecture requirement.

Before assigning a PlanTask to an AI worker, the deterministic orchestrator checks the Action Registry.

Example:

```text
TASK-18
Release Windows installer
```

RUNE finds:

```text
Release Windows version
```

Plan becomes:

```text
TASK-18

Executor
RUNE Action

Action
Release Windows version

Expected model calls
0
```

The planner may still override if the task differs materially.

This can dramatically reduce token usage in large plans.

---

# 219. PlanTask executor types

Extend PlanTask execution policy conceptually:

```ts
type PlanTaskExecutor =
  | { kind: "action"; actionId: ActionId }
  | { kind: "agent"; binding: RoleBinding }
  | { kind: "manual" };
```

The deterministic orchestrator handles Action tasks directly.

Do not spawn a child LLM agent thread for a deterministic Action unless the Action itself contains an agent step.

---

# 220. Action execution and child threads

A pure deterministic Action does not need a fake agent thread.

It should appear in the parent Plan/activity as:

```text
▶ Release Windows version
```

with process/activity detail.

If the Action escalates to agent fallback:

```text
Action needs adaptation
→ spawn real child agent thread
→ repair
→ return result
→ optionally update Action
```

This keeps the thread tree meaningful.

---

# 221. Skill integration

Actions and Skills are different:

```text
Skill
→ how to reason/do a class of work

Action
→ concrete executable procedure
```

A Skill may help create/repair an Action.

An Action may declare relevant Skills for its agent fallback.

Do not turn skills into deterministic macros.

Do not turn recipes into giant skill prompts.

---

# 222. Reusable workflow learning across providers

When multiple providers independently execute the same task, RUNE can improve confidence in the workflow.

Example:

```text
Codex run
Claude run
Luna run

all converge on:
build → test → package → verify
```

RUNE may recognize the stable deterministic core.

However, do not combine provider-specific incidental tool chatter.

Normalize to semantic execution receipts.

---

# 223. Action history

Each Action records run history:

```text
run ID
start/end
result
parameters
repository revision
step results
artifact refs
verification
model calls
cost
fallback usage
```

UI:

```text
Release Windows version

Last 5 runs
✓ 0.0.43    4m 12s    0 model calls
✓ 0.0.42    4m 08s    0 model calls
✓ 0.0.41    5m 01s    repaired
```

This gives the user confidence and makes regressions obvious.

---

# 224. Token and latency savings must be measured

For a workflow before conversion:

```text
model requests
input/output tokens
tool calls
wall time
RUNE overhead
```

After conversion:

```text
model requests
wall time
repair rate
```

Example target:

```text
Repeated deterministic release

Before
3 model requests
28k input tokens
2m reasoning overhead

After
0 model requests
deterministic execution
```

Do not fabricate savings.

Turn Trace / Usage should record real before-after data.

---

# 225. Recipe quality score

Internally calculate a confidence/quality score from:

```text
successful runs
verification coverage
stability of commands
stability of outputs
parameter clarity
failure rate
repository compatibility
```

Do not show a fake percentage prominently.

Use it to decide:

```text
suggest
run deterministically
require confirmation
escalate to agent
```

---

# 226. Never auto-learn destructive behavior

Do not suggest a learned Action from workflows dominated by:

```text
mass delete
production data mutation
credential rotation
irreversible migration
security-sensitive cleanup
```

unless the user explicitly requests saving it and appropriate approval/precondition policies exist.

Even then, destructive steps remain gated.

---

# 227. Scope and portability

Action scope:

## Project

Example:

```text
Release RUNE
Run DABT scanner suite
```

## Workspace

Useful when multiple project roots share the same workflow.

## Global

Example:

```text
Review current branch
Generate release notes
```

A Global Action must declare compatibility requirements.

Do not run a project-specific shell recipe globally merely because its name matches.

---

# 228. Export / source control

Project Actions should be optionally serializable into a safe project file such as:

```text
rune.json
```

or the repository's canonical Action config.

Never serialize secrets.

Store:

```text
credential reference name/id
```

rather than token.

Learned Actions should not silently modify source-controlled configuration.

User chooses:

```text
Save to project
Save privately
```

---

# 229. Action repair workflow

When a recipe fails:

```text
Step 3 failed
Build desktop

Reason
command not found
```

Offer:

```text
Retry
Open output
Repair Action
Run with Agent
```

`Repair Action`:

```text
spawn focused repair worker
provide recipe + failure + relevant repo context
find smallest compatible update
verify
show semantic Action diff
```

Example:

```text
Action update

- pnpm release:win
+ pnpm dist:desktop:win:x64

[Update Action]
```

Never rewrite the recipe invisibly.

---

# 230. Action diff

Action versions need a semantic diff UI.

Example:

```text
Release Windows version v3

~ Build command
  pnpm release:win
  → pnpm dist:desktop:win:x64

+ Verification
  desktop smoke test

- Removed
  obsolete vp preflight
```

Avoid raw JSON diff as the default.

Developer details may show underlying config.

---

# 231. Action suggestions should be low-noise

Do not constantly nag:

```text
Save as Action?
Save as Action?
Save as Action?
```

Rules:

```text
only after verified success
only above repeatability threshold
dismissal suppresses similar suggestion for a period
never interrupt active work
surface at natural completion point
```

User may globally disable learned-action suggestions without disabling Actions themselves.

---

# 232. Repeated task memory is NOT model memory

Do not solve this by adding:

```text
memory: "release uses pnpm build"
```

and then asking the model to read the memory and execute it.

That still burns tokens and remains nondeterministic.

The correct stack is:

```text
Memory
→ useful stable facts

Skill
→ reusable reasoning/process knowledge

Action
→ executable known workflow

Agent
→ uncertainty/judgment
```

This separation is mandatory.

---

# 233. RUNE Native Action Executor

The Action Executor should be deterministic RUNE code.

Responsibilities:

```text
validate parameters
evaluate preconditions
resolve secrets by reference
resolve project/workspace
run steps
emit structured activity
record process/output
respect approvals
stop/cancel
verify outputs
write run receipt
```

It should not require a model session.

---

# 234. Cancellation / pause behavior

Actions integrate with existing execution controls.

For safe interruptible steps:

```text
Pause
Continue
Stop
```

For atomic/non-interruptible operations:

```text
Finishing current atomic step…
```

then pause/stop at a safe boundary.

Do not kill package managers/build processes in a way that corrupts workspace state merely to satisfy instant Pause UX.

---

# 235. Queue / Steer behavior with Actions

If an Action is running:

Normal new prompt:

```text
Queue
```

Steer may:

```text
pause Action at safe boundary
→ run steer
→ resume Action if still relevant
```

if policy permits.

A destructive Action may require explicit confirmation before automatic resume.

The Action is part of the same execution controller, not a separate task system.

---

# 236. Subagent interaction with Actions

A child agent may invoke approved Actions:

```text
run_action("test")
run_action("build")
```

The child must not rediscover known commands.

Action execution receipts appear inside that child's live activity.

Parent receives structured child status without duplicated logs.

---

# 237. Built-in Action candidates

Do not preinstall dozens of filler actions.

High-value project-derived candidates may include:

```text
Dev server
Test
Typecheck
Lint
Build
Desktop build
Desktop smoke
Package
Release
Storybook
Database migration
```

Only expose what the repository actually supports.

Auto-discover from:

```text
package.json
workspace scripts
rune.json
known build tooling
```

and label discovered vs learned vs user-created.

---

# 238. Action source labels

Action details may show:

```text
Built-in
Discovered
Learned
User-created
Imported
```

This helps trust/debugging.

Do not clutter the normal quick-run list with these labels unless useful.

---

# 239. Learning boundaries

The learner may observe:

```text
RUNE tool/action receipts
commands
process outcomes
verification
diff/checkpoint metadata
```

It must not learn from:

```text
secret plaintext
hidden model reasoning
private provider internals
unverified generated claims
```

Store only what is required for repeatable execution.

---

# 240. Exact release-workflow acceptance test

Use the user's reported repeated task as a flagship test.

First run:

```text
"release the latest version"
```

Allow agent execution.

Suppose it discovers:

```text
repo-local executable required
version resolution
build
smoke
package
artifact verification
```

After verified success:

```text
Save as Action
```

Create:

```text
Release Windows version
```

Second run:

```text
"release the latest version"
```

Expected:

```text
RUNE suggests saved Action
user runs
no planning model call
no repository rediscovery
no repeated generic narration
same verified artifact workflow
```

If repository scripts changed:

```text
Action identifies incompatibility
focused repair path
does not silently fail/replan everything
```

---

# 241. Required Learned Action tests

At minimum:

```text
1. verified successful workflow can become Action.
2. failed workflow is not learned as canonical.
3. repeated intent matching handles paraphrases.
4. unrelated intent does not false-match.
5. deterministic recipe executes with 0 model calls.
6. parameters are validated locally.
7. precondition failure blocks/asks appropriately.
8. secret values are never serialized.
9. credentialRef resolves at runtime.
10. destructive step still requires approval.
11. action run emits Semantic Activity.
12. action run appears in Turn Trace.
13. action run appears in Environment.
14. action run history persists.
15. recipe versioning works.
16. compatibility drift is detected.
17. minor drift invokes focused repair.
18. repair requires approval before updating recipe.
19. large drift offers agent fallback.
20. PlanTask can resolve to Action executor.
21. Plan Action task does not spawn fake LLM child thread.
22. child agent can call approved Action.
23. user dismissal suppresses noisy repeated suggestions.
24. source-controlled export excludes secrets.
25. deleting Action does not delete historical run receipts unexpectedly.
26. two providers can invoke same RUNE Action.
27. Action remains valid after switching provider/harness when deterministic.
28. pause/continue respects safe step boundaries.
29. queued prompts remain safe while Action runs.
30. release workflow benchmark proves model/token reduction.
```

---

# 242. Learned Actions UX completion gate

Do not mark this complete until:

```text
✓ user can save a successful workflow as Action.
✓ repeated-task suggestion is useful and non-annoying.
✓ one-click run works.
✓ deterministic run uses no LLM by default.
✓ activity remains live throughout execution.
✓ exact commands/output remain available in Developer Trace.
✓ failures are actionable.
✓ repair workflow works.
✓ secrets never appear in recipe/export/trace.
✓ Actions work across providers/harnesses.
✓ Plan Mode prefers Actions before agents where correct.
✓ Environment and command palette use same registry.
✓ packaged desktop behavior matches dev.
```

---

# 243. Updated execution intelligence hierarchy

RUNE's execution decision stack is now:

```text
USER INTENT
    ↓
Can RUNE satisfy deterministically?
    │
    ├─ Exact Action
    │
    ├─ Compatible Recipe
    │
    ├─ Project Action
    │
    └─ Deterministic tool workflow
    │
    ▼
If no
    ↓
Does an activated Skill provide a known reasoning procedure?
    ↓
Agent / Subagent
    ↓
Verification
    ↓
Potential Learned Action candidate
```

This is how RUNE becomes faster over time without making the model itself "remember everything".

---

# 244. Updated product formula

RUNE's core execution system is now:

```text
Goal
+
Ask / Grill
+
Spec
+
Plan Graph
+
Actions
+
Skills
+
Agents
+
Verification
+
Memory
+
Turn Trace
```

with these responsibilities:

```text
Goal
→ what we are trying to achieve

Ask / Grill
→ resolve user decisions

Spec
→ what must be true

Plan
→ how work is decomposed

Action
→ known deterministic execution

Skill
→ reusable reasoning/process knowledge

Agent
→ uncertainty and adaptation

Verification
→ evidence

Memory
→ durable project facts/decisions

Turn Trace
→ exact observability
```

Do not blur these layers.


---

# 245. BLOCKING MILESTONE — Antigravity and RUNE Native must actually work

This supersedes any earlier section that treats Antigravity or RUNE Native as a mostly-complete foundation.

Current real-world evidence shows:

```text
Antigravity
→ thread/session failure
→ ProviderAdapterSessionNotFoundError
→ generic "Fixing remaining errors"
→ "Failed: the operation did not report a reason"

RUNE Native
→ reported as effectively nonfunctional in normal development use
```

This is release-blocking.

Do NOT continue polishing secondary settings, Plan Mode, Actions, or decorative UX while these execution foundations remain broken.

The priority becomes:

```text
1. make the selected provider/harness actually execute
2. preserve the real failure reason when it cannot
3. make retry/recovery correct
4. make model/provider identity visually correct
5. prove it in the packaged desktop app
```

A provider card that renders, model picker that opens, or adapter class that compiles does NOT mean the provider works.

---

# 246. Exact Antigravity failure currently observed

Reproduce this exact class of failure:

```text
ProviderAdapterSessionNotFoundError:
Unknown antigravity adapter thread: <thread-id>
```

followed by an activity failure such as:

```text
Fixing remaining errors

Failed: the operation did not report a reason
```

Do not treat the `SessionNotFoundError` as the root cause until lifecycle traces prove it.

It is highly likely to be a SECONDARY failure emitted after an earlier Antigravity process/session-start failure.

The repair must preserve and surface the ORIGINAL failure.

---

# 247. Current RUNE code — high-confidence Antigravity root-cause leads

Before editing, inspect the current checkout and compare it with the current public implementation.

The public RUNE Antigravity adapter currently has this lifecycle shape:

```text
startSession
→ spawn one long-lived `agy` process
→ sessions.set(threadId, ctx)
→ start stdout/stderr/exit readers
→ return connecting session BEFORE init completes

sendTurn
→ requireSession(threadId)
→ await ctx.ready
→ write JSON user event to long-lived stdin

process exit
→ ctx.stopped = true
→ sessions.delete(threadId)
```

Current source areas to inspect first:

```text
apps/server/src/provider/Layers/AntigravityAdapter.ts
apps/server/src/provider/antigravityProtocol.ts
provider lifecycle/orchestration service
provider health/runtime discovery
provider thread projection
ProviderAdapter errors
web provider/runtime error projection
```

Specific current-code evidence to verify:

## 247.1 Session is deleted on process exit

Current code conceptually does:

```ts
ctx.stopped = true;
sessions.delete(ctx.threadId);
```

inside `handleProcessExit`.

If the `agy` process exits during initialization or between orchestration calls, the next `sendTurn()` performs:

```ts
requireSession(threadId)
```

and can emit the exact observed:

```text
Unknown antigravity adapter thread
```

instead of the original process failure.

This is a high-confidence failure chain.

Prove it with a deterministic regression test.

## 247.2 `startSession()` returns before provider readiness

Current `startSession()` returns a session in:

```text
connecting
```

state after spawning readers.

Provider readiness only occurs after an `init` event resolves `ctx.ready`.

Test these races explicitly:

```text
startSession returns
→ process exits
→ sendTurn arrives

startSession returns
→ sendTurn starts
→ process exits before init

init and process exit cross

restart/replacement session
→ old process exits late
```

No stale process may invalidate a newer generation.

## 247.3 Actual Antigravity stderr is currently thrown away

Current stderr reading logic consumes chunks without preserving them.

That is unacceptable for a provider integration.

If `agy` exits because of:

```text
authentication
bad flags
unsupported CLI mode
bad model
bad cwd
plugin/config error
CLI version mismatch
Windows command issue
```

RUNE must retain a BOUNDED, REDACTED stderr tail and attach it to the root lifecycle failure.

Never discard the only useful provider error and later tell the user:

```text
operation did not report a reason
```

## 247.4 Persistent stream protocol assumption must be proven

Current protocol helper explicitly builds a long-lived command using:

```text
--input-format stream-json
--output-format stream-json
```

and writes user events to stdin.

Do NOT assume this remains the best/current supported Antigravity lifecycle merely because the helper exists.

Test the actual installed/current `agy`:

```text
agy --version
agy --help
agy models
supported input/output modes
conversation/resume behavior
process lifetime
permission behavior
hook/plugin behavior
Windows behavior
```

If persistent stream mode is truly supported and reliable, prove it with a lifecycle stress suite.

If not, replace the lifecycle architecture.

---

# 248. Study Synara's CURRENT Antigravity implementation as a working reference

Use:

```text
https://github.com/Emanuele-web04/synara
```

and specifically inspect current:

```text
apps/server/src/provider/Layers/AntigravityAdapter.ts
provider health/runtime/model discovery
provider registry/runtime ingestion
ProviderIcon / Icons
composer provider registry
settings/profile
handoff
session orchestration
child-thread event projection
Antigravity tests
CHANGELOG.md
PR #360 and subsequent lifecycle fixes
```

Important:

> Do NOT blindly paste Synara's adapter into RUNE.

Synara is evidence of a working architecture and edge cases.

Translate useful mechanisms into RUNE's own:

```text
ProviderAdapter contracts
ProviderInstance model
runtime event model
AgentThreadRegistry
Semantic Activity
Turn Trace
Environment
structured errors
```

If directly adapting MIT-licensed code/assets, preserve the required license/attribution.

---

# 249. What Synara currently proves is worth harvesting

Current Synara Antigravity work demonstrates a substantially more mature provider integration pattern:

```text
installation/auth guidance
runtime model discovery
reasoning-effort discovery
session creation/resume
streaming text/reasoning
tool + plan events
usage
cancellation
restart recovery
dedicated branding
lifecycle race handling
child/subagent conversation attribution
```

Its later releases specifically fixed:

```text
session startup races
late/replayed lifecycle events
provider notification drains closing too early
Antigravity inactive PreToolUse hook decisions
provider lifecycle stalls
restart reconciliation
```

Treat those as a TEST INVENTORY for RUNE even if RUNE implements them differently.

Do not repeat already-discovered integration mistakes.

---

# 250. Preferred Antigravity session architecture to evaluate

Strongly evaluate a durable RUNE provider-session context whose lifetime is NOT identical to one child process.

Concept:

```text
RUNE Thread
    ↓
Durable Antigravity Session Context
    ├─ conversationId / resume cursor
    ├─ model / effort
    ├─ lifecycle generation
    ├─ active turn
    ├─ transcript/event cursor
    ├─ child/subagent mappings
    └─ last root failure

        ↓ per turn

Antigravity Process
    ↓
events / hooks / transcript
    ↓
turn settles
    ↓
process may exit
    ↓
durable session remains resumable
```

This is closer to Synara's current successful approach.

Do not delete the durable session merely because a per-turn process exits normally.

A session should be deleted/retired because:

```text
explicit stop
thread deletion
provider instance invalidation
nonrecoverable lifecycle transition
```

not just:

```text
child process ended
```

However, do not force per-turn process mode if the current official `agy` protocol demonstrably supports a superior persistent transport.

Benchmark and choose the correct lifecycle from evidence.

---

# 251. Antigravity lifecycle generations

Every provider-session incarnation must have a generation/token.

Conceptually:

```text
thread A
generation 1
→ process P1

restart

thread A
generation 2
→ process P2
```

If P1 exits late:

```text
P1 exit
≠ mark generation 2 stopped
≠ delete generation 2
```

All async callbacks/events/process exits must verify ownership:

```text
threadId
generation
turnId
process identity
```

before mutating session state.

Add race tests.

---

# 252. Preserve provider startup tombstones instead of losing root cause

If session startup fails, persist a bounded structured tombstone long enough for the orchestration layer to retrieve the actual cause.

Concept:

```ts
ProviderSessionFailure {
  provider
  threadId
  generation
  stage
  causeClass
  safeMessage
  exitCode?
  stderrTail?
  occurredAt
}
```

Then:

```text
sendTurn after failed start
```

must return:

```text
Antigravity session failed to initialize:
<original safe cause>
```

not:

```text
Unknown antigravity adapter thread
```

A true unknown thread should remain a distinct programmer/state error.

---

# 253. Antigravity error-stage taxonomy

At minimum distinguish:

```text
binary-discovery
version-probe
authentication
model-discovery
session-prepare
process-spawn
process-initialization
turn-prepare
turn-dispatch
provider-stream
provider-hook
transcript-read
tool-projection
turn-settlement
interrupt
resume
restart
```

Every provider error contains:

```text
provider
instance
thread
stage
recoverable
safe detail
nested cause
```

where available.

No generic:

```text
operation failed
```

if a more specific cause exists.

---

# 254. Fix "operation did not report a reason" globally

This is not only an Antigravity cosmetic bug.

Audit the path that produces:

```text
Failed: the operation did not report a reason
```

A terminal execution/activity failure should resolve its user-facing reason in this order:

```text
turn.completed.errorMessage
runtime.error.message
session.state.changed.reason
provider adapter structured error detail
process stderr tail
nested safe cause
generic final fallback
```

The generic fallback is allowed only when NONE of the above exist.

Developer Trace must retain the complete safe cause chain.

Do not expose secrets.

---

# 255. Antigravity startup UX

Normal user-facing failure should become something like:

```text
Antigravity could not start

The Antigravity CLI exited before the session initialized.

[Retry]
[Open diagnostics]
```

If known:

```text
Antigravity needs sign-in

`agy` is installed, but this account is not authenticated.

[Open terminal]
[Retry]
```

If model failure:

```text
Model unavailable

The selected Antigravity model is not present in the current `agy models` catalog.

[Choose model]
[Refresh models]
```

Raw adapter class/stack belongs in Developer Trace.

Do not place a giant red JavaScript/provider stack as the main chat experience.

---

# 256. Antigravity model and effort discovery must be runtime-authoritative

Study the actual current output of:

```text
agy models
```

and normalize:

```text
provider model slug
display label
effort
availability
```

Do not depend only on a stale hard-coded model list.

Cache successful discovery briefly.

Keep last-known-good catalog as fallback when appropriate.

A discovery failure must not erase a still-usable last-known-good catalog without explanation.

Provider picker should show:

```text
model
effort options
discovery status
```

from one canonical runtime capability snapshot.

---

# 257. Antigravity conversation resume

Persist the provider conversation identifier/resume cursor independently from process handles.

Verify:

```text
first turn
second turn
close/reopen thread
desktop restart
provider process restart
handoff away and back
```

where Antigravity supports it.

A new process may resume an existing provider conversation.

Do not equate:

```text
process PID
```

with:

```text
provider conversation
```

---

# 258. Antigravity interruption and cancellation

Do not advertise a capability the CLI cannot honestly provide.

Determine current behavior.

If the provider supports only process-level cancellation:

```text
interrupt
→ terminate active turn process safely
→ settle turn as interrupted
→ preserve durable session/resume context
```

If a finer control channel exists, use it.

Never kill the entire durable RUNE thread merely because one turn is interrupted.

Verify:

```text
interrupt
→ next turn still works
```

---

# 259. Antigravity permission / approval truthfulness

Current Synara print-mode integration explicitly constrains runtime permissions because that mode cannot pause for normal interactive approvals.

RUNE must investigate the current `agy` capability and expose the truth.

Do NOT display:

```text
approval-required
```

if RUNE cannot actually deliver provider approval prompts.

Options:

```text
Full access
Provider-managed permissions
RUNE approval bridge
```

only when genuinely supported.

Unsupported mode should be disabled with explanation.

No fake safety UI.

---

# 260. Antigravity tools, reasoning, plan events, and child agents

A first-class Antigravity integration should project meaningful provider events into RUNE's provider-neutral event model.

Where current `agy` exposes them, support:

```text
assistant text
visible reasoning/rationale summary
tool start/progress/completion
plan/task events
usage
provider child/subagent conversations
```

If child conversations are discovered:

```text
provider child conversation
→ RUNE real child thread
→ providerParentThreadId
```

Never let child tool/reasoning events contaminate the parent thread.

Deduplicate duplicate evidence arriving from:

```text
stdout
hooks
transcript
```

using stable provider IDs/occurrence tracking.

---

# 261. Capture/hook architecture — evaluate, isolate, and sanitize

Synara currently uses Antigravity hook/plugin capture to recover richer lifecycle/tool/subagent events.

Evaluate whether RUNE should implement a RUNE-specific capture plugin/hook.

Requirements if used:

```text
installed idempotently
scoped to RUNE-managed sessions
neutral when session inactive
never launches RUNE GUI unexpectedly
payload sanitized
temp/event files bounded
cleaned up
versioned
tested across Windows
```

Do not globally hijack a user's Antigravity installation.

If current `agy` offers a cleaner official event API, prefer it.

---

# 262. Antigravity Windows robustness

RUNE is a Windows desktop product in active use.

Test specifically:

```text
paths with spaces
long prompts
long command lines
PowerShell/cmd spawn resolution
installed binary path
PATH differences between shell and Electron
unicode project paths
process tree teardown
restart
packaged resources
```

Do not pass huge prompts through command-line arguments if this can hit Windows limits.

Prefer stdin/file/protocol mechanisms when supported.

Surface an actionable validation error before spawn when a hard platform limit is predictable.

---

# 263. Antigravity health is not session readiness

Separate:

```text
binary installed
version usable
authenticated
models available
adapter compatible
session ready
turn running
```

One green provider card must not collapse all states.

`Validate Antigravity` should test progressively:

```text
1. binary
2. version
3. auth
4. model discovery
5. minimal adapter/session probe
```

and report exactly where it fails.

Do not perform a paid/full inference without telling the user if a real model request is required.

---

# 264. Antigravity regression suite — mandatory

At minimum:

```text
1. binary missing
2. bad binary path
3. version probe fails
4. authentication missing
5. model discovery succeeds
6. model discovery fails with cached fallback
7. start session succeeds
8. process exits before init
9. original stderr/cause survives
10. send after failed start returns root startup cause
11. true unknown thread remains distinct
12. first turn succeeds
13. second turn succeeds
14. conversation resume works
15. model+effort mapping correct
16. invalid model actionable
17. interrupt settles current turn
18. next turn works after interrupt
19. process exit does not accidentally delete a valid new generation
20. late old-generation event ignored
21. restart recovers/resumes where supported
22. provider errors never become reasonless
23. tool events project once
24. child/subagent events map to child threads
25. child event never contaminates parent
26. usage emitted when available
27. packaged Windows path finds the same CLI
28. path with spaces works
29. large prompt transport is bounded/safe
30. icon renders correctly in every required provider surface
```

---

# 265. Antigravity real-world completion gate

Do not say:

```text
Antigravity fixed
```

until a REAL connected Antigravity account, when credentials are available on the development machine, has been manually verified for:

```text
provider discovery
real icon
model list
model selection
effort selection
new thread
"hi"
second follow-up turn
repository read task
tool/task event projection
cancel/interruption
resume/reopen
app restart recovery
failure diagnostics
```

If a live account is unavailable:

```text
fixture tests may pass
but live verification remains BLOCKED_WITH_EVIDENCE
```

Never convert fixture success into a claim that the real integration works.

---

# 266. Central Provider Brand Registry — one source of truth

Provider/harness identity is currently visually inconsistent.

Create/finish ONE canonical local brand registry.

Conceptually:

```ts
ProviderBrand {
  id
  displayName
  icon
  iconDark?
  iconLight?
  monochromeIcon?
  accent?
  accessibilityLabel
  source
}
```

It must cover every known RUNE harness/provider/service.

The same registry powers:

```text
provider settings
instance manager
composer harness picker
model picker
thread header
sidebar
handoff
Usage
Environment
Agents
Plan role bindings
Developer Trace
diagnostics
```

Do not independently branch:

```text
if antigravity ...
if claude ...
```

across ten components.

---

# 267. Antigravity must use the REAL dedicated Antigravity icon

The current generic/wrong icon is a product defect.

Source the canonical Antigravity mark from:

```text
official Antigravity/Google assets if available
or a legally reusable bundled integration asset
```

Synara's MIT implementation may be used as a reference, and directly adapted only with appropriate attribution/license handling.

Requirements:

```text
local asset/component
no network dependency for normal rendering
dark/light-safe
crisp at 12/14/16/20/24px
stable SVG IDs
accessible
no filter-ID collisions
```

Test screenshots/snapshots in:

```text
provider picker
settings
instance row
chat header
handoff
usage
Agent/Plan binding
```

A known provider must never fall back to a generic placeholder because one surface forgot the mapping.

---

# 268. RUNE Native must use the latest real RUNE mark

For the RUNE Native harness/provider identity, use the canonical latest RUNE product mark from the current:

```text
assets/svg/
```

asset pipeline.

Do not use:

```text
generic terminal glyph
old T3 icon
old Synara icon
random AI sparkle
missing placeholder
```

Use the RUNE mark consistently for RUNE-owned native execution identity.

Do not replace third-party provider icons with RUNE branding.

Correct distinction:

```text
Harness: RUNE Native
→ RUNE mark

Service: OpenRouter
→ OpenRouter icon

Model vendor, when shown separately
→ appropriate model/vendor icon
```

---

# 269. Brand registry regression tests

Verify every known provider/harness/service has a resolvable local brand.

At minimum:

```text
RUNE Native
Codex
Claude Code
Antigravity
Cursor
OpenRouter
OpenAI
Anthropic
Google/Gemini where represented
OpenCode
Kilo
Pi
Grok
Droid
custom gateway fallback
```

Test:

```text
dark
light
high DPI
small picker size
header size
no duplicate SVG filter IDs
no external network fetch required
```

---

# 270. RUNE Native — ZERO-TOLERANCE end-to-end release gate

The current master spec already says to finish RUNE Native.

This section makes that requirement non-negotiable.

RUNE Native is not considered implemented until it works as an actual coding harness from the real composer.

A working UI shell or adapter factory is insufficient.

For each supported raw API service, the canonical path should be:

```text
Composer / Thread
    ↓
Execution Controller
    ↓
RUNE Role / Instance Binding
    ↓
Prompt Compiler
    ↓
Context Planner
    ↓
Tool Compiler
    ↓
Native Agent Loop
    ↓
Provider Driver
    ↓
Raw API
    ↓
Provider-neutral Runtime Events
    ↓
Semantic Activity / Diff / Trace
```

Claude Code, Codex CLI, or another external harness must NOT appear in this path unless explicitly selected.

---

# 271. Build a RUNE Native capability status matrix from the REAL checkout

Create:

```text
docs/rune/RUNE-NATIVE-E2E-STATUS.md
```

Inventory every claimed capability and mark:

```text
WORKING_LIVE
WORKING_FIXTURE
PARTIAL
UI_ONLY
DEAD_CODE
BROKEN
MISSING
BLOCKED_EXTERNAL
```

At minimum inventory:

```text
provider instance selection
service connection selection
model selection
session/thread creation
simple text streaming
tool schema compilation
workspace search
workspace read
batch read
patch/write
shell/checks
git/diff
structured ask_user
approvals
attachments/images
queue
steer
pause
continue
stop
context compaction
request budget
retry
loop detection
verification
usage
Turn Trace
prompt cache telemetry
session resume
restart recovery
subagents
different child role bindings
OpenRouter
OpenAI
Anthropic
Google
custom compatible gateway
packaged desktop
```

Do not allow:

```text
file exists
→ WORKING
```

Evidence must be a passing integration/manual scenario.

---

# 272. Native fast-path acceptance

Hard gate:

```text
RUNE Native + connected raw provider
User: "hi"
```

Expected:

```text
1 logical inference request
0 subagents
0 planner
0 utility model
0 repository scan
0 title-generation model
stream starts promptly
final response appears
```

Turn Trace must prove request count.

If this fails, stop optimizing advanced workflows until it is fixed.

---

# 273. Native coding-turn acceptance

Test a tiny repository edit:

```text
"Rename the displayed label from A to B and verify it."
```

Expected:

```text
focused context lookup
bounded model requests
actual patch
focused verification
inline diff receipt
correct final response
```

No hidden external harness.

No 50-request fan-out.

No fake tool events.

---

# 274. Native provider driver contract

Normalize provider differences behind capability-aware drivers.

Each driver declares/supports:

```text
stream protocol
tool call format
reasoning controls
image/file input
prompt caching
usage
rate limits
model capabilities
parallel tool behavior
structured output
retry semantics
```

The Native Agent Loop must not contain giant scattered:

```text
if provider === ...
```

branches when a driver capability can own the difference.

---

# 275. Native tool execution must really work

For each canonical native tool:

```text
search_many
read_many
symbol query / LSP where available
apply_patch
run_checks
git status/diff
run_action
ask_user
```

prove:

```text
model can call it
schema validates
runtime executes it
result returns to model
activity projects it
errors remain attributable
request budget accounts for follow-up
```

A tool button/schema existing is not sufficient.

---

# 276. Native structured asker

RUNE Native must be the reference implementation of:

```text
ask_user
```

The model emits a structured request.

RUNE pauses the turn in:

```text
WAITING_FOR_USER
```

The composer-native asker appears.

Answer resumes the SAME turn/session.

No numbered questionnaire dumped into chat.

Test:

```text
ask
cancel
multi-choice
custom answer
reload while waiting where persistence promises it
```

---

# 277. Native approvals

Implement real approval boundaries for native tools.

State:

```text
WAITING_FOR_APPROVAL
```

must replace Working immediately.

Approval decision returns to the same tool/turn.

Do not use a decorative approval dialog disconnected from the tool executor.

Test denial/retry/cancellation.

---

# 278. Native queue / steer / pause / continue

Native Harness should be the BEST-behaved execution path for RUNE's own orchestration semantics.

Verify:

```text
normal send while running
→ Queue

Steer
→ interrupt/safe boundary
→ steer
→ resume previous objective where appropriate

Pause
→ preserved resumable state

Continue
→ same objective/session

Stop
→ explicit abandon
```

No hidden fake user-message continuation where native runtime can preserve structured execution state directly.

---

# 279. Native session/restart recovery

Persist enough provider-neutral state that a desktop/server restart can accurately classify:

```text
completed
recoverable
needs retry
lost external response
waiting user
waiting approval
```

Do not claim impossible mid-request resume if the raw provider does not support it.

Use checkpoint/retry/fork semantics honestly.

No resurrected duplicate turns.

---

# 280. Native subagents

A Native parent must be able to spawn real RUNE child threads according to the canonical AgentThreadRegistry.

Child may use:

```text
same provider instance
different provider instance
different harness
different model
different worktree
```

according to RoleBinding/Plan policy.

Parent receives structured progress/results.

Do not implement native subagents as invisible recursive model calls.

---

# 281. Native images / attachments

If the selected model/provider driver supports image/file input:

```text
composer attachment
→ capability validation
→ native provider request
```

must work.

If not supported:

```text
explain capability mismatch
offer compatible model/provider
```

Do not silently discard images.

---

# 282. Native request governor

Every Native inference call has:

```text
requestId
turnId
purpose
provider instance
model
parent request if follow-up
budget
```

Purposes:

```text
main
tool-followup
repair
verification
subagent
compaction
retry
```

An unattributed request is a defect.

Hard budgets prevent accidental infinite loops/fan-out.

---

# 283. Native error contract

No provider/API failure should collapse into:

```text
Something went wrong
```

or:

```text
operation did not report a reason
```

Normalize:

```text
transport
auth
quota/rate limit
invalid model
bad request
tool validation
tool execution
context limit
provider timeout
provider internal
session recovery
```

Show actionable user message.

Developer Trace shows safe raw details/request IDs.

---

# 284. Native E2E smoke battery

Create one command/suite that exercises the actual RUNE Native product path.

Conceptually:

```text
pnpm test:native-harness-smoke
```

or repository-appropriate equivalent.

Fixture provider tests:

```text
streaming
tool round
tool failure
retry
ask_user
approval
patch
verification
queue/interrupt state
usage
trace
```

Live-provider smoke, when configured:

```text
OpenRouter
at least one primary direct provider
custom-gateway fixture
```

If live credentials absent, report live items BLOCKED.

---

# 285. Native packaged-desktop gate

Run Native smoke through the packaged desktop/server resources where practical.

Verify:

```text
provider connection can be read
secret reference resolves
thread creates
"hi" works
tool call works
diff shows
restart does not corrupt session state
```

A dev-server-only pass is insufficient.

---

# 286. Native performance benchmark

For representative tasks compare:

```text
RUNE Native
Codex through RUNE
Claude Code through RUNE
```

Same task, same repository state where meaningful.

Measure:

```text
wall time
TTFT
logical model requests
tool calls
context tokens
RUNE overhead
time to first edit
verification time
correctness
```

The goal is not to fake a universal win.

The goal is to identify and remove avoidable RUNE overhead.

---

# 287. Provider-selection correctness gate

For every provider/harness shown in the composer:

```text
selected UI identity
=
pinned providerInstanceId
=
resolved runtime
=
icon/label shown
=
Turn Trace provider
```

No drift.

For example:

```text
Antigravity selected
→ Antigravity adapter/runtime
→ Antigravity icon
→ Antigravity models

RUNE Native + OpenRouter selected
→ Native loop
→ OpenRouter service
→ RUNE harness mark + OpenRouter service identity
```

If these disagree, the product is broken.

---

# 288. Never ship a provider as "available" when it is nonfunctional

Provider availability should be capability/readiness-driven.

States:

```text
Ready
Needs setup
Unavailable
Experimental
Broken / incompatible version
```

If an adapter cannot complete its minimum smoke:

```text
do not show Ready
```

If behind experimental support:

```text
label Experimental
```

with exact limits.

No false green states.

---

# 289. DABT developer-dogfood benchmark

RUNE is being developed to accelerate real DABT engineering work.

Treat a DABT-sized repository/workflow as an INTERNAL dogfood benchmark, not marketing copy.

Important:

The currently supplied:

```text
Dabt-Eco-main-IT-recovery-updated.zip.sha256
```

is only a checksum sidecar, not the DABT source archive.

Do not pretend to inspect DABT source from the checksum.

If the real DABT checkout/archive is available on the development machine, use SAFE representative tasks to verify RUNE:

```text
large repo mapping
focused bug investigation
small edit + verification
Plan Mode
parallel read-only reviewers
child threads
provider switch/handoff
RUNE Native
Learned Action
long-running build/test visibility
```

Preserve all DABT work.

Do not:

```text
reset
clean
destroy worktrees
rewrite unrelated code
```

The benchmark question is:

> Does RUNE measurably reduce time and supervision needed to develop a real large product?

---

# 290. DABT workload performance targets

On a real large project, verify:

```text
thread opens promptly
sidebar does not subscribe/render entire history
repo search is targeted
Native fast path remains bounded
child agents do not collide
long builds expose real stage/activity
repeated tasks become Actions
provider failures remain recoverable
```

Capture:

```text
time to first useful activity
time to first relevant file
time to first edit
request count
tool count
verification time
wall time
```

Do not optimize only synthetic hello-world fixtures.

---

# 291. Updated blocking implementation order

This supersedes earlier ordering when conflicts exist.

```text
0. preserve git/worktrees/user state
1. reproduce current startup/provider failures
2. Antigravity exact session-not-found + reason-loss regression
3. Antigravity lifecycle/error repair
4. provider Brand Registry + real icons
5. RUNE Native E2E status matrix
6. RUNE Native core end-to-end repair
7. provider-instance/runtime manifest correctness
8. Claude/OpenRouter exact regression
9. Queue/Steer/Pause/Continue
10. child-thread Agent system
11. structured asker / Grill
12. Plan/Spec/RoleBinding
13. deterministic orchestrator
14. Actions / Learned Actions
15. Semantic Activity + live diff receipts
16. Environment / files / panels
17. Skills pipelines
18. Usage / Turn Trace
19. performance + DABT-scale dogfood
20. packaged Windows release verification
```

Do not use Plan/Actions as an excuse to postpone the core provider execution failures.

---

# 292. Required Antigravity engineering report

Create:

```text
docs/rune/ANTIGRAVITY-INTEGRATION-REPAIR.md
```

Include:

```text
reported screenshot/error
current RUNE lifecycle
exact reproduction
root cause
secondary/masked errors
current `agy` version/protocol evidence
Synara comparison
chosen RUNE architecture
why it was chosen
files changed
tests
live verification
remaining limitations
```

Include a redacted event timeline:

```text
session/start
process/spawn
provider init or exit
session state
send turn
failure projection
```

No secrets.

---

# 293. Required Provider Brand report

Create/update:

```text
docs/rune/PROVIDER-BRAND-REGISTRY.md
```

Document:

```text
provider/harness/service
canonical local asset/component
source/license
dark/light behavior
where used
fallback behavior
```

No known-provider generic placeholders remain.

---

# 294. Required Native Harness repair report

Create:

```text
docs/rune/RUNE-NATIVE-E2E-STATUS.md
```

plus final:

```text
docs/rune/RUNE-NATIVE-REPAIR-REPORT.md
```

Report:

```text
capability matrix before
root causes
capability matrix after
fixture tests
live tests
request-count evidence
packaged desktop result
remaining blocked items
```

Do not write aspirational prose in the status matrix.

Only evidence.

---

# 295. Final blocking completion gate

Do NOT call the master pass complete if ANY of these remain true:

```text
Antigravity "hi" fails.
Antigravity second turn fails.
Antigravity process failure is replaced by SessionNotFound.
Antigravity error loses stderr/root cause.
Antigravity shows wrong/generic icon.
RUNE Native "hi" cannot complete on a supported connected provider.
RUNE Native simple coding tool round fails.
RUNE Native secretly routes through an external harness.
provider picker identity disagrees with runtime.
RUNE Native uses wrong/missing RUNE icon.
known provider icon is missing in some primary surface.
"operation did not report a reason" appears when a real cause existed.
a provider claims Ready without passing its minimum readiness/smoke contract.
packaged desktop behaves differently from dev for these paths.
```

Completion requires real executable evidence.

---

# 296. Current reference URLs for this blocking milestone

Re-check current source at implementation time:

```text
RUNE Antigravity adapter
https://github.com/bitreonx/Rune/blob/main/apps/server/src/provider/Layers/AntigravityAdapter.ts

RUNE Antigravity protocol
https://github.com/bitreonx/Rune/blob/main/apps/server/src/provider/antigravityProtocol.ts

Synara repository
https://github.com/Emanuele-web04/synara

Synara Antigravity adapter
https://github.com/Emanuele-web04/synara/blob/main/apps/server/src/provider/Layers/AntigravityAdapter.ts

Synara changelog
https://github.com/Emanuele-web04/synara/blob/main/CHANGELOG.md

Synara Antigravity integration PR
https://github.com/Emanuele-web04/synara/pull/360
```

These are implementation references, not permission to create a Synara clone.

RUNE must preserve its own provider-neutral contracts and product identity.


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
