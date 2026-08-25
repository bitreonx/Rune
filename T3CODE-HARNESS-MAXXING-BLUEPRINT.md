# RUNE Harness Maxxing Blueprint
## Turning a Rebranded T3 Code Fork into a DeepSeek-Harness-Parity, Cursor-Class, Multi-Provider Agent Operating System

**Status:** Architecture / implementation specification  
**Target:** T3 Code fork as product shell + native harness runtime  
**Primary goal:** Reach full DeepSeek Harness capability parity, preserve the best parts of T3 Code, match or exceed Cursor-class developer experience, and add original systems that improve speed, reliability, quality, context use, orchestration, and provider economics.

---

# 0. Executive Thesis

We are not building another chat UI around Codex.

We are not building a thin OpenRouter client.

We are not building a prettier T3 Code fork.

We are building a **model-agnostic agent operating system for software engineering**.

The product should combine:

- **T3 Code strengths**
  - desktop/web/mobile control surface
  - typed RPC/WebSocket boundary
  - provider adapters
  - event-sourced orchestration
  - workspaces, threads, checkpoints, diffs, terminals
  - remote-capable client/server split

- **DeepSeek Harness strengths**
  - everything-pluggable runtime
  - replaceable agent loop
  - session event log
  - prompt assembly registry
  - scoped tools
  - LLM adapter seam
  - compaction
  - context providers
  - subagents
  - jobs
  - workflows
  - Ralph-style fresh-agent iteration
  - skills
  - sandboxing
  - shell/terminal/filesystem/LSP capability seams
  - approval and human interaction systems
  - profiles/bundles/extensions

- **Cursor strengths**
  - model-specific tuning
  - low-friction UX
  - fast codebase retrieval
  - semantic indexing
  - clean diff loop
  - automatic specialized subagents
  - polished status/streaming behavior
  - background/cloud-style execution concepts
  - rules that are scoped and reusable

- **Our additions**
  - model router above OpenRouter
  - provider health intelligence
  - prompt compiler
  - tool-schema compiler
  - instruction graph
  - semantic context planner
  - retrieved-context subagents
  - agent teams
  - global scheduler
  - write-conflict isolation
  - verification engine
  - structured memory
  - harness benchmark lab
  - adaptive latency strategy
  - speculative context loading
  - speculative subagent preparation
  - provider racing for selected requests
  - cost/quality/latency policy engine
  - observability and replay
  - plugin marketplace architecture
  - native API models and external agent runtimes in the same product

The benchmark is not:

> “Does it have many features?”

The benchmark is:

> “Does the user consistently get a correct, verified result faster, with less friction, less wasted context, fewer retries, and less cost than using a single coding agent directly?”

That is **Harness Maxxing**.

---

# 1. The Product Formula

```text
RUNE
=
T3 CODE CONTROL SURFACE
+
DEEPSEEK HARNESS CAPABILITY PARITY
+
CURSOR-CLASS CONTEXT + UX
+
OPENROUTER / NATIVE PROVIDER INTELLIGENCE
+
OUR OWN AGENT RUNTIME
+
OUR OWN ORCHESTRATION / VERIFICATION / MEMORY
```

Important distinction:

```text
MODEL PROVIDER != AGENT PROVIDER
```

## Model providers

Raw inference providers:

- OpenRouter
- OpenAI
- Anthropic
- Google
- DeepSeek
- xAI
- OpenAI-compatible endpoints
- Ollama
- vLLM
- LM Studio
- other local/remote runtimes

When using these, **RUNE owns the harness**.

## Agent providers

Complete external agent harnesses:

- Codex
- Claude Code
- Cursor Agent
- OpenCode
- DeepSeek Harness
- ACP-compatible agents
- future external runtimes

When using these, **RUNE orchestrates another harness**.

This lets the user run:

```text
Thread A -> RUNE Native -> GPT through OpenRouter
Thread B -> Codex
Thread C -> Claude Code
Thread D -> RUNE Native -> DeepSeek direct API
Thread E -> OpenCode
```

inside one product.

---

# 2. Non-Negotiable Architecture Principles

## 2.1 Provider logic never leaks upward

No random application code should contain:

```ts
if (provider === "openrouter") ...
if (provider === "anthropic") ...
if (provider === "codex") ...
```

Provider quirks belong in:

```text
model/provider-*
agent-provider/*
```

Everything above those boundaries consumes canonical RUNE contracts.

---

## 2.2 The agent loop remains small

The main loop should not know implementation details of:

- compaction
- memory
- permissions
- sandboxing
- subagents
- plan mode
- skills
- workflows
- provider quirks
- UI rendering
- model routing
- verification

Conceptually:

```ts
while (!turn.finished) {
  const request = await requestPipeline.compile(state)
  const stream = modelRuntime.stream(request)
  const actions = await interpreter.consume(stream)
  await toolRuntime.execute(actions)
  await session.append(actions)
}
```

Everything else attaches through capabilities, middleware, hooks, events, or registries.

---

## 2.3 Durable facts are events

Anything that must survive reload/replay becomes a durable event.

Examples:

```text
session.created
turn.started
user.message
model.requested
assistant.message
tool.called
tool.completed
file.changed
agent.spawned
agent.completed
compaction.completed
verification.started
verification.failed
verification.passed
checkpoint.created
permission.requested
permission.responded
```

Transient UI state does not pollute the durable log.

---

## 2.4 Enforcement never depends on the prompt

The model may be instructed not to do something.

The runtime must still enforce it.

Examples:

- filesystem policy
- network policy
- shell access
- destructive commands
- secret access
- workspace scope
- maximum agents
- spend limits
- tool scopes
- write leases

Prompt = behavioral guidance.

Policy engine = actual authority.

---

## 2.5 Fast path first, complexity only when useful

A harness becomes worse if every task launches six agents, builds a DAG, compacts memory, and performs five reviews.

Simple task:

```text
rename variable
```

should take the simple path.

Complex task:

```text
migrate authentication architecture safely across a monorepo
```

gets deeper orchestration.

The system needs a **Task Complexity Classifier**.

---

# 3. The Final Layered Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    RUNE CLIENT / DESKTOP                     │
│ React UI • Electron • web/mobile clients                     │
│ threads • diffs • terminals • agents • plans • usage         │
└────────────────────────────┬─────────────────────────────────┘
                             │ typed RPC / WS
┌────────────────────────────▼─────────────────────────────────┐
│                    RUNE CONTROL PLANE                        │
│ event store • projections • command bus • queues             │
│ workspaces • checkpoints • provider sessions • credentials   │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                 RUNE HARNESS CONTROL LAYER                   │
│ intent • planning • scheduling • budgets • permissions       │
│ model router • agent planner • verification policy           │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    RUNE NATIVE AGENT                         │
│ agent loop • prompt compiler • tools • context • memory      │
│ subagents • compaction • workflow • skills • hooks           │
└────────────────────────────┬─────────────────────────────────┘
                             │
         ┌───────────────────┼─────────────────────┐
         ▼                   ▼                     ▼
   MODEL BUS            AGENT PROVIDERS       EXECUTION BUS
   OpenRouter           Codex                 filesystem
   OpenAI               Claude Code           shell
   Anthropic            Cursor                terminal
   DeepSeek             OpenCode              LSP
   Gemini               ACP                   browser
   local                                      sandbox
