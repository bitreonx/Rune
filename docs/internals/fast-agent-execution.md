# Fast Agent Execution

## Status

API-provider fast-path slice implemented on the current `main` checkout. The
API loop now enforces the four-request policy, while CLI-backed providers such
as Codex and Claude remain unchanged until their adapters explicitly opt into
the same execution policy. The global transcript usage dashboard is still a
separate surface; per-turn API request telemetry is now available through the
shared runtime events.

## Problem

Before this slice, one user turn could make up to 32 sequential chat-completion requests. Each request included the stable system prompt plus the growing conversation, assistant tool calls, and tool observations. A model that discovers the repository one file at a time could therefore spend most of its latency and tokens repeatedly asking for context rather than changing code.

The visible consequences are:

- two user messages can produce dozens of provider requests;
- input tokens grow on every round because prior observations are resent;
- independent reads and tool calls wait for one another;
- a large edit is serialized through many `edit_file` calls;
- users cannot see whether time is being spent on the provider, tools, approvals, or verification;
- the current 32-request failure is late and expensive rather than an early, useful handoff.

The goal is not to claim that any remote model can reliably emit 10,000 correct source lines in a few seconds. Provider queueing, time-to-first-token, output-token throughput, and context limits remain external constraints. Rune's responsibility is to remove avoidable round-trips and use local deterministic work for large mechanical output.

## Goals

- Complete ordinary coding turns in one to four provider requests.
- Make the default hard budget four provider requests, excluding one narrowly defined transport retry.
- Execute independent safe tools concurrently.
- Prefer one repository snapshot and batched reads over repeated discovery calls.
- Apply large changes with one atomic patch or deterministic generator operation.
- Keep prompt-cache prefixes stable and keep dynamic observations compact.
- Preserve approval, sandbox, workspace confinement, remote operation, interruption, and checkpoint semantics.
- Expose request count, token count, cache-hit tokens, and phase timing per user turn.
- Support web, desktop, mobile, local, relay, and tunnel clients through shared contracts.
- Remain compatible with OpenAI-compatible providers, including OpenRouter and DeepSeek, without hard-coding model names.

## Non-goals

- Bypassing provider rate limits or promising a fixed provider response time.
- Replacing native Codex, Claude, Cursor, Grok, or OpenCode agent loops in the first delivery.
- Generating arbitrary 10,000-line blobs directly from model text when a template or transformation can produce them locally.
- Running repository-wide tests after every edit.
- Adding a distributed scheduler or a second orchestration system.

## Approaches considered

### 1. Lower the existing cap from 32 to 4

This immediately limits cost, but it preserves one-file-at-a-time discovery, sequential tools, repeated context, and weak completion behavior. Many legitimate tasks would fail after four inefficient rounds. This is a safety patch, not the final design.

### 2. Keep the free-form loop and add more parallelism

Executing tool calls concurrently reduces tool latency, but the model can still spend 32 requests rediscovering the workspace. Concurrent writes also become unsafe without conflict detection and atomic application.

### 3. Budgeted four-stage execution with compound tools

This is the recommended design. Rune gives the model high-bandwidth tools and an explicit request budget:

1. Inspect and plan.
2. Apply the complete change.
3. Verify and repair once.
4. Report or return a precise continuation.

Simple turns can finish in the first request. The model may skip stages, but it cannot exceed the budget. Safe operations can run concurrently; mutations remain atomic and ordered.

## Architecture

### Execution policy

Add a provider-neutral `AgentExecutionPolicy` resolved by the API adapter at turn start. The initial policy is server-owned and intentionally small:

```ts
interface AgentExecutionPolicy {
  readonly maxProviderRequests: 4;
  readonly maxTransportRetries: 1;
  readonly maxConcurrentSafeTools: 8;
  readonly maxObservationChars: 48_000;
  readonly maxPatchBytes: 2_000_000;
  readonly verificationMode: "focused";
}
```

The request budget counts every chat-completion POST, including requests that return tool calls. A retry is tracked separately and is allowed only when no response bytes were consumed. The policy is captured for the whole turn so settings changes cannot alter a running budget.

The four requests are roles, not mandatory requests:

| Request | Purpose | Expected result |
| --- | --- | --- |
| 1 | Inspect | final answer for trivial work, or one batch of safe discovery calls |
| 2 | Execute | one atomic patch/generation request, optionally with focused checks |
| 3 | Repair | consume verification output and apply one corrective patch |
| 4 | Finalize | concise completion, or an honest continuation with exact blockers |

When the budget is exhausted, Rune does not report a generic provider failure. It emits a normal terminal response stating what changed, what was verified, and what remains. If no safe terminal text exists, Rune synthesizes this from execution receipts without another model request.

### Compound workspace tools

Replace low-bandwidth repeated operations with a small set of bounded compound tools:

