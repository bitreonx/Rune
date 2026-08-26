/**
 * HarnessProfileCompiler — compiles HarnessProfileConfig into ProviderInstanceConfig.
 *
 * Rules:
 *   - Deterministic id: profile.instanceId.
 *   - HarnessRouteAdapter compiles the driver, environment, and customModels.
 *   - profile.advanced.environment merges OVER compiled vars (manual wins).
 *   - Legacy provider instances not owned by any profile pass through untouched.
 *
 * @module provider/harnesses/HarnessProfileCompiler
 */
import type {
  HarnessProfileConfig,
  ModelServiceConfig,
  ProfileId,
  ProviderInstanceConfig,
  ProviderInstanceEnvironment,
  ProviderInstanceEnvironmentVariable,
  ProviderInstanceId,
  ServiceId,
} from "@rune/contracts";
import { getHarnessRouteAdapter } from "./HarnessRouteAdapter.ts";

function mergeEnvironmentVariables(
  compiledEnv: ProviderInstanceEnvironment | undefined,
  advancedEnv: ProviderInstanceEnvironment | undefined,
): ProviderInstanceEnvironment | undefined {
  if (!compiledEnv && !advancedEnv) return undefined;
  if (!compiledEnv) return advancedEnv;
  if (!advancedEnv) return compiledEnv;

  const result: ProviderInstanceEnvironmentVariable[] = [];
  const advancedNames = new Set(advancedEnv.map((v) => v.name));

  // Add compiled vars that aren't overridden by advanced
  for (const compiledVar of compiledEnv) {
    if (!advancedNames.has(compiledVar.name)) {
      result.push(compiledVar);
    }
  }

  // Append advanced vars (manual wins)
  for (const advancedVar of advancedEnv) {
    result.push(advancedVar);
  }

  return result;
}

export function compileHarnessProfiles(
  profiles: Record<ProfileId, HarnessProfileConfig>,
  services: Record<ServiceId, ModelServiceConfig>,
  legacyInstances: Record<string, ProviderInstanceConfig> = {},
): Record<ProviderInstanceId, ProviderInstanceConfig> {
  const result: Record<string, ProviderInstanceConfig> = {};
  const claimedInstanceIds = new Set<string>();

  for (const profile of Object.values(profiles)) {
    const serviceId = profile.route?.modelServiceId;
    const service =
      serviceId && serviceId !== "native" ? services[serviceId as ServiceId] : undefined;

    const adapter = getHarnessRouteAdapter(profile.harnessKind);
    const compiled = adapter.compile(profile, profile.route, service);

    const mergedEnvironment = mergeEnvironmentVariables(
      compiled.environment,
      profile.advanced?.environment,
    );

    const instanceId = profile.instanceId;
    claimedInstanceIds.add(instanceId);

    result[instanceId] = {
      ...compiled,
      ...(mergedEnvironment ? { environment: mergedEnvironment } : {}),
    };
  }

  // Pass through unmanaged legacy instances
  for (const [legacyId, legacyConfig] of Object.entries(legacyInstances)) {
    if (!claimedInstanceIds.has(legacyId)) {
      result[legacyId] = legacyConfig;
    }
  }

  return result as Record<ProviderInstanceId, ProviderInstanceConfig>;
}
