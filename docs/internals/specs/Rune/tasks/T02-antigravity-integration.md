---
task_id: T02
title: Antigravity lifecycle, recovery, real icon, and live verification
status: TODO
depends_on: [T00, T01]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T02 — Antigravity lifecycle, recovery, real icon, and live verification

## Purpose

Repair Antigravity as a first-class provider: durable session lifecycle, preserved root failures, correct discovery/resume/cancel behavior, child-thread projection, and honest readiness.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master Antigravity sections 31, 245–265, reports/gates 292/295/296.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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