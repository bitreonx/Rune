import { describe, expect, it } from "vite-plus/test";

import type { OrchestrationThreadActivity } from "@rune/contracts";
import { deriveTurnTraces } from "./turnTrace.ts";

const activity = (
  overrides: Partial<OrchestrationThreadActivity> &
    Pick<OrchestrationThreadActivity, "kind" | "payload">,
): OrchestrationThreadActivity => ({
  id: overrides.id ?? `${overrides.kind}-1`,
  tone: overrides.tone ?? "info",
  summary: overrides.summary ?? overrides.kind,
  turnId: overrides.turnId ?? "turn-1",
  createdAt: overrides.createdAt ?? "2026-08-28T00:00:00.000Z",
  ...overrides,
});

describe("deriveTurnTraces", () => {
  it("deduplicates replayed requests and tool updates while retaining attribution and timings", () => {
    const request = activity({
      id: "trace-request-1",
      kind: "turn.trace.request",
      payload: {
        requestId: "request-1",
        requestNumber: 1,
        retry: false,
        provider: "openrouter",
        providerInstanceId: "gateway-1",
        timeToFirstByteMs: 120,
        streamDurationMs: 800,
      },
    });
    const retry = activity({
      id: "trace-request-2",
      kind: "turn.trace.request",
      payload: {
        requestId: "request-2",
        requestNumber: 2,
        retry: true,
        provider: "openrouter",
        streamDurationMs: 300,
      },
    });
    const tool = (id: string, kind: "tool.started" | "tool.completed") =>
      activity({
        id: `${id}-${kind}`,
        kind,
        tone: "tool",
        payload: { toolCallId: id },
      });

    expect(
      deriveTurnTraces([
        activity({
          id: "trace-start",
          kind: "turn.trace.started",
          payload: { provider: "openrouter", providerInstanceId: "gateway-1", model: "gpt-test" },
        }),
        request,
        request,
        retry,
        tool("tool-1", "tool.started"),
        tool("tool-1", "tool.completed"),
        tool("tool-2", "tool.completed"),
      ]),
    ).toEqual([
      {
        turnId: "turn-1",
        provider: "openrouter",
        providerInstanceId: "gateway-1",
        model: "gpt-test",
        requests: 2,
        retries: 1,
        tools: 2,
        timeToFirstByteMs: 120,
        latencyMs: 1_100,
        requestDetails: [
          {
            requestId: "request-1",
            requestNumber: 1,
            retry: false,
            timeToFirstByteMs: 120,
            streamDurationMs: 800,
          },
          {
            requestId: "request-2",
            requestNumber: 2,
            retry: true,
            timeToFirstByteMs: null,
            streamDurationMs: 300,
          },
        ],
      },
    ]);
  });

  it("bounds visible history without changing the accounting of retained turns", () => {
    const traces = Array.from({ length: 20 }, (_, index) =>
      activity({
        id: `trace-${index}`,
        kind: "turn.trace.request",
        turnId: `turn-${index}`,
        payload: { requestId: `request-${index}`, requestNumber: 1, retry: false },
      }),
    );

    expect(deriveTurnTraces(traces, 3).map((trace) => trace.turnId)).toEqual([
      "turn-17",
      "turn-18",
      "turn-19",
    ]);
  });

  it("folds request attribution, governor timings, milestones, and completion totals", () => {
    const firstRequest = activity({
      id: "request-start",
      kind: "turn.trace.request",
      payload: {
        requestId: "request-main",
        requestNumber: 1,
        retry: false,
        purpose: "main",
        budget: { maxRequests: 4, maxToolCalls: 8 },
      },
    });
    const requestUsage = activity({
      id: "request-usage",
      kind: "turn.trace.request",
      payload: {
        requestId: "request-main",
        requestNumber: 1,
        retry: false,
        inputTokens: 200,
        cachedInputTokens: 50,
        outputTokens: 55,
        reasoningTokens: 5,
        timeToFirstByteMs: 80,
        streamDurationMs: 300,
      },
    });
    const followup = activity({
      id: "request-followup",
      kind: "turn.trace.request",
      payload: {
        requestId: "request-tool",
        requestNumber: 2,
        retry: false,
        purpose: "tool-followup",
        parentRequestId: "request-main",
        sessionAcquisitionMs: 12,
      },
    });
    const trace = deriveTurnTraces([
      firstRequest,
      requestUsage,
      followup,
      activity({
        id: "queue",
        kind: "turn.trace.started",
        payload: { stage: "queue.wait", durationMs: 25 },
      }),
      activity({
        id: "compile",
        kind: "turn.trace.started",
        payload: { stage: "prompt.compile", durationMs: 40 },
      }),
      activity({
        id: "useful",
        kind: "turn.trace.started",
        payload: { stage: "first.useful.activity", durationMs: 110 },
      }),
      activity({
        id: "edit",
        kind: "turn.trace.started",
        payload: { stage: "first.edit", durationMs: 430 },
      }),
      activity({
        id: "verify",
        kind: "turn.trace.started",
        payload: { stage: "verification", durationMs: 90 },
      }),
      activity({
        id: "complete",
        kind: "turn.trace.started",
        payload: {
          stage: "completion",
          totals: { outputTokens: 55, wallDurationMs: 900 },
        },
      }),
    ])[0];

    expect(trace).toMatchObject({
      requests: 2,
      queueWaitMs: 25,
      promptCompilationMs: 40,
      sessionAcquisitionMs: 12,
      timeToFirstUsefulActivityMs: 110,
      timeToFirstEditMs: 430,
      verificationMs: 90,
      turnDurationMs: 900,
      budget: { maxRequests: 4, maxToolCalls: 8 },
      totals: {
        requestCount: 2,
        retryCount: 0,
        inputTokens: 200,
        cachedInputTokens: 50,
        outputTokens: 55,
        reasoningTokens: 5,
        wallDurationMs: 900,
      },
    });
    expect(trace?.requestDetails[0]).toMatchObject({
      purpose: "main",
      timeToFirstByteMs: 80,
      streamDurationMs: 300,
    });
    expect(trace?.requestDetails[1]).toMatchObject({
      purpose: "tool-followup",
      parentRequestId: "request-main",
    });
  });

  it("deduplicates replayed milestone rows", () => {
    const milestone = activity({
      id: "queue-once",
      kind: "turn.trace.started",
      payload: { stage: "queue.wait", durationMs: 25 },
    });
    expect(deriveTurnTraces([milestone, milestone])[0]).toMatchObject({ queueWaitMs: 25 });
  });
});
