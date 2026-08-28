import { describe, expect, it } from "vite-plus/test";

import { ProviderDriverKind } from "@rune/contracts";

import {
  readInstanceServiceConnection,
  serviceConnectionModeLabel,
  validateServiceConnection,
} from "./UniversalServiceSettings";

describe("readInstanceServiceConnection", () => {
  const codex = ProviderDriverKind.make("codex");

  it("keeps an explicitly selected custom gateway active while it is still empty", () => {
    expect(
      readInstanceServiceConnection(codex, [
        { name: "OPENAI_BASE_URL", value: "", sensitive: false },
        { name: "OPENAI_API_KEY", value: "", sensitive: true },
      ]),
    ).toMatchObject({ mode: "custom", baseUrl: "", apiKey: "", hasStoredKey: false });
  });

  it("treats a populated custom gateway as custom", () => {
    expect(
      readInstanceServiceConnection(codex, [
        { name: "OPENAI_BASE_URL", value: "https://gateway.example/v1", sensitive: false },
        { name: "OPENAI_API_KEY", valueRedacted: true, value: "", sensitive: true },
      ]),
    ).toMatchObject({ mode: "custom", baseUrl: "https://gateway.example/v1", hasStoredKey: true });
  });

  it("only classifies OpenRouter URLs as the OpenRouter mode", () => {
    expect(
      readInstanceServiceConnection(codex, [
        { name: "OPENAI_BASE_URL", value: "https://openrouter.ai/api/v1", sensitive: false },
      ]).mode,
    ).toBe("openrouter");
  });

  it("reads legacy OpenRouter credentials while editing a CLI instance", () => {
    expect(
      readInstanceServiceConnection(codex, [
        { name: "OPENAI_BASE_URL", value: "https://openrouter.ai/api/v1", sensitive: false },
        { name: "OPENROUTER_API_KEY", value: "sk-or-legacy", sensitive: true },
      ]),
    ).toMatchObject({
      mode: "openrouter",
      apiKey: "sk-or-legacy",
      hasStoredKey: true,
    });
  });

  it("does not classify a custom gateway that merely contains the OpenRouter text", () => {
    expect(
      readInstanceServiceConnection(codex, [
        {
          name: "OPENAI_BASE_URL",
          value: "https://gateway.example/openrouter.ai/api/v1",
          sensitive: false,
        },
      ]).mode,
    ).toBe("custom");
  });

  it("returns actionable validation for incomplete and malformed custom gateways", () => {
    expect(
      validateServiceConnection({ mode: "custom", baseUrl: "", apiKey: "", hasStoredKey: false }),
    ).toEqual({
      baseUrl: "Add a base URL before using this Custom Gateway.",
      credential: "Add a credential for this gateway, or leave the field empty only if the gateway is public.",
    });
    expect(
      validateServiceConnection({
        mode: "custom",
        baseUrl: "ftp://gateway.example",
        apiKey: "token",
        hasStoredKey: false,
      }),
    ).toMatchObject({ baseUrl: "Use an HTTP or HTTPS gateway URL.", credential: null });
  });

  it("treats a redacted stored credential as valid without exposing its value", () => {
    expect(
      validateServiceConnection({
        mode: "custom",
        baseUrl: "https://gateway.example/v1",
        apiKey: "",
        hasStoredKey: true,
      }),
    ).toEqual({ baseUrl: null, credential: null });
  });

  it("names connection modes without confusing them with instance identity", () => {
    expect(serviceConnectionModeLabel("custom")).toBe("Custom Gateway");
    expect(serviceConnectionModeLabel("openrouter")).toBe("OpenRouter");
    expect(serviceConnectionModeLabel("native")).toBe("Native account");
  });
});
