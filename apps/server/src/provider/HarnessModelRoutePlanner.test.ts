import { describe, expect, it } from "@effect/vitest";

import { planHarnessModelRoute } from "./HarnessModelRoutePlanner.ts";

const base = {
  harness: "claudeAgent",
  instanceId: "claude_research",
  requestedModel: "model/default",
} as const;

describe("HarnessModelRoutePlanner", () => {
  it("keeps native Claude on the native route", () => {
    const result = planHarnessModelRoute(base);
    expect(result).toMatchObject({ tag: "planned", plan: { routeKind: "native", protocolFamily: "native" } });
  });

  it("uses the existing service-compatible route for Claude through OpenRouter", () => {
    const result = planHarnessModelRoute({
      ...base,
      connection: { connectionId: "openrouter_work", kind: "openrouter" },
    });
    expect(result).toMatchObject({
      tag: "planned",
      plan: {
        harness: "claudeAgent",
        instanceId: "claude_research",
        connectionId: "openrouter_work",
        routeKind: "service-compatible",
        protocolFamily: "anthropic-messages",
        bridgeRequired: false,
      },
    });
  });

  it("selects a RUNE bridge for Claude and an OpenAI Responses model when available", () => {
    const result = planHarnessModelRoute({
      ...base,
      requestedModel: "gpt-5.6-sol",
      connection: { connectionId: "codex_work", kind: "openai", protocol: "openai-responses" },
      bridgeAvailable: true,
    });
    expect(result).toMatchObject({
      tag: "planned",
      plan: { routeKind: "rune-bridge", protocolFamily: "openai-responses", bridgeRequired: true },
    });
  });

  it("keeps RUNE Native on its native API adapter path", () => {
    const result = planHarnessModelRoute({
      ...base,
      harness: "runeNative",
      instanceId: "native_work",
      connection: { connectionId: "openrouter_work", kind: "openrouter" },
    });
    expect(result).toMatchObject({ tag: "planned", plan: { routeKind: "native" } });
    if (result.tag === "planned") expect(result.plan.bridgeRequired).toBe(false);
  });

  it("does not silently fall back when the protocol pair is unsupported", () => {
    const result = planHarnessModelRoute({
      ...base,
      connection: { connectionId: "google_work", kind: "google", protocol: "provider-native" },
    });
    expect(result).toEqual({
      tag: "unsupported",
      reason: "claudeAgent cannot use native through google without a validated bridge.",
    });
  });

  it("never changes the selected instance or model while planning", () => {
    const result = planHarnessModelRoute({
      ...base,
      requestedModel: "  vendor/model  ",
      connection: { connectionId: "openrouter_work", kind: "openrouter" },
    });
    expect(result).toMatchObject({ tag: "planned", plan: { instanceId: "claude_research", requestedModel: "vendor/model" } });
  });
});
