import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { ProviderDriverKind, ProviderInstanceId } from "./providerInstance.ts";
import {
  buildProviderWorkspaceSummary,
  classifyProviderConnection,
  ProviderConnectionCategory,
  ProviderWorkspaceSummary,
} from "./providerConnection.ts";

describe("provider connection presentation", () => {
  it("classifies API and subscription connections without reading secret values", () => {
    expect(
      classifyProviderConnection({
        driver: ProviderDriverKind.make("openaiApi"),
        config: { baseUrl: "https://api.openai.com/v1" },
      }),
    ).toBe("api");
    expect(
      classifyProviderConnection({
        driver: ProviderDriverKind.make("openrouter"),
        config: { baseUrl: "https://openrouter.ai/api/v1" },
      }),
    ).toBe("api");
    expect(
      classifyProviderConnection({ driver: ProviderDriverKind.make("codex"), config: {} }),
    ).toBe("subscription");
  });

  it("uses normalized configuration, never environment-variable values", () => {
    expect(
      classifyProviderConnection({
        driver: ProviderDriverKind.make("ollama"),
        config: { baseUrl: "http://localhost:11434/" },
      }),
    ).toBe("local");
    expect(
      classifyProviderConnection({
        driver: ProviderDriverKind.make("codex"),
        config: { remoteUrl: "https://remote.example.test/" },
      }),
    ).toBe("remote");
    expect(
      classifyProviderConnection({
        driver: ProviderDriverKind.make("codex"),
        config: {},
        environment: [
          { name: "RUNE_REMOTE_URL", value: "https://secret.example.test", sensitive: true },
        ],
      }),
    ).toBe("subscription");
  });

  it("derives a safe summary from settings and a provider snapshot", () => {
    const summary = buildProviderWorkspaceSummary({
      config: {
        instanceId: ProviderInstanceId.make("codex_work"),
        driver: ProviderDriverKind.make("codex"),
        displayName: "Work Codex",
        enabled: true,
        environment: [{ name: "OPENAI_API_KEY", value: "secret", sensitive: true }],
      },
      snapshot: {
        instanceId: ProviderInstanceId.make("codex_work"),
        driver: ProviderDriverKind.make("codex"),
        displayName: "Work Codex",
        enabled: true,
        installed: true,
        version: null,
        status: "ready",
        auth: { status: "authenticated", type: "subscription" },
        checkedAt: "2026-08-25T00:00:00.000Z",
        models: [
          { slug: "gpt-5", name: "GPT-5", isCustom: false, isDefault: true, capabilities: null },
        ],
        slashCommands: [],
        skills: [],
      },
    });
    expect(summary).toMatchObject({
      instanceId: "codex_work",
      category: "subscription",
      authStatus: "authenticated",
      modelCount: 1,
      defaultModel: "gpt-5",
    });
    expect(JSON.stringify(summary)).not.toContain("secret");
    expect(Schema.decodeUnknownSync(ProviderWorkspaceSummary)(summary)).toEqual(summary);
  });

  it("exposes decodable category values and a stable fallback instance id", () => {
    expect(Schema.decodeUnknownSync(ProviderConnectionCategory)("api")).toBe("api");
    expect(
      buildProviderWorkspaceSummary({
        config: { driver: ProviderDriverKind.make("codex") },
      }).instanceId,
    ).toBe("codex");
  });
});