- `workspace_snapshot`: returns relevant top-level structure, repository metadata, dirty paths, package scripts, and instruction-file locations in one operation. It does not recursively dump the repository.
- `search_many`: accepts multiple searches and executes them concurrently with per-query and total output limits.
- `read_many`: reads bounded windows from multiple files concurrently and returns content hashes.
- `apply_patch`: applies a multi-file create/update/delete patch atomically after validating paths, expected hashes, patch size, and sandbox policy. A failed precondition writes nothing.
- `generate_files`: expands explicit templates or structured records locally. This is the fast path for large mechanical output. It is constrained to declared target files and reports hashes and line counts.
- `run_checks`: runs a bounded list of focused commands, concurrently only when they do not mutate shared build artifacts.

The existing `read_file`, `search`, `edit_file`, and `bash` tools remain as compatibility fallbacks. The system prompt tells capable models to prefer compound tools.

### Parallel tool scheduling

Tool calls returned in one assistant message are partitioned before execution:

- safe reads/searches run concurrently with a maximum concurrency of eight;
- approvals for independent gated operations may be requested together at the client boundary, but every operation retains its own decision and audit record;
- mutations execute in declared order;
- `apply_patch` is one mutation regardless of the number of files;
- shell checks run after successful mutation unless the model explicitly marks a check as read-only and independent;
- tool results are returned in the original call order for deterministic prompts.

This scheduler lives at the API-provider boundary. The orchestration decider remains pure and continues to receive canonical runtime events and receipts.

### Large-change strategy

Rune selects the fastest correct mechanism based on the requested work:

- semantic edits: model-generated atomic patch;
- repetitive files or boilerplate: structured manifest plus local templates;
- formatting: existing formatter over explicitly changed files;
- renames and mechanical rewrites: bounded local command or codemod;
- independent features: separate user-authorized agent lanes, each with its own request budget and isolated write scope;
- genuinely novel source: streamed model output, limited by provider throughput.

The system prompt must explicitly discourage line-count goals. Success is measured by correct behavior and small diffs, not generated volume.

### Context and token control

The stable system prompt and tool schemas stay byte-identical for prompt caching. Dynamic content is appended after that prefix.

Rune sends:

- the user request and only the thread context required for continuity;
- a compact workspace snapshot rather than raw directory listings;
- bounded tool observations with content hashes;
- changed hunks and focused diagnostics after mutation, not complete files already seen;
- a rolling execution ledger containing call IDs, statuses, hashes, and short summaries.

Rune does not summarize source code with another model request. Compaction is deterministic: deduplicate observations by content hash, replace superseded reads with the newest version, retain errors and mutation receipts, and clamp by policy. If compaction would remove information required for a safe write, the write is rejected and the model receives that fact.

DeepSeek context caching is automatic when request prefixes overlap, so keeping the prefix stable provides a direct benefit. Its API also reports prompt cache hit/miss tokens, which Rune should ingest when available. Provider-specific request fields such as strict tools, thinking mode, or reasoning effort are enabled through capabilities rather than URL or model-name checks.

### Provider capabilities

Add normalized API capabilities discovered from driver defaults, model metadata, and conservative runtime fallback:

```ts
interface ApiModelCapabilities {
  readonly parallelToolCalls: boolean;
  readonly strictToolSchemas: boolean;
  readonly reasoningMode: "none" | "optional" | "required";
  readonly reportsCachedTokens: boolean;
  readonly supportsFim: boolean;
}
```

Strict tool schemas are enabled when supported. Thinking/reasoning is a quality control, not the default speed path: routine edits use non-thinking or low-cost reasoning, while architectural or ambiguous tasks may use deeper reasoning within the same request budget. FIM can later optimize single-file insertions, but it is not required for the first delivery because multi-file atomic patches solve the larger problem.

Unknown OpenAI-compatible gateways get conservative defaults and retain the same four-request budget. Unsupported optional fields are never sent blindly.

### Usage and performance telemetry

The current usage dashboard must distinguish:

- user turns;
- provider requests;
- transport retries;
- tool calls;
- input, output, reasoning, cache-hit, and cache-miss tokens;
- provider time-to-first-byte and stream duration;
- tool execution and approval wait duration;
- request-budget outcome: completed, continued, exhausted, interrupted, or failed.

Every API turn publishes a compact progress event after each stage. Clients render one status line such as `Inspecting (1/4 requests)` or `Verifying (3/4 requests)`. This is shared through `packages/contracts` and `packages/client-runtime`; web and mobile use the same derived state, while desktop inherits web and preserves Electron interruption behavior.

Usage aggregation must not label streamed token snapshots as requests. A provider request is counted at the HTTP attempt boundary and correlated to one user turn. Retries are visible but separate.

### Error handling

- Invalid tool JSON gets one local repair attempt and does not consume another provider request.
- Repeated identical tool calls with unchanged inputs and unchanged workspace hashes are rejected locally with a loop-detected observation.
- A transient transport failure may retry once only before response bytes arrive.
- Rate limits honor provider retry headers when the delay fits the turn policy; otherwise the turn returns a resumable terminal state.
- Atomic patch conflicts return expected/current hashes and write nothing.
- Oversized observations are stored server-side when appropriate and represented in prompt context by a bounded excerpt plus hash; secrets are never persisted in new telemetry.
- Interruption cancels active HTTP streams and safe-tool fibers, waits for in-flight atomic mutation to commit or abort, then emits the existing terminal receipts.
- Budget exhaustion is not retried automatically.

