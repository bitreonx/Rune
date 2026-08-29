import {
  type HarnessProfileConfig,
  type ProviderDriverKind,
  type ProviderInstanceConfig,
  type ProviderInstanceId,
  type ServerSettings,
} from "@rune/contracts";
import { DEFAULT_UNIFIED_SETTINGS, type UnifiedSettings } from "@rune/contracts/settings";

import type { ResolvedInstanceSlot } from "./providerInstanceSlots";

function withoutRecordKey<V>(
  record: Readonly<Record<string, V>> | undefined,
  key: string,
): Record<string, V> {
  const next = { ...record };
  delete next[key];
  return next;
}

function profileWithInstanceConfig(
  profile: HarnessProfileConfig,
  instance: ProviderInstanceConfig,
): HarnessProfileConfig {
  const { accentColor: _previousAccentColor, advanced: _previousAdvanced, ...profileRest } = profile;
  const configPatch = instance.config;
  const environment = instance.environment;
  const advanced = {
    ...(configPatch !== undefined ? { configPatch } : {}),
    ...(environment !== undefined ? { environment } : {}),
  };
  return {
    ...profileRest,
    displayName: instance.displayName?.trim() || profile.displayName,
    enabled: instance.enabled ?? true,
    ...(instance.accentColor ? { accentColor: instance.accentColor } : {}),
    ...(Object.keys(advanced).length > 0 ? { advanced } : {}),
  };
}

/** Writes profile-backed editors back to their canonical harness profile. */
export function buildProfileInstanceUpdatePatch(input: {
  readonly settings: UnifiedSettings;
  readonly slot: ResolvedInstanceSlot;
  readonly instance: ProviderInstanceConfig;
}): Partial<ServerSettings> {
  const profileId = input.slot.profileId;
  if (profileId === undefined) return {};
  const profile = input.settings.harnesses?.profiles?.[profileId];
  if (profile === undefined) return {};
  return {
    harnesses: {
      profiles: {
        ...input.settings.harnesses?.profiles,
        [profileId]: profileWithInstanceConfig(profile, input.instance),
      },
      services: input.settings.harnesses?.services ?? {},
    },
  };
}

/**
 * Remove one user-created instance and every settings reference that becomes
 * invalid with it. This deliberately removes a matching profile as well as a
 * legacy envelope so mixed-era settings cannot leave a ghost in the overview.
 */
export function buildProviderInstanceRemovalPatch(input: {
  readonly settings: UnifiedSettings;
  readonly instanceId: ProviderInstanceId;
}): Partial<UnifiedSettings> {
  const { settings, instanceId } = input;
  const textGenerationModelSelection =
    settings.textGenerationModelSelection?.instanceId === instanceId
      ? DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection
      : settings.textGenerationModelSelection;
  const sourceControlWriterModelSelection =
    settings.sourceControlWriterModelSelection?.instanceId === instanceId
      ? null
      : settings.sourceControlWriterModelSelection;

  return {
    providerInstances: withoutRecordKey(settings.providerInstances, instanceId) as UnifiedSettings["providerInstances"],
    providerModelPreferences: withoutRecordKey(
      settings.providerModelPreferences,
      instanceId,
    ) as UnifiedSettings["providerModelPreferences"],
    favorites: (settings.favorites ?? []).filter((favorite) => favorite.provider !== instanceId),
    harnesses: {
      profiles: Object.fromEntries(
        Object.entries(settings.harnesses?.profiles ?? {}).filter(
          ([, profile]) => profile.instanceId !== instanceId,
        ),
      ) as UnifiedSettings["harnesses"]["profiles"],
      services: settings.harnesses?.services ?? {},
    },
    ...(textGenerationModelSelection !== undefined ? { textGenerationModelSelection } : {}),
    ...(sourceControlWriterModelSelection !== undefined
      ? { sourceControlWriterModelSelection }
      : {}),
  };
}

/** Reset a built-in slot to its shipped legacy configuration instead of deleting its identity. */
export function buildProviderInstanceResetPatch(input: {
  readonly settings: UnifiedSettings;
  readonly instanceId: ProviderInstanceId;
  readonly driver: ProviderDriverKind;
}): Partial<UnifiedSettings> {
  const defaults = DEFAULT_UNIFIED_SETTINGS.providers as Record<string, unknown | undefined>;
  const providerDefaults = defaults[String(input.driver)];
  if (providerDefaults === undefined) return {};
  return {
    ...buildProviderInstanceRemovalPatch(input),
    providers: {
      ...input.settings.providers,
      [input.driver]: providerDefaults,
    } as UnifiedSettings["providers"],
  };
}
