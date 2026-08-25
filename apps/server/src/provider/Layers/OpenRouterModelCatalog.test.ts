import { describe, expect, it } from "vite-plus/test";

import { parseOpenRouterModelCatalog } from "./OpenRouterModelCatalog.ts";

describe("parseOpenRouterModelCatalog", () => {
  it("preserves OpenRouter model metadata for the provider-neutral catalog", () => {
    const models = parseOpenRouterModelCatalog({
      data: [
        {
          id: "deepseek/deepseek-v4",
          canonical_slug: "deepseek/deepseek-v4-20260801",
          name: "DeepSeek: DeepSeek V4",
          context_length: 1_000_000,
          architecture: {
            input_modalities: ["text", "image"],
            output_modalities: ["text"],
          },
          pricing: {
            prompt: "0.0000003",
            completion: "0.0000012",
            input_cache_read: "0.00000003",
          },
          top_provider: { max_completion_tokens: 131_072 },
          supported_parameters: ["tools", "reasoning_effort"],
          reasoning: {
            mandatory: false,
            default_effort: "medium",
            supported_efforts: ["low", "medium", "high"],
          },
        },
      ],
    });

    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      slug: "deepseek/deepseek-v4",
      name: "DeepSeek: DeepSeek V4",
      metadata: {
        canonicalSlug: "deepseek/deepseek-v4-20260801",
        contextWindow: 1_000_000,
        maxOutputTokens: 131_072,
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        supportedParameters: ["tools", "reasoning_effort"],
        pricing: {
          prompt: "0.0000003",
          completion: "0.0000012",
          inputCacheRead: "0.00000003",
        },
        reasoning: {
          mandatory: false,
          defaultEffort: "medium",
          supportedEfforts: ["low", "medium", "high"],
        },
      },
    });
  });

  it("ignores malformed catalog rows without poisoning valid models", () => {
    const models = parseOpenRouterModelCatalog({
      data: [null, { name: "missing id" }, { id: "  " }, { id: "valid/model" }],
    });

    expect(models).toEqual([
      { slug: "valid/model", name: "valid/model", isCustom: false, capabilities: null },
    ]);
  });
});
