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

    expect(completed.payload).toHaveProperty("outcome", "completed");
  });

  it("decodes attributed requests and trace milestones", () => {
    const request = decodeRuntimeEvent({
      type: "api.request.usage",
      eventId: "event-attributed-request",
      provider: "openrouter",
      createdAt: "2026-08-25T00:00:03.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        requestId: "request-tool-followup",
        requestNumber: 2,
        retry: false,
        purpose: "tool-followup",
        parentRequestId: "request-main",
        budget: { maxRequests: 4, maxToolCalls: 8 },
        sessionAcquisitionMs: 12,
      },
    });
    const milestone = decodeRuntimeEvent({
      type: "turn.trace",
      eventId: "event-trace-milestone",
      provider: "openrouter",
      createdAt: "2026-08-25T00:00:04.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        stage: "first.edit",
        durationMs: 430,
        requestId: "request-tool-followup",
      },
    });

    if (request.type !== "api.request.usage" || milestone.type !== "turn.trace") {
      throw new Error("expected trace events");
    }
    expect(request.payload.purpose).toBe("tool-followup");
    expect(request.payload.parentRequestId).toBe("request-main");
    expect(milestone.payload.stage).toBe("first.edit");
  });
});
