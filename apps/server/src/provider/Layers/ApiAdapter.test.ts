// @effect-diagnostics nodeBuiltinImport:off
import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import type {
  ApprovalRequestId,
  ProviderRuntimeEvent,
} from "@rune/contracts";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
} from "@rune/contracts";

import * as ProcessRunner from "../../processRunner.ts";
import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";
import * as WorkspaceEntries from "../../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../../workspace/WorkspacePaths.ts";
import {
  extractOpenAiCompatibleModelIds,
  extractOpenAiCompatibleText,
  makeApiAdapter,
  type ApiProviderAdapter,
} from "./ApiAdapter.ts";

describe("ApiAdapter response parsing", () => {
  it("reads chat-completion text and array content", () => {
    expect(
      extractOpenAiCompatibleText({
        choices: [{ message: { content: [{ type: "text", text: "Hello " }, { text: "RUNE" }] } }],
      }),
    ).toBe("Hello RUNE");
    expect(extractOpenAiCompatibleText({ output_text: "Responses API" })).toBe("Responses API");
  });

  it("filters invalid model-list entries", () => {
    expect(
      extractOpenAiCompatibleModelIds({
        data: [{ id: "gpt-4.1" }, { id: "  " }, { id: 42 }, null, { name: "missing" }],
      }),
    ).toEqual(["gpt-4.1"]);
  });
});

const PROVIDER = ProviderDriverKind.make("openrouter");
const INSTANCE_ID = ProviderInstanceId.make("openrouter-test");
const THREAD_ID = ThreadId.make("thread-streaming");

interface CapturedRequest {
  readonly url: string;
  readonly body: unknown;
}

function sseResponse(request: Parameters<typeof HttpClientResponse.fromWeb>[0], chunks: string[]) {
  const encoder = new TextEncoder();
  return HttpClientResponse.fromWeb(
    request,
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          controller.close();
        },
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } },
    ),
  );
}

function makeStreamingClient(chunks: string[], failAfter?: number) {
  const requests: CapturedRequest[] = [];
  const client = {
    execute: (request: Parameters<typeof HttpClientResponse.fromWeb>[0]) => {
      let body: unknown;
      const rawBody = (request.body as { body?: Uint8Array } | undefined)?.body;
      if (rawBody) {
        try {
          body = JSON.parse(new TextDecoder().decode(rawBody));
        } catch {
          body = undefined;
        }
      }
      requests.push({ url: request.url, body });

      if (failAfter !== undefined) {
        const encoder = new TextEncoder();
        const response = new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              for (const chunk of chunks.slice(0, failAfter)) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.error(new Error("connection reset mid-stream"));
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
        return Effect.succeed(HttpClientResponse.fromWeb(request, response));
      }
      return Effect.succeed(sseResponse(request, chunks));
    },
  };
  return {
    httpClient: client as unknown as HttpClient.HttpClient,
    requests,
  };
}

const makeAdapterLayer = (httpClient: HttpClient.HttpClient) =>
  Layer.mergeAll(NodeServices.layer, Layer.succeed(HttpClient.HttpClient, httpClient));

