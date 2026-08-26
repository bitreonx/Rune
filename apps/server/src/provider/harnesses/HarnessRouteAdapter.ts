import {
  HarnessKind,
  type HarnessProfileConfig,
  type HarnessRole,
  type ModelRoute,
  type ModelServiceConfig,
  ProviderDriverKind,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
} from "@rune/contracts";

export interface HarnessRouteAdapter {
  readonly harnessKind: HarnessKind;
  readonly supportedRoles: readonly HarnessRole[];
  readonly canApplyRouteLive: boolean;
  compile(
    profile: HarnessProfileConfig,
    route: ModelRoute,
    service: ModelServiceConfig | undefined,
  ): ProviderInstanceConfig;
}

export class ClaudeCodeRouteAdapter implements HarnessRouteAdapter {
  readonly harnessKind = HarnessKind.make("claudeAgent");
  readonly driverKind = ProviderDriverKind.make("claudeAgent");
  readonly supportedRoles: readonly HarnessRole[] = [
    "main",
    "reasoning",
    "fast",
    "subagent",
  ];
  readonly canApplyRouteLive = true;

  compile(
    profile: HarnessProfileConfig,
    route: ModelRoute,
    service: ModelServiceConfig | undefined,
  ): ProviderInstanceConfig {
    const environment: ProviderInstanceEnvironmentVariable[] = [];
    const modelsSet = new Set<string>();
    if (route.defaultModel) {
      modelsSet.add(route.defaultModel);
    }
    if (!route.sameModelEverywhere && route.roleOverrides) {
      for (const model of Object.values(route.roleOverrides)) {
        if (model) modelsSet.add(model);
      }
    }
    const customModels = Array.from(modelsSet);

    if (service && service.kind !== "native") {
      const baseUrl =
        service.baseUrl ||
        (service.kind === "openrouter" ? "https://openrouter.ai/api" : "");
      if (baseUrl) {
        environment.push({
          name: "ANTHROPIC_BASE_URL",
          value: baseUrl,
          sensitive: false,
        });
      }

      if (service.credentialRef || service.hasCredential) {
        environment.push({
          name: "ANTHROPIC_AUTH_TOKEN",
          value: "",
          sensitive: true,
          valueRedacted: true,
        });
      }

      // Inject role model environment variables when defined
      if (!route.sameModelEverywhere && route.roleOverrides) {
        if (route.roleOverrides.reasoning) {
          environment.push({
            name: "ANTHROPIC_DEFAULT_OPUS_MODEL",
            value: route.roleOverrides.reasoning,
            sensitive: false,
          });
        }
        if (route.roleOverrides.main) {
          environment.push({
            name: "ANTHROPIC_DEFAULT_SONNET_MODEL",
            value: route.roleOverrides.main,
            sensitive: false,
          });
        }
        if (route.roleOverrides.fast) {
          environment.push({
            name: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
            value: route.roleOverrides.fast,
            sensitive: false,
          });
        }
        if (route.roleOverrides.subagent) {
          environment.push({
            name: "CLAUDE_CODE_SUBAGENT_MODEL",
            value: route.roleOverrides.subagent,
            sensitive: false,
          });
        }
      }
    }

    const baseConfig =
      profile.advanced?.configPatch &&
      typeof profile.advanced.configPatch === "object"
        ? (profile.advanced.configPatch as Record<string, unknown>)
        : {};

    return {
      driver: this.driverKind,
      displayName: profile.displayName,
      ...(profile.accentColor ? { accentColor: profile.accentColor } : {}),
      enabled: profile.enabled,
      ...(environment.length > 0 ? { environment } : {}),
      config: {
        ...baseConfig,
        ...(customModels.length > 0 ? { customModels } : {}),
      },
    };
  }
}

export class CodexRouteAdapter implements HarnessRouteAdapter {
  readonly harnessKind = HarnessKind.make("codex");
  readonly driverKind = ProviderDriverKind.make("codex");
  readonly supportedRoles: readonly HarnessRole[] = ["main"];
  readonly canApplyRouteLive = false;

