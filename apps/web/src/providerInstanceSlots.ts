/**
 * Settings-side resolution of provider instance slots.
 *
 * The settings list and the dedicated per-instance edit page must agree on
 * which slots exist and what their effective envelope is: an explicit
 * `settings.providerInstances[id]` envelope wins; otherwise a default slot is
 * synthesized from the driver's legacy `settings.providers[driver]` blob
 * (envelope-level `enabled` only — the legacy in-config flag stays out, or an
 * explicit disable could never be undone). A slot with neither source has
 * nothing to render and is omitted — but its driver's custom instances still
 * exist through their own envelopes.
 *
 * @module providerInstanceSlots
 */
import {
  defaultInstanceIdForDriver,
  ProviderDriverKind,
  type HarnessProfileConfig,
  type ProfileId,
  type ProviderInstanceConfig,
  type ProviderInstanceId,
  type ServerSettings,
} from "@rune/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@rune/contracts/settings";
import * as Equal from "effect/Equal";

/** One resolvable settings row, shared by the list view and the edit page. */
export interface ResolvedInstanceSlot {
  readonly instanceId: ProviderInstanceId;
  /** Effective envelope: explicit, or synthesized from the legacy blob. */
  readonly instance: ProviderInstanceConfig;
  readonly driver: ProviderDriverKind;
  readonly isDefault: boolean;
  /** Settings container that owns the editable state for this slot. */
  readonly source: "legacy" | "profile";
  /** Present when the harness profile, rather than a legacy envelope, owns the slot. */
  readonly profileId?: ProfileId;
  /**
   * True when the slot carries user-authored state: an explicit envelope, a
   * modified legacy blob, or (custom instances) its very existence.
   */
  readonly isDirty: boolean;
}

export interface ListProviderInstanceSlotsOptions {
  /** Keep stale instances from other drivers when rendering a scoped view. */
  readonly includeUnlistedDrivers?: boolean;
}

type SlotSettings = Pick<ServerSettings, "providerInstances" | "providers"> & {
  readonly harnesses?: ServerSettings["harnesses"];
};

type LegacyProviderBlobs = Record<
  string,
  ({ readonly enabled?: boolean } & Record<string, unknown>) | undefined
>;

function legacyBlob(settings: SlotSettings, driver: ProviderDriverKind) {
  return (settings.providers as LegacyProviderBlobs)[driver];
}

function synthesizeFromLegacy(
  settings: SlotSettings,
  driver: ProviderDriverKind,
): ProviderInstanceConfig | undefined {
  const config = legacyBlob(settings, driver);
  if (config === undefined) {
    return undefined;
  }
  const { enabled, ...rest } = config;
  return {
    driver,
    ...(enabled !== undefined ? { enabled } : {}),
    config: rest,
  } satisfies ProviderInstanceConfig;
}

function profileConfig(profile: HarnessProfileConfig): ProviderInstanceConfig {
  const configPatch = profile.advanced?.configPatch;
  const config =
    configPatch !== null && typeof configPatch === "object" && !Array.isArray(configPatch)
      ? (configPatch as Record<string, unknown>)
      : undefined;
  return {
    driver: ProviderDriverKind.make(String(profile.harnessKind)),
    displayName: profile.displayName,
    ...(profile.accentColor ? { accentColor: profile.accentColor } : {}),
    enabled: profile.enabled,
    ...(profile.advanced?.environment ? { environment: profile.advanced.environment } : {}),
    ...(config ? { config } : {}),
  };
}

function profileForInstance(
  settings: SlotSettings,
  driver: ProviderDriverKind,
  instanceId: ProviderInstanceId,
): HarnessProfileConfig | undefined {
  return Object.values(settings.harnesses?.profiles ?? {}).find(
    (profile) =>
      String(profile.harnessKind) === String(driver) &&
      String(profile.instanceId) === String(instanceId),
  );
}