// Live platform services (no TestClock): turn fibers fork into a real scope
// and SSE consumption completes against live timers.
it.layer(Layer.empty, { excludeTestServices: true })("ApiAdapter", (it) => {
  it.effect("streams chat completions as deltas before completing the item", () =>
    Effect.gen(function* () {
      const { httpClient, requests } = makeStreamingClient([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        ": OPENROUTER PROCESSING\n\n",
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
      }).pipe(Effect.provide(makeAdapterLayer(httpClient)));

      yield* adapter.startSession({ threadId: THREAD_ID, runtimeMode: "full-access" });

      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "hi there" });

      const events: Array<ProviderRuntimeEvent> = [];
      while (true) {
        const event = yield* Queue.take(queue);
        events.push(event);
        if (event.type === "turn.completed" && event.turnId === started.turnId) break;
      }

      const deltas = events.flatMap((event) =>
        event.type === "content.delta" && event.payload.streamKind === "assistant_text"
          ? [event.payload.delta]
          : [],
      );
      expect(deltas.length).toBeGreaterThan(0);
      expect(deltas.join("")).toBe("Hello world");

      const completed = events.find((event) => event.type === "item.completed");
      expect(completed && completed.type === "item.completed" ? completed.payload : undefined)
        .toMatchObject({ itemType: "assistant_message", status: "completed" });

      const thread = yield* adapter.readThread(THREAD_ID);
      expect(thread.turns[0]?.items).toEqual([
        { role: "user", content: "hi there" },
        { role: "assistant", content: "Hello world" },
      ]);

      const firstRequest = requests[0];
      expect(requests).toHaveLength(1);
      expect(firstRequest?.url).toContain("/chat/completions");
      expect(firstRequest?.body).toMatchObject({ stream: true, model: "test/default-model" });
    }));

  it.effect("marks the turn failed when the stream dies mid-generation", () =>
    Effect.gen(function* () {
      const { httpClient } = makeStreamingClient(
        ['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'],
        1,
      );

      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
      }).pipe(Effect.provide(makeAdapterLayer(httpClient)));

      yield* adapter.startSession({ threadId: THREAD_ID, runtimeMode: "full-access" });

      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "hi there" });

      let lastTurnEvent: Extract<ProviderRuntimeEvent, { type: "turn.completed" }> | undefined;
      while (true) {
        const event = yield* Queue.take(queue);
        if (event.type === "turn.completed" && event.turnId === started.turnId) {
          lastTurnEvent = event;
          break;
        }
      }
      expect(lastTurnEvent?.payload.state).toBe("failed");
    }));
});

// ---------------------------------------------------------------------------
// Native agent loop integration: tools, approvals, sandbox.
// ---------------------------------------------------------------------------

const workspaceEntriesLayer = WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer));

interface CapturedProcessRun {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string | undefined;
}

const capturedProcessRuns: Array<CapturedProcessRun> = [];

const fakeProcessRunnerLayer = Layer.mock(ProcessRunner.ProcessRunner)({
  run: (input) =>
    Effect.suspend(() => {
      capturedProcessRuns.push({ command: input.command, args: input.args, cwd: input.cwd });
      return Effect.succeed({
        stdout: "ran via mock runner\n",
        stderr: "",
        code: ChildProcessSpawner.ExitCode(0),
        timedOut: false,
        stdoutTruncated: false,
        stderrTruncated: false,
        stdoutInvalidUtf8: false,
        stderrInvalidUtf8: false,
      });
    }),
});

const agenticBaseLayer = Layer.mergeAll(
  WorkspacePaths.layer,
  workspaceEntriesLayer,
  WorkspaceFileSystem.layer.pipe(
    Layer.provide(WorkspacePaths.layer),
    Layer.provide(workspaceEntriesLayer),
    Layer.provideMerge(Layer.mock(GitVcsDriver.GitVcsDriver)({})),
  ),
  fakeProcessRunnerLayer,
).pipe(Layer.provideMerge(NodeServices.layer));

const makeAgenticLayer = (httpClient: HttpClient.HttpClient) =>
  Layer.mergeAll(agenticBaseLayer, Layer.succeed(HttpClient.HttpClient, httpClient));

const makeMultiScriptClient = (scripts: ReadonlyArray<string>) => {
  const requests: CapturedRequest[] = [];
  const encoder = new TextEncoder();
  const client = {
    execute: (request: Parameters<typeof HttpClientResponse.fromWeb>[0]) => {
      let body: unknown;
      const rawBody = (request.body as { body?: Uint8Array } | undefined)?.body;
      if (rawBody) {
        try {
          body = JSON.parse(new TextDecoder().decode(rawBody));
        } catch {
          body = undefined;
        }
      }
      requests.push({ url: request.url, body });
      const script = scripts[Math.min(requests.length - 1, scripts.length - 1)];
      const response = new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(script));
            controller.close();
          },
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
      return Effect.succeed(HttpClientResponse.fromWeb(request, response));
    },
  };
  return { httpClient: client as unknown as HttpClient.HttpClient, requests };
};

