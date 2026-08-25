# RUNE Native Agent Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run tests from the repo root with `pnpm.cmd exec vp test run <files>` (vp is not on PATH in bash; use this form).

**Goal:** Upgrade the chat-only OpenAI-compatible API adapters (`openaiApi`, `openrouter`) into a real native agent loop that can read, search, edit files, and run commands in the workspace through tool calling.

**Architecture:** Four modules flat in `apps/server/src/provider/Layers/`: `ApiSse.ts` (extended wire parsing), `ApiPrompt.ts` (stable-prefix prompt assembly), `ApiTools.ts` (tool defs/executors over existing confined services), `ApiAgentLoop.ts` (the turn loop). `ApiAdapter.ts` stays the translation seam owning sessions/events/approvals and delegates turn execution to the loop.

**Tech Stack:** Effect (v4-style: `effect/*`, `effect/unstable/http`), Effect Schema contracts in `@t3tools/contracts`, Vitest via `vite-plus/test`.

**Spec:** docs/superpowers/specs/2026-08-25-native-agent-loop-design.md

## Global Constraints

- No client-code changes; everything renders through canonical `ProviderRuntimeEvent`s already in `packages/contracts/src/providerRuntime.ts`.
- Provider logic stays inside `apps/server/src/provider/Layers/` — no new nesting, no new packages.
- Hard cap **32 model round-trips per turn**; exceeded → turn failed with clear reason.
- Malformed tool arguments get **exactly one** deterministic repair attempt.
- Prompt order is stable-prefix-first: identity → tool guidance → workspace instructions → dynamic tail. Hash the compiled system prompt and log it per request.
- Approvals reuse canonical request types `exec_command_approval` / `file_change_approval`; gating inputs are `approvalPolicy` ("untrusted" | "on-failure" | "on-request" | "never") and `sandboxMode` ("read-only" | "workspace-write" | "danger-full-access") from `ProviderSessionStartInput`.
- Reads/searches always allowed; `edit_file` and `bash` follow the approval table; `sandboxMode: "read-only"` denies both outright regardless of policy.
- Errors: 401 → "check API key"; 402 → "out of credits"; 429/5xx/network → one retry then transient failure. Terminal failures publish `turn.completed(state:"failed")` with human-readable reason. Never hang silently.
- Focused tests only. No `vp check`, no suite runs, no repo-wide typecheck.
- Do not touch anything under `~/.t3/userdata` or start servers against it.

---

### Task 1: SSE wire parsing for tool calls and usage

**Files:**
- Modify: `apps/server/src/provider/Layers/ApiSse.ts`
- Test: `apps/server/src/provider/Layers/ApiSse.test.ts`

**Interfaces:**
- Produces (consumed by Task 5):
  - `SseLineResult` gains variants `{ kind: "toolCallDelta"; index: number; id?: string; name?: string; argsDelta: string }`, `{ kind: "finish"; reason: string }`, `{ kind: "usage"; usage: Record<string, number> }` (existing `"delta" | "done" | "ignore"` unchanged).
  - `makeToolCallAccumulator(): { add(result: Extract<SseLineResult, {kind:"toolCallDelta"}>): void; finish(): Array<{ id: string; name: string; arguments: string }> }` — merges streamed fragments by index into complete tool calls.

- [ ] **Step 1: Write failing tests**

Append to `ApiSse.test.ts`:

