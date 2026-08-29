import { describe, expect, it } from "@effect/vitest";

import { bridgeSupportsRoute, parseModelBridgeHealth } from "./ModelBridgeHealth.ts";

const capabilities = {
  streaming: true,
  tools: true,
  usage: true,
  images: false,
  reasoningEffort: false,
  protocols: ["openai-responses"],
} as const;

describe("ModelBridgeHealth", () => {
  it("accepts only the small, typed ready payload", () => {
    expect(parseModelBridgeHealth({ status: "ready", version: "1.0.0", capabilities })).toEqual({
      status: "ready",
      version: "1.0.0",
      capabilities,
    });
  });

  it("rejects incomplete or unknown capabilities", () => {
    expect(
      parseModelBridgeHealth({ status: "ready", capabilities: { streaming: true } }),
    ).toEqual({ status: "invalid", reason: "Bridge health capabilities are incomplete." });
    expect(
      parseModelBridgeHealth({
        status: "ready",
        capabilities: { ...capabilities, protocols: ["unknown"] },
      }),
    ).toEqual({ status: "invalid", reason: "Bridge health capabilities are incomplete." });
  });

  it("requires the selected protocol and core route capabilities", () => {
    const health = parseModelBridgeHealth({ status: "ready", capabilities });
    if (health.status !== "ready") throw new Error("expected valid health");
    expect(
      bridgeSupportsRoute(health, "openai-responses", {
        streaming: true,
        tools: true,
        usage: true,
      }),
    ).toBe(true);
    expect(
      bridgeSupportsRoute(health, "anthropic-messages", {
        streaming: true,
        tools: true,
        usage: true,
      }),
    ).toBe(false);
  });
});

