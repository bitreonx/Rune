import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import {
  HARNESS_ROLES,
  ServerSettings,
  type ServerSettings as ServerSettingsType,
} from "@rune/contracts";

import {
  compileHarnessProfileProviderInstance,
  deriveHarnessProfileProviderInstances,
} from "./ProviderInstanceProfile.ts";
import { deriveProviderInstanceConfigMap } from "./Layers/ProviderInstanceRegistryHydration.ts";

const decodeSettings = Schema.decodeSync(ServerSettings);

const makeSettings = (input: unknown): ServerSettingsType => decodeSettings(input);

describe("ProviderInstanceProfile", () => {
  it("propagates role bindings and explicit service compatibility into the instance envelope", () => {
    const settings = makeSettings({
      harnesses: {
        services: {
          openrouter_main: {
            serviceId: "openrouter_main",
            kind: "openrouter",
            displayName: "OpenRouter",
            protocol: "anthropic-compatible",
            compatibilityProfileId: "claude-openrouter-current",
          },
        },
        profiles: {
          claude_gateway: {
            profileId: "claude_gateway",
            harnessKind: "claudeAgent",
            displayName: "Claude Gateway",
            instanceId: "claude_gateway",
            route: {
              modelServiceId: "openrouter_main",
              defaultModel: "anthropic/claude-sonnet",
              roleOverrides: { fast: "anthropic/claude-haiku" },
            },
            identity: { label: "Gateway", configDir: "C:/rune/claude-gateway" },
          },
        },
      },
    });

    const instance = deriveHarnessProfileProviderInstances(settings).claude_gateway;
    expect(instance).toMatchObject({
      driver: "claudeAgent",
      connectionId: "openrouter_main",
      authMode: "rune-managed",
      runtimeHomePolicy: "isolated",
      modelProfileId: "claude_gateway",
      compatibilityProfileId: "claude-openrouter-current",
      compatibilityProfileVersion: "1",
      protocol: "anthropic-compatible",
      config: { homePath: "C:/rune/claude-gateway" },
    });
    expect(instance.modelBindings).toMatchObject({
      main: "anthropic/claude-sonnet",
      fast: "anthropic/claude-haiku",
    });
    for (const role of HARNESS_ROLES) {
      expect(instance.modelBindings?.[role]).toBe(
        role === "fast" ? "anthropic/claude-haiku" : "anthropic/claude-sonnet",
      );
    }
  });

  it("keeps explicit instance bindings while hydrating missing profile metadata", () => {
    const settings = makeSettings({
      providerInstances: {
        claude_gateway: {
          driver: "claudeAgent",
          connectionId: "explicit-connection",
          config: { binaryPath: "claude" },
        },
      },
      harnesses: {
        services: {
          profile_service: {
            serviceId: "profile_service",
            kind: "custom-anthropic-compatible",
            displayName: "Profile service",
          },
        },
        profiles: {
          claude_gateway: {
            profileId: "claude_gateway",
            harnessKind: "claudeAgent",
            displayName: "Profile label",
            instanceId: "claude_gateway",
            route: {
              modelServiceId: "profile_service",
              defaultModel: "model/main",
              sameModelEverywhere: false,
              roleOverrides: { reviewer: "model/reviewer" },
            },
          },
        },
      },
    });

    const instance = deriveHarnessProfileProviderInstances(settings).claude_gateway;
    expect(instance.connectionId).toBe("explicit-connection");
    expect(instance.config).toEqual({ binaryPath: "claude" });
    expect(instance.modelProfileId).toBe("claude_gateway");
    expect(instance.modelBindings).toEqual({ main: "model/main", reviewer: "model/reviewer" });
  });

  it("gives a migrated harness profile precedence over the legacy default slot", () => {
    const settings = makeSettings({
      providers: { codex: { homePath: "C:/legacy-codex" } },
      harnesses: {
        profiles: {
          codex: {
            profileId: "codex",
            harnessKind: "codex",
            displayName: "Codex native profile",
            instanceId: "codex",
            route: {
              modelServiceId: "native",
              defaultModel: "gpt-5-codex",
            },
          },
        },
      },
    });

    const map = deriveProviderInstanceConfigMap(settings);
    expect(map.codex).toMatchObject({
      driver: "codex",
      modelProfileId: "codex",
      authMode: "native",
      runtimeHomePolicy: "native",
    });
    expect(map.codex.config).toBeUndefined();
  });
});