```ts
describe("ApiSse tool-call parsing", () => {
  it("parses streamed tool_call fragments", () => {
    expect(
      resultFromSseLine(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read_file","arguments":""}}]}}]}',
      ),
    ).toEqual({ kind: "toolCallDelta", index: 0, id: "call_1", name: "read_file", argsDelta: "" });
    expect(
      resultFromSseLine(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":"}}]}}]}',
      ),
    ).toEqual({ kind: "toolCallDelta", index: 0, argsDelta: '{"path":' });
  });

  it("parses finish_reason and usage chunks", () => {
    expect(
      resultFromSseLine('data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}'),
    ).toEqual({ kind: "finish", reason: "tool_calls" });
    expect(
      resultFromSseLine(
        'data: {"choices":[],"usage":{"prompt_tokens":120,"completion_tokens":40}}',
      ),
    ).toEqual({ kind: "usage", usage: { prompt_tokens: 120, completion_tokens: 40 } });
  });

  it("accumulates fragments into complete tool calls", () => {
    const acc = makeToolCallAccumulator();
    acc.add({ kind: "toolCallDelta", index: 0, id: "call_1", name: "edit_file", argsDelta: '{"path"' });
    acc.add({ kind: "toolCallDelta", index: 0, argsDelta: ':"a"}' });
    acc.add({ kind: "toolCallDelta", index: 1, id: "call_2", name: "bash", argsDelta: "{}" });
    expect(acc.finish()).toEqual([
      { id: "call_1", name: "edit_file", arguments: '{"path":"a"}' },
      { id: "call_2", name: "bash", arguments: "{}" },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiSse.test.ts`
Expected: FAIL — `makeToolCallAccumulator` not exported; toolCallDelta cases return `{kind:"ignore"}`.

- [ ] **Step 3: Implement in `ApiSse.ts`**

Extend the union and parser (existing delta/done/ignore branches unchanged):

```ts
export type SseLineResult =
  | { readonly kind: "delta"; readonly text: string }
  | { readonly kind: "toolCallDelta"; readonly index: number; readonly id?: string; readonly name?: string; readonly argsDelta: string }
  | { readonly kind: "finish"; readonly reason: string }
  | { readonly kind: "usage"; readonly usage: Record<string, number> }
  | { readonly kind: "done" }
  | { readonly kind: "ignore" };
```

Inside `resultFromSseLine`, after `isRecord(parsed)`:

```ts
if (isRecord(parsed.usage)) {
  const usage: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed.usage)) {
    if (typeof value === "number") usage[key] = value;
  }
  return { kind: "usage", usage };
}
const choices = parsed.choices;
if (!Array.isArray(choices)) return { kind: "ignore" };
const choice = choices.find(isRecord);
if (!choice) return { kind: "ignore" };
if (typeof choice.finish_reason === "string" && choice.finish_reason.length > 0) {
  return { kind: "finish", reason: choice.finish_reason };
}
if (!isRecord(choice.delta)) return { kind: "ignore" };
if (Array.isArray(choice.delta.tool_calls)) {
  const call = choice.delta.tool_calls.find(isRecord);
  if (!call || typeof call.index !== "number") return { kind: "ignore" };
  const fn = isRecord(call.function) ? call.function : {};
  return {
    kind: "toolCallDelta",
    index: call.index,
    ...(typeof call.id === "string" && call.id.length > 0 ? { id: call.id } : {}),
    ...(typeof fn.name === "string" && fn.name.length > 0 ? { name: fn.name } : {}),
    argsDelta: typeof fn.arguments === "string" ? fn.arguments : "",
  };
}
```

(Then the existing `content` branch stays as-is.) Add the accumulator below the parser:

```ts
export interface CompletedToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

export const makeToolCallAccumulator = (): {
  add: (result: Extract<SseLineResult, { kind: "toolCallDelta" }>) => void;
  finish: () => Array<CompletedToolCall>;
} => {
  const byIndex = new Map<number, { id: string; name: string; arguments: string }>();
  return {
    add: (result) => {
      const current = byIndex.get(result.index) ?? { id: "", name: "", arguments: "" };
      byIndex.set(result.index, {
        id: current.id || result.id || "",
        name: current.name || result.name || "",
        arguments: current.arguments + result.argsDelta,
      });
    },
    finish: () =>
      [...byIndex.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, call]) => ({ ...call, id: call.id || `call_${index}` }))
        .filter((call) => call.name.length > 0),
  };
};
```

