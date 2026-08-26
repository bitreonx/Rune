import { describe, expect, it } from "vite-plus/test";
import {
  parseModelCatalogResponse,
  resolveCatalogEndpointUrl,
} from "./ModelCatalogService.ts";

describe("ModelCatalogService", () => {
  it("resolves endpoint URL correctly", () => {
    expect(resolveCatalogEndpointUrl()).toBe("https://openrouter.ai/api/v1/models");
    expect(resolveCatalogEndpointUrl("https://api.openai.com/v1")).toBe(
      "https://api.openai.com/v1/models",
    );
    expect(resolveCatalogEndpointUrl("https://api.openai.com/v1/models")).toBe(
      "https://api.openai.com/v1/models",
    );
  });

  it("tolerantly parses OpenAI catalog format", () => {
    const response = {
      data: [
        { id: "gpt-4o", name: "GPT-4o", context_length: 128000 },
        { id: "gpt-4o-mini", context_window: 128000 },
      ],
    };

    const parsed = parseModelCatalogResponse(response);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      id: "gpt-4o",
      name: "GPT-4o",
      contextLength: 128000,
    });
    expect(parsed[1]).toEqual({
      id: "gpt-4o-mini",
      contextLength: 128000,
    });
  });

  it("tolerantly parses Anthropic catalog format", () => {
    const response = {
      data: [
        { id: "claude-3-7-sonnet-20250219", display_name: "Claude 3.7 Sonnet" },
      ],
    };

    const parsed = parseModelCatalogResponse(response);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
    });
  });

  it("tolerantly parses bare arrays and deduplicates", () => {
    const response = [
      { id: "model-1", name: "Model 1" },
      { id: "model-1", name: "Duplicate Model" },
      { id: "model-2" },
      { id: "" },
      null,
    ];

    const parsed = parseModelCatalogResponse(response);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.id).toBe("model-1");
    expect(parsed[1]?.id).toBe("model-2");
  });
});