const toolCallChunk = (name: string, rawArguments: string) =>
  [
    `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"${name}","arguments":""}}]}}]}`,
    `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":${JSON.stringify(rawArguments)}}}]}}]}`,
    `data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

const textChunk = (text: string) =>
  [
    `data: {"choices":[{"delta":{"content":"${text}"}}]}`,
    `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}`,
    `data: {"choices":[],"usage":{"prompt_tokens":90,"completion_tokens":30,"total_tokens":120}}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

/** Adapter over scripted SSE responses plus the workspace tool services. */
interface AgenticFixture {
  readonly httpClient: HttpClient.HttpClient;
  readonly requests: ReadonlyArray<CapturedRequest>;
}

const makeAgenticFixture = (scripts: ReadonlyArray<string>): AgenticFixture => {
  const { httpClient, requests } = makeMultiScriptClient(scripts);
  return { httpClient, requests };
};

// The provide wraps the whole gen so the workspace/process tags the
// toolServices are read from resolve inside the agentic layer, not the
// ambient (empty) test environment.
const makeAgenticAdapter = (fixture: AgenticFixture) =>
  Effect.gen(function* () {
    return yield* makeApiAdapter({
      provider: PROVIDER,
      instanceId: INSTANCE_ID,
      baseUrl: "https://example.invalid/v1",
      apiKey: "key",
      defaultModel: "test/default-model",
      toolServices: {
        workspaceFileSystem: yield* WorkspaceFileSystem.WorkspaceFileSystem,
        workspaceEntries: yield* WorkspaceEntries.WorkspaceEntries,
        processRunner: yield* ProcessRunner.ProcessRunner,
      },
    });
  }).pipe(Effect.provide(makeAgenticLayer(fixture.httpClient)));

