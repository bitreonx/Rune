---
task_id: T00
title: Baseline, safety, requirement ledger, and real-app gate
status: BLOCKED_WITH_EVIDENCE
depends_on: []
source: RUNE master v3.6 + v4 authoritative decisions
---

# T00 — Baseline, safety, requirement ledger, and real-app gate

## Purpose

Establish repository truth, preserve work, reproduce the actual app, and create the evidence ledger every later task updates.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 0–6.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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