```

---

# 4. T3 Code: What We Keep

T3 Code already has strong architecture around:

- server-owned execution
- provider abstraction
- canonical provider runtime events
- typed RPC/WebSocket
- event-sourced orchestration
- project/thread concepts
- checkpointing
- queue-backed background work
- desktop/web/mobile shells
- terminals/filesystem/server boundary
- provider instance registry

We should **preserve those strengths** rather than replacing the entire product.

## Keep / extend

```text
apps/server
apps/web
apps/desktop
apps/mobile

OrchestrationEngine
ProviderService
ProviderAdapterRegistry
ProviderSessionDirectory
ProviderRuntimeIngestion
checkpoint infrastructure
typed contracts
connection runtime
```

## Replace assumptions

Current conceptual assumption:

```text
Provider = external agent runtime
```

New model:

```text
ProviderRuntime
├── ExternalAgentRuntime
└── RuneNativeRuntime
```

And inside native:

```text
RuneNativeRuntime
└── ModelProvider
    ├── OpenRouter
    ├── OpenAI
    ├── Anthropic
    ├── DeepSeek
    ├── Gemini
    └── Local
```

---

# 5. DeepSeek Harness Parity Rule

DeepSeek Harness is the **minimum capability baseline**.

For every meaningful DeepSeek subsystem, we classify it:

```text
EXISTS IN T3
REUSE
ADAPT
REIMPLEMENT
IMPROVE
REPLACE
OUR ADDITION
```

Parity must include at minimum:

- session log
- agent contract
- agent loop
- system prompt assembly
- scoped prompt sections
- scoped tool schemas
- LLM adapter registry
- tool registry
- tool guarding
- context providers
- workspace instructions
- compaction
- tool-result pruning
- filesystem
- shell
- subprocess
- persistent terminals
- sandbox
- LSP
- skills
- subagents
- spawn
- fork
- external subagent providers
- agent control/messages
- jobs
- workflow engine
- Ralph-style iteration
- approval
- user questions
- attachments
- large-output spill handling
- plans
- todos
- goals
- settings
- credentials
- persistence
- workspace
- hooks
- extensions
- profiles/bundles
- SDK/API/ACP integration

Parity is not enough.

Every subsystem gets a second question:

> What makes ours measurably better?

---

# 6. FRONTEND MAXXING

Frontend is not decoration. For an agent product, frontend design changes trust, speed perception, and correction rate.

## 6.1 Primary UX objective

The user should always know:

1. What is happening?
2. Why is it happening?
3. What changed?
4. Is the agent blocked?
5. How confident are we?
6. What can I intervene in?
7. How expensive is this?
8. What remains?
9. Is the result verified?

Never leave a giant spinner saying:

```text
Thinking...
```

for 40 seconds.

---

# 7. Perceived Latency Budget

Set explicit UX targets.

## Target

| Event | Target |
|---|---:|
| click send -> local acknowledgement | < 50 ms |
| send -> thread state change | < 100 ms |
| send -> visible agent status | < 150 ms |
| send -> first useful activity | < 400 ms |
| provider request initiated | < 500 ms where possible |
| first streamed model token | provider-dependent |
| first tool result shown | ASAP |
| edit preview appearance | streamed incrementally |
| terminal output | streaming immediately |
| final verification status | progressive |

The user should see:

```text
Understanding request
→ locating relevant code
→ reading auth flow
→ checking existing tests
→ editing
→ verifying
```

but these should be **real runtime states**, not fake animations.

---

# 8. Optimistic UI

When the user sends:

```text
Fix the login redirect bug
```

the UI immediately:

- appends the message locally
- creates turn shell
- shows task state
- begins lightweight repository pre-analysis
- prepares likely context
- resolves available models/providers
- warms needed services

Do not wait for the model request before doing useful work.

---

# 9. Progressive Disclosure

Default UI:

```text
Agent is fixing authentication
3 files changed
2/3 checks passed
```

Expandable:

```text
Agent graph
tool trace
full model usage
context packet
raw terminal
prompt debug
provider timing
```

Powerful internals exist without overwhelming normal users.

---

# 10. Streaming Everything That Can Stream

Stream:

- assistant output
- reasoning status, where supported and appropriate
- tool states
- file reads
- file edits
- diff hunks
- terminal output
- subagent status
- verification
- provider fallback state
- context indexing status

Avoid UI that updates only after a 30-second operation finishes.

---

# 11. Agent Timeline

Every turn becomes a compact timeline:

```text
00.0  Request accepted
00.1  Classified: bug / medium complexity
00.2  Retrieved 8 relevant symbols
00.3  Selected model
01.2  Model first token
02.0  Read auth/session.ts
03.1  Read router.ts
04.8  Edited redirect.ts
06.2  Ran focused tests
08.1  Test failed
08.2  Repair step
10.5  Tests passed
11.0  Done
```

This is enormously useful for debugging harness latency.

---

# 12. Frontend Agent Graph

For complex tasks:

```text
Parent
├── Explorer      complete
├── Security      running
├── Implementer   running
└── Tests         queued
```

Click any node:

- objective
- model
- provider
- context size
- tools
- spend
- status
- output
- touched files

This makes multi-agent work understandable.

---

# 13. Diff UX Maxxing

Diff is one of the most important surfaces.

Features:

- streaming diffs
- file-by-file status
- inline rationale
- verification badges
- accept/revert hunk
- lock user-edited hunks from later agent overwrite
- show which agent made each change
- show base revision
- conflict detection
- test coverage links
- “why this changed”
- “related requirement”
- “risk”

Example:

```text
auth/session.ts

+ 12 - 4

Agent: Implementer
Reason: Preserve intended destination after OAuth callback
Verification:
✓ Typecheck
✓ auth.redirect.test.ts
✓ reviewer
```

---

# 14. Command Palette for Agent Operations

Examples:

```text
Run reviewer
Add security review
Switch model
Fork agent
Start fresh agent with context
Compact thread
Inspect context
Retry with another model
Compare two models
Verify all changes
Pause writes
Revert agent patch
```

Users should control orchestration without learning internal API syntax.

---

# 15. BACKEND MAXXING

The backend must be built for **throughput + determinism + cancellation + observability**.

The biggest mistake is one giant event loop that handles:

- RPC
- provider streams
- files
- git
- indexing
- terminals
- subagents
- embeddings
- verification

without workload isolation.

---

# 16. Workload Classes

Create separate execution classes:

```text
INTERACTIVE
- user turns
- approvals
- UI RPC

MODEL_IO
- inference streams

TOOLS
- file read/write
- search
- LSP

PROCESS
- shell
- tests
- builds

INDEXING
- semantic index
- embeddings

BACKGROUND
- compaction
- title generation
- telemetry

