import { describe, expect, it } from "vite-plus/test";

import { getProviderBrandPresentation, getProviderOrServiceIcon } from "./providerIconUtils";
import { DRIVER_OPTIONS, MODEL_SERVICE_OPTIONS } from "../settings/providerDriverMeta";

describe("provider icon lookup", () => {
  it("resolves harness and service identity through the shared brand authority", () => {
    expect(getProviderBrandPresentation("runeNative")).toMatchObject({
      id: "runeNative",
      displayName: "Rune Native",
      iconKey: "rune",
    });
    expect(getProviderBrandPresentation("OPENROUTER")).toMatchObject({
      id: "openrouter",
      displayName: "OpenRouter",
      iconKey: "openrouter",
    });
    expect(getProviderBrandPresentation("claudeAgent")).toMatchObject({
      id: "claudeAgent",
      displayName: "Claude Code",
      iconKey: "claude",
    });
    expect(getProviderBrandPresentation("not-a-provider")).toBeNull();
  });

  it("returns a renderer for every canonical brand", () => {
    for (const kind of [
      "runeNative",
      "codex",
      "claudeAgent",
      "antigravity",
      "opencode",
      "cursor",
      "grok",
      "openrouter",
      "openai",
      "anthropic",
      "google",
      "deepseek",
      "xai",
    ]) {
      expect(getProviderOrServiceIcon(kind), kind).toBeTypeOf("function");
    }
  });

  it("keeps every settings provider option on the canonical brand authority", () => {
    for (const option of [...DRIVER_OPTIONS, ...MODEL_SERVICE_OPTIONS]) {
      const presentation = getProviderBrandPresentation(String(option.value));
      expect(presentation, String(option.value)).not.toBeNull();
      expect(presentation?.icon, String(option.value)).toBeTypeOf("function");
    }
  });
});
