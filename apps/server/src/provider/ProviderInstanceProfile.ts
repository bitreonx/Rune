/**
 * ProviderInstanceProfile — compile harness profiles into instance metadata.
 *
 * `HarnessProfileConfig` is the authoring contract and `ProviderInstanceConfig`
 * is the runtime envelope. Keeping this translation pure gives settings
 * materialization and registry hydration the same migration semantics without
 * making either boundary infer routing from URLs or process environment.
 */
import {
  HARNESS_ROLES,
  ProviderDriverKind,
  type HarnessProfileConfig,
  type ModelServiceConfig,
  type ProviderInstanceConfig,
  type ServerSettings,
  type ServiceConnectionProtocol,
} from "@rune/contracts";

const COMPATIBILITY_PROFILE_VERSION = "1";

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};

const serviceForProfile = (
  profile: HarnessProfileConfig,
  services: Readonly<Record<string, ModelServiceConfig>>,
): ModelServiceConfig | undefined => {
  if (profile.route.modelServiceId === "native") return undefined;
  return services[String(profile.route.modelServiceId)];
};

const resolveProtocol = (
  driver: string,
  service: ModelServiceConfig | undefined,
): ServiceConnectionProtocol | undefined => {
  if (service?.protocol !== undefined) return service.protocol;
  switch (service?.kind) {
    case "openrouter":
      return driver === "claudeAgent" ? "anthropic-compatible" : "openai-responses";
    case "openai":
    case "deepseek":
      return "openai-responses";
    case "anthropic":
    case "custom-anthropic-compatible":
      return "anthropic-compatible";
    case "custom-openai-compatible":
      return "openai-chat";
    case "google":
      return "provider-native";
    default:
      return undefined;
  }
};

const resolveCompatibilityProfileId = (
  driver: string,
  service: ModelServiceConfig | undefined,
): string | undefined => {
  if (service?.compatibilityProfileId !== undefined) return service.compatibilityProfileId;
  if (service === undefined || service.kind === "native") return undefined;
  if (service.kind === "openrouter") return `${driver}-openrouter`;
  return `${driver}-${service.kind}`;
};

const resolveModelBindings = (profile: HarnessProfileConfig): Record<string, string> => {
  const bindings: Record<string, string> = profile.route.sameModelEverywhere
    ? Object.fromEntries(HARNESS_ROLES.map((role) => [role, profile.route.defaultModel]))
    : { main: profile.route.defaultModel };
  for (const [role, model] of Object.entries(profile.route.roleOverrides)) {
    bindings[role] = model;
  }
  return bindings;
};

const resolveConfig = (profile: HarnessProfileConfig, driver: string): unknown => {
  const config = asRecord(profile.advanced?.configPatch);
  const identity = profile.identity;
  if (driver === "claudeAgent" || driver === "codex") {
    if (config.homePath === undefined && identity?.configDir !== undefined) {
      config.homePath = identity.configDir;
    }
    if (driver === "codex" && config.shadowHomePath === undefined) {
      if (identity?.managedShadowHome !== undefined) {
        config.shadowHomePath = identity.managedShadowHome;
      }
    }
  }
  return Object.keys(config).length > 0 ? config : undefined;
};

/**
 * Translate one authored harness profile into the provider-instance fields
 * needed by the runtime compiler. The service id remains explicit even when
 * its catalog entry is missing, so a broken migration cannot fall back to a
 * different connection.
 */