AGENT
- subagent workloads
```

Each gets bounded queues and concurrency.

One giant test process should not make UI RPC lag.

---

# 17. Global Scheduler

Core subsystem:

```ts
Scheduler.submit({
  class: "model",
  priority: "interactive",
  budget,
  affinity,
  cancellationSignal
})
```

Scheduler considers:

- CPU
- RAM
- disk IO
- number of model streams
- provider rate limits
- token budget
- dollar budget
- active terminals
- active test suites
- number of write agents
- project affinity

Example policy:

```text
max native model streams       8
max repository writers         2
max heavy test processes       2
max semantic indexing workers  2
max lightweight readers       12
```

Dynamic, not hardcoded forever.

---

# 18. Cancellation Must Be End-to-End

When user presses Stop:

```text
UI
→ RPC cancellation
→ orchestration
→ agent
→ model request
→ tool
→ subprocess
→ subagent
```

Every layer receives the same cancellation chain.

No zombie process.

No model stream continuing after the UI says stopped.

---

# 19. Fast Startup

Desktop cold start goals:

1. render shell before all services are ready
2. start server in parallel
3. lazy-load expensive features
4. defer semantic indexing
5. defer model catalog enrichment
6. cache provider capabilities
7. cache workspace metadata
8. reuse stable child processes where safe

Startup sequence:

```text
UI shell
||
server start
||
restore cached projects
||
provider health probe

then later:
semantic index refresh
model catalog refresh
background telemetry
```

---

# 20. Long-Lived Service Pools

Avoid repeated startup cost.

Potential pools:

- LSP processes
- embedding workers
- parser workers
- sandbox runners
- provider connections if protocol supports reuse
- model tokenizer workers

Reuse by workspace/language/provider where safe.

---

# 21. Incremental Everything

Never recompute the whole world when one file changes.

Incrementally update:

- git diff state
- code index
- AST chunks
- embeddings
- symbol graph
- rule scopes
- test dependency graph
- diagnostics
- workspace hashes

---

# 22. Semantic Index Inspired by Cursor, Improved for Local Harness Use

Cursor has publicly described codebase indexing with syntactic chunking, embeddings, caching unchanged chunks, and Merkle-tree-based change detection.

Our local-first version:

```text
Workspace
→ Merkle tree
→ changed files only
→ parser
→ syntax-aware chunks
→ content hash
→ embedding cache
→ vector index
→ symbol graph
```

Each chunk stores:

```ts
{
  file
  language
  symbol
  kind
  start
  end
  contentHash
  embedding
  imports
  exports
  references
  gitRecency
}
```

Semantic retrieval should be **one signal**, not the entire context algorithm.

---

# 23. Code Intelligence Graph

Combine:

- LSP
- AST
- imports
- call graph
- symbol references
- tests
- git history
- recent edits
- diagnostics
- semantic similarity

Graph:

```text
symbol
├── defined in
├── referenced by
├── calls
├── called by
├── tested by
├── imported by
├── changed with
└── owned by
```

Context retrieval uses graph expansion rather than only vector similarity.

---

# 24. AI MAXXING: The Prompt Compiler

Do not have:

```text
system-prompt.md
```

as one giant immutable blob.

Build:

```text
Prompt Registry
→ scope resolution
→ relevance filter
→ conflict resolution
→ token budgeting
→ provider dialect
→ model dialect
→ final request
```

Prompt section categories:

```text
-1000 identity
 -950 execution invariants
 -900 provider dialect
 -850 model dialect
 -800 role
 -700 permissions
 -600 tool guidance
 -500 workspace rules
 -400 skill guidance
 -300 memory
 -200 retrieved context policy
 -100 task-state context
    0 current objective
```

---

# 25. Stable Prefix Maxxing

Prompt caching matters.

Keep stable content as early and as unchanged as possible:

```text
HARNESS IDENTITY
CORE POLICIES
TOOL DEFINITIONS
STABLE WORKSPACE RULES
```

Dynamic content later:

```text
current files
current task
recent tool results
temporary memory
```

Benefits:

- provider cache reuse where supported
- less serialization churn
- predictable token usage
- easier prompt diffing

---

# 26. Provider-Specific Prompt Dialects

Canonical rule:

```text
Before editing a file, ensure you have current contents.
```

Compiler emits provider/model optimized form.

Maintain:

```text
dialects/
  openai/
  anthropic/
  deepseek/
  gemini/
  generic/
```

Benchmark dialects empirically.

Do not rely on folklore forever.

---

# 27. Tool-Schema Compiler

Canonical tool:

```ts
readFile({ path, startLine, endLine })
```

Model-facing schema can vary.

Track:

- malformed tool calls
- invalid paths
- argument repair frequency
- redundant reads
- average calls/task
- tool success
- tokens spent describing tools

Then optimize each model's tool schema.

---

# 28. Dynamic Tool Loading

Do not send every possible tool to every request.

Task:

```text
Explain this function
```

may need:

```text
read
search
lsp
```

Not:

```text
browser
deployment
database migration
image
git push
remote desktop
40 MCP tools
```

Tool selector:

```text
Task
+
Role
+
Workspace
+
Permissions
→ relevant tool bundle
```

Less prompt weight and less model confusion.

---

# 29. Instruction Graph

Support:

- RUNE.md
- AGENTS.md
- CLAUDE.md
- .cursor/rules
- package rules
- team rules
- user rules
- skill rules

Parse into normalized rule records:

```ts
Instruction {
  id
  source
  scope
  priority
  severity
  paths
  languages
  roles
  providers
  models
  text
}
```

Resolve according to current task.

Do not blindly inject every file.

---

# 30. Context Planner

This is one of the most important subsystems.

Input:

```text
user objective
current branch
open files
recent edits
errors
agent role
```

Available knowledge:

```text
semantic index
symbol graph
git history
tests
diagnostics
workspace rules
memory
prior session facts
```

Output:

```text
ContextPacket
```

Example:

```ts
{
  directFiles: [...],
  symbolSnippets: [...],
  tests: [...],
  diagnostics: [...],
  rules: [...],
  memory: [...],
  omittedReasoning: [...]
}
```

---

# 31. Context Budget Allocation

Do not fill context until model maximum.

Set target based on task.

Example budget:

```text
system/tools          15%
workspace rules        5%
primary code           30%
related code           15%
tests                   8%
history/memory         10%
recent interaction     10%
reserve                 7%
```

Dynamic per model and task.

Reserve context for future tool observations.

---

# 32. Speculative Context Loading

While intent classification/model selection runs:

- predict likely files
- pre-read hot files
- fetch diagnostics
- query semantic index
- query symbol graph

If prediction is wrong, discard.

This reduces time before the first useful model request.

Do not wait serially:

```text
classify
THEN retrieve
THEN inspect rules
THEN model select
THEN call
```

Parallelize independent work.

---

# 33. Request Preparation Pipeline

Bad:

```text
classification 300 ms
+
rules 100 ms
+
search 500 ms
+
model resolve 300 ms
+
provider probe 500 ms
=
1.7 s before request
```

Better:

```text
               ┌─ classify