## Contracts and surfaces

The first implementation changes these boundaries:

- `packages/contracts`: execution policy snapshot, per-turn performance counters, normalized API model capabilities, and progress events.
- `apps/server/src/provider/Layers`: budget state machine, tool scheduler, compound tools, request telemetry, and capability-aware request body construction.
- `packages/client-runtime`: derive progress and terminal budget state once for web and mobile.
- `apps/web`: progress text and per-turn request/token details; settings show the fixed fast policy without exposing a matrix of tuning knobs.
- `apps/mobile`: equivalent compact progress and details.
- `apps/desktop`: no separate agent logic; verify interruption, approvals, and local backend behavior through the shared server/web path.
- `apps/server/src/usage`: consume request-boundary telemetry for API providers while keeping transcript-based CLI usage intact.

No new client-to-provider direct path is introduced. Local, remote, relay, and tunnel clients continue sending commands to the environment that owns the workspace and credentials.

## Delivery slices

### Slice 1: Stop request explosions

Introduce the four-request budget, separate retry accounting, loop detection, cumulative per-turn usage, and terminal budget-exhaustion behavior. Keep existing tools. This produces immediate cost control and trustworthy metrics.

### Slice 2: Make four requests sufficient

Add `workspace_snapshot`, `search_many`, `read_many`, and concurrent safe-tool scheduling. Update prompt guidance. Demonstrate that representative read-only and small-edit tasks complete in at most three requests.

### Slice 3: Fast large changes

Add atomic `apply_patch`, deterministic `generate_files`, ordered mutation scheduling, and focused `run_checks`. Demonstrate a large generated fixture or scaffold without asking the model to emit every line.

### Slice 4: Provider intelligence and product visibility

Add normalized capabilities, strict schema support, cache-token accounting, optional reasoning controls, shared progress contracts, and web/mobile usage details. Verify DeepSeek and OpenRouter through OpenAI-compatible contract fixtures rather than vendor-specific orchestration forks.

## Verification strategy

Each slice starts with focused failing tests and avoids repository-wide checks.

Required server tests:

- one plain-text completion uses one provider request;
- multiple safe tool calls execute concurrently and preserve result order;
- a representative inspect/edit/check turn uses no more than four requests;
- the fifth request is impossible, including malformed and repeated tool-call cases;
- transport retry accounting is separate and cannot duplicate streamed deltas;
- context compaction keeps the stable prefix identical and removes superseded observations;
- atomic patch precondition failure leaves every target unchanged;
- interruption cannot leave a partially applied patch;
- usage is cumulative across rounds and cache-hit/miss tokens are preserved;
- unknown gateways receive only baseline-compatible fields;
- DeepSeek-style strict tools and usage chunks decode through capability fixtures.

Required contract/client tests:

- older servers remain renderable without the new optional counters;
- web and mobile derive identical stage and budget labels;
- request count, retry count, and user-turn count cannot be conflated;
- terminal exhausted turns remain resumable and are not displayed as running.

Performance acceptance scenarios use a scripted provider so results are deterministic:

| Scenario | Request budget | Local overhead target |
| --- | ---: | ---: |
| Answer from existing context | 1 | under 50 ms excluding provider |
| Locate and explain code | 2 | under 250 ms excluding filesystem scan and provider |
| Small multi-file edit plus focused check | 3 | under 500 ms excluding command and provider |
| Repair after failed focused check | 4 | under 750 ms excluding command and provider |
| Generate 10,000 deterministic lines | 2-3 | under 2 s local generation on a representative developer machine, excluding provider |

The 10,000-line case passes only when the output is generated from a bounded manifest/template and validates byte-for-byte. It is not evidence that a model can author 10,000 novel correct lines in seconds.

After integration, the primary agent performs one user-approved real-client verification for web and one for mobile if mobile progress UI changed. Browser or computer-use verification is not run without that approval.

## Rollout and safeguards

The budget and compound tools first ship behind a server capability advertised to clients, but the server owns enforcement. During internal rollout, telemetry compares request count, total tokens, completion rate, interruption rate, and repair rate against the existing API loop. There is no silent fallback to 32 rounds. If compound tools are disabled, the four-request cap still applies and the user receives a continuation rather than uncontrolled spend.

The feature graduates when representative API-provider tasks show:

- p95 provider requests per completed user turn at or below four;
- median provider requests at or below two;
- no increase in partial writes or sandbox escapes;
- lower median input tokens per completed task;
- no regression in remote, approval, interruption, or checkpoint behavior.

## Open implementation decisions

These are decisions for the implementation plan, not product ambiguity:

- whether the execution ledger is a new runtime event payload or a projection derived from request events;
- whether deterministic generation starts with a generic template schema or only repository-native generators;
- which existing workspace service owns atomic multi-file patch staging.

The implementation plan should resolve these by selecting the smallest design that preserves event-sourced receipts and atomic workspace writes.
