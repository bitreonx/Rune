import { describe, expect, it } from "vite-plus/test";

import { deriveAgentExecutionState } from "./agentExecution.ts";
import type { ProviderRuntimeEvent } from "@rune/contracts";

const base = {
  provider: "openrouter",
  createdAt: "2026-08-25T00:00:00.000Z",
  threadId: "thread-1",
  turnId: "turn-1",
} as const;

describe("deriveAgentExecutionState", () => {
  it("counts provider attempts separately from user turns and deduplicates delivery", () => {
    const request: ProviderRuntimeEvent = {
      ...base,
      type: "api.request.usage",
      eventId: "usage-1",
      payload: { requestId: "request-1", requestNumber: 1, retry: false, inputTokens: 100 },
    };
    const retry: ProviderRuntimeEvent = {
      ...base,
      type: "api.request.usage",
      eventId: "usage-2",
      payload: { requestId: "request-2", requestNumber: 2, retry: true, outputTokens: 20 },
    };

    const state = deriveAgentExecutionState([request, request, retry]);

    expect(state.requests).toBe(2);
    expect(state.retries).toBe(1);
    expect(state.tokens).toEqual({ input: 100, output: 20, cachedInput: 0, reasoning: 0 });
  });

  it("derives shared stage and terminal budget state", () => {
    const state = deriveAgentExecutionState([
      {
        ...base,
        type: "agent.execution.progress",
        eventId: "progress-1",
        payload: {
          stage: "inspect",
          requestNumber: 1,
          maxRequests: 4,
          toolCalls: 0,
          elapsedMs: 40,
        },
      },
      {
        ...base,
        type: "agent.execution.progress",
        eventId: "progress-2",
        payload: {
          stage: "verify",
          requestNumber: 4,
          maxRequests: 4,
          toolCalls: 2,
          elapsedMs: 900,
          outcome: "exhausted",
        },
      },
    ]);

    expect(state.stage).toBe("verify");
    expect(state.requests).toBe(4);
    expect(state.outcome).toBe("exhausted");
    expect(state.isBudgetExhausted).toBe(true);
  });
});