user request ──┼─ rules
               ├─ retrieve
               ├─ provider health
               └─ model candidates

join only required outputs
→ request
```

---

# 34. Model Router

The user can choose:

```text
Auto
Fast
Balanced
Max Quality
Low Cost
Manual
```

Internally:

```ts
score =
  predictedQuality
  * toolReliability
  * contextFit
  * providerReliability
  * taskFit
  * modalityFit
  - costPenalty
  - latencyPenalty
```

Candidate constraints first:

- tool support
- context length
- structured output
- image input
- reasoning support
- privacy/ZDR
- provider availability

Then ranking.

---

# 35. OPENROUTER MAXXING

OpenRouter should be first-class, but RUNE remains the higher-level router.

OpenRouter gives us:

- hundreds of models
- model metadata
- supported parameters
- context lengths
- pricing
- provider routing
- provider fallbacks
- latency/throughput-aware routing
- BYOK routing
- data-retention controls
- ZDR filters

RUNE adds task-level knowledge.

Architecture:

```text
RUNE Task Router
→ chooses model
→ chooses routing policy
→ OpenRouter
→ chooses infrastructure provider endpoint
```

---

# 36. OpenRouter Model Catalog Sync

Background task:

```text
GET model catalog
→ normalize
→ diff
→ store
→ enrich local metadata
```

Local profile:

```ts
ModelProfile {
  id
  canonicalSlug
  provider
  contextLength
  modalities
  supportedParameters
  pricing
  benchmarkMetadata
  measuredTTFT
  measuredThroughput
  measuredReliability
  codingScore
  planningScore
  reviewScore
  toolScore
  promptDialect
  toolDialect
}
```

Never hardcode the model list as primary truth.

---

# 37. Provider Routing Profiles

Examples:

## Fast

```text
sort: latency
fallbacks: true
require required parameters
```

## Cheap

```text
sort: price
fallbacks: true
```

## Private

```text
ZDR only
data collection deny
```

## High Reliability

```text
preferred provider order
fallbacks true
minimum throughput
maximum latency
```

Expose as RUNE policies.

---

# 38. Direct Providers Still Matter

OpenRouter should not be the only path.

Native adapters can preserve:

- provider-native features
- latest API semantics
- caching controls
- session/state features
- special tool APIs
- provider-specific reasoning controls
- direct enterprise contracts

Therefore:

```text
OpenRouter = broad compatibility / flexibility
Native provider = maximum provider-specific capability
```

Both first-class.

---

# 39. Provider Health Engine

Track moving averages:

```text
TTFT
tokens/sec
error rate
429 rate
5xx rate
tool-call validity
stream disconnects
cost
```

Per:

```text
provider
model
endpoint
region if known
```

Router uses real observed performance.

---

# 40. Selective Provider Racing

For high-priority tasks where latency is more important than cost:

```text
send same request to A and B
take first acceptable stream
cancel loser
```

Use sparingly.

Possible modes:

- off
- first-token race
- first-valid-structured-result race

Never default to doubling spend.

---

# 41. AI Response Quality Maxxing

Do not judge quality by prose.

Task success signals:

- build passes
- focused tests pass
- regression tests pass
- typecheck passes
- lint passes where relevant
- runtime reproduction fixed
- user kept changes
- reviewer accepted
- no unexpected files touched
- requirements satisfied

These become training signals for harness configuration.

---

# 42. SUBAGENT MAXXING

Parity:

- spawn
- fork
- external agent
- control/messages
- structured report

Add:

- retrieve
- team
- persistent
- isolated workspace
- read-only
- specialist bundles
- model diversity policies

---

# 43. Four Context Strategies

## Spawn

```text
fresh
+ explicit objective
```

Best for independent review.

## Fork

```text
parent history
+ current objective
```

Best for continuing reasoning.

## Retrieve

```text
fresh
+ selected relevant facts/files/decisions
```

Best default for many subagents.

## Shared

```text
fresh/ongoing agent
+ team blackboard
```

Best for coordinated multi-agent work.

---

# 44. Agent Specification

```ts
AgentSpec {
  role
  objective
  contextStrategy

  modelPolicy
  tools
  permissions

  workspaceMode
  tokenBudget
  costBudget

  outputSchema
  verificationPolicy

  parentId
  teamId
}
```

No unstructured “spawn(prompt)” as the primary API.

---

# 45. Built-In Specialist Agents

Useful built-ins:

- Explorer
- Planner
- Implementer
- Debugger
- Test Engineer
- Reviewer
- Security Reviewer
- Performance Reviewer
- UX Reviewer
- Dependency Investigator
- Documentation Agent
- Git Archaeologist
- Build Fixer

Each has:

- prompt role
- default tools
- default permissions
- preferred model class
- output contract

---

# 46. Agent Blackboard

Structured shared team state:

```ts
Blackboard {
  facts
  decisions
  hypotheses
  blockers
  changedFiles
  testResults
  findings
  requests
  openQuestions
}
```

Agents publish facts, not giant chat dumps.

---

# 47. Parallelism Policy

Parallelize only independent work.

Good:

```text
Explorer A -> auth
Explorer B -> tests
Security -> threat surfaces
```

Bad:

```text
3 implementers editing same file simultaneously
```

Planner and scheduler determine dependency graph.

---

# 48. Workspace Isolation

Every writing subagent gets:

- git worktree, or
- virtual patch workspace

Then produces:

```ts
PatchProposal {
  baseRevision
  diff
  touchedFiles
  rationale
  verification
}
```

Merge pipeline handles conflicts.

---

# 49. Write Leases

Optional optimization for shared workspace mode:

```text
agent A leases auth/session.ts
agent B attempts write
→ queued / denied / separate patch
```

Symbol-level leases can come later.

---

# 50. RALPH / FORGE MAXXING

DeepSeek-style fresh-agent iteration is valuable because long histories accumulate failed reasoning.

Our Forge workflow:

```text
OBJECTIVE
→ PLAN
→ IMPLEMENT
→ TEST
→ REVIEW
→ REPAIR
→ VERIFY
```

Fresh agents may be used between stages.

Structured handoff only.

---

# 51. Forge Stop Conditions

Stop when:

- requirements verified
- build/tests pass
- reviewer score threshold reached
- no unresolved blockers

Also stop on:

- max spend
- max rounds
- repeated identical failure
- user interruption
- policy violation

Never endless loop.

---

# 52. Cross-Model Review

Use model diversity where helpful:

```text
Model family A implements
Model family B reviews
Model family A repairs
Model family C optionally verifies
```

This reduces correlated mistakes.

Not required for trivial work.

---

# 53. MEMORY MAXXING

Do not use one prose summary as “memory”.

Memory layers:

```text
TURN MEMORY
SESSION MEMORY
PROJECT MEMORY
WORKSPACE FACTS
USER-PINNED MEMORY
TEAM BLACKBOARD
```

Structured records.

---

# 54. Session Memory Schema

```ts
SessionMemory {
  objective
  constraints
  decisions
  discoveries
  touchedFiles
  testState
  failures
  userCorrections
  unresolved
  nextActions
}
```

Compaction generates prompt text from this structure.

---

# 55. Memory Confidence and Provenance

Every remembered fact:

```ts
{
  value,
  source,
  timestamp,
  confidence,
  staleAfter?,
  relatedFiles?,
  revision?
}
```

Example:

```text
"Auth uses Supabase middleware"

