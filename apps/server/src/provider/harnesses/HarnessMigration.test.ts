import { describe, expect, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProfileId,
  ProviderDriverKind,
  ProviderInstanceId,
  ServerSettings,
  ServiceId,
} from "@rune/contracts";
import { projectLegacyInstancesToHarnesses } from "./HarnessMigration.ts";

describe("HarnessMigration", () => {
  it("projects legacy Claude instance with OpenRouter base URL to profile and model service", () => {
    const settings: ServerSettings = {
      ...DEFAULT_SERVER_SETTINGS,
      providerInstances: {
        [ProviderInstanceId.make("claude_openrouter")]: {
          driver: ProviderDriverKind.make("claudeAgent"),
          displayName: "Claude OR",
          environment: [
            {
              name: "ANTHROPIC_BASE_URL",
              value: "https://openrouter.ai/api",
              sensitive: false,
            },
            {
              name: "ANTHROPIC_AUTH_TOKEN",
              value: "sk-or-test",
              sensitive: true,
            },
            {
              name: "ANTHROPIC_DEFAULT_SONNET_MODEL",
              value: "anthropic/claude-3.7-sonnet",
              sensitive: false,
            },
            {
              name: "ANTHROPIC_DEFAULT_OPUS_MODEL",
              value: "anthropic/claude-3.7-sonnet:thinking",
              sensitive: false,
            },
            {
              name: "CUSTOM_USER_ENV",
              value: "preserved",
              sensitive: false,
            },
          ],
          config: {
            customModels: ["anthropic/claude-3.7-sonnet"],
          },
        },
      },
    };

    const projected = projectLegacyInstancesToHarnesses(settings);
    const profile = projected.profiles[ProfileId.make("claude_openrouter")];
    expect(profile).toBeDefined();
    if (!profile) return;
    expect(profile.displayName).toBe("Claude OR");
    expect(profile.instanceId).toBe("claude_openrouter");
    expect(profile.route.defaultModel).toBe("anthropic/claude-3.7-sonnet");
    expect(profile.route.roleOverrides?.reasoning).toBe(
      "anthropic/claude-3.7-sonnet:thinking",
    );

    const serviceId = profile.route.modelServiceId;
    expect(serviceId).not.toBe("native");
    const service = projected.services[serviceId as ServiceId];
    expect(service).toBeDefined();
    if (!service) return;
    expect(service.kind).toBe("openrouter");
    expect(service.baseUrl).toBe("https://openrouter.ai/api");

    const advancedEnv = profile.advanced?.environment;
    expect(advancedEnv?.find((v) => v.name === "CUSTOM_USER_ENV")?.value).toBe(
      "preserved",
    );
  });

  it("projects Codex shadow home configuration to identity", () => {
    const settings: ServerSettings = {
      ...DEFAULT_SERVER_SETTINGS,
      providerInstances: {
        [ProviderInstanceId.make("codex_personal")]: {
          driver: ProviderDriverKind.make("codex"),
          displayName: "Codex Personal",
          config: {
            homePath: "~/.codex",
            shadowHomePath: "~/.codex-rune/personal",
          },
        },
      },
    };

    const projected = projectLegacyInstancesToHarnesses(settings);
    const profile = projected.profiles[ProfileId.make("codex_personal")];
    expect(profile).toBeDefined();
    if (!profile) return;
    expect(profile.identity).toBeDefined();
    expect(profile.identity?.configDir).toBe("~/.codex");
    expect(profile.identity?.managedShadowHome).toBe("~/.codex-rune/personal");
  });
});
