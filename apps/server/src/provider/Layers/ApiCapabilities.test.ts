import { describe, expect, it } from "@effect/vitest";

import { ProviderDriverKind } from "@rune/contracts";

import {
  buildApiRequestBody,
  resolveApiModelCapabilities,
} from "./ApiCapabilities.ts";

const OPENROUTER = ProviderDriverKind.make("openrouter");

describe("ApiCapabilities", () => {
  it("uses conservative defaults for an unknown compatible gateway", () => {
    const capabilities = resolveApiModelCapabilities({ driver: OPENROUTER });

    expect(capabilities).toEqual({
      parallelToolCalls: false,
      strictToolSchemas: false,
      reasoningMode: "none",
      reportsCachedTokens: false,
      supportsFim: false,
    });
  });

  it("honors explicit advertised capabilities without model-name heuristics", () => {
    const capabilities = resolveApiModelCapabilities({
      driver: OPENROUTER,
      advertised: {
        parallelToolCalls: true,
        strictToolSchemas: true,
        reasoningMode: "optional",
        reportsCachedTokens: true,
        supportsFim: false,
      },
    });

    expect(capabilities.strictToolSchemas).toBe(true);
    expect(capabilities.reasoningMode).toBe("optional");
  });

  it("does not send optional fields to a conservative gateway", () => {
    const body = buildApiRequestBody({
      model: "test/model",
      systemPrompt: "stable system",
      messages: [{ role: "user", content: "hello" }],
      tools: [],
      capabilities: resolveApiModelCapabilities({ driver: OPENROUTER }),
    });

    expect(body).toEqual({
      model: "test/model",
      messages: [
        { role: "system", content: "stable system" },
        { role: "user", content: "hello" },
      ],
      stream: true,
      stream_options: { include_usage: true },
    });
  });

  it("adds strict tools and reasoning only when capabilities allow them", () => {
    const body = buildApiRequestBody({
      model: "deepseek-chat",
      systemPrompt: "stable system",
      messages: [{ role: "user", content: "edit" }],
      tools: [{ type: "function", function: { name: "apply_patch" } }],
      capabilities: {
        parallelToolCalls: true,
        strictToolSchemas: true,
        reasoningMode: "optional",
        reportsCachedTokens: true,
        supportsFim: false,
      },
    });

    expect(body).toMatchObject({
      parallel_tool_calls: true,
      thinking: { type: "enabled" },
      tools: [{ function: { strict: true } }],
    });
  });
});