source: auth/middleware.ts@abc123
```

When file changes, memory can become stale.

---

# 56. Compaction Maxxing

Implement multiple compaction strategies:

- tool result pruning
- rolling summary
- structured memory projection
- semantic history selection
- provider-native compaction if useful

Token pressure should be measured using:

- system prompt
- tool schemas
- messages
- tool results
- context packet
- expected output reserve

Not only chat history.

---

# 57. Large Tool Output Handling

Never dump 5 MB of logs into model context.

Tool output manager:

```text
tool result
→ classify size/value
→ inline small
→ summarize medium
→ spill large
→ provide reference + targeted search
```

Example:

```text
Test output: 42,000 lines
Stored as observation://...
Relevant errors:
- ...
- ...
```

---

# 58. VERIFICATION MAXXING

“Agent says done” is not completion.

State machine:

```text
WORKING
→ CANDIDATE_COMPLETE
→ VERIFYING
→ PASSED
```

or:

```text
VERIFYING
→ FAILED
→ WORKING
```

---

# 59. Verifier Registry

```text
BuildVerifier
TestVerifier
FocusedTestVerifier
TypecheckVerifier
LintVerifier
RuntimeVerifier
RequirementVerifier
SecurityVerifier
PerformanceVerifier
UIVerifier
DiffReviewer
```

Task planner selects relevant verifiers.

---

# 60. Verification Evidence

Final answer can say:

```text
Changed:
- auth/redirect.ts
- auth/session.ts

Verified:
✓ typecheck
✓ 8 focused tests
✓ no new diagnostics
✓ independent review

Not verified:
- production OAuth callback against live provider
```

Trust increases because limitations are explicit.

---

# 61. Requirement Ledger

At task start:

```ts
Requirement {
  id
  text
  verificationMethod
  state
  evidence
}
```

Example:

```text
R1 preserve redirect
R2 no behavior regression
R3 add test
```

Completion requires ledger closure.

This is especially powerful for long implementation prompts.

---

# 62. PERFORMANCE MAXXING

Real performance measurement:

## Core metrics

- cold startup
- warm startup
- send-to-first-status
- send-to-provider-request
- TTFT
- tokens/sec
- first-tool latency
- tool roundtrip latency
- LSP latency
- semantic retrieval latency
- edit application latency
- verification latency
- turn completion latency

Use p50, p90, p99.

---

# 63. Latency Critical Path Tracing

Every turn gets a trace:

```text
request received
├─ classification 85ms
├─ context retrieval 190ms
├─ rules 18ms
├─ provider select 4ms
└─ model request
    ├─ network 62ms
    ├─ TTFT 740ms
    └─ generation
```

This tells us what to optimize instead of guessing.

---

# 64. Parallel Request Preparation

Initial request phase should execute independent activities concurrently.

```text
Promise.all / Effect.all:
- intent
- context search
- rule selection
- provider health
- model capability lookup
- workspace diagnostics
```

Join only where needed.

---

# 65. Cache Hierarchy

Cache:

```text
L1 process memory
L2 local SQLite/LMDB
L3 optional shared/team cache
```

Candidates:

- model catalog
- provider capability
- tokenization estimates
- prompt stable prefix
- parsed instructions
- syntax chunks
- embeddings
- symbol graph
- file hashes
- git metadata
- dependency graph

Cache keys must include version/revision.

---

# 66. Avoid Expensive Work on the Interactive Thread

Never block UI-sensitive service paths with:

- repository scan
- embedding generation
- large git diff
- test parsing
- compaction
- model catalog refresh

Push to background workers.

---

# 67. LSP Maxxing

Keep language servers warm.

Features:

- diagnostics
- definition
- references
- hover
- symbols
- workspace symbols
- rename analysis
- code actions where useful

Use LSP to answer precise questions without expensive semantic calls.

---

# 68. SEARCH Maxxing

Search stack:

```text
1 exact path/file
2 ripgrep
3 symbol search
4 AST query
5 semantic search
6 graph expansion
```

Select cheapest method capable of answering.

Do not use embeddings for everything.

---

# 69. MODEL CALL MAXXING

Reduce unnecessary model turns.

Examples:

- model requests file already in context -> tool layer can deduplicate
- repeated identical search -> cache
- malformed structured result -> local repair if safe
- trivial deterministic operation -> runtime tool handles directly
- verification result clear -> no model needed unless interpretation necessary

Models are expensive latency sources.

Use deterministic runtime logic whenever possible.

---

# 70. Tool Deduplication

Track recent calls:

```text
read file revision X lines 1-200
```

If model repeats immediately and file unchanged:

- return cached observation
- do not hit disk again

Likewise for search and diagnostics.

---

# 71. Tool Bundles

Predefined bundles:

```text
explore
implement
review
debug
security
frontend
database
deployment
```

Bundles select:

- tools
- instructions
- verifiers
- model policy

---

# 72. Skills Maxxing

Skill record:

```ts
Skill {
  id
  version
  description
  triggers
  instructions
  requiredTools
  optionalTools
  references
  tests
  compatibility
}
```

Skills load on demand.

Do not place the entire skill catalog content into every prompt.

Model sees compact catalog metadata first.

---

# 73. Skill Selection

Selection signals:

- explicit @skill
- task classifier
- path patterns
- language/framework detection
- tool need
- previous successful usage

Show UI:

```text
Skills active:
✓ React UI
✓ Supabase
✓ TDD
```

---

# 74. POLICY MAXXING

Policy engine evaluates:

```text
actor
tool
operation
resource
workspace
permission mode
risk level
```

Output:

```text
ALLOW
DENY
ASK
ALLOW_WITH_RESTRICTIONS
```

---

# 75. Risk Classification

Operations:

## Low

- read file
- search
- diagnostics

## Medium

- edit workspace file
- run tests
- install dev dependency

## High

- delete many files
- network credential use
- production deploy
- database migration
- secret modification

Policy mode changes behavior.

---

# 76. Sandbox Maxxing

Execution backends:

```text
local
local-restricted
Docker
Podman
remote SSH
cloud sandbox
future microVM
```

Same contract:

```ts
ExecutionBackend {
  spawn
  filesystem
  networkPolicy
  resourceLimits
  destroy
}
```

---

# 77. Resource Limits

Per job/agent:

- CPU
- RAM
- runtime
- process count
- network
- disk
- output size

Prevent runaway tests or accidental fork bombs.

---

# 78. PLUGIN MAXXING

Everything significant registers through stable capability interfaces.

Plugin may contribute:

- model provider
- agent provider
- tool
- prompt section
- context provider
- skill provider
- memory provider
- sandbox
- shell
- filesystem
- LSP
- workflow
- verifier
- UI panel
- command
- hook

---

# 79. Plugin Manifest

```ts
PluginManifest {
  id
  version
  apiVersion
  permissions
  capabilities
  dependencies
  optionalDependencies
}
```

Install must be reviewable.

---

# 80. Hot Mounting

Eventually:

```text
agent needs database inspection
→ finds approved plugin
→ user/policy approves
→ mount
→ use
→ unmount
```

This should be sandboxed and auditable.

---

# 81. OBSERVABILITY MAXXING

Every harness action should be traceable without logging secrets.

Trace hierarchy:

```text
turn
├── planning
├── context
├── model-call
│   └── stream
├── tool
├── subagent
├── verification
└── response
```

---

# 82. Cost Trace

Per turn:

```text
Model calls
$0.17

