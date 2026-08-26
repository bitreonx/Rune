import { describe, expect, it } from "@effect/vitest";

import { ApiContextLedger } from "./ApiContextLedger.ts";

describe("ApiContextLedger", () => {
  it("compacts old observations while retaining the user request and newest result", () => {
    const ledger = new ApiContextLedger();
    ledger.add({ role: "user", content: "inspect the project" });
    ledger.add({ role: "tool", tool_call_id: "old", content: "old observation".repeat(20) }, { key: "old" });
    ledger.add(
      { role: "tool", tool_call_id: "new", content: "new observation" },
      { key: "new", required: true },
    );

    const result = ledger.compact(120);
    const messages = ledger.toMessages();

    expect(result.removedObservationCount).toBe(1);
    expect(result.requiredContextRemoved).toBe(false);
    expect(messages).toEqual([
      { role: "user", content: "inspect the project" },
      { role: "tool", tool_call_id: "new", content: "new observation" },
    ]);
  });

  it("replaces an observation without changing its ledger key", () => {
    const ledger = new ApiContextLedger();
    ledger.add({ role: "tool", tool_call_id: "read", content: "before" }, { key: "read" });

    ledger.replaceObservation("read", "after", "hash-after");

    expect(ledger.toMessages()).toEqual([
      { role: "tool", tool_call_id: "read", content: "after" },
    ]);
  });
});