it.layer(Layer.empty, { excludeTestServices: true })("ApiAdapter native agent loop", (it) => {
  const startAgenticSession = (
    adapter: ApiProviderAdapter,
    input: { cwd?: string; approvalPolicy?: "untrusted"; sandboxMode?: "read-only" } = {},
  ) =>
    adapter.startSession({
      threadId: THREAD_ID,
      runtimeMode: "full-access",
      cwd: input.cwd ?? "/tmp",
      ...(input.approvalPolicy ? { approvalPolicy: input.approvalPolicy } : {}),
      ...(input.sandboxMode ? { sandboxMode: input.sandboxMode } : {}),
    });

  const drainUntilCompleted = function* (started: { readonly turnId: import("@rune/contracts").TurnId }, queue: Queue.Queue<ProviderRuntimeEvent>) {
    const events: Array<ProviderRuntimeEvent> = [];
    while (true) {
      const event = yield* Queue.take(queue);
      events.push(event);
      if (event.type === "turn.completed" && event.turnId === started.turnId) break;
    }
    return events;
  };

  const findPayload = <K extends ProviderRuntimeEvent["type"]>(
    events: ReadonlyArray<ProviderRuntimeEvent>,
    kind: K,
  ): Extract<ProviderRuntimeEvent, { type: K }> | undefined =>
    events.find((event): event is Extract<ProviderRuntimeEvent, { type: K }> => event.type === kind);

  it.effect("runs a tool round-trip through sendTurn and completes the turn", () => {
    const fixture = makeAgenticFixture([
      toolCallChunk("read_file", '{"path": "hello.txt"}'),
      textChunk("done"),
    ]);
    // The layer provides FileSystem/Path for the temp workspace below.
    return Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "rune-api-adapter-" });
      yield* fileSystem.writeFileString(path.join(cwd, "hello.txt"), "line1\nline2\n").pipe(Effect.orDie);

      const adapter = yield* makeAgenticAdapter(fixture);
      yield* startAgenticSession(adapter, { cwd });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "read hello.txt" });
      const events = yield* drainUntilCompleted(started, queue);

      const completed = findPayload(events, "turn.completed");
      expect(completed?.payload).toMatchObject({ state: "completed" });

      // read_file is a read-only tool: no approval request opens for it.
      expect(events.some((event) => event.type === "request.opened")).toBe(false);
      const deltas = events.flatMap((event) =>
        event.type === "content.delta" ? [event.payload.delta] : [],
      );
      expect(deltas.join("")).toBe("done");

      const usageEvent = findPayload(events, "thread.token-usage.updated");
      expect(usageEvent?.payload.usage).toMatchObject({ usedTokens: 120 });

      expect(fixture.requests).toHaveLength(2);
      const secondMessages =
        (fixture.requests[1]?.body as { messages?: Array<Record<string, unknown>> } | undefined)
          ?.messages ?? [];
      expect(secondMessages.some((message) => message.role === "tool")).toBe(true);
    }).pipe(Effect.provide(makeAgenticLayer(fixture.httpClient)));
  });

  it.effect("gates bash behind an approval request and runs it on accept", () =>
    Effect.gen(function* () {
      const fixture = makeAgenticFixture([
        toolCallChunk("bash", '{"command": "echo hi"}'),
        textChunk("ok"),
      ]);
      capturedProcessRuns.length = 0;

      const adapter = yield* makeAgenticAdapter(fixture);
      yield* startAgenticSession(adapter, { approvalPolicy: "untrusted" });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "run echo hi" });

      let openedRequestId: ApprovalRequestId | undefined;
      const events: Array<ProviderRuntimeEvent> = [];
      while (true) {
        const event = yield* Queue.take(queue);
        events.push(event);
        if (event.type === "request.opened" && !openedRequestId) {
          openedRequestId = event.requestId ?? undefined;
          yield* adapter.respondToRequest(THREAD_ID, event.requestId!, "accept");
        }
        if (event.type === "turn.completed" && event.turnId === started.turnId) break;
      }

      expect(openedRequestId).toBeDefined();
      const opened = findPayload(events, "request.opened");
      expect(opened?.payload.requestType).toBe("command_execution_approval");
      const resolved = findPayload(events, "request.resolved");
      expect(resolved?.payload.decision).toBe("accept");

      const completed = findPayload(events, "turn.completed");
      expect(completed?.payload).toMatchObject({ state: "completed" });
      // The gated bash actually ran through the process runner on accept.
      expect(capturedProcessRuns).toHaveLength(1);
    }));

  it.effect("reports a denied gated tool back to the model", () =>
    Effect.gen(function* () {
      const fixture = makeAgenticFixture([
        toolCallChunk("edit_file", '{"path": "a.txt", "oldText": "x", "newText": "y"}'),
        textChunk("ok"),
      ]);

      const adapter = yield* makeAgenticAdapter(fixture);
      yield* startAgenticSession(adapter, { approvalPolicy: "untrusted" });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "edit a.txt" });

      const events: Array<ProviderRuntimeEvent> = [];
      let responded = false;
      while (true) {
        const event = yield* Queue.take(queue);
        events.push(event);
        if (event.type === "request.opened" && !responded) {
          responded = true;
          yield* adapter.respondToRequest(THREAD_ID, event.requestId!, "decline");
        }
        if (event.type === "turn.completed" && event.turnId === started.turnId) break;
      }

      const resolved = findPayload(events, "request.resolved");
      expect(resolved?.payload.decision).toBe("decline");
      const completed = findPayload(events, "turn.completed");
      expect(completed?.payload).toMatchObject({ state: "completed" });

      // The model saw the denial observation and wrapped up with text.
      expect(fixture.requests.length).toBeGreaterThanOrEqual(2);
      const secondMessages =
        (fixture.requests[1]?.body as { messages?: Array<Record<string, unknown>> } | undefined)
          ?.messages ?? [];
      const toolResult = secondMessages.find((message) => message.role === "tool");
      expect(String(toolResult?.content)).toContain("user denied edit_file");
    }));

  it.effect("offers no gated tools when the session is read-only", () =>
    Effect.gen(function* () {
      const fixture = makeAgenticFixture([textChunk("readonly")]);

      const adapter = yield* makeAgenticAdapter(fixture);
      yield* startAgenticSession(adapter, { sandboxMode: "read-only" });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "hi" });
      yield* drainUntilCompleted(started, queue);

      const names = (
        (fixture.requests[0]?.body as { tools?: Array<{ function: { name: string } }> } | undefined)
          ?.tools ?? []
      ).map((tool) => tool.function.name);
      expect(names).not.toContain("edit_file");
      expect(names).not.toContain("bash");
    }));
});
