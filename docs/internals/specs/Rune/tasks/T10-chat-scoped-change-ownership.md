---
task_id: T10
title: Thread/turn change ownership, checkpoints, rewind, and diff truth
status: TODO
depends_on: [T00, T04, T08]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T10 — Thread/turn change ownership, checkpoints, rewind, and diff truth

## Purpose

Ensure each chat/agent owns only its real mutations, historical edits can safely rewind/fork, and every Changes/Diff surface reads canonical thread ownership instead of workspace dirtiness.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Relevant master sections 11–14, 112–113, 130B, and 313–320.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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