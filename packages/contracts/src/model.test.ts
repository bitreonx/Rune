import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { ModelMetadata } from "./model.ts";

const decodeModelMetadata = Schema.decodeUnknownSync(ModelMetadata);

describe("ModelMetadata", () => {
  it("accepts provider catalog metadata without requiring optional fields", () => {
    expect(
      decodeModelMetadata({
        contextWindow: 128_000,
        maxOutputTokens: 16_000,
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        supportedParameters: ["tools", "reasoning_effort"],
        pricing: {
          prompt: "0.000001",
          completion: "0.000002",
        },
        reasoning: {
          mandatory: false,
          defaultEffort: "medium",
          supportedEfforts: ["low", "medium", "high"],
        },
      }),
    ).toMatchObject({
      contextWindow: 128_000,
      pricing: { prompt: "0.000001" },
      reasoning: { defaultEffort: "medium" },
    });
  });

  it("rejects non-positive context windows", () => {
    expect(() => decodeModelMetadata({ contextWindow: 0 })).toThrow();
  });
});
