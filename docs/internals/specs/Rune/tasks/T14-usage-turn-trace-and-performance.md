---
task_id: T14
title: Usage, Turn Trace, request accounting, and performance
status: TODO
depends_on: [T00, T03, T09]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T14 — Usage, Turn Trace, request accounting, and performance

## Purpose

Make every wait/request attributable, build honest cost/usage inspection, eliminate hidden model fan-out and UI/background overhead, and benchmark RUNE against external harness paths.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 23–25, 66–73, and benchmark/native trace sections.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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