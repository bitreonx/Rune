import { describe, expect, it } from "vite-plus/test";

import {
  OPENAI_API_DRIVER,
  OPENAI_API_KEY_ENVIRONMENT_VARIABLE,
  OPENROUTER_DRIVER,
  apiKeyEnvironmentVariableForDriver,
  apiProviderEndpoint,
  normalizeApiProviderBaseUrl,
} from "./apiProvider.ts";

describe("apiProvider", () => {
  it("normalizes compatible endpoints without leaking credentials", () => {
    expect(normalizeApiProviderBaseUrl(" https://gateway.example/v1/ ", "fallback")).toBe(
      "https://gateway.example/v1",
    );
    expect(apiProviderEndpoint("https://gateway.example/v1/", "/models")).toBe(
      "https://gateway.example/v1/models",
    );
    expect(apiKeyEnvironmentVariableForDriver(OPENAI_API_DRIVER)).toBe(
      OPENAI_API_KEY_ENVIRONMENT_VARIABLE,
    );
  });

  it("keeps provider key routing explicit", () => {
    expect(apiKeyEnvironmentVariableForDriver(OPENROUTER_DRIVER)).toBe("OPENROUTER_API_KEY");
    expect(apiKeyEnvironmentVariableForDriver("unknown-driver")).toBeUndefined();
    expect(normalizeApiProviderBaseUrl("file:///secret", "https://fallback.example/v1")).toBe(
      "https://fallback.example/v1",
    );
  });
});