export function resolveProviderInstanceSlot(
  settings: SlotSettings,
  driver: ProviderDriverKind,
  instanceId: ProviderInstanceId,
): ResolvedInstanceSlot | undefined {
  const explicitInstance = settings.providerInstances?.[instanceId];
  const profile = profileForInstance(settings, driver, instanceId);
  if (String(instanceId) !== String(defaultInstanceIdForDriver(driver))) {
    if (explicitInstance !== undefined) {
      return {
        instanceId,
        instance: explicitInstance,
        driver: explicitInstance.driver,
        isDefault: false,
        source: "legacy",
        isDirty: true,
      };
    }
    if (profile === undefined) return undefined;
    return {
      instanceId,
      instance: profileConfig(profile),
      driver,
      isDefault: false,
      source: "profile",
      profileId: profile.profileId,
      isDirty: true,
    };
  }
  const defaultLegacyProviders = DEFAULT_UNIFIED_SETTINGS.providers as Record<
    string,
    unknown | undefined
  >;
  const effectiveInstance =
    explicitInstance ?? (profile ? profileConfig(profile) : undefined) ?? synthesizeFromLegacy(settings, driver);
  if (effectiveInstance === undefined) {
    return undefined;
  }
  return {
    instanceId,
    instance: effectiveInstance,
    driver,
    isDefault: true,
    source: profile && explicitInstance === undefined ? "profile" : "legacy",
    ...(profile && explicitInstance === undefined ? { profileId: profile.profileId } : {}),
    isDirty:
      explicitInstance !== undefined ||
      profile !== undefined ||
      !Equal.equals(legacyBlob(settings, driver), defaultLegacyProviders[driver]),
  };
}

function discoveredDrivers(settings: SlotSettings): ReadonlyArray<ProviderDriverKind> {
  const drivers: ProviderDriverKind[] = [];
  let seen = new Set<string>();
  for (const key of Object.keys(settings.providers as LegacyProviderBlobs)) {
    seen.add(key);
    drivers.push(ProviderDriverKind.make(key));
  }
  seen = new Set(seen);
  for (const instance of Object.values(settings.providerInstances ?? {})) {
    const key = String(instance.driver);
    if (!seen.has(key)) {
      seen.add(key);
      drivers.push(ProviderDriverKind.make(key));
    }
  }
  for (const profile of Object.values(settings.harnesses?.profiles ?? {})) {
    const key = String(profile.harnessKind);
    if (!seen.has(key)) {
      seen.add(key);
      drivers.push(ProviderDriverKind.make(key));
    }
  }
  return drivers;
}

export function listProviderInstanceSlots(
  settings: SlotSettings,
  drivers?: ReadonlyArray<ProviderDriverKind>,
  options: ListProviderInstanceSlotsOptions = {},
): ReadonlyArray<ResolvedInstanceSlot> {
  const listedDrivers = drivers ?? discoveredDrivers(settings);
  const listedDriversSet = new Set(listedDrivers.map((driver) => String(driver)));
  const listedDefaultIds = new Set(
    listedDrivers.map((driver) => String(defaultInstanceIdForDriver(driver))),
  );
  const slots: ResolvedInstanceSlot[] = [];

  for (const driver of listedDrivers) {
    const defaultSlot = resolveProviderInstanceSlot(
      settings,
      driver,
      defaultInstanceIdForDriver(driver),
    );
    if (defaultSlot !== undefined) {
      slots.push(defaultSlot);
    }
    for (const [id, instance] of Object.entries(settings.providerInstances ?? {})) {
      if (String(instance.driver) !== String(driver)) continue;
      if (String(id) === String(defaultInstanceIdForDriver(driver))) continue;
      slots.push({
        instanceId: id as ProviderInstanceId,
        instance,
        driver: instance.driver,
        isDefault: false,
        source: "legacy",
        isDirty: true,
      });
    }
    for (const profile of Object.values(settings.harnesses?.profiles ?? {})) {
      if (String(profile.harnessKind) !== String(driver)) continue;
      if (String(profile.instanceId) === String(defaultInstanceIdForDriver(driver))) continue;
      if (settings.providerInstances?.[profile.instanceId] !== undefined) continue;
      slots.push({
        instanceId: profile.instanceId,
        instance: profileConfig(profile),
        driver,
        isDefault: false,
        source: "profile",
        profileId: profile.profileId,
        isDirty: true,
      });
    }
  }

  // Instances of drivers outside the requested order keep rendering by
  // default (a stale remote snapshot may still carry them), appended after
  // everything listed. Scoped editors opt out so a Claude page cannot show a
  // Codex instance in its family switcher.
  if (options.includeUnlistedDrivers === false) {
    return slots;
  }
  for (const [id, instance] of Object.entries(settings.providerInstances ?? {})) {
    if (listedDriversSet.has(String(instance.driver))) continue;
    slots.push({
      instanceId: id as ProviderInstanceId,
      instance,
      driver: instance.driver,
      isDefault: listedDefaultIds.has(String(id)),
      source: "legacy",
      isDirty: true,
    });
  }
  return slots;
}
