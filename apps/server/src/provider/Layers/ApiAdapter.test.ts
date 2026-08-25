import { describe, expect, it } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import type { ProviderRuntimeEvent } from "@t3tools/contracts";
import { ProviderDriverKind, ProviderInstanceId, ThreadId } from "@t3tools/contracts";

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

describe("ApiAdapter streaming turns", () => {
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
      expect(completed && completed.type === "item.completed" ? completed.payload : undefined)
        .toMatchObject({ itemType: "assistant_message", status: "completed" });

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
