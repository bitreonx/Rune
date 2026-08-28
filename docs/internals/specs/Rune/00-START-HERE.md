# RUNE MASTER SPEC v4.0 — START HERE

This folder replaces the monolithic v3.6 prompt as the **default implementation source**.

The old master is preserved under `archive/` for audit only.

## Why this exists

The previous master grew to hundreds of sections. Re-injecting it into every worker wastes context, weakens late requirements, and makes agents silently forget tail gates.

v4 is task-addressable:

```text
START HERE
→ choose one task
→ read its dependency task(s)
→ inspect repository
→ implement
→ verify
→ update STATUS
→ next task
```

No worker should reread the whole specification by default.

## Authority

```text
1. current repository truth
2. this v4 task folder
3. latest explicit user decisions embedded in task files
4. archived v3.6 master
5. older drafts
```

## Non-negotiable product model

```text
RUNE
├─ Execution Controller
│  ├─ Queue
│  ├─ Steer
│  ├─ Pause / Continue
│  └─ historical Edit / rewind / fork
├─ Structured Input Gateway
│  └─ all harnesses ask through the RUNE composer
├─ Plan / Spec
│  └─ planner and executor can be different providers/harnesses
├─ Agent Team
│  └─ every subagent is a real nested child thread
├─ Semantic Activity
│  └─ live narrative + actual diff/test receipts
├─ Actions
│  └─ deterministic repeated work before LLM work
├─ Skills
│  └─ progressive provider-neutral RUNE registry
├─ Environment
│  └─ quick popover + full right rail
├─ Provider Instances
│  └─ harness → instance → connection → model/runtime
└─ Turn Trace
   └─ every request/wait attributable
```

## Recommended order

```text
T00 Baseline
T01 Provider instances
T02 Antigravity
T03 RUNE Native
T04 Execution controller
T05 Structured asker / Grill
T08 Child-agent threads
T09 Live activity
T10 Change ownership
T06 Plan / Spec
T07 Skills registry
T11 Actions / Learned Actions
T12 Environment / Files / Panels
T13 Settings provider UX
T15 Brand / icons
T17 Chat + Shell polish
T14 Usage / Trace / Performance
T19 DABT dogfood
T18 Final packaged verification
```

## Provider/harness question rule

Even when RUNE is running **Codex, Claude Code, Cursor, Antigravity, or another harness**, product/user questions must use the canonical RUNE Structured Input Gateway when the adapter has that capability.

The model must not dump a Grill questionnaire into the assistant transcript.

See `tasks/T05-structured-asker-and-grill-ux.md`.

## Skills rule

Import Matt Pocock's current engineering skills through the RUNE Skill Registry and adapt behavior at runtime. Do not paste all skill bodies into the system prompt.

See `tasks/T07-skills-registry-and-mattpocock-pack.md`.

## Completion

A task is complete only when its acceptance gates are supported by:

```text
code path
test
manual/live scenario where relevant
packaged behavior where relevant
```

Update `STATUS.md`.
