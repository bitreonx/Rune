import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { ProviderRuntimeEvent } from "./providerRuntime.ts";

const decodeRuntimeEvent = Schema.decodeUnknownSync(ProviderRuntimeEvent);

describe("provider performance runtime events", () => {
  it("decodes progress and request usage without changing the base event contract", () => {
    const progress = decodeRuntimeEvent({
      type: "agent.execution.progress",
      eventId: "event-progress",
      provider: "openrouter",
      createdAt: "2026-08-25T00:00:00.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        stage: "inspect",
        requestNumber: 1,
        maxRequests: 4,
        toolCalls: 0,
        elapsedMs: 25,
      },
    });
    const usage = decodeRuntimeEvent({
      type: "api.request.usage",
      eventId: "event-usage",
      provider: "openrouter",
      createdAt: "2026-08-25T00:00:01.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        requestId: "request-1",
        requestNumber: 1,
        retry: false,
        inputTokens: 100,
        outputTokens: 20,
        cachedInputTokens: 80,
        reasoningTokens: 5,
        timeToFirstByteMs: 120,
        streamDurationMs: 800,
      },
    });

    expect(progress.type).toBe("agent.execution.progress");
    expect(usage.type).toBe("api.request.usage");
  });

  it("keeps terminal budget outcomes additive", () => {
    const completed = decodeRuntimeEvent({
      type: "agent.execution.progress",
      eventId: "event-completed",
      provider: "openrouter",
      createdAt: "2026-08-25T00:00:02.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        stage: "finalize",
        requestNumber: 2,
        maxRequests: 4,
        toolCalls: 1,
        elapsedMs: 900,
        outcome: "completed",
      },
    });

    expect(completed.payload.outcome).toBe("completed");
  });
});
