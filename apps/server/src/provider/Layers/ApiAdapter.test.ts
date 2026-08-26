import { describe, expect, it } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import type { ProviderRuntimeEvent } from "@rune/contracts";
import {
  ApprovalRequestId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
} from "@rune/contracts";
import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";
import * as WorkspaceEntries from "../../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../../workspace/WorkspacePaths.ts";

import { extractOpenAiCompatibleModelIds, extractOpenAiCompatibleText } from "./ApiAdapter.ts";
import { makeApiAdapter } from "./ApiAdapter.ts";

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
const USER_INPUT_THREAD_ID = ThreadId.make("thread-native-user-input");

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

function makeStreamingClient(chunks: string[], failAfter?: number, scriptedChunks?: string[][]) {
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

      const responseChunks = scriptedChunks?.[requests.length - 1] ?? chunks;
      if (failAfter !== undefined) {
        const encoder = new TextEncoder();
        const response = new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              for (const chunk of responseChunks.slice(0, failAfter)) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.error(new Error("connection reset mid-stream"));
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
        return Effect.succeed(HttpClientResponse.fromWeb(request, response));
      }
      return Effect.succeed(sseResponse(request, responseChunks));
    },
  };
  return {
    httpClient: client as unknown as HttpClient.HttpClient,
    requests,
  };
}

const makeAdapterLayer = (httpClient: HttpClient.HttpClient) =>
  Layer.mergeAll(NodeServices.layer, Layer.succeed(HttpClient.HttpClient, httpClient));

const workspaceEntriesLayer = WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer));
const workspaceFileSystemLayer = WorkspaceFileSystem.layer.pipe(
  Layer.provide(WorkspacePaths.layer),
  Layer.provide(workspaceEntriesLayer),
  Layer.provideMerge(Layer.mock(GitVcsDriver.GitVcsDriver)({})),
);
const workspaceToolLayer = Layer.empty.pipe(
  Layer.provideMerge(workspaceFileSystemLayer),
  Layer.provideMerge(workspaceEntriesLayer),
  Layer.provideMerge(WorkspacePaths.layer),
  Layer.provideMerge(NodeServices.layer),
);

