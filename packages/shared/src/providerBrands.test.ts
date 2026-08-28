import { describe, expect, it } from "vite-plus/test";

import { getProviderBrand, PROVIDER_BRANDS } from "./providerBrands";

describe("provider brand registry", () => {
  it("resolves every represented harness and service to a local icon key", () => {
    const required = [
      "runeNative",
      "codex",
      "claudeAgent",
      "antigravity",
      "cursor",
      "grok",
      "opencode",
      "openrouter",
      "openai",
      "anthropic",
      "google",
      "gemini",
      "deepseek",
      "xai",
      "custom-openai-compatible",
      "custom-anthropic-compatible",
    ] as const;

    for (const kind of required) {
      const brand = getProviderBrand(kind);
      expect(brand, kind).not.toBeNull();
      expect(brand?.iconKey, kind).toBeTruthy();
      expect(brand?.accessibilityLabel, kind).toBeTruthy();
    }
  });

  it("does not turn unknown identities into a known provider", () => {
    expect(getProviderBrand("unknown-provider")).toBeNull();
    expect(Object.keys(PROVIDER_BRANDS)).not.toContain("unknown-provider");
  });
});
