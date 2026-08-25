# RUNE Native Agent Loop — Design

**Date:** 2026-08-25
**Status:** Approved in chat, ready for implementation
**Blueprint:** T3CODE-HARNESS-MAXXING-BLUEPRINT.md §128–§133 (Phases 2–3)
**Predecessor:** docs/superpowers/plans/2026-08-24-rune-provider-model-plan.md (built the chat-only API adapters this slice upgrades)

## Goal

A thread pointed at an `openaiApi` or `openrouter` provider instance can read, search, edit files, and run commands in the workspace. Tool calls stream live through the existing timeline, gate on the existing approval UI, and are checkpointed and diffed like any other provider's work. After this slice RUNE owns a real harness for OpenAI-compatible models, not just a chat pipe.

## Non-goals (explicit)

- Subagents, teams, blackboards
- Semantic index / symbol graph / LSP tools
- Verification engine and requirement ledger
- Compaction strategies beyond the existing message-array behavior
- Model routing intelligence, provider health, catalog enrichment
- Session persistence across server restarts (parity with today's adapter; `resumeCursor` stays unused)
- New settings UI

## Decisions

1. **Approach A chosen:** extend the existing API adapter in place rather than adding a separate `rune-native` driver kind (rejected: duplicates config/UI/settings for the same endpoints) or scaffolding the blueprint's full package layout now (rejected: empty architecture ahead of behavior). The driver-kind split can be refactored later once the loop's shape has proven itself.
2. Tools are thin wrappers over server services that already enforce confinement (`WorkspaceFileSystem`, `ProcessRunner`, `WorkspaceSearchIndex`). Nothing new is trusted.
3. Permissions reuse the canonical approval flow (`request.opened` → client responds → adapter resolves), driven by the thread's existing interaction mode.
4. Prompt assembly orders content stable-prefix-first so provider-side prompt caching works from the first release.

## Architecture

Four modules next to the existing ones in `apps/server/src/provider/Layers/` (flat, matching repo idiom):

| Module | Responsibility |
|---|---|
| `ApiAgentLoop.ts` | The turn loop: compile prompt → stream completion → interpret tool calls → execute → feed results back → repeat until done or budget exhausted |
| `ApiTools.ts` | Tool definitions + executors over existing services |
| `ApiPrompt.ts` | Prompt assembly v0 |
| `ApiSse.ts` (extended) | Parse `tool_calls` deltas and `usage` chunks alongside text deltas |

`ApiAdapter.ts` remains the translation seam: it owns sessions, event publication, fibers, and lifecycle; it delegates turn execution to the agent loop.

## Agent loop protocol

```
compile prompt (stable prefix cached per session)
→ POST /chat/completions {messages, tools, stream: true, stream_options: {include_usage: true}}
→ stream: forward text deltas via existing coalesced sink;
  accumulate tool_call argument fragments by index
→ if no tool calls: finalize assistant message, emit token usage, turn.completed(completed)
→ else: for each tool call → approve-if-needed → execute →
  emit canonical item events → append assistant message + tool result messages
→ repeat (hard cap 32 model round-trips per turn; exceeded → turn failed with clear reason)
```

- Malformed tool-call JSON gets exactly one deterministic repair attempt before that call fails; the failure text is fed back to the model as an observation.
- Tool failures are observations for the model, not turn aborts — only transport/loop-level errors fail the turn.
- Usage from the final chunk emits `thread.token-usage.updated`.

## Tools v0

| Tool | Signature | Backing service | Canonical items |
|---|---|---|---|
| `read_file` | `(path, offset?, limit?)` | `WorkspaceFileSystem` | — |
| `edit_file` | `(path, oldText, newText)` | `WorkspaceFileSystem` write | `file_change` |
| `list_dir` | `(path)` | `WorkspaceEntries` | — |
| `search` | `(query)` | `WorkspaceSearchIndex` | — |
| `bash` | `(command)` | `ProcessRunner` (timeout + output cap) | `command_execution` |

Every path argument passes through the same root-confinement checks used elsewhere; escapes are denied observations, not crashes.

## Permissions

Gating inputs are the fields the orchestration layer already sends on `ProviderSessionStartInput`:

- `approvalPolicy` (`"untrusted" | "on-failure" | "on-request" | "never"`) — asks map to it as: `untrusted`/`on-request` → `edit_file` and `bash` require approval; `on-failure`/`never` → execute directly. Reads/searches always allowed.
- `sandboxMode` (`"read-only" | "workspace-write" | "danger-full-access"`) — hard authority, enforced regardless of what the prompt says: `read-only` denies `edit_file` and `bash` outright (denial observation to the model); `workspace-write` confines all tools to the workspace root (already the case); `danger-full-access` lifts only the workspace-write confinement of `bash`.

Approval mechanics: the loop publishes `request.opened` with request type `exec_command_approval` or `file_change_approval`, then parks on an `Effect.Deferred`; the adapter's existing `respondToRequest` hook completes it; denial returns an observation to the model. Interrupt/stop interrupts the parked fiber end-to-end (Effect fiber interruption covers model stream, tool process, and waiters).

## Prompt assembly v0

Order (stable-prefix-first):

1. Identity
2. Tool guidance
3. Workspace instructions — AGENTS.md / CLAUDE.md discovered at project root, read once per session
4. Dynamic tail — current task

The compiled system prompt is hashed and logged per request so future prompt diffs and Harness Lab comparisons are possible without retrofitting.

## What renders for free

Streaming assistant text (existing coalescing), tool cards (`command_execution` / `file_change` items), approval dialogs (`CanonicalRequestType` already covers both types), diffs and reverts via `CheckpointReactor` (native edits are plain workspace files inside checkpoint capture), spend via token usage events. Zero client-code changes expected; any renderer gap found during verification is fixed as part of this slice, not deferred.

## Error handling

At the HTTP boundary: 401 → actionable "check API key" message; 402 → "provider account out of credits"; 429 → single retry with backoff; 5xx / network → single retry, then transient failure. All terminal failures publish `turn.completed(state: "failed")` with a human-readable reason plus `runtime.error` where appropriate — never a silent hang or a lying spinner.

## Testing

Focused only (repo rule: no suite runs):

- Unit: `ApiSse` tool-call fragment accumulation and usage parsing; prompt assembly order + hash stability; path-confinement denials.
- Loop integration against a fake streaming HTTP server (pattern exists in `ApiAdapter.test.ts`): happy-path tool round trip, multi-tool sequences, bash approval gate in ask vs auto mode, malformed-argument repair path, runaway-loop cap, 402/429 error mapping.
- Typecheck/lint scoped to touched files.

## Follow-ups (each its own spec cycle)

Session resume from persisted orchestration events · instruction graph beyond root files · compaction · subagents (spawn/fork/retrieve) · verification engine · model router + provider health · Harness Lab replay.
