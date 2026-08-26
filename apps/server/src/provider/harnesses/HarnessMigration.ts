/**
 * HarnessMigration — silent, lazy, lossless projection of legacy instances to profiles and services.
 *
 * Rules:
 *   1. Plain instances → native profiles.
 *   2. Claude instances carrying ANTHROPIC_BASE_URL → profile + gateway service.
 *   3. Codex shadow-home instances → identities with managed shadow homes.
 *   4. Migrated profiles adopt the existing instanceId (lossless persistence).
 *   5. Unrecognized env/config survives verbatim in profile.advanced.
 *
 * @module provider/harnesses/HarnessMigration
 */
import {
  HarnessKind,
  type HarnessProfileConfig,
  type HarnessesSettings,
  type ModelRoute,
  type ModelServiceConfig,
  type ModelServiceKind,
  ProfileId,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerSettings,
  ServiceId,
} from "@rune/contracts";

export function projectLegacyInstancesToHarnesses(
  settings: ServerSettings,
): HarnessesSettings {
  if (
    settings.harnesses &&
    Object.keys(settings.harnesses.profiles).length > 0
  ) {
    return settings.harnesses;
  }

  const profiles: Record<ProfileId, HarnessProfileConfig> = {};
  const services: Record<ServiceId, ModelServiceConfig> = {};

  const sourceInstances: Record<string, ProviderInstanceConfig> = {
    ...settings.providerInstances,
  };

  // Add default legacy provider instances if not already present
  const defaultDrivers: Array<[string, unknown]> = [
    ["codex", settings.providers.codex],
    ["claudeAgent", settings.providers.claudeAgent],
    ["cursor", settings.providers.cursor],
    ["grok", settings.providers.grok],
    ["opencode", settings.providers.opencode],
    ["antigravity", settings.providers.antigravity],
  ];

  for (const [driverSlug, configBlob] of defaultDrivers) {
    if (!sourceInstances[driverSlug] && configBlob) {
      sourceInstances[driverSlug] = {
        driver: ProviderDriverKind.make(driverSlug),
        config: configBlob,
      };
    }
  }

  for (const [instanceIdStr, instance] of Object.entries(sourceInstances)) {
    const instanceId = ProviderInstanceId.make(instanceIdStr);
    const profileId = ProfileId.make(instanceIdStr);
    const harnessKind = HarnessKind.make(instance.driver);
    const displayName = instance.displayName || instanceIdStr;
    const env = instance.environment ?? [];

    let modelServiceId: ServiceId | "native" = "native";
    let defaultModel = "default";
    let roleOverrides: Record<string, string> = {};
    const unhandledEnv: ProviderInstanceEnvironmentVariable[] = [];

    // Inspect Claude gateway settings
    if (instance.driver === "claudeAgent") {
      const baseUrlVar = env.find((v) => v.name === "ANTHROPIC_BASE_URL");
      const authVar = env.find(
        (v) => v.name === "ANTHROPIC_AUTH_TOKEN" || v.name === "ANTHROPIC_API_KEY",
      );
      const opusVar = env.find((v) => v.name === "ANTHROPIC_DEFAULT_OPUS_MODEL");
      const sonnetVar = env.find(
        (v) => v.name === "ANTHROPIC_DEFAULT_SONNET_MODEL",
      );
      const haikuVar = env.find(
        (v) =>
          v.name === "ANTHROPIC_DEFAULT_HAIKU_MODEL" ||
          v.name === "ANTHROPIC_SMALL_FAST_MODEL",
      );

      const customModels = Array.isArray(
        (instance.config as { customModels?: unknown })?.customModels,
      )
        ? ((instance.config as { customModels: string[] }).customModels)
        : [];

      if (baseUrlVar && baseUrlVar.value.trim().length > 0) {
        const baseUrl = baseUrlVar.value.trim();
        const isOr = baseUrl.includes("openrouter.ai");
        const serviceKind: ModelServiceKind = isOr
          ? "openrouter"
          : "custom-anthropic-compatible";
        const serviceId = ServiceId.make(
          isOr ? "openrouter_service" : `service_${instanceIdStr}`,
        );

        if (!services[serviceId]) {
          services[serviceId] = {
            serviceId,
            kind: serviceKind,
            displayName: isOr ? "OpenRouter" : `${displayName} Gateway`,
            baseUrl,
            ...(authVar ? { credentialRef: `model-service:${serviceId}:api-key` } : {}),
            hasCredential: Boolean(authVar),
          };
        }

        modelServiceId = serviceId;
        defaultModel =
          sonnetVar?.value || customModels[0] || "anthropic/claude-3.7-sonnet";
        if (opusVar?.value) roleOverrides.reasoning = opusVar.value;
        if (haikuVar?.value) roleOverrides.fast = haikuVar.value;
      } else {
        defaultModel = customModels[0] || "claude-3-7-sonnet-20250219";
      }

      // Filter handled env vars
      for (const v of env) {
        if (
          v.name !== "ANTHROPIC_BASE_URL" &&
          v.name !== "ANTHROPIC_AUTH_TOKEN" &&
          v.name !== "ANTHROPIC_DEFAULT_OPUS_MODEL" &&
          v.name !== "ANTHROPIC_DEFAULT_SONNET_MODEL" &&
          v.name !== "ANTHROPIC_DEFAULT_HAIKU_MODEL" &&
          v.name !== "ANTHROPIC_SMALL_FAST_MODEL"
        ) {
          unhandledEnv.push(v);
        }
      }
    } else {
      for (const v of env) {
        unhandledEnv.push(v);
      }
    }

    // Codex shadow home identity detection
    let identity: HarnessProfileConfig["identity"] = undefined;
    if (instance.driver === "codex") {
      const configObj = (instance.config ?? {}) as Record<string, unknown>;
      if (configObj.shadowHomePath || configObj.homePath) {
        identity = {
          label: displayName,
          ...(configObj.homePath ? { configDir: String(configObj.homePath) } : {}),
          ...(configObj.shadowHomePath
            ? { managedShadowHome: String(configObj.shadowHomePath) }
            : {}),
        };
      }
    }

    const route: ModelRoute = {
      modelServiceId,
      defaultModel,
      sameModelEverywhere: Object.keys(roleOverrides).length === 0,
      roleOverrides,
    };

    profiles[profileId] = {
      profileId,
      harnessKind,
      displayName,
      ...(instance.accentColor ? { accentColor: instance.accentColor } : {}),
      enabled: instance.enabled ?? true,
      ...(identity ? { identity } : {}),
      instanceId,
      route,
      routeVersion: 1,
      advanced: {
        ...(unhandledEnv.length > 0 ? { environment: unhandledEnv } : {}),
        ...(instance.config ? { configPatch: instance.config } : {}),
      },
    };
  }

  return { profiles, services };
}