- [ ] **Step 4: Run tests to green**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiSse.test.ts apps/server/src/provider/Layers/ApiAdapter.test.ts`
Expected: PASS — including pre-existing ApiAdapter streaming tests (parser change is additive).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/provider/Layers/ApiSse.ts apps/server/src/provider/Layers/ApiSse.test.ts
git commit -m "feat(server): parse tool_calls and usage from OpenAI-compatible SSE streams"
```

---

### Task 2: Prompt assembly v0

**Files:**
- Create: `apps/server/src/provider/Layers/ApiPrompt.ts`
- Create: `apps/server/src/provider/Layers/ApiPrompt.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (Task 5 consumes):
  - `compileSystemPrompt(input: { identity: string; toolGuidance: string; workspaceInstructions?: string }): string` — sections joined `\n\n`, always in this order, empty optional sections omitted.
  - `hashPrompt(prompt: string): string` — sha256 hex prefix (16 chars).
  - `defaultIdentity: string`, `defaultToolGuidance: string` — module constants (concise harness identity; read-before-edit rule; edit uniqueness rule; workspace-relative paths; stop-when-done).

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vite-plus/test";
import { compileSystemPrompt, defaultIdentity, hashPrompt } from "./ApiPrompt.ts";

describe("ApiPrompt", () => {
  it("orders sections stable-prefix-first and omits missing optionals", () => {
    const full = compileSystemPrompt({
      identity: "I",
      toolGuidance: "T",
      workspaceInstructions: "W",
    });
    expect(full).toBe("I\n\nT\n\nW");
    expect(compileSystemPrompt({ identity: "I", toolGuidance: "T" })).toBe("I\n\nT");
  });

  it("hashes deterministically", () => {
    expect(hashPrompt("abc")).toBe(hashPrompt("abc"));
    expect(hashPrompt("abc")).not.toBe(hashPrompt("abd"));
    expect(hashPrompt(defaultIdentity)).toMatch(/^[0-9a-f]{16}$/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiPrompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ApiPrompt.ts`**

Use Node `crypto` directly (server-side module; matches `atomicWrite.ts`-style plain-node usage):

```ts
import { createHash } from "node:crypto";

export const defaultIdentity = [
  "You are RUNE, a coding agent operating inside the user's workspace.",
  "You can read, search, edit files and run commands using the provided tools.",
  "Paths are workspace-relative. Read a file before editing it.",
  "oldText in edit_file must match exactly one location.",
  "When the task is complete, reply with a concise summary and stop calling tools.",
].join("\n");

export const defaultToolGuidance = [
  "- Prefer search over listing directories when locating code.",
  "- Keep command output small; you will see only what fits.",
  "Verify edits compile/run when the workspace has fast checks available.",
].join("\n");

export function compileSystemPrompt(input: {
  identity: string;
  toolGuidance: string;
  workspaceInstructions?: string;
}): string {
  return [input.identity, input.toolGuidance, input.workspaceInstructions]
    .filter((section): section is string => section !== undefined && section.length > 0)
    .join("\n\n");
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
```

