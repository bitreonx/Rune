import { describe, expect, it } from "@effect/vitest";

import {
  DEFAULT_API_EXECUTION_POLICY,
  makeRequestBudget,
  type ApiRequestBudgetSnapshot,
} from "./ApiRequestBudget.ts";

describe("ApiRequestBudget", () => {
  it("allows four provider requests and rejects the fifth", () => {
    const budget = makeRequestBudget(DEFAULT_API_EXECUTION_POLICY);

    expect(budget.tryStartRequest()).toEqual({ kind: "allowed", requestNumber: 1 });
    expect(budget.tryStartRequest()).toEqual({ kind: "allowed", requestNumber: 2 });
    expect(budget.tryStartRequest()).toEqual({ kind: "allowed", requestNumber: 3 });
    expect(budget.tryStartRequest()).toEqual({ kind: "allowed", requestNumber: 4 });
    expect(budget.tryStartRequest()).toEqual({
      kind: "budgetExhausted",
      snapshot: expect.objectContaining({ requests: 4, maxRequests: 4 }),
    });
  });

  it("allows one retry only before response bytes arrive", () => {
    const budget = makeRequestBudget(DEFAULT_API_EXECUTION_POLICY);

    expect(budget.tryStartRequest()).toEqual({ kind: "allowed", requestNumber: 1 });
    expect(budget.tryStartRetry()).toEqual({ kind: "allowedRetry", retryNumber: 1 });
    expect(budget.tryStartRetry()).toEqual({
      kind: "retryExhausted",
      snapshot: expect.objectContaining({ retries: 1, maxRetries: 1 }),
    });

    budget.recordResponseBytes();
    expect(budget.tryStartRetry()).toEqual({
      kind: "retryUnavailable",
      reason: "responseStarted",
    });
  });

  it("reports a stable terminal snapshot", () => {
    const budget = makeRequestBudget(DEFAULT_API_EXECUTION_POLICY);
    budget.tryStartRequest();
    budget.recordResponseBytes();

    const snapshot: ApiRequestBudgetSnapshot = budget.snapshot();
    expect(snapshot).toEqual({
      requests: 1,
      retries: 0,
      maxRequests: 4,
      maxRetries: 1,
      outcome: "running",
      responseStarted: true,
    });
  });
});
