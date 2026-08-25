import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { AntigravitySettings, DEFAULT_SERVER_SETTINGS } from "./settings.ts";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  MODEL_SLUG_ALIASES_BY_PROVIDER,
  PROVIDER_DISPLAY_NAMES,
} from "./model.ts";
import { ProviderDriverKind } from "./providerInstance.ts";

const decodeAntigravitySettings = Schema.decodeUnknownSync(AntigravitySettings);
const ANTIGRAVITY = ProviderDriverKind.make("antigravity");

describe("Antigravity provider contract", () => {
  it("defaults to the installed agy binary and an enabled, health-gated provider", () => {
    expect(decodeAntigravitySettings({})).toMatchObject({
      enabled: true,
      binaryPath: "agy",
      customModels: [],
    });
    expect(DEFAULT_SERVER_SETTINGS.providers.antigravity.enabled).toBe(true);
  });

  it("publishes a stable provider label and a live-catalog fallback model", () => {
    expect(PROVIDER_DISPLAY_NAMES[ANTIGRAVITY]).toBe("Antigravity");
    expect(DEFAULT_MODEL_BY_PROVIDER[ANTIGRAVITY]).toBe("gemini-3.7-flash-high");
    expect(MODEL_SLUG_ALIASES_BY_PROVIDER[ANTIGRAVITY]).toEqual({});
  });
});