- [ ] **Step 4: Run to green**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiPrompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/provider/Layers/ApiPrompt.ts apps/server/src/provider/Layers/ApiPrompt.test.ts
git commit -m "feat(server): stable-prefix prompt assembly for native agent loop"
```

---

### Task 3: Safe tools — read_file, list_dir, search

**Files:**
- Create: `apps/server/src/provider/Layers/ApiTools.ts`
- Create: `apps/server/src/provider/Layers/ApiTools.test.ts`

**Interfaces:**
- Consumes: `WorkspaceFileSystem` (readFile), `WorkspaceEntries` (browse, searchContents) — all take cwd per call; confinement/symlink checks are theirs.
- Produces (Tasks 4–6 consume):
  ```ts
  export interface NativeToolContext {
    readonly cwd: string;
    readonly workspaceFileSystem: WorkspaceFileSystem["Service"];
    readonly workspaceEntries: WorkspaceEntries["Service"];
    readonly processRunner?: ProcessRunner["Service"]; // Task 4
  }
  export interface NativeToolDef {
    readonly name: string;
    readonly description: string;
    readonly parametersJsonSchema: Record<string, unknown>;
    readonly requiresApproval: boolean;
    readonly execute: (args: Record<string, unknown>, context: NativeToolContext) => Effect.Effect<string>; // never fails: errors become observation text
  }
  export const SAFE_TOOLS: ReadonlyArray<NativeToolDef>; // read_file, list_dir, search
  ```
  Observation convention: success returns plain content; failures return `Error: <message>` so the model can adapt.

- [ ] **Step 1: Write failing tests**

Real temp-dir workspace. Layer recipe mirrors production `server.ts:337-343` with `GitVcsDriver` mocked exactly like `server.test.ts:563`:

```ts
import { describe, expect, it } from "vite-plus/test";
import * as NodeFSP from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { GitVcsDriver } from "../../vcs/GitVcsDriver.ts"; // adjust import path to actual module location
import { WorkspaceEntries } from "../../workspace/WorkspaceEntries.ts";
import { WorkspaceFileSystem } from "../../workspace/WorkspaceFileSystem.ts";
import { WorkspacePaths } from "../../workspace/WorkspacePaths.ts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as NodeServices from "@effect/platform-node/NodeServices";

import { SAFE_TOOLS, type NativeToolContext } from "./ApiTools.ts";

const toolServicesLayer = Layer.mergeAll(
  NodeServices.layer,
  WorkspacePaths.layer,
  WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer)),
  WorkspaceFileSystem.layer.pipe(
    Layer.provide(WorkspacePaths.layer),
    Layer.provide(
      WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer)),
    ),
    Layer.provideMerge(Layer.mock(GitVcsDriver.GitVcsDriver)({})),
  ),
);

async function withContext(run: (ctx: NativeToolContext) => Promise<void>) {
  const cwd = await NodeFSP.mkdtemp(path.join(os.tmpdir(), "rune-tools-"));
  await NodeFSP.writeFile(path.join(cwd, "hello.txt"), "line1\nline2\n", "utf8");
  await Effect.runPromise(
    Effect.gen(function* () {
      const ctx: NativeToolContext = {
        cwd,
        workspaceFileSystem: yield* WorkspaceFileSystem,
        workspaceEntries: yield* WorkspaceEntries,
      };
      yield* Effect.promise(() => run(ctx));
    }).pipe(Effect.provide(toolServicesLayer)),
  );
  await NodeFSP.rm(cwd, { recursive: true, force: true });
}
```

Test cases:

```ts
describe("ApiTools safe tools", () => {
  it("read_file returns contents and honors line offset/limit", async () => {
    await withContext(async (ctx) => {
      const read = SAFE_TOOLS.find((t) => t.name === "read_file")!;
      expect(await Effect.runPromise(read.execute({ path: "hello.txt" }, ctx))).toContain("line2");
      expect(await Effect.runPromise(read.execute({ path: "hello.txt", offset: 2, limit: 1 }, ctx))).toBe("line2");
    });
  });

  it("read_file denies paths escaping the root", async () => {
    await withContext(async (ctx) => {
      const read = SAFE_TOOLS.find((t) => t.name === "read_file")!;
      const observation = await Effect.runPromise(read.execute({ path: "../outside.txt" }, ctx));
      expect(observation.startsWith("Error:")).toBe(true);
    });
  });

  it("list_dir lists without reading file contents", async () => {
    await withContext(async (ctx) => {
      const list = SAFE_TOOLS.find((t) => t.name === "list_dir")!;
      expect(await Effect.runPromise(list.execute({ path: "." }, ctx))).toContain("hello.txt");
    });
  });

  it("search finds content matches formatted as path:line: snippet", async () => {
    await withContext(async (ctx) => {
      const search = SAFE_TOOLS.find((t) => t.name === "search")!;
      expect(await Effect.runPromise(search.execute({ query: "line2" }, ctx))).toMatch(/hello\.txt:\d+:/);
    });
  });

  it("every tool def is fully described", () => {
    for (const def of [...SAFE_TOOLS]) {
      expect(def.description.length).toBeGreaterThan(0);
      expect(Object.keys((def.parametersJsonSchema as { properties?: object }).properties ?? {})).toEqual(
        expect.arrayContaining([expect.any(String)]),
      );
    }
  });
});
```

Cases:
- `read_file` returns contents; `offset/limit` slice lines (`{path:"hello.txt", offset:2, limit:1}` → `"line2"`).
- `read_file` outside root (`{"path":"../x"}`) → observation starts with `Error:`.
- `list_dir` lists entries of a subdir without reading them.
- `search` finds a content match and formats `path:line: snippet`.
- Every def has non-empty description and JSON-schema `properties`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiTools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three tools**

Tool JSON schemas are plain objects. Each execute wraps service effects with `Effect.catch` → `` Error: ${message} `` observation. `read_file` post-slices lines from `ProjectReadFileResult.contents` when `offset`/`limit` present; appends `[truncated]` marker when `truncated`. `list_dir` uses `workspaceEntries.browse({ partialPath, cwd })`. `search` uses `workspaceEntries.searchContents({ cwd, query, limit: 20, caseSensitive: false, wholeWord: false, useRegex: false })` and formats `ProjectSearchContentsResult` matches as `relativePath:line: snippet` capped at ~4 KB.

- [ ] **Step 4: Run to green**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiTools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/provider/Layers/ApiTools.ts apps/server/src/provider/Layers/ApiTools.test.ts
git commit -m "feat(server): safe native tools (read_file, list_dir, search)"
```

