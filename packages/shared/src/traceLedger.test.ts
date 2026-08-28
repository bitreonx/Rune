import { describe, expect, it } from "vite-plus/test";

import { admitTraceRequest, EMPTY_TRACE_LEDGER, recordTraceRequest } from "./traceLedger.ts";

describe("trace ledger", () => {
  it("enforces request, tool, and elapsed budgets before admission", () => {
    const budget = { maxRequests: 2, maxToolCalls: 3, maxElapsedMs: 100 };
    const first = recordTraceRequest(EMPTY_TRACE_LEDGER, {
      purpose: "main",
      toolCalls: 2,
      elapsedMs: 40,
    });

    expect(admitTraceRequest(first, budget, { toolCalls: 1, elapsedMs: 60 })).toEqual({
      allowed: true,
    });
    expect(admitTraceRequest(first, budget, { toolCalls: 2 })).toEqual({
      allowed: false,
      reason: "toolCalls",
    });
    expect(admitTraceRequest(first, budget, { elapsedMs: 61 })).toEqual({
      allowed: false,
      reason: "elapsedMs",
    });
    const second = recordTraceRequest(first, { purpose: "tool-followup" });
    expect(admitTraceRequest(second, budget)).toEqual({ allowed: false, reason: "requests" });
  });
});
