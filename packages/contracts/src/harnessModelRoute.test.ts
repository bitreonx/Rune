import { describe, expect, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import {
  HarnessModelRouteDecision,
  HarnessModelRoutePlan,
  HarnessModelRouteUnsupported,
} from "./harnessModelRoute.ts";

describe("HarnessModelRoutePlan", () => {
  const plan = {
    harness: "claudeAgent",
    instanceId: "claude_research",
    connectionId: "openrouter_work",
    requestedModel: "anthropic/claude-sonnet-4.5",
    routeKind: "service-compatible",
    protocolFamily: "anthropic-messages",
    bridgeRequired: false,
    subagentModelPolicy: "inherit",
    capabilities: {
      streaming: true,
      tools: true,
      images: true,
      usage: true,
      reasoningEffort: true,
    },
  } as const;

  it("decodes a secret-free route plan", () => {
    expect(Schema.decodeUnknownSync(HarnessModelRoutePlan)(plan)).toEqual(plan);
  });

  it("keeps unsupported pair explanations explicit", () => {
    const unsupported = { tag: "unsupported", reason: "The selected harness cannot use this protocol." };
    expect(Schema.decodeUnknownSync(HarnessModelRouteUnsupported)(unsupported)).toEqual(unsupported);
    expect(
      Schema.decodeUnknownSync(HarnessModelRouteDecision)({ tag: "unsupported", ...unsupported }),
    ).toEqual({ tag: "unsupported", ...unsupported });
  });

  it("drops secrets and implementation paths from the decoded plan", () => {
    expect(() =>
      Schema.decodeUnknownSync(HarnessModelRoutePlan)({
        ...plan,
        apiKey: "secret",
        configPath: "C:/Users/user/.rune/bridge.json",
      }),
    ).not.toThrow();
    const decoded = Schema.decodeUnknownSync(HarnessModelRoutePlan)({
      ...plan,
      apiKey: "secret",
      configPath: "C:/Users/user/.rune/bridge.json",
    });
    expect(JSON.stringify(decoded)).not.toContain("secret");
    expect(JSON.stringify(decoded)).not.toContain("bridge.json");
  });
});