Subagents
$0.05

Embeddings
$0.002

Total
$0.222
```

User can inspect which action cost money.

---

# 83. Context Inspector

Expose what model actually received:

```text
System: 6.2k
Tools: 3.1k
Rules: 1.3k
Code: 24k
History: 12k
Memory: 2k
Reserve: 16k
```

And sources.

This is invaluable for debugging bad agent behavior.

---

# 84. Prompt Inspector / Replay

Developer mode:

- inspect compiled prompt
- inspect tools
- inspect context
- replay same turn
- change model
- change prompt version
- compare output

This becomes our internal Harness Lab.

---

# 85. HARNESS LAB

This is a major moat.

Take the same benchmark task and test:

```text
Prompt v1 vs v2
Tool schema A vs B
Context strategy X vs Y
Model A vs B
Compaction A vs B
Agent workflow A vs B
```

Metrics:

- success
- tests
- edits accepted
- latency
- tokens
- cost
- tool errors
- retries

Never optimize prompts by intuition alone.

---

# 86. Harness Configuration Versioning

Every run records:

```text
harnessVersion
promptCompilerVersion
toolCompilerVersion
contextStrategyVersion
routerVersion
skillVersions
verificationVersion
```

Then regressions can be traced.

---

# 87. User Satisfaction Signals

Useful weak signals:

- user accepted result
- immediate follow-up says still broken
- user reverted files
- checkpoint reverted
- task re-run
- reviewer failed
- changes committed

Do not equate long output with quality.

---

# 88. Adaptive Orchestration

Over time, router learns:

```text
small CSS task
→ one fast model

TypeScript bug
→ one strong model + focused verify

security-critical auth migration
→ planner + implementer + independent security review
```

The harness should become smarter about how much machinery to use.

---

# 89. Plan Mode Maxxing

Plan mode must be stateful, not just a markdown response.

Plan:

```ts
Plan {
  objective
  assumptions
  requirements
  steps
  dependencies
  files
  risks
  verification
}
```

Statuses:

```text
proposed
approved
running
blocked
completed
superseded
```

Agents update actual plan state.

---

# 90. Plan-to-Execution Mapping

Each plan step maps to:

- agent
- files
- tasks
- checks
- completion evidence

UI:

```text
1 Inspect auth flow        ✓
2 Implement callback       ✓
3 Add tests                running
4 Security review          queued
```

---

# 91. Git Maxxing

Use git as a first-class collaboration substrate.

Features:

- automatic checkpoints
- per-agent branches/worktrees
- patch transactions
- atomic revert
- commit generation optional
- changed-file ownership
- diff provenance
- conflict resolution

Do not make checkpoints race with provider-specific pseudo-diffs.

Use one authoritative checkpoint pipeline.

---

# 92. Transactional Patch Application

Agent edits against revision:

```text
base abc123
```

Before apply:

```text
current base?
conflict?
user changed same hunk?
policy allows?
```

If unsafe:

```text
rebase patch
or request re-read
```

Never silently overwrite.

---

# 93. Testing Maxxing

Test planner chooses:

```text
focused
related
package
workspace
full
```

based on risk.

Start fast.

Escalate only when necessary.

Example:

```text
1 focused unit tests
2 typecheck affected package
3 related integration
4 full suite if high-risk
```

---

# 94. Test Impact Graph

Map:

```text
symbol/file
→ likely tests
```

Sources:

- imports
- coverage data
- naming
- git co-change
- framework conventions

This reduces wasted full-suite execution.

---

# 95. FRONTEND AGENT / UI VERIFICATION

For frontend tasks:

- launch app
- capture screenshot
- inspect runtime errors
- optionally browser interaction
- compare expected states
- record artifacts

Cursor's recent cloud-agent direction emphasizes giving agents an actual environment where they can use and validate the software they build. We should support the same philosophy locally and remotely.

---

# 96. Browser / Computer Use Layer

Eventually:

```text
BrowserTool
DesktopTool
ScreenshotTool
DOMTool
NetworkInspector
ConsoleInspector
```

Frontend agent can:

```text
edit
→ run
→ open
→ interact
→ observe
→ fix
```

instead of stopping at compilation.

---

# 97. Error Recovery

Every failure gets classified:

```text
provider transient
provider permanent
tool transient
tool invalid arguments
sandbox denied
test failure
context missing
model malformed
rate limited
budget exhausted
```

Recovery policy differs.

Do not retry blindly.

---

# 98. Provider Failure Strategy

Example:

```text
OpenRouter endpoint 429
→ route fallback

Model tool-call invalid twice
→ repair schema or switch model

Provider stream disconnect
→ resume if supported
→ otherwise reconstruct turn safely
```

---

# 99. Structured Output Repair

For machine-to-machine outputs:

1. provider-native structured output if supported
2. local schema validation
3. deterministic lightweight repair if possible
4. one repair request
5. fail clearly

Do not continue with corrupt JSON.

---

# 100. Security of Provider Keys

Credential subsystem:

- OS keychain where possible
- encrypted local store fallback
- never put secrets in prompt
- redact logs
- per-provider scopes
- optional BYOK
- secret access audit

---

# 101. Privacy Modes

Profiles:

## Local-first

- no cloud indexing
- local embeddings
- local model optional

## Standard cloud

- selected model providers
- local repository index

## Strict privacy

- ZDR-compatible provider endpoints
- no telemetry
- redacted context policies

Expose clearly.

---

# 102. RUNE Profiles

Profile bundles:

```text
Fast
Balanced
Max Quality
Private
Local Only
Security Audit
Frontend Builder
```

Profile controls:

- router policy
- model preferences
- tools
- subagent budget
- verification depth
- sandbox
- context size
- cost cap

---

# 103. Default Fast Profile

Goal:

> feel faster than competitors for everyday coding.

Policy:

- low overhead classifier
- no planner for simple tasks
- speculative context
- fast model for exploration
- stronger model only if necessary
- focused verification
- max 1-2 subagents unless complexity demands more

---

# 104. Max Quality Profile

Policy:

- deeper context
- plan
- independent reviewer
- model diversity
- stronger verification
- broader tests
- higher spend budget

---

# 105. Cost Saver Profile

Policy:

- cheap explorer
- strong model only for critical steps
- aggressive caching
- smaller context
- limited retries
- no model racing
- focused verification

---

# 106. User Control Without Complexity

Simple top-level choices:

```text
Mode:
Fast | Balanced | Max Quality

