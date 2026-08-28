import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import {
  BUILT_IN_HARNESS_DEFINITIONS,
  HarnessKind,
  HarnessProfileConfig,
  HarnessRole,
  isHarnessKind,
  isProfileId,
  isServiceId,
  ModelRoute,
  ModelServiceConfig,
  ModelServiceKind,
  ProfileId,
  ServiceId,
} from "./harness.ts";
import { ProviderInstanceId } from "./providerInstance.ts";
import { ServerSettings } from "./settings.ts";

describe("Harness contracts", () => {
  it("validates open branded slugs for HarnessKind, ServiceId, and ProfileId", () => {
    expect(isHarnessKind("claudeAgent")).toBe(true);
    expect(isHarnessKind("custom_fork_harness")).toBe(true);
    expect(isHarnessKind("123invalid")).toBe(false);
    expect(isHarnessKind("")).toBe(false);

    expect(isServiceId("openrouter_work")).toBe(true);
    expect(isProfileId("claude_sonnet_openrouter")).toBe(true);
  });

  it("decodes ModelRoute with defaults", () => {
    const decodeRoute = Schema.decodeUnknownSync(ModelRoute);
    const route = decodeRoute({
      modelServiceId: "openrouter",
      defaultModel: "anthropic/claude-3.7-sonnet",
    });

    expect(route.modelServiceId).toBe("openrouter");
    expect(route.defaultModel).toBe("anthropic/claude-3.7-sonnet");
    expect(route.sameModelEverywhere).toBe(true);
    expect(route.roleOverrides).toEqual({});
  });

  it("decodes HarnessProfileConfig and preserves advanced configurations", () => {
    const decodeProfile = Schema.decodeUnknownSync(HarnessProfileConfig);
    const profile = decodeProfile({
      profileId: "claude_openrouter",
      harnessKind: "claudeAgent",
      displayName: "Claude OpenRouter",
      instanceId: "claude_openrouter_inst",
      route: {
        modelServiceId: "openrouter",
        defaultModel: "anthropic/claude-3.7-sonnet",
        sameModelEverywhere: false,
        roleOverrides: {
          reasoning: "anthropic/claude-3.7-sonnet:thinking",
          fast: "anthropic/claude-3.5-haiku",
        },
      },
      advanced: {
        environment: [
          { name: "CUSTOM_ENV_VAR", value: "custom_value", sensitive: false },
        ],
        configPatch: { customFlag: true },
      },
    });

    expect(profile.profileId).toBe("claude_openrouter");
    expect(profile.harnessKind).toBe("claudeAgent");
    expect(profile.enabled).toBe(true);
    expect(profile.routeVersion).toBe(1);
    expect(profile.route.roleOverrides.reasoning).toBe(
      "anthropic/claude-3.7-sonnet:thinking",
    );
    expect(profile.advanced?.environment?.[0]?.name).toBe("CUSTOM_ENV_VAR");
  });

  it("decodes ModelServiceConfig with wire projection", () => {
    const decodeService = Schema.decodeUnknownSync(ModelServiceConfig);
    const service = decodeService({
      serviceId: "openrouter_personal",
      kind: "openrouter",
      displayName: "OpenRouter Personal",
      protocol: "openai-chat",
      baseUrl: "https://openrouter.ai/api/v1",
      credentialRef: "model-service:openrouter_personal:api-key",
      modelCatalogPolicy: "discover",
      compatibilityProfileId: "openrouter-openai-v1",
      hasCredential: true,
      maskedLabel: "sk-or-v1-••••••••1234",
      status: "connected",
    });

    expect(service.serviceId).toBe("openrouter_personal");
    expect(service.kind).toBe("openrouter");
    expect(service.protocol).toBe("openai-chat");
    expect(service.modelCatalogPolicy).toBe("discover");
    expect(service.compatibilityProfileId).toBe("openrouter-openai-v1");
    expect(service.hasCredential).toBe(true);
    expect(service.status).toBe("connected");
  });

  it("decodes ServerSettings containing empty or populated harnesses", () => {
    const decodeSettings = Schema.decodeUnknownSync(ServerSettings);
    const emptySettings = decodeSettings({});
    expect(emptySettings.harnesses).toEqual({ profiles: {}, services: {} });

    const populatedSettings = decodeSettings({
      harnesses: {
        profiles: {
          claude_default: {
            profileId: "claude_default",
            harnessKind: "claudeAgent",
            displayName: "Claude Default",
            instanceId: "claude",
            route: {
              modelServiceId: "native",
              defaultModel: "claude-3-7-sonnet-20250219",
            },
          },
        },
        services: {
          openrouter: {
            serviceId: "openrouter",
            kind: "openrouter",
            displayName: "OpenRouter",
          },
        },
      },
    });

    expect(
      populatedSettings.harnesses.profiles[ProfileId.make("claude_default")]?.displayName,
    ).toBe("Claude Default");
    expect(
      populatedSettings.harnesses.services[ServiceId.make("openrouter")]?.displayName,
    ).toBe("OpenRouter");
  });

  it("verifies built-in harness definitions catalog", () => {
    const codex = BUILT_IN_HARNESS_DEFINITIONS.find(
      (h) => h.kind === HarnessKind.make("codex"),
    );
    expect(codex).toBeDefined();
    expect(codex?.capabilities.supportsMultipleIdentities).toBe(true);

    const claude = BUILT_IN_HARNESS_DEFINITIONS.find(
      (h) => h.kind === HarnessKind.make("claudeAgent"),
    );
    expect(claude).toBeDefined();
    expect(claude?.capabilities.canApplyRoutesLive).toBe(true);
    expect(claude?.capabilities.roles.map((r) => r.role)).toContain("subagent");
  });
});
