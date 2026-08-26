// @effect-diagnostics nodeBuiltinImport:off
import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";
import {
  EventId,
  ProviderDriverKind,
  ProviderInstanceId,
  RuntimeItemId,
  ThreadId,
  TurnId,
  type ProviderRuntimeEvent,
} from "@rune/contracts";

import { ProviderAdapterRequestError } from "../Errors.ts";
import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";
import * as WorkspaceEntries from "../../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../../workspace/WorkspacePaths.ts";
import type { NativeToolContext } from "./ApiTools.ts";
import {
  classifyTransportError,
  runAgenticTurn,
  type AgentLoopDeps,
  type AgentLoopMessage,
} from "./ApiAgentLoop.ts";

const workspaceEntriesLayer = WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer));

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(
    WorkspaceFileSystem.layer.pipe(
      Layer.provide(WorkspacePaths.layer),
      Layer.provide(workspaceEntriesLayer),
      Layer.provideMerge(Layer.mock(GitVcsDriver.GitVcsDriver)({})),
    ),
  ),
  Layer.provideMerge(workspaceEntriesLayer),
  Layer.provideMerge(WorkspacePaths.layer),
  Layer.provideMerge(NodeServices.layer),
);

const PROVIDER = ProviderDriverKind.make("openrouter");
const INSTANCE_ID = ProviderInstanceId.make("openrouter-test");
const THREAD_ID = ThreadId.make("thread-agent-loop");
const TURN_ID = TurnId.make("turn-agent-loop");
const ITEM_PREFIX = RuntimeItemId.make("turn-agent-loop:assistant");

const makeToolContext = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "rune-agent-loop-" });
  yield* fileSystem
    .writeFileString(path.join(cwd, "hello.txt"), "line1\nline2\n")
    .pipe(Effect.orDie);
  return {
    cwd,
    workspaceFileSystem: yield* WorkspaceFileSystem.WorkspaceFileSystem,
    workspaceEntries: yield* WorkspaceEntries.WorkspaceEntries,
  };
});

const requestError = (detail: string, cause?: unknown) =>
  new ProviderAdapterRequestError({
    provider: PROVIDER,
    method: "chat/completions",
    detail,
    cause,
  });

/** Encode an SSE payload as the Uint8Array stream a provider would send. */
const sseStream = (payload: string): Stream.Stream<Uint8Array> =>
  Stream.fromIterable([new TextEncoder().encode(payload)]);

interface ScriptedHarness {
  readonly deps: AgentLoopDeps;
  readonly requests: Array<{ readonly url: string; readonly body: Record<string, unknown> }>;
  readonly published: Array<ProviderRuntimeEvent>;
}

/**
 * Script one SSE payload per model round-trip; the last script repeats if the
 * loop keeps talking (which the cap test relies on).
 */
const makeHarness = (
  toolContext: NativeToolContext,
  scripts: ReadonlyArray<string>,
  overrides?: Partial<Pick<AgentLoopDeps, "approvalGate" | "httpPost" | "userInputRequest">>,
): ScriptedHarness => {
  const requests: ScriptedHarness["requests"] = [];
  const published: Array<ProviderRuntimeEvent> = [];
  let stampCount = 0;
  const deps: AgentLoopDeps = {
    provider: PROVIDER,
    providerInstanceId: INSTANCE_ID,
    threadId: THREAD_ID,
    httpPost: (_url, body) =>
      Effect.suspend(() => {
        const script = scripts[Math.min(requests.length, scripts.length - 1)] ?? "";
        requests.push({ url: _url, body: body as Record<string, unknown> });
        return Effect.succeed(sseStream(script));
      }),
    publish: (event) => Effect.sync(() => published.push(event)),
    stamp: Effect.succeed({
      eventId: EventId.make(`evt-${stampCount++}`),
      createdAt: "2026-08-25T00:00:00.000Z",
    }),
    toolContext,
    ...overrides,
  };
  return { deps, requests, published };
};

