---
task_id: T05
title: Structured composer asker and provider-neutral Grill UX
status: TODO
depends_on: [T00, T04]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T05 — Structured composer asker and provider-neutral Grill UX

## Purpose

Make every harness—including Codex—ask decisions through the same polished RUNE composer input instead of dumping questionnaires into chat.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 37–41 and 353–354, plus authoritative v4 Structured Input Gateway requirements.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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

## Authoritative v4 architecture — Structured Input Gateway

All question-capable harnesses/providers MUST converge on one RUNE event:

```ts
UserInputRequest {
  id
  threadId
  turnId
  sourceProvider
  title?
  question
  context?
  options[]
  recommendedOptionId?
  allowCustomAnswer
  allowEditSuggestedAnswer
  progress?: { current, total }
  blocking: true
}
```

Provider bridges normalize native mechanisms:

```text
RUNE Native     ask_user
Codex           request_user_input / equivalent provider-native request
Claude Code     AskUserQuestion
Cursor          ask_question
Antigravity     current supported structured question mechanism, if any
Future ACP      provider capability mapping
```

The chat UI never implements provider-specific question cards.

### Absolute behavior

If the harness/model needs a product/user decision and structured input is available:

```text
model/provider
→ structured question event
→ active turn becomes WAITING_FOR_USER
→ RUNE composer morphs into the asker
→ user answers
→ structured answer returns to SAME provider turn/session
→ execution resumes
```

It must NOT become assistant prose like:

```text
Now answer these hard questions:
1. ...
2. ...
3. ...
```

### RUNE composer-native asker — redesign it to belong to the composer

The existing question input is a foundation, not the final design. Audit it against the current RUNE composer tokens/layout and redesign it as the same component family.

Target:

```text
┌────────────────────────────────────────────────────────────┐
│ Clarify · 2 of 6                          Provider routing │
│                                                            │
│ Who should own the service connection?                     │
│                                                            │
│ [ Per instance · Recommended ]                             │
│ [ Shared reusable connection ]                             │
│ [ Native harness account ]                                │
│                                                            │
│ Answer                                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ Per instance, but allow explicitly shared connections…   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Back                                    Skip   Send answer │
└────────────────────────────────────────────────────────────┘
```

Rules:

- visually continuous with the normal RUNE composer;
- same radius/border/spacing/iconography/focus language;
- no unrelated floating modal for ordinary questions;
- normally show up to **3 high-quality suggested answers**;
- one suggestion may be marked **Recommended**, with concise rationale on demand;
- clicking a suggestion populates an **editable answer field**;
- user can edit any suggested answer before sending;
- user can ignore suggestions and write a completely custom response;
- question-by-question is the default UX for dependent Grill decisions;
- `Back` revisits the prior decision without transcript spam;
- `Skip` only exists when the decision is genuinely optional;
- keyboard and screen-reader operation are mandatory;
- narrow/mobile rendering remains composer-native.

### Transcript behavior

Do not write every question/answer into the main assistant transcript.

Use compact receipts:

```text
Needs you · Folder ownership
```

then:

```text
✓ Clarified folder ownership
```

For a full Grill:

```text
✓ Clarified 8 product decisions
```

Click may open the Decision Ledger.

### External-harness enforcement

RUNE must make this work even when the selected harness is Codex/Claude/etc.

Each harness adapter/compiler injects a high-priority capability instruction conceptually equivalent to:

```text
When you need user decisions and RUNE structured input is available,
use the provider's structured question mechanism.
Never print a numbered questionnaire in assistant prose.
Find repository/environment facts yourself.
Ask only decisions.
```

### Imported skill adaptation

Third-party skills such as Matt Pocock's `grilling` define the decision-tree algorithm. RUNE preserves that algorithm but adapts the I/O:

```text
upstream skill says:
ask frontier questions

RUNE skill compiler says:
emit decisions through Structured Input Gateway,
not assistant Markdown
```

Do NOT edit upstream skill files in place.

### High-confidence questionnaire guard

Add a safety net for known imported-skill formats, not a magical generic prose parser.

If an external harness nevertheless emits a recognized Grill block such as:

```text
❓ Q1 ...
➡️ Recommended ...
---
❓ Q2 ...
```

before transcript commit, a provider/skill-aware guard MAY convert it into structured requests only when parsing is lossless and high-confidence.

Primary fix remains provider instructions + native question tool support.

### Decision graph

Grill maintains a decision DAG/frontier.

Facts are resolved via repository/tools/subagents.

Only decision nodes become user questions.

Dependent questions wait; independent decisions may be prepared in parallel, while the UI presents them coherently one at a time.

### No extra model calls for presentation

Rendering options, editing a suggestion, Back, and submitting an already-generated structured answer are local operations.

## Required tests

1. RUNE Native `ask_user` opens composer asker.
2. Codex provider-native user-input request opens the same component.
3. Claude provider-native question opens the same component.
4. provider identity does not fork the asker UI.
5. Grill does not dump numbered questionnaire into chat.
6. suggested answer is editable.
7. custom answer works.
8. Back preserves prior answer.
9. answer returns to the originating thread/turn only.
10. child-agent asker does not leak to parent.
11. WAITING_FOR_USER replaces Working immediately.
12. reload restores waiting state where promised.
13. recognized Grill format can be guarded without losing content.
14. unknown prose is never aggressively misparsed.
15. reduced-motion, keyboard, focus, and screen-reader behavior pass.