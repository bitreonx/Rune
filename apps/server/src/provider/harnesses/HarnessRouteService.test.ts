import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_SERVER_SETTINGS,
  HarnessKind,
  HarnessProfileConfig,
  ModelServiceConfig,
  ProfileId,
  ProviderInstanceId,
  ServerSettings,
  ServiceId,
} from "@rune/contracts";
import { resolveRouteFromSettings } from "./HarnessRouteService.ts";

describe("HarnessRouteService", () => {
  const profileId = ProfileId.make("claude_routed");
  const serviceId = ServiceId.make("openrouter_service");

  const baseSettings: ServerSettings = {
    ...DEFAULT_SERVER_SETTINGS,
    harnesses: {
      profiles: {
        [profileId]: {
          profileId,
          harnessKind: HarnessKind.make("claudeAgent"),
          displayName: "Claude Routed",
          instanceId: ProviderInstanceId.make("claude_routed_inst"),
          enabled: true,
          routeVersion: 3,
          route: {
            modelServiceId: serviceId,
            defaultModel: "anthropic/claude-3.7-sonnet",
            sameModelEverywhere: false,
            roleOverrides: {
              reasoning: "anthropic/claude-3.7-sonnet:thinking",
              fast: "anthropic/claude-3.5-haiku",
              subagent: "anthropic/claude-3.5-sonnet",
            },
          },
        },
      },
      services: {
        [serviceId]: {
          serviceId,
          kind: "openrouter",
          displayName: "OpenRouter",
          baseUrl: "https://openrouter.ai/api",
        },
      },
    },
  };

  it("resolves role models with overrides", () => {
    const mainRoute = resolveRouteFromSettings(baseSettings, {
      profileId,
      role: "main",
    });
    expect(mainRoute.model).toBe("anthropic/claude-3.7-sonnet");
    expect(mainRoute.serviceKind).toBe("openrouter");
    expect(mainRoute.routeVersion).toBe(3);
    expect(mainRoute.stale).toBe(false);

    const reasoningRoute = resolveRouteFromSettings(baseSettings, {
      profileId,
      role: "reasoning",
    });
    expect(reasoningRoute.model).toBe("anthropic/claude-3.7-sonnet:thinking");

    const fastRoute = resolveRouteFromSettings(baseSettings, {
      profileId,
      role: "fast",
    });
    expect(fastRoute.model).toBe("anthropic/claude-3.5-haiku");

    const subagentRoute = resolveRouteFromSettings(baseSettings, {
      profileId,
      role: "subagent",
    });
    expect(subagentRoute.model).toBe("anthropic/claude-3.5-sonnet");
  });
  it("resolves defaultModel for all roles when sameModelEverywhere is true", () => {
    const currentProfile = baseSettings.harnesses.profiles[profileId]!;
    const sameEverywhereSettings: ServerSettings = {
      ...baseSettings,
      harnesses: {
        ...baseSettings.harnesses,
        profiles: {
          [profileId]: {
            ...currentProfile,
            route: {
              ...currentProfile.route,
              sameModelEverywhere: true,
            },
          },
        },
      },
    };

    const fastRoute = resolveRouteFromSettings(sameEverywhereSettings, {
      profileId,
      role: "fast",
    });
    expect(fastRoute.model).toBe("anthropic/claude-3.7-sonnet");
  });

  it("detects stale routes based on sinceVersion", () => {
    const fresh = resolveRouteFromSettings(baseSettings, {
      profileId,
      role: "main",
      sinceVersion: 3,
    });
    expect(fresh.stale).toBe(false);

    const stale = resolveRouteFromSettings(baseSettings, {
      profileId,
      role: "main",
      sinceVersion: 2,
    });
    expect(stale.stale).toBe(true);
  });
});