---

### Task 4: Gated tools — edit_file, bash

**Files:**
- Modify: `apps/server/src/provider/Layers/ApiTools.ts`
- Modify: `apps/server/src/provider/Layers/ApiTools.test.ts`

**Interfaces:**
- Produces (Task 5 consumes):
  - `GATED_TOOLS: ReadonlyArray<NativeToolDef>` — `requiresApproval: true`.
  - `edit_file(path, oldText, newText)`: read via `WorkspaceFileSystem.readFile`, require exactly one occurrence of `oldText` (else observation `Error: oldText matched N locations` / `not found`), replace, write via `writeFile`.
  - `bash(command)`: `processRunner.run({ command: shell, args: [shellFlag, command], cwd, timeout: "120 seconds", maxOutputBytes: 65_536, outputMode: "truncate", timeoutBehavior: "timedOutResult" })` where `(shell, flag)` = win32 → `("cmd.exe","/c")`, otherwise `("bash","-c")` with `"sh"` fallback unhandled (bash exists everywhere we target). Observation includes exit code, timedOut flag, stdout/stderr tails.

- [ ] **Step 1: Write failing tests**

Same harness as Task 3 plus a stubbed ProcessRunner (object literal cast like `makeStreamingClient` does for HttpClient):
- `edit_file` happy path rewrites file on disk; two occurrences → error observation, file untouched; missing file → error observation.
- `bash` echoes stdout; nonzero exit still returns observation (no throw); timeout produces timedOut marker.
- Both defs have `requiresApproval === true`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiTools.test.ts`
Expected: FAIL — GATED_TOOLS not exported.

- [ ] **Step 3: Implement**

Per interfaces above. Keep executors pure relative to services; no event publishing here (adapter owns events).

- [ ] **Step 4: Run to green**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiTools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/provider/Layers/ApiTools.ts apps/server/src/provider/Layers/ApiTools.test.ts
git commit -m "feat(server): gated native tools (edit_file, bash) with approval flags"
```