Model:
Auto | Manual

Permissions:
Ask | Workspace | Full
```

Advanced settings hidden.

---

# 107. Recommended Repository Evolution

Starting from T3 Code:

```text
apps/
  desktop/
  web/
  mobile/
  server/

packages/
  contracts/
  client-runtime/

  harness-core/
    session/
    scope/
    events/
    agent/
    agent-loop/
    tools/

  prompt/
    registry/
    compiler/
    dialects/
    instruction-graph/

  model/
    contracts/
    registry/
    router/
    provider-openrouter/
    provider-openai/
    provider-anthropic/
    provider-google/
    provider-deepseek/
    provider-compatible/
    provider-local/

  context/
    engine/
    code-index/
    semantic-index/
    symbol-graph/
    memory/
    compaction/

  execution/
    filesystem/
    subprocess/
    shell/
    terminal/
    sandbox/
    lsp/

  agents/
    subagent-core/
    spawn/
    fork/
    retrieve/
    external/
    teams/
    scheduler/

  workflow/
    engine/
    ralph/
    forge/

  verification/
    core/
    build/
    tests/
    types/
    lint/
    review/
    security/
    ui/

  skills/
    core/
    local/
    registry/

  platform/
    settings/
    credentials/
    persistence/
    telemetry/
    plugins/
    hooks/
```

---

# 108. Canonical Runtime Events

Extend T3 canonical events to cover native harness internals:

```text
agent.created
agent.status.changed
agent.spawned
agent.message
agent.completed
agent.failed

model.request.started
model.first-token
model.usage
model.request.completed
model.request.failed

context.started
context.completed

tool.started
tool.progress
tool.completed
tool.failed

workflow.started
workflow.node.started
workflow.node.completed
workflow.completed

verification.started
verification.check
verification.failed
verification.passed
```

UI consumes these, never raw provider events.

---

# 109. ProviderAdapter vs ModelProvider

Keep separate interfaces.

```ts
interface AgentProviderAdapter {
  startSession()
  sendTurn()
  interrupt()
  streamEvents()
  resume()
}
```

for Codex/Claude/etc.

```ts
interface ModelProvider {
  discoverModels()
  stream()
  capabilities()
  health()
}
```

for OpenRouter/OpenAI/etc.

Do not blur them.

---

# 110. Native Agent Session

Thread may use:

```ts
runtime: {
  kind: "rune-native",
  modelProvider: "openrouter",
  model: "..."
}
```

External thread:

```ts
runtime: {
  kind: "external-agent",
  agentProvider: "codex"
}
```

This cleans the entire architecture.

---

# 111. Model Capability Probe

Catalog metadata may be incomplete.

Optional safe probe suite:

- basic stream
- tool call
- parallel tool call
- structured output
- reasoning parameter
- image input

Cache probe results.

Never repeatedly spend tokens probing.

---

# 112. Warm Model Selection

When user opens a workspace:

- load model registry
- refresh health asynchronously
- precompute recommended models
- do not wait until Send is pressed

---

# 113. Warm Context Selection

When user opens file / selects text / sees error:

precompute lightweight context candidates.

Then Send can reuse.

---

# 114. Composer Intelligence

Before request submission, local deterministic enrichment may add:

- selected code reference
- diagnostics
- active file
- branch
- explicit attachments

Do not make the model rediscover obvious UI state.

---

# 115. Context References Instead of Giant Paste

User attaches directory.

Store a reference:

```text
@src/auth
```

Context planner resolves relevance dynamically.

Do not paste all files.

---

# 116. Fast Explorer Model

Cursor documents that its Explore-style subagent can use a faster model to perform context-heavy searches without bloating the main context.

We should formalize:

```text
Explorer model class:
high tool reliability
fast TTFT
cheap
large context useful
```

Explorer returns structured findings to strong parent.

---

# 117. Bash Subagent / Log Isolation

Shell-heavy investigation can produce giant logs.

Run in child context:

```text
Bash Agent
→ shell
→ summarize findings
→ return concise report
```

Keeps main model clean.

---

# 118. Context Hygiene

Do not allow these to dominate parent context:

- long search listings
- compiler logs
- full test output
- huge JSON
- repeated files
- subagent scratch reasoning

Return structured result + references.

---

# 119. Confidence-Aware Escalation

If fast model detects low confidence:

```text
confidence low
or repeated tool failure
or verifier fails
→ escalate to stronger model
```

Cost-efficient quality.

---

# 120. Automatic Model Downgrade

For mechanical follow-up:

```text
strong model planned patch
```

cheap model may:

- run repetitive edits
- update tests
- perform mechanical refactor

Only if verification is strong.

---

# 121. Completion Quality Score

Internal only:

```text
requirements 40%
verification 30%
review 15%
diagnostics 10%
risk 5%
```

Never expose misleading “93% confidence” unless calibrated.

Use it for orchestration decisions.

---

# 122. Harness Self-Optimization

Store aggregate benchmark records:

```ts
HarnessRun {
  taskClass
  model
  provider
  promptVersion
  toolVersion
  contextVersion
  workflowVersion
  latency
  cost
  resultMetrics
}
```

Offline analyzer finds better policies.

---

# 123. No Silent Behavior Changes

When adaptive system changes routing logic:

- version it
- canary it
- benchmark it
- roll back on regression

A self-optimizing harness still needs engineering discipline.

---

# 124. Debug Reproducibility

For any failed turn, export:

```text
runtime config
model/provider
prompt section hashes
tool schemas
context manifest
events
patch
verification logs
timings
```

Redact secrets.

This enables deterministic-ish investigation.

---

# 125. Replay Modes

## Logical replay

Replay events without model calls for UI/debug.

## Harness replay

Re-run same task against same repository revision with another model/config.

Excellent for regression tests.

---

# 126. Benchmarks We Need

Create internal benchmark repository:

- simple edit
- multi-file refactor
- TypeScript type error
- failing unit test
- runtime bug
- dependency migration
- frontend visual issue
- security bug
- large monorepo exploration
- ambiguous feature request

Measure every release.

---

# 127. UX Benchmark

Also measure human-facing metrics:

- time until user sees useful action
- number of interruptions needed
- number of rejected diffs
- number of retries
- user revert rate
- completion clarity

Harness quality is not just SWE-bench.

---

# 128. Phase 0 — Rebrand Without Architecture Damage

Do not mix giant architecture rewrite with cosmetic rebranding.

Change:

- product name
- assets
- package names where planned
- paths/config directory
- app identifiers
- desktop metadata

Keep builds green.

Then harness work.

---

# 129. Phase 1 — Establish Runtime Boundary

Goal:

```text
External Agent Runtime
vs
RUNE Native Runtime
```

Deliver:

- runtime type
- canonical runtime events
- native stub adapter
- no provider conditionals in orchestration

This is foundational.

---

# 130. Phase 2 — Native Model Bus

Implement:

1. OpenRouter
2. OpenAI
3. Anthropic
4. Google
5. DeepSeek
6. generic OpenAI-compatible
7. local

Deliver:

- streaming
- tools
- usage
- cancellation
- structured output
- capability catalog
- provider health

---

# 131. Phase 3 — Minimal Native Agent Loop

Tools:

- read
- write/edit
- search
- shell
- terminal
- LSP

Features:

- sessions
- turns
- cancellation
- permissions
- event emission

At this point RUNE can code using OpenRouter directly.

---

# 132. Phase 4 — DeepSeek Prompt / Context Parity

Implement:

- prompt registry
- scoped sections
- runtime context providers
- tool schema assembly
- workspace instructions
- compaction
- tool-result pruning

Then improve with:

- prompt compiler
- instruction graph
- model dialects

---

# 133. Phase 5 — Code Intelligence

Implement:

- incremental parser
- semantic index
- symbol graph
- LSP integration
- git-awareness
- context planner

This is a major quality jump.

---

# 134. Phase 6 — Subagent Parity

Implement:

- spawn
- fork
- external provider bridge
- control/messages
- report channel

Then add:

- retrieve
- teams
- isolated worktrees
- scheduler

---

# 135. Phase 7 — Workflow / Forge

Implement:

- workflow engine
- bounded agent scripts/DAG
- Ralph parity
- Forge
- budgets
- stop conditions

---

# 136. Phase 8 — Verification

Implement:

- requirement ledger
- verifier registry
- focused tests
- build/type/lint
- review
- completion gate

Do not call the product “best” before this layer exists.

---

# 137. Phase 9 — OpenRouter / Model Router Intelligence

Implement:

- live model sync
- provider health
- model profiles
- routing modes
- automatic escalation
- optional routing policies

---

# 138. Phase 10 — Harness Lab

Build:

- replay
- A/B prompt
- A/B model
- tool schema evaluation
- context strategy evaluation
- dashboards

This is how we keep improving.

---

# 139. Definition of “1000x Better”

Not literally 1000x on one benchmark.

Use the phrase as a product discipline:

## Speed

- lower time-to-first-useful-action
- fewer serial preparation steps
- faster context retrieval
- fewer redundant tool calls

## Quality

- higher verified task completion
- fewer regressions
- better context relevance
- stronger independent checks

## Cost

- cheaper models for cheap work
- expensive models only where useful
- cache reuse
- reduced context waste

## Control

- transparent agent graph
- cancel/interrupt
- clean diffs
- reversible changes

## Extensibility

- plugin capability seams
- model/provider independence
- external agent support

That is measurable Harness Maxxing.

---

# 140. Anti-Patterns

Do **not**:

- make one giant system prompt
- make every task multi-agent
- give every model every tool
- send full repo context
- use semantic search for every lookup
- trust model claims of completion
- let agents overwrite files blindly
- hardcode OpenRouter model catalogs
- rely on one provider
- mix raw provider events into UI
- retry failures blindly
- store memory as one summary blob
- block startup on indexing
- block UI on backend maintenance
- run unlimited agents
- hide provider latency/cost
- build features without benchmark traces

---

# 141. The Fastest Possible Good Turn

Ideal everyday flow:

```text
0 ms
user presses Send