const toolCallScript = (name: string, rawArguments: string) =>
  [
    `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"${name}","arguments":""}}]}}]}`,
    `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":${JSON.stringify(rawArguments)}}}]}}]}`,
    `data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

const toolCallScriptWithUsage = (
  name: string,
  rawArguments: string,
  usage: { input: number; output: number },
) =>
  toolCallScript(name, rawArguments).replace(
    "data: [DONE]",
    `data: {"choices":[],"usage":{"prompt_tokens":${usage.input},"completion_tokens":${usage.output},"total_tokens":${usage.input + usage.output}}}\n\ndata: [DONE]`,
  );

const textScript = (text: string) =>
  [
    `data: {"choices":[{"delta":{"content":"${text}"}}]}`,
    `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}`,
    `data: {"choices":[],"usage":{"prompt_tokens":120,"completion_tokens":40,"total_tokens":160}}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

const usageTextScript = (text: string, usage: { input: number; output: number }) =>
  [
    `data: {"choices":[{"delta":{"content":"${text}"}}]}`,
    `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}`,
    `data: {"choices":[],"usage":{"prompt_tokens":${usage.input},"completion_tokens":${usage.output},"total_tokens":${usage.input + usage.output}}}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

const runTurn = (deps: AgentLoopDeps, input?: Partial<Parameters<typeof runAgenticTurn>[1]>) =>
  runAgenticTurn(deps, {
    threadId: THREAD_ID,
    turnId: TURN_ID,
    itemIdPrefix: ITEM_PREFIX,
    messages: [
      { role: "user", content: "read hello.txt and summarize" },
    ] as Array<AgentLoopMessage>,
    model: "test/model",
    baseUrl: "https://example.invalid/v1",
    apiKey: "key",
    sandboxReadOnly: false,
    ...input,
  });

describe("classifyTransportError", () => {
  it("maps statuses to retryability and human guidance", () => {
    expect(classifyTransportError({ status: 401 }).message).toContain("API key");
    expect(classifyTransportError({ status: 401 })).toMatchObject({ retryable: false });
    expect(classifyTransportError({ status: 402 }).message).toContain("credits");
    expect(classifyTransportError({ status: 402 }).retryable).toBe(false);
    expect(classifyTransportError({ status: 429 }).retryable).toBe(false);
    expect(classifyTransportError({ status: 429 }).message).toContain("Rate limit exceeded");
    expect(classifyTransportError({ status: 503 }).retryable).toBe(true);
    expect(classifyTransportError(new Error("socket hang up")).retryable).toBe(true);
    expect(classifyTransportError({ status: 400 }).retryable).toBe(false);
    expect(classifyTransportError({ status: 400 }).message).toContain("HTTP 400");
  });
});

it.layer(TestLayer, { excludeTestServices: true })("ApiAgentLoop", (it) => {
  it.effect("runs a tool round-trip and finishes on text", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [
        toolCallScript("read_file", '{"path": "hello.txt"}'),
        textScript("done"),
      ]);

      const result = yield* runTurn(harness.deps);

      expect(result.finalText).toBe("done");
      expect(result.usage).toMatchObject({ inputTokens: 120, outputTokens: 40, usedTokens: 160 });
      expect(result.systemPromptHash).toMatch(/^[0-9a-f]{16}$/);

      // First request offers every native tool and leads with the system prompt.
      const firstBody = harness.requests[0]?.body;
      expect(firstBody).toMatchObject({
        model: "test/model",
        stream: true,
        stream_options: { include_usage: true },
        tool_choice: "auto",
      });
      const offeredNames = (firstBody?.tools as Array<{ function: { name: string } }>).map(
        (tool) => tool.function.name,
      );
      expect(offeredNames).toEqual([
        "ask_user",
        "workspace_snapshot",
        "search_many",
        "read_many",
        "read_file",
        "list_dir",
        "search",
        "apply_patch",
        "generate_files",
        "run_checks",
        "edit_file",
        "bash",
      ]);
      expect((firstBody?.messages as Array<{ role: string }>)[0]).toMatchObject({
        role: "system",
      });

      // Second request carries the assistant tool_calls plus the tool result.
      const secondMessages = harness.requests[1]?.body.messages as Array<Record<string, unknown>>;
      const assistant = secondMessages.find((message) => message.role === "assistant");
      expect(assistant).toMatchObject({
        tool_calls: [{ id: "call_1", type: "function", function: { name: "read_file" } }],
      });
      const toolResult = secondMessages.find((message) => message.role === "tool");
      expect(toolResult).toMatchObject({ tool_call_id: "call_1" });
      expect(String(toolResult?.content)).toContain("line2");

      // Deltas stream out and usage lands as the canonical token-usage event.
      const deltas = harness.published.flatMap((event) =>
        event.type === "content.delta" ? [event.payload.delta] : [],
      );
      expect(deltas.join("")).toBe("done");
      const usageEvents = harness.published.filter(
        (event) => event.type === "thread.token-usage.updated",
      );
      expect(usageEvents).toHaveLength(1);
      const usagePayload =
        usageEvents[0] && usageEvents[0].type === "thread.token-usage.updated"
          ? usageEvents[0].payload.usage
          : undefined;
      expect(usagePayload).toMatchObject({ usedTokens: 160, inputTokens: 120, outputTokens: 40 });

      const requestUsageEvents = harness.published.filter(
        (event) => event.type === "api.request.usage",
      );
      expect(requestUsageEvents).toHaveLength(2);
      expect(requestUsageEvents[0]?.type === "api.request.usage").toBe(true);
      const progressEvents = harness.published.filter(
        (event) => event.type === "agent.execution.progress",
      );
      expect(progressEvents.at(-1)).toMatchObject({
        type: "agent.execution.progress",
        payload: { stage: "finalize", requestNumber: 2, outcome: "completed" },
      });
    }),
  );

  it.effect("strips sandboxed tools from the offered set", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [textScript("readonly done")]);

      const result = yield* runTurn(harness.deps, { sandboxReadOnly: true });

      expect(result.finalText).toBe("readonly done");
      const offeredNames = (
        harness.requests[0]?.body.tools as Array<{ function: { name: string } }>
      ).map((tool) => tool.function.name);
      expect(offeredNames).toEqual([
        "ask_user",
        "workspace_snapshot",
        "search_many",
        "read_many",
        "read_file",
        "list_dir",
        "search",
      ]);
    }),
  );

  it.effect("adds optional provider fields only when advertised", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [textScript("done")]);

      yield* runTurn(harness.deps, {
        apiCapabilities: {
          parallelToolCalls: true,
          strictToolSchemas: true,
          reasoningMode: "optional",
          reportsCachedTokens: true,
          supportsFim: false,
        },
      });

      expect(harness.requests[0]?.body).toMatchObject({
        parallel_tool_calls: true,
        thinking: { type: "enabled" },
      });
      expect(
        (harness.requests[0]?.body.tools as Array<{ function: { strict?: boolean } }>)[0]?.function
          .strict,
      ).toBe(true);
    }),
  );

  it.effect("repairs fenced JSON arguments without another model round-trip", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [
        toolCallScript("read_file", '```json\n{"path": "hello.txt"}\n```'),
        textScript("recovered"),
      ]);

      const result = yield* runTurn(harness.deps);

      expect(result.finalText).toBe("recovered");
      // The repair happened locally: still exactly two model round-trips, and
      // the tool actually ran (file contents reached the model).
      expect(harness.requests).toHaveLength(2);
      const secondMessages = harness.requests[1]?.body.messages as Array<Record<string, unknown>>;
      const toolResult = secondMessages.find((message) => message.role === "tool");
      expect(String(toolResult?.content)).toContain("line2");
    }),
  );

  it.effect("accumulates usage across provider rounds", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [
        toolCallScriptWithUsage("read_file", '{"path": "hello.txt"}', { input: 120, output: 40 }),
        usageTextScript("done", { input: 200, output: 30 }),
      ]);

      const result = yield* runTurn(harness.deps);

      expect(result.usage).toMatchObject({
        usedTokens: 390,
        inputTokens: 320,
        outputTokens: 70,
      });
      const usageEvents = harness.published.filter(
        (event) => event.type === "thread.token-usage.updated",
      );
      expect(usageEvents).toHaveLength(2);
      expect(
        usageEvents[0]?.type === "thread.token-usage.updated"
          ? usageEvents[0].payload.usage.usedTokens
          : undefined,
      ).toBe(160);
      expect(
        usageEvents[1]?.type === "thread.token-usage.updated"
          ? usageEvents[1].payload.usage.usedTokens
          : undefined,
      ).toBe(390);
    }),
  );

  it.effect("rejects an identical repeated tool call locally", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [
        toolCallScript("read_file", '{"path": "hello.txt"}'),
        toolCallScript("read_file", '{"path": "hello.txt"}'),
        textScript("stopped repeating"),
      ]);

      const result = yield* runTurn(harness.deps);

      expect(result.finalText).toBe("stopped repeating");
      const thirdMessages = harness.requests[2]?.body.messages as Array<Record<string, unknown>>;
      const observations = thirdMessages.filter((message) => message.role === "tool");
      expect(String(observations.at(-1)?.content)).toContain("repeated tool call");
    }),
  );

  it.effect("unparseable tool arguments become an Error observation", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(toolContext, [
        toolCallScript("read_file", "{not json"),
        textScript("gave up"),
      ]);

      const result = yield* runTurn(harness.deps);

      expect(result.finalText).toBe("gave up");
      const secondMessages = harness.requests[1]?.body.messages as Array<Record<string, unknown>>;
      const toolResult = secondMessages.find((message) => message.role === "tool");
      expect(String(toolResult?.content).startsWith("Error:")).toBe(true);
    }),
  );

  it.effect("denied gated tools observe the denial instead of executing", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const gates: Array<string> = [];
      const harness = makeHarness(
        toolContext,
        [toolCallScript("bash", '{"command": "echo hi"}'), textScript("skipped")],
        {
          approvalGate: (input) =>
            Effect.suspend(() => {
              gates.push(input.toolName);
              return Effect.fail(requestError("User denied bash"));
            }),
        },
      );

      const result = yield* runTurn(harness.deps);

      expect(gates).toEqual(["bash"]);
      expect(result.finalText).toBe("skipped");
      const secondMessages = harness.requests[1]?.body.messages as Array<Record<string, unknown>>;
      const toolResult = secondMessages.find((message) => message.role === "tool");
      expect(String(toolResult?.content)).toBe("Error: user denied bash");
    }),
  );

  it.effect("approved gated tools execute through the gate", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const harness = makeHarness(
        toolContext,
        [toolCallScript("list_dir", '{"path": "."}'), textScript("listed")],
        {
          approvalGate: (_input) => Effect.void,
        },
      );

      const result = yield* runTurn(harness.deps);

      expect(result.finalText).toBe("listed");
      const secondMessages = harness.requests[1]?.body.messages as Array<Record<string, unknown>>;
      const toolResult = secondMessages.find((message) => message.role === "tool");
      expect(String(toolResult?.content)).not.toContain("Error:");
    }),
  );

  it.effect("fails the turn after four tool-requesting round-trips", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      const endless = toolCallScript("read_file", '{"path": "hello.txt"}');
      const harness = makeHarness(toolContext, [endless]);

      const failure = yield* runTurn(harness.deps).pipe(Effect.flip);

      expect(failure.message).toContain("4");
      expect(harness.requests).toHaveLength(4);
    }),
  );

  it.effect("retries a transient transport failure once before succeeding", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      let attempts = 0;
      const harness = makeHarness(toolContext, [], {
        httpPost: () =>
          Effect.suspend(() => {
            attempts += 1;
            if (attempts === 1) {
              return Effect.fail(requestError("Transient provider failure.", { status: 503 }));
            }
            return Effect.succeed(sseStream(textScript("after retry")));
          }),
      });

      const result = yield* runTurn(harness.deps);

      expect(attempts).toBe(2);
      expect(result.finalText).toBe("after retry");
    }),
  );

  it.effect("surfaces fatal transport failures immediately without retrying", () =>
    Effect.gen(function* () {
      const toolContext = yield* makeToolContext;
      let attempts = 0;
      const harness = makeHarness(toolContext, [], {
        httpPost: () =>
          Effect.suspend(() => {
            attempts += 1;
            return Effect.fail(requestError("Key rejected", { status: 401 }));
          }),
      });

      const failure = yield* runTurn(harness.deps).pipe(Effect.flip);

      expect(attempts).toBe(1);
      expect(failure.message).toContain("API key");
    }),
  );
});