export const compileHarnessProfileProviderInstance = (
  profile: HarnessProfileConfig,
  services: Readonly<Record<string, ModelServiceConfig>>,
): ProviderInstanceConfig => {
  const driver = ProviderDriverKind.make(String(profile.harnessKind));
  const service = serviceForProfile(profile, services);
  const compatibilityProfileId = resolveCompatibilityProfileId(String(driver), service);
  const protocol = resolveProtocol(String(driver), service);
  const config = resolveConfig(profile, String(driver));
  const connectionId =
    profile.route.modelServiceId === "native"
      ? undefined
      : String(profile.route.modelServiceId);
  const runtimeHomePolicy =
    profile.route.modelServiceId !== "native" || profile.identity?.managedShadowHome !== undefined
      ? "isolated"
      : "native";

  return {
    driver,
    displayName: profile.displayName,
    ...(profile.accentColor !== undefined ? { accentColor: profile.accentColor } : {}),
    enabled: profile.enabled,
    ...(connectionId !== undefined ? { connectionId } : {}),
    ...(service?.kind !== undefined ? { serviceKind: String(service.kind) } : {}),
    authMode: profile.route.modelServiceId === "native" ? "native" : "rune-managed",
    runtimeHomePolicy,
    modelProfileId: String(profile.profileId),
    ...(compatibilityProfileId !== undefined ? { compatibilityProfileId } : {}),
    ...(protocol !== undefined ? { protocol } : {}),
    ...(compatibilityProfileId !== undefined
      ? { compatibilityProfileVersion: COMPATIBILITY_PROFILE_VERSION }
      : {}),
    modelBindings: resolveModelBindings(profile),
    ...(profile.advanced?.environment !== undefined
      ? { environment: profile.advanced.environment }
      : {}),
    ...(config !== undefined ? { config } : {}),
  };
};

/**
 * Add profile-derived routing metadata to an explicit instance without
 * replacing any instance-owned value. Explicit providerInstances remain the
 * authority; profile data only hydrates fields that older envelopes lack.
 */
export const mergeHarnessProfileIntoProviderInstance = (
  instance: ProviderInstanceConfig,
  profileInstance: ProviderInstanceConfig,
): ProviderInstanceConfig => ({
  ...profileInstance,
  ...instance,
  ...(instance.connectionId === undefined && profileInstance.connectionId !== undefined
    ? { connectionId: profileInstance.connectionId }
    : {}),
  ...(instance.serviceKind === undefined && profileInstance.serviceKind !== undefined
    ? { serviceKind: profileInstance.serviceKind }
    : {}),
  ...(instance.authMode === undefined && profileInstance.authMode !== undefined
    ? { authMode: profileInstance.authMode }
    : {}),
  ...(instance.runtimeHomePolicy === undefined && profileInstance.runtimeHomePolicy !== undefined
    ? { runtimeHomePolicy: profileInstance.runtimeHomePolicy }
    : {}),
  ...(instance.modelProfileId === undefined && profileInstance.modelProfileId !== undefined
    ? { modelProfileId: profileInstance.modelProfileId }
    : {}),
  ...(instance.compatibilityProfileId === undefined && profileInstance.compatibilityProfileId !== undefined
    ? { compatibilityProfileId: profileInstance.compatibilityProfileId }
    : {}),
  ...(instance.compatibilityProfileVersion === undefined &&
  profileInstance.compatibilityProfileVersion !== undefined
    ? { compatibilityProfileVersion: profileInstance.compatibilityProfileVersion }
    : {}),
  ...(instance.protocol === undefined && profileInstance.protocol !== undefined
    ? { protocol: profileInstance.protocol }
    : {}),
  ...(instance.modelBindings === undefined && profileInstance.modelBindings !== undefined
    ? { modelBindings: profileInstance.modelBindings }
    : {}),
  ...(instance.environment === undefined && profileInstance.environment !== undefined
    ? { environment: profileInstance.environment }
    : {}),
  ...(instance.config === undefined && profileInstance.config !== undefined
    ? { config: profileInstance.config }
    : {}),
});

/**
 * Hydrate profile-backed instances for both settings materialization and the
 * registry. Duplicate profiles targeting one instance resolve by profile id,
 * making the result deterministic across object insertion order.
 */
export const deriveHarnessProfileProviderInstances = (
  settings: Pick<ServerSettings, "harnesses" | "providerInstances">,
): Record<string, ProviderInstanceConfig> => {
  const result: Record<string, ProviderInstanceConfig> = {};
  const profiles = Object.values(settings.harnesses.profiles).sort((left, right) =>
    String(left.profileId).localeCompare(String(right.profileId)),
  );
  for (const profile of profiles) {
    const instanceId = String(profile.instanceId);
    const compiled = compileHarnessProfileProviderInstance(profile, settings.harnesses.services);
    const explicit = settings.providerInstances[instanceId as keyof typeof settings.providerInstances];
    if (result[instanceId] !== undefined) continue;
    result[instanceId] =
      explicit === undefined ? compiled : mergeHarnessProfileIntoProviderInstance(explicit, compiled);
  }
  return result;
};