  compile(
    profile: HarnessProfileConfig,
    route: ModelRoute,
    service: ModelServiceConfig | undefined,
  ): ProviderInstanceConfig {
    const environment: ProviderInstanceEnvironmentVariable[] = [];
    const modelsSet = new Set<string>();
    if (route?.defaultModel) {
      modelsSet.add(route.defaultModel);
    }
    if (!route?.sameModelEverywhere && route?.roleOverrides) {
      for (const model of Object.values(route.roleOverrides)) {
        if (model) modelsSet.add(model);
      }
    }
    const customModels = Array.from(modelsSet);

    if (service && service.kind !== "native") {
      const baseUrl =
        service.baseUrl ||
        (service.kind === "openrouter" ? "https://openrouter.ai/api/v1" : "");
      if (baseUrl) {
        environment.push({
          name: "OPENAI_BASE_URL",
          value: baseUrl,
          sensitive: false,
        });
      }

      if (service.credentialRef || service.hasCredential) {
        environment.push({
          name: "OPENAI_API_KEY",
          value: "",
          sensitive: true,
          valueRedacted: true,
        });
      }
    }

    const baseConfig =
      profile.advanced?.configPatch &&
      typeof profile.advanced.configPatch === "object"
        ? (profile.advanced.configPatch as Record<string, unknown>)
        : {};

    const identity = profile.identity;
    const config: Record<string, unknown> = {
      ...baseConfig,
      ...(customModels.length > 0 ? { customModels } : {}),
    };
    if (identity?.configDir) {
      config.homePath = identity.configDir;
    }
    if (identity?.managedShadowHome) {
      config.shadowHomePath = identity.managedShadowHome;
    }

    return {
      driver: this.driverKind,
      displayName: profile.displayName,
      ...(profile.accentColor ? { accentColor: profile.accentColor } : {}),
      enabled: profile.enabled,
      ...(environment.length > 0 ? { environment } : {}),
      config,
    };
  }
}

export class RuneNativeRouteAdapter implements HarnessRouteAdapter {
  readonly harnessKind = HarnessKind.make("runeNative");
  readonly supportedRoles: readonly HarnessRole[] = [
    "main",
    "fast",
    "subagent",
  ];
  readonly canApplyRouteLive = true;

  compile(
    profile: HarnessProfileConfig,
    _route: ModelRoute,
    service: ModelServiceConfig | undefined,
  ): ProviderInstanceConfig {
    const driverKind =
      service?.kind === "openrouter"
        ? ProviderDriverKind.make("openrouter")
        : service?.kind === "openai" ||
            service?.kind === "custom-openai-compatible"
          ? ProviderDriverKind.make("openaiApi")
          : ProviderDriverKind.make("runeNative");

    const baseConfig =
      profile.advanced?.configPatch &&
      typeof profile.advanced.configPatch === "object"
        ? (profile.advanced.configPatch as Record<string, unknown>)
        : {};

    return {
      driver: driverKind,
      displayName: profile.displayName,
      ...(profile.accentColor ? { accentColor: profile.accentColor } : {}),
      enabled: profile.enabled,
      config: baseConfig,
    };
  }
}

export class SingleSourceRouteAdapter implements HarnessRouteAdapter {
  readonly supportedRoles: readonly HarnessRole[] = ["main"];
  readonly canApplyRouteLive = false;
  readonly harnessKind: HarnessKind;
  readonly driverKind: ProviderDriverKind;

  constructor(harnessKind: HarnessKind, driverKind?: ProviderDriverKind) {
    this.harnessKind = harnessKind;
    this.driverKind = driverKind ?? ProviderDriverKind.make(String(harnessKind));
  }

  compile(
    profile: HarnessProfileConfig,
    _route: ModelRoute,
    _service: ModelServiceConfig | undefined,
  ): ProviderInstanceConfig {
    const baseConfig =
      profile.advanced?.configPatch &&
      typeof profile.advanced.configPatch === "object"
        ? (profile.advanced.configPatch as Record<string, unknown>)
        : {};

    return {
      driver: this.driverKind,
      displayName: profile.displayName,
      ...(profile.accentColor ? { accentColor: profile.accentColor } : {}),
      enabled: profile.enabled,
      config: baseConfig,
    };
  }
}

const ADAPTERS = new Map<string, HarnessRouteAdapter>([
  ["claudeAgent", new ClaudeCodeRouteAdapter()],
  ["codex", new CodexRouteAdapter()],
  ["runeNative", new RuneNativeRouteAdapter()],
  [
    "cursor",
    new SingleSourceRouteAdapter(
      HarnessKind.make("cursor"),
      ProviderDriverKind.make("cursor"),
    ),
  ],
  [
    "grok",
    new SingleSourceRouteAdapter(
      HarnessKind.make("grok"),
      ProviderDriverKind.make("grok"),
    ),
  ],
  [
    "opencode",
    new SingleSourceRouteAdapter(
      HarnessKind.make("opencode"),
      ProviderDriverKind.make("opencode"),
    ),
  ],
  [
    "antigravity",
    new SingleSourceRouteAdapter(
      HarnessKind.make("antigravity"),
      ProviderDriverKind.make("antigravity"),
    ),
  ],
]);

export const getHarnessRouteAdapter = (
  harnessKind: HarnessKind | string,
): HarnessRouteAdapter => {
  const adapter = ADAPTERS.get(String(harnessKind));
  if (adapter) return adapter;
  const kind = HarnessKind.make(String(harnessKind));
  return new SingleSourceRouteAdapter(kind);
};