---

### Task 5: The agent loop

**Files:**
- Create: `apps/server/src/provider/Layers/ApiAgentLoop.ts`
- Create: `apps/server/src/provider/Layers/ApiAgentLoop.test.ts`

**Interfaces:**
- Consumes: Task 1 (`resultFromSseLine`, `makeToolCallAccumulator`), Task 2 (`compileSystemPrompt`, `hashPrompt`, defaults), Task 3–4 (`SAFE_TOOLS`, `GATED_TOOLS`, `NativeToolContext`).
- Produces (Task 6 consumes):
  ```ts
  export interface AgentLoopDeps {
    readonly httpPost: (url: string, body: unknown) => Effect.Effect<Stream.Stream<Uint8Array>, ProviderAdapterRequestError>; // adapter supplies postStream
    readonly publish: (event: ProviderRuntimeEvent) => Effect.Effect<void>;
    readonly stamp: Effect.Effect<{ eventId: EventId; createdAt: string }, ProviderAdapterError>;
    readonly toolContext: NativeToolContext;
    readonly approvalGate?: (input: { toolName: string; summary: string }) => Effect.Effect<void, ProviderAdapterError>; // undefined = auto mode; Task 7 supplies real gate
  }
  export const runAgenticTurn = (deps: AgentLoopDeps, input: {
    threadId: ThreadId; turnId: TurnId; itemIdPrefix: RuntimeItemId; messages: Array<ApiChatMessage | ApiAssistantToolMessage | ApiToolResultMessage>;
    model: string; baseUrl: string; apiKey: string; requestHeaders?: Readonly<Record<string,string>>;
    workspaceInstructions?: string; sandboxReadOnly: boolean;
  }): Effect.Effect<{ finalText: string; usage?: Record<string,number>; systemPromptHash: string }, ProviderAdapterError>;
  ```
  Message shapes: reuse OpenAI dialect — assistant message may carry `tool_calls`; tool results are `{ role: "tool", tool_call_id, content }`. Export these interfaces from `ApiAgentLoop.ts`.

Loop behavior per spec §Agent loop protocol: build request `{model, messages, stream:true, stream_options:{include_usage:true}, tools:[...all defs as {type:"function",function:{name,description,parameters}}], tool_choice:"auto"}`; system prompt compiled once per turn and prepended as first message; forward assistant text deltas through `publish(content.delta)` (reuse coalescing from `ApiSse.makeCoalescedDeltaSink`); accumulate tool calls; emit usage when parsed. Sandbox read-only strips `edit_file`/`bash` from the offered set entirely. Round-trip cap 32 → fail turn. Malformed JSON args → one repair attempt (strip code fences, retry parse) → else `Error:` observation. `approvalGate` runs before gated tool execution; denied → observation `Error: user denied <tool>`.

- [ ] **Step 1: Write failing integration test**

Reuse `ApiAdapter.test.ts` harness style: `makeStreamingClient(chunks)` fake HttpClient, `NodeServices.layer`, drive `runAgenticTurn` directly with a scripted multi-chunk SSE conversation:
1. First response streams `read_file` tool call + finish_reason `tool_calls`.
2. Second response streams text "done" + finish `stop` + usage chunk.
Assert: request bodies contain `tools` and growing `messages` (assistant tool_calls + `role:"tool"` result with file contents); published events include the content deltas and a `thread.token-usage.updated`; returned `finalText === "done"`.
Also assert: cap test (32 responses all requesting tools) fails with cap message; malformed args produce exactly one follow-up request containing an `Error:` tool observation and no extra model round-trip beyond the normal continuation.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiAgentLoop.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `runAgenticTurn`**

Single `Effect.gen`. Structure: outer `while (roundTrips < 32)`; inner `Stream.runFold`-style consumption of decoded SSE lines feeding `resultFromSseLine`; collect text/toolCalls/usage/finish; dispatch tools sequentially via their `execute` with `approvalGate` for gated ones; append assistant+tool messages; continue. Map transport failures through `classifyTransportError`:

```ts
const classifyTransportError = (cause: unknown): { retryable: boolean; message: string } => {
  const status =
    (cause as { status?: number }).status ?? (cause as { statusCode?: number }).statusCode;
  if (status === 401) return { retryable: false, message: "Provider rejected the API key. Check the key in provider settings." };
  if (status === 402) return { retryable: false, message: "Provider account is out of credits." };
  if (status === 429 || (typeof status === "number" && status >= 500) || status === undefined)
    return { retryable: true, message: "Transient provider failure." };
  return { retryable: false, message: `Provider request failed${typeof status === "number" ? ` (HTTP ${status})` : ""}.` };
};
```

Retryable → one `Effect.sleep("1 seconds")` + retry; second failure surfaces. Compute `hashPrompt(systemPrompt)` and include it in the loop's return value as `systemPromptHash` (add to the interface) so Task 6 can attach it to server-side diagnostics; do NOT extend any contract schema this slice — prompt-hash observability belongs to the later observability slice.

- [ ] **Step 4: Run to green**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiAgentLoop.test.ts apps/server/src/provider/Layers/ApiSse.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/provider/Layers/ApiAgentLoop.ts apps/server/src/provider/Layers/ApiAgentLoop.test.ts
git commit -m "feat(server): native agent loop over OpenAI-compatible tool calling"
```

---

### Task 6: Adapter integration — sessions, events, approvals

**Files:**
- Modify: `apps/server/src/provider/Layers/ApiAdapter.ts`
- Modify: `apps/server/src/provider/Layers/ApiProvider.ts` (pass tool services into `makeApiAdapter`)
- Modify: `apps/server/src/provider/Layers/ApiAdapter.test.ts`
- Modify: `apps/server/src/provider/Drivers/OpenAiApiDriver.ts` and `OpenRouterDriver.ts` (env types gain `WorkspaceFileSystem | WorkspaceEntries | ProcessRunner`)
- Modify: `apps/server/src/provider/builtInDrivers.ts` (`BuiltInDriversEnv` union picks this up automatically)

**Interfaces:**
- Consumes: Task 5 `runAgenticTurn`.
- Produces: `makeApiAdapter` options gain `toolServices: { workspaceFileSystem; workspaceEntries; processRunner }`. Session context gains `pendingApprovals: Map<ApprovalRequestId, Deferred.Request<ProviderApprovalDecision>>` and stores `sandboxMode` from `startSession` input (extend stored session fields locally; `ProviderSession` contract unchanged unless a field already exists — check first; if absent keep sandbox in context only).

Behavior:
- `runTurn` delegates to `runAgenticTurn`, publishing through existing `publish`/`makeStamp`; maps `finalText`/failure to existing `item.completed` + `turn.completed` payloads (unchanged shapes).
- Approval gate (replaces Task 5's undefined): policy mapping is explicit — session `approvalPolicy` `"untrusted"` or `"on-request"` → pass the gate into the loop; `"on-failure"` or `"never"` → pass `undefined` (auto-execute). Gate behavior: publishes `request.opened` with `requestType` `exec_command_approval` (bash) or `file_change_approval` (edit_file), `options` from `ProviderApprovalOption` contract values used elsewhere for approve/reject; awaits `Deferred` from `pendingApprovals`; decision deny → throw denial observation inside loop.
- `respondToRequest(threadId, requestId, decision)` completes matching deferred; unknown ids fail validation error (already typed).
- `stopSession`/`interruptTurn` also fail+clear pending deferreds.
- Token usage: after turn, publish `thread.token-usage.updated` with `ThreadTokenUsageSnapshot` mapped from usage chunk (`lastInputTokens: prompt_tokens`, `lastOutputTokens: completion_tokens`, `usedTokens: sum`, `toolUses: executedToolCount`).
- Workspace instructions: at session start, best-effort read `AGENTS.md` then `CLAUDE.md` via `WorkspaceFileSystem.readFile({cwd: input.cwd, relativePath})`, catch-all → undefined; store on context; pass to loop.

- [ ] **Step 1: Write failing tests (extend `ApiAdapter.test.ts`)**

Using existing fake-client helpers:
1. Tool round trip end-to-end through `adapter.sendTurn` (chunks scripted like Task 5) → assert `command_execution`/`file_change` absent for read-only tool, `turn.completed` state completed, token usage event present.
2. Approval: `startSession` with `approvalPolicy: "untrusted"`; chunks request `bash`; assert `request.opened` arrives; respond via `adapter.respondToRequest(..., approve-decision-value used by existing adapters)`; assert process ran and turn completed.
3. Denial: same but reject → turn completes with model-visible denial (second model response says "ok").
4. `sandboxMode: "read-only"` → request contains no `edit_file`/`bash` tool names.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiAdapter.test.ts`
Expected: FAIL — new behavior absent (tests 2–4; test 1 may pass partially).

