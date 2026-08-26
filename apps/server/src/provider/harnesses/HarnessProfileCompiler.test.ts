import { describe, expect, it } from "vite-plus/test";
import {
  HarnessKind,
  HarnessProfileConfig,
  ModelServiceConfig,
  ProfileId,
  ProviderDriverKind,
  ProviderInstanceId,
  ServiceId,
} from "@rune/contracts";
import { compileHarnessProfiles } from "./HarnessProfileCompiler.ts";

describe("HarnessProfileCompiler", () => {
  it("compiles Claude Code with OpenRouter model service", () => {
    const profiles: Record<ProfileId, HarnessProfileConfig> = {
      [ProfileId.make("claude_openrouter")]: {
        profileId: ProfileId.make("claude_openrouter"),
        harnessKind: HarnessKind.make("claudeAgent"),
        displayName: "Claude OpenRouter",
        instanceId: ProviderInstanceId.make("claude_openrouter_inst"),
        enabled: true,
        routeVersion: 1,
        route: {
          modelServiceId: ServiceId.make("openrouter_service"),
          defaultModel: "anthropic/claude-3.7-sonnet",
          sameModelEverywhere: false,
          roleOverrides: {
            reasoning: "anthropic/claude-3.7-sonnet:thinking",
            fast: "anthropic/claude-3.5-haiku",
          },
        },
      },
    };

    const services: Record<ServiceId, ModelServiceConfig> = {
      [ServiceId.make("openrouter_service")]: {
        serviceId: ServiceId.make("openrouter_service"),
        kind: "openrouter",
        displayName: "OpenRouter",
        baseUrl: "https://openrouter.ai/api",
        credentialRef: "model-service:openrouter_service:api-key",
      },
    };

    const compiled = compileHarnessProfiles(profiles, services);
    const instance = compiled[ProviderInstanceId.make("claude_openrouter_inst")];
    expect(instance).toBeDefined();
    if (!instance) return;
    expect(instance.driver).toBe("claudeAgent");
    expect(instance.displayName).toBe("Claude OpenRouter");

    const baseUrlVar = instance.environment?.find(
      (v) => v.name === "ANTHROPIC_BASE_URL",
    );
    expect(baseUrlVar?.value).toBe("https://openrouter.ai/api");

    const authVar = instance.environment?.find(
      (v) => v.name === "ANTHROPIC_AUTH_TOKEN",
    );
    expect(authVar?.sensitive).toBe(true);
    expect(authVar?.valueRedacted).toBe(true);

    const config = instance.config as { customModels?: string[] };
    expect(config.customModels).toContain("anthropic/claude-3.7-sonnet");
    expect(config.customModels).toContain("anthropic/claude-3.7-sonnet:thinking");
    expect(config.customModels).toContain("anthropic/claude-3.5-haiku");
  });

  it("compiles Codex multi-account identities with auto-managed shadow homes", () => {
    const profiles: Record<ProfileId, HarnessProfileConfig> = {
      [ProfileId.make("codex_work")]: {
        profileId: ProfileId.make("codex_work"),
        harnessKind: HarnessKind.make("codex"),
        displayName: "Codex Work",
        instanceId: ProviderInstanceId.make("codex_work_inst"),
        enabled: true,
        routeVersion: 1,
        identity: {
          label: "Work Account",
          configDir: "~/.codex",
          managedShadowHome: "~/.codex-rune/work",
        },
        route: {
          modelServiceId: "native",
          defaultModel: "gpt-4o",
          sameModelEverywhere: true,
          roleOverrides: {},
        },
      },
    };

    const compiled = compileHarnessProfiles(profiles, {});
    const instance = compiled[ProviderInstanceId.make("codex_work_inst")];
    expect(instance).toBeDefined();
    if (!instance) return;
    expect(instance.driver).toBe("codex");

    const config = instance.config as {
      homePath?: string;
      shadowHomePath?: string;
    };
    expect(config.homePath).toBe("~/.codex");
    expect(config.shadowHomePath).toBe("~/.codex-rune/work");
  });

  it("preserves advanced environment overrides over compiled pins", () => {
    const profiles: Record<ProfileId, HarnessProfileConfig> = {
      [ProfileId.make("claude_override")]: {
        profileId: ProfileId.make("claude_override"),
        harnessKind: HarnessKind.make("claudeAgent"),
        displayName: "Claude Custom",
        instanceId: ProviderInstanceId.make("claude_override_inst"),
        enabled: true,
        routeVersion: 1,
        route: {
          modelServiceId: ServiceId.make("openrouter_service"),
          defaultModel: "anthropic/claude-3.7-sonnet",
          sameModelEverywhere: true,
          roleOverrides: {},
        },
        advanced: {
          environment: [
            {
              name: "ANTHROPIC_BASE_URL",
              value: "https://custom.gateway/api",
              sensitive: false,
            },
            { name: "EXTRA_ENV", value: "extra_val", sensitive: false },
          ],
        },
      },
    };

    const services: Record<ServiceId, ModelServiceConfig> = {
      [ServiceId.make("openrouter_service")]: {
        serviceId: ServiceId.make("openrouter_service"),
        kind: "openrouter",
        displayName: "OpenRouter",
        baseUrl: "https://openrouter.ai/api",
      },
    };

    const compiled = compileHarnessProfiles(profiles, services);
    const instance = compiled[ProviderInstanceId.make("claude_override_inst")];
    expect(instance).toBeDefined();
    if (!instance) return;
    const baseUrlVar = instance.environment?.find(
      (v) => v.name === "ANTHROPIC_BASE_URL",
    );
    expect(baseUrlVar?.value).toBe("https://custom.gateway/api");

    const extraVar = instance.environment?.find((v) => v.name === "EXTRA_ENV");
    expect(extraVar?.value).toBe("extra_val");
  });

  it("compiles Claude Code with role aliases for subagent routing", () => {
    const profiles: Record<ProfileId, HarnessProfileConfig> = {
      [ProfileId.make("claude_routed")]: {
        profileId: ProfileId.make("claude_routed"),
        harnessKind: HarnessKind.make("claudeAgent"),
        displayName: "Claude Routed",
        instanceId: ProviderInstanceId.make("claude_routed_inst"),
        enabled: true,
        routeVersion: 1,
        route: {
          modelServiceId: ServiceId.make("openrouter_service"),
          defaultModel: "anthropic/claude-3.7-sonnet",
          sameModelEverywhere: false,
          roleOverrides: {
            main: "anthropic/claude-3.7-sonnet",
            reasoning: "anthropic/claude-3.7-sonnet:thinking",
            fast: "anthropic/claude-3.5-haiku",
            subagent: "deepseek/deepseek-chat",
          },
        },
      },
    };

    const services: Record<ServiceId, ModelServiceConfig> = {
      [ServiceId.make("openrouter_service")]: {
        serviceId: ServiceId.make("openrouter_service"),
        kind: "openrouter",
        displayName: "OpenRouter",
        baseUrl: "https://openrouter.ai/api",
        hasCredential: true,
      },
    };

    const compiled = compileHarnessProfiles(profiles, services);
    const instance = compiled[ProviderInstanceId.make("claude_routed_inst")];
    expect(instance).toBeDefined();
    if (!instance) return;

    const envMap = new Map(instance.environment?.map((v) => [v.name, v.value]));
    expect(envMap.get("ANTHROPIC_BASE_URL")).toBe("https://openrouter.ai/api");
    expect(envMap.get("ANTHROPIC_DEFAULT_SONNET_MODEL")).toBe("anthropic/claude-3.7-sonnet");
    expect(envMap.get("ANTHROPIC_DEFAULT_OPUS_MODEL")).toBe("anthropic/claude-3.7-sonnet:thinking");
    expect(envMap.get("ANTHROPIC_DEFAULT_HAIKU_MODEL")).toBe("anthropic/claude-3.5-haiku");
    expect(envMap.get("CLAUDE_CODE_SUBAGENT_MODEL")).toBe("deepseek/deepseek-chat");
  });

  it("compiles Codex with OpenRouter gateway routing", () => {
    const profiles: Record<ProfileId, HarnessProfileConfig> = {
      [ProfileId.make("codex_openrouter")]: {
        profileId: ProfileId.make("codex_openrouter"),
        harnessKind: HarnessKind.make("codex"),
        displayName: "Codex via OpenRouter",
        instanceId: ProviderInstanceId.make("codex_openrouter_inst"),
        enabled: true,
        routeVersion: 1,
        identity: {
          label: "OpenRouter Codex",
          managedShadowHome: "~/.codex-rune/openrouter",
        },
        route: {
          modelServiceId: ServiceId.make("openrouter_service"),
          defaultModel: "openai/gpt-4o",
          sameModelEverywhere: true,
          roleOverrides: {},
        },
      },
    };

    const services: Record<ServiceId, ModelServiceConfig> = {
      [ServiceId.make("openrouter_service")]: {
        serviceId: ServiceId.make("openrouter_service"),
        kind: "openrouter",
        displayName: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        hasCredential: true,
      },
    };

    const compiled = compileHarnessProfiles(profiles, services);
    const instance = compiled[ProviderInstanceId.make("codex_openrouter_inst")];
    expect(instance).toBeDefined();
    if (!instance) return;
    expect(instance.driver).toBe("codex");

    const envMap = new Map(instance.environment?.map((v) => [v.name, v.value]));
    expect(envMap.get("OPENAI_BASE_URL")).toBe("https://openrouter.ai/api/v1");

    const authVar = instance.environment?.find((v) => v.name === "OPENAI_API_KEY");
    expect(authVar?.sensitive).toBe(true);

    const config = instance.config as { shadowHomePath?: string; customModels?: string[] };
    expect(config.shadowHomePath).toBe("~/.codex-rune/openrouter");
    expect(config.customModels).toContain("openai/gpt-4o");
  });

  it("passes through unmanaged legacy instances", () => {
    const profiles: Record<ProfileId, HarnessProfileConfig> = {};
    const legacyInstances = {
      custom_unmanaged: {
        driver: ProviderDriverKind.make("codex"),
        displayName: "Unmanaged Legacy",
      },
    };
    const compiled = compileHarnessProfiles(profiles, {}, legacyInstances);
    expect(
      compiled[ProviderInstanceId.make("custom_unmanaged")]?.displayName,
    ).toBe("Unmanaged Legacy");
  });
});