10 ms
message appears

30 ms
turn created locally/server-side

50 ms
parallel:
- classify
- rules
- context candidates
- provider health
- model choice

150-300 ms
request packet ready

provider call

model begins streaming

while model thinks:
- optional diagnostics already warm
- search/index ready
- LSP ready

model calls tools

tool observations stream immediately

edit appears as diff

focused verification begins immediately after stable patch

final response only after completion gate
```

This is the target experience.

---

# 142. The Best Complex Turn

```text
User task
→ complexity classifier
→ requirement extraction
→ plan
→ context map
→ specialist exploration in parallel
→ implementer with curated context
→ isolated patch
→ focused tests
→ reviewer with fresh/retrieved context
→ repair if needed
→ verification
→ merge patch
→ concise user summary + evidence
```

The user should feel like one brilliant agent is working.

Under the hood, the harness may coordinate many systems.

---

# 143. The North-Star Product Experience

The best harness does not impress the user with “AI.”

It feels like:

- instant
- aware
- calm
- precise
- reversible
- capable
- predictable

The user asks:

> Fix this.

The system already knows:

- project architecture
- relevant rules
- likely code
- available models
- tools
- permissions
- tests
- cost budget

It chooses the smallest workflow likely to succeed.

It escalates only when necessary.

It proves the result.

That is the end state.

---

# 144. Sources / Architecture References

Research references used for this blueprint:

## T3 Code

- Repository: https://github.com/pingdotgg/t3code
- Architecture overview: https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md
- Detailed architecture: https://github.com/pingdotgg/t3code/blob/main/docs/architecture/overview.md
- ProviderService: https://github.com/pingdotgg/t3code/blob/main/apps/server/src/provider/Services/ProviderService.ts
- ProviderAdapter: https://github.com/pingdotgg/t3code/blob/main/apps/server/src/provider/Services/ProviderAdapter.ts
- Connection runtime: https://github.com/pingdotgg/t3code/blob/main/docs/internals/connection-runtime.md
- Workspace layout: https://github.com/pingdotgg/t3code/blob/main/docs/internals/workspace-layout.md

## DeepSeek Harness

- Repository: https://github.com/deepseek-ai/deepseek-harness
- Architecture: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
- Core subsystem: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/core.md
- System prompt: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/system-prompt.md
- Subagents: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/subagent.md
- Workflow: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/workflow.md
- Compaction: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/compaction.md
- Package map: https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/README.md

## Cursor

- Agent overview: https://prod.cursor.com/docs/agent/overview
- Subagents: https://prod.cursor.com/docs/subagents
- Rules: https://prod.cursor.com/docs/rules
- Secure codebase indexing: https://cursor.com/blog/secure-codebase-indexing
- Agent computer use: https://cursor.com/blog/agent-computer-use

## OpenRouter

- Quickstart: https://openrouter.ai/docs/quickstart
- Models: https://openrouter.ai/docs/guides/overview/models
- Provider routing: https://openrouter.ai/docs/guides/routing/provider-selection
- Presets: https://openrouter.ai/docs/guides/features/presets
- Response healing: https://openrouter.ai/docs/guides/features/plugins/response-healing

---

# 145. Final Architectural Rule

Every engineering decision should answer these questions:

1. Does this reduce time to useful result?
2. Does this improve verified correctness?
3. Does this reduce unnecessary context?
4. Does this reduce unnecessary model calls?
5. Does this preserve provider independence?
6. Does this preserve reversibility?
7. Can we benchmark the improvement?
8. Can the user understand what happened?
9. Can another subsystem replace this implementation later?
10. Does it make the harness more capable without making simple tasks slower?

If the answer is no to most of them, we probably should not add the feature.

**Harness Maxxing = maximum useful intelligence around the model, minimum wasted work around the user.**