- [ ] **Step 3: Implement** per behaviors above. Copy the approve decision literal from `CodexAdapter.ts`/`ClaudeAdapter.ts` usage of `ProviderApprovalDecision` rather than inventing one.

- [ ] **Step 4: Run to green + neighbors**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiAdapter.test.ts apps/server/src/provider/Layers/ApiAgentLoop.test.ts apps/server/src/provider/builtInDrivers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A apps/server/src/provider
git commit -m "feat(server): wire native agent loop into API adapters with approvals"
```

---

### Task 7: Runtime wiring, docs, verification

**Files:**
- Modify: `apps/server/src/server.ts` (only if `ProviderInstanceRegistryHydrationLive`/registry layer lacks the new env requirements — follow compiler)
- Create: `docs/internals/rune-native-agent.md`
- Modify: `docs/internals/providers.md` (one paragraph: openaiApi/openrouter are now agentic)

**Interfaces:**
- Consumes: everything above. Produces: a buildable tree.

- [ ] **Step 1: Typecheck touched scope**

Run: `pnpm.cmd exec vp --filter @t3tools/server typecheck` (or the narrowest available server typecheck script — inspect `apps/server/package.json` first and use its script name)
Fix any env-channel gaps by providing `WorkspaceLayerLive` members + `ProcessRunner.layer` at the registry composition site (mirror how `TerminalLayerLive` receives `ProcessRunner.layer` at `server.ts:325`). Do NOT widen global layers beyond what the compiler demands.

- [ ] **Step 2: Full focused test pass**

Run: `pnpm.cmd exec vp test run apps/server/src/provider/Layers/ApiSse.test.ts apps/server/src/provider/Layers/ApiPrompt.test.ts apps/server/src/provider/Layers/ApiTools.test.ts apps/server/src/provider/Layers/ApiAgentLoop.test.ts apps/server/src/provider/Layers/ApiAdapter.test.ts apps/server/src/provider/builtInDrivers.test.ts`
Expected: PASS

- [ ] **Step 3: Lint touched files**

Run: lint scoped to `apps/server/src/provider/Layers/Api*.ts` via the repo's lint entry (inspect root `package.json` scripts; use the narrowest file-scoped invocation).

- [ ] **Step 4: Write docs**

`docs/internals/rune-native-agent.md`: what the native runtime is, tool set, approval/sandbox semantics table, prompt layout, known limits (in-memory sessions, no compaction). One short section; link from `docs/internals/providers.md`.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/server.ts docs/internals/rune-native-agent.md docs/internals/providers.md
git commit -m "docs: rune-native agent loop internals"
```

---

## Follow-ups explicitly out of scope

Session resume from persisted events · instruction graph · compaction · subagents · verification engine · model routing/health · Harness Lab replay. Each gets its own spec + plan cycle.
