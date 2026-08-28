---
task_id: T03
title: RUNE Native end-to-end harness
status: TODO
depends_on: [T00, T01]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T03 — RUNE Native end-to-end harness

## Purpose

Make RUNE Native a genuinely working direct-API coding harness with bounded requests, tools, asking, approvals, execution controls, recovery, subagents, and packaged-desktop proof.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master fast-path/native sections 24–28 and zero-tolerance Native sections 270–286, 294–295.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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