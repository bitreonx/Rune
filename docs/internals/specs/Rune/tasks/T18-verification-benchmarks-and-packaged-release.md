---
task_id: T18
title: Full regression matrix, benchmarks, packaged desktop verification, and reports
status: TODO
depends_on: [T00, T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T17]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T18 — Full regression matrix, benchmarks, packaged desktop verification, and reports

## Purpose

Close the requirement ledger with real tests, UX walkthroughs, performance evidence, Windows packaging, and explicit blocked items rather than aspirational completion claims.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 74–100 and blocking implementation/report gates 289–296.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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