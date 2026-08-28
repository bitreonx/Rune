---
task_id: T11
title: Actions 2.0 + Learned Actions
status: TODO
depends_on: [T00, T04, T06]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T11 — Actions 2.0 + Learned Actions

## Purpose

Turn repeated verified workflows into provider-neutral one-click deterministic Actions that save tokens, integrate with plans/activity, drift safely, and escalate to agents only for uncertainty.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master Actions foundation and Learned Actions sections 191–244.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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