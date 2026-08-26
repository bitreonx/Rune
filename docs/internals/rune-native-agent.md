# The native agent loop for API providers

> For maintainers. Using RUNE? See [docs/user](../user/).

Most providers wrap an external agent CLI. The `openaiApi` and `openrouter` drivers have no CLI to
wrap — they speak raw chat-completions APIs — so the server runs its own agent loop instead.
[`ApiAdapter.ts`][adapter] implements the standard adapter surface on top of
[`runAgenticTurn`][loop], a bounded conversation with the model: stream a completion, execute any
requested tools against workspace services, feed observations back, repeat until the model answers
in plain text or the request budget trips. Text streams out as canonical `content.delta` events, so
clients render these providers exactly like CLI-backed ones.

## Prompt layout

The system prompt ([`ApiPrompt.ts`][prompt]) is three stacked sections: identity, tool guidance,
then optional workspace instructions read from `AGENTS.md` (falling back to `CLAUDE.md`) in the
session's cwd, trimmed to 8,000 characters. Sections never change mid-session, which keeps the
prefix stable for provider prompt caches; the loop publishes a `systemPromptHash` with each turn.

## Tools

Tool definitions live in [`ApiTools.ts`][tools] (base tools) and [`ApiWorkspaceTools.ts`][compound]
(batch tools over the same services). Every execution failure becomes an `Error: …` observation
instead of failing the turn — a bad tool call is information for the next round-trip. Observations
are clamped to 16 KB.

| Tool                | Kind  | Approval | What it does                                          |
| ------------------- | ----- | -------- | ----------------------------------------------------- |
| `workspace_snapshot` | safe | never    | Bounded workspace structure summary, no file contents |
| `search_many`        | safe | never    | Several content searches in one call                  |
| `read_many`          | safe | never    | Several file reads in one call                        |
| `read_file`          | safe | never    | One UTF-8 file, optional line window                  |
| `list_dir`           | safe | never    | Directory entries without contents                    |
| `search`             | safe | never    | Content search as `path:line: snippet` lines          |
| `apply_patch`        | gated | policy  | Multi-file patch application                          |
| `generate_files`     | gated | policy  | Write or overwrite a batch of files                   |
| `run_checks`         | gated | policy  | Run configured check commands via the process runner  |
| `edit_file`          | gated | policy  | Unique-substring replacement in one file              |
| `bash`               | gated | policy  | Shell command in the workspace root (2 min timeout)   |

Safe tools run concurrently (up to eight); mutation tools run one at a time in call order
([`ApiToolScheduler.ts`][scheduler]). `bash` and `run_checks` are only offered when the host
supplies a process runner — the server layer provides one, slimmer embeddings can omit it, and the
tool self-guards with an error observation if asked anyway.

## Approvals and sandbox

Two session options decide what the model may do unattended:

- `sandboxMode: "read-only"` removes every gated tool from the offered set entirely — the model
  cannot request what it is not shown.
- `approvalPolicy: "untrusted"` or `"on-request"` gates each gated-tool call: the adapter publishes
  `request.opened` (`command_execution_approval` for `bash`, `file_change_approval` otherwise) with
  accept / accept-for-session / decline options and parks the turn fiber on a deferred until
  `respondToRequest` resolves it. Declining feeds the model an `Error: user denied <tool>`
  observation so it can pick another route. Accept-for-session flips the session's policy to
  `"never"`, so later calls run straight through.

Any other approval policy runs gated tools without asking.

## Budgets, retries, context

[`ApiExecutionPolicy.ts`][policy] bounds a turn: four provider requests per turn by default, one
transport retry, and compaction above 48,000 chars of conversation. Transport failures are
classified once — 401s surface immediately as a key problem, 402s as missing credits, everything
transient gets its single retry, and retries only cover stream acquisition because restarting after
bytes flowed would double-publish deltas. Repeated identical tool calls are short-circuited by
fingerprint instead of being executed again. When context grows past the budget, the ledger drops
oldest non-required tool observations first ([`ApiContextLedger.ts`][ledger]).

Model features are resolved conservatively ([`ApiCapabilities.ts`][capabilities]): parallel tool
calls, strict schemas, and reasoning mode are off unless the instance advertises them. Usage from
every round-trip accumulates into cumulative `thread.token-usage.updated` events, including
reasoning output tokens when the provider reports them.

## Known limits

- Sessions live in the adapter's memory. A server restart ends them like any other non-resumable
  provider; the [restart flow](./providers.md) applies unchanged.
- No checkpoints or resume cursors: turns replay from the message list the adapter keeps, not from
  git refs.
- The default request budget makes long multi-step tasks fail with an exhaustion receipt rather
  than silently wandering; raising it is a policy change, not a code path.
- Text and tool calls only — no image inputs or multimodal outputs.

[adapter]: ../../apps/server/src/provider/Layers/ApiAdapter.ts
[loop]: ../../apps/server/src/provider/Layers/ApiAgentLoop.ts
[prompt]: ../../apps/server/src/provider/Layers/ApiPrompt.ts
[tools]: ../../apps/server/src/provider/Layers/ApiTools.ts
[compound]: ../../apps/server/src/provider/Layers/ApiWorkspaceTools.ts
[scheduler]: ../../apps/server/src/provider/Layers/ApiToolScheduler.ts
[policy]: ../../apps/server/src/provider/Layers/ApiExecutionPolicy.ts
[ledger]: ../../apps/server/src/provider/Layers/ApiContextLedger.ts
[capabilities]: ../../apps/server/src/provider/Layers/ApiCapabilities.ts