describe("ApiAdapter streaming turns", () => {
  it("routes native ask_user calls through the composer user-input lifecycle", async () => {
    const askArguments = JSON.stringify({
      questions: [
        {
          id: "scope",
          header: "Scope",
          question: "Which scope should RUNE use?",
          options: [
            { label: "Focused", description: "Change only the requested surface." },
            { label: "Broad", description: "Include related surfaces and tests." },
          ],
        },
      ],
    });
    const firstRound = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_ask","function":{"name":"ask_user","arguments":""}}]}}]}\n\n',
      `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":${JSON.stringify(askArguments)}}}]}}]}\n\n`,
      'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const finalRound = [
      'data: {"choices":[{"delta":{"content":"Thanks, continuing."}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const { httpClient, requests } = makeStreamingClient([], undefined, [firstRound, finalRound]);

    const program = Effect.gen(function* () {
      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
      });
      yield* adapter.startSession({ threadId: USER_INPUT_THREAD_ID, runtimeMode: "full-access" });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({
        threadId: USER_INPUT_THREAD_ID,
        input: "Help me choose.",
      });

      let requested: ProviderRuntimeEvent | undefined;
      while (requested?.type !== "user-input.requested") {
        const event = yield* Queue.take(queue);
        if (event.type === "turn.completed" && event.payload.state === "failed") {
          throw new Error(event.payload.errorMessage ?? "native ask_user turn failed");
        }
        if (event.type === "user-input.requested") requested = event;
      }
      expect(requested?.payload.questions[0]?.question).toBe("Which scope should RUNE use?");
      expect(requested?.requestId).toBeDefined();
      if (!requested?.requestId) throw new Error("native user input request id missing");

      yield* adapter.respondToUserInput(
        USER_INPUT_THREAD_ID,
        ApprovalRequestId.make(String(requested.requestId)),
        {
          scope: "Focused",
        },
      );

      while (true) {
        const event = yield* Queue.take(queue);
        if (event.type === "turn.completed" && event.turnId === started.turnId) break;
      }
      return requests;
    }).pipe(Effect.provide(makeAdapterLayer(httpClient)), Effect.scoped);

    const capturedRequests = await Effect.runPromise(program);
    expect(capturedRequests).toHaveLength(2);
    expect((capturedRequests[0]?.body as { model?: string }).model).toBe("test/default-model");
  });

  it("streams chat completions as deltas before completing the item", async () => {
    const { httpClient, requests } = makeStreamingClient([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      ": OPENROUTER PROCESSING\n\n",
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    const program = Effect.gen(function* () {
      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
      });

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
      expect(
        completed && completed.type === "item.completed" ? completed.payload : undefined,
      ).toMatchObject({ itemType: "assistant_message", status: "completed" });

      const thread = yield* adapter.readThread(THREAD_ID);
      expect(thread.turns[0]?.items).toEqual([
        { role: "user", content: "hi there" },
        { role: "assistant", content: "Hello world" },
      ]);

      return requests;
    }).pipe(Effect.provide(makeAdapterLayer(httpClient)), Effect.scoped);

    const capturedRequests = await Effect.runPromise(program);
    const firstRequest = capturedRequests[0];
    expect(capturedRequests).toHaveLength(1);
    expect(firstRequest?.url).toContain("/chat/completions");
    expect(firstRequest?.body).toMatchObject({ stream: true, model: "test/default-model" });
  });

  it("offers native workspace tools when a session has a cwd", async () => {
    const toolRound = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read_file","arguments":""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":\\"hello.txt\\"}"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const finalRound = [
      'data: {"choices":[{"delta":{"content":"done"}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const { httpClient, requests } = makeStreamingClient([], undefined, [toolRound, finalRound]);

    const program = Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "rune-api-adapter-tools-" });
      yield* fileSystem.writeFileString(path.join(cwd, "hello.txt"), "hello from workspace\n");
      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
        toolServices: {
          workspaceFileSystem: yield* WorkspaceFileSystem.WorkspaceFileSystem,
          workspaceEntries: yield* WorkspaceEntries.WorkspaceEntries,
        },
      });
      yield* adapter.startSession({ threadId: THREAD_ID, cwd, runtimeMode: "full-access" });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "read hello.txt" });
      while (true) {
        const event = yield* Queue.take(queue);
        if (event.type === "turn.completed" && event.turnId === started.turnId) break;
      }
    }).pipe(
      Effect.provide(Layer.mergeAll(workspaceToolLayer, makeAdapterLayer(httpClient))),
      Effect.scoped,
    );

    await Effect.runPromise(program);
    const firstBody = requests[0]?.body as { tools?: Array<{ function: { name: string } }> };
    expect(firstBody.tools?.map((tool) => tool.function.name)).toEqual([
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
    ]);
    const secondBody = requests[1]?.body as {
      messages?: Array<{ role: string; content?: string }>;
    };
    expect(secondBody.messages?.find((message) => message.role === "tool")?.content).toContain(
      "hello from workspace",
    );
  });

  it("pauses gated edits until the approval response arrives", async () => {
    const editRound = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"edit_1","function":{"name":"edit_file","arguments":""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":\\"hello.txt\\",\\"oldText\\":\\"before\\",\\"newText\\":\\"after\\"}"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const finalRound = [
      'data: {"choices":[{"delta":{"content":"saved"}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const { httpClient } = makeStreamingClient([], undefined, [editRound, finalRound]);

    const program = Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const cwd = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "rune-api-adapter-approval-",
      });
      yield* fileSystem.writeFileString(path.join(cwd, "hello.txt"), "before\n");
      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
        toolServices: {
          workspaceFileSystem: yield* WorkspaceFileSystem.WorkspaceFileSystem,
          workspaceEntries: yield* WorkspaceEntries.WorkspaceEntries,
        },
      });
      yield* adapter.startSession({
        threadId: THREAD_ID,
        cwd,
        approvalPolicy: "on-request",
        sandboxMode: "workspace-write",
        runtimeMode: "approval-required",
      });
      const queue = yield* Stream.toQueue(adapter.streamEvents, { capacity: 256 });
      const started = yield* adapter.sendTurn({ threadId: THREAD_ID, input: "update hello.txt" });
      const events: Array<ProviderRuntimeEvent> = [];
      while (true) {
        const event = yield* Queue.take(queue);
        events.push(event);
        if (event.type === "request.opened" && event.requestId !== undefined) {
          yield* adapter.respondToRequest(
            THREAD_ID,
            ApprovalRequestId.make(String(event.requestId)),
            "accept",
          );
        }
        if (event.type === "turn.completed" && event.turnId === started.turnId) break;
      }
      return {
        events,
        contents: yield* fileSystem.readFileString(path.join(cwd, "hello.txt")),
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(workspaceToolLayer, makeAdapterLayer(httpClient))),
      Effect.scoped,
    );

    const result = await Effect.runPromise(program);
    expect(result.contents).toBe("after\n");
    expect(result.events.some((event) => event.type === "request.opened")).toBe(true);
    expect(result.events.some((event) => event.type === "request.resolved")).toBe(true);
  });

  it("marks the turn failed when the stream dies mid-generation", async () => {
    const { httpClient } = makeStreamingClient(
      ['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'],
      1,
    );

    const program = Effect.gen(function* () {
      const adapter = yield* makeApiAdapter({
        provider: PROVIDER,
        instanceId: INSTANCE_ID,
        baseUrl: "https://example.invalid/v1",
        apiKey: "key",
        defaultModel: "test/default-model",
      });

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
      return lastTurnEvent;
    }).pipe(Effect.provide(makeAdapterLayer(httpClient)), Effect.scoped);

    const turnCompleted = await Effect.runPromise(program);
    expect(turnCompleted?.payload.state).toBe("failed");
  });
});
