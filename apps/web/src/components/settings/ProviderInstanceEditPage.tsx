"use client";

import { useAtomValue } from "@effect/atom-react";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  ProfileId,
  resolveProviderInstanceEnabled,
  type EnvironmentId,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
  type ServerProvider,
} from "@rune/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@rune/contracts/settings";
import type { UnifiedSettings } from "@rune/contracts/settings";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { cn } from "../../lib/utils";
import { resolveAppModelSelectionState } from "../../modelSelection";
import { CLAUDE_ROLE_ENVIRONMENT_VARIABLE_NAMES } from "../../claudeRoles";
import {
  deriveProviderInstanceEntries,
  instanceBadgePresentation,
  normalizeProviderAccentColor,
  withIsolatedProviderInstanceConfig,
} from "../../providerInstances";
import {
  resolveProviderInstanceSlot,
  listProviderInstanceSlots,
  type ResolvedInstanceSlot,
} from "../../providerInstanceSlots";
import {
  buildProfileInstanceUpdatePatch,
  buildProviderInstanceRemovalPatch,
  buildProviderInstanceResetPatch,
} from "../../providerInstanceLifecycle";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DraftInput } from "../ui/draft-input";
import { Switch } from "../ui/switch";
import { CLAUDE_SUBSCRIPTION_DRIVER } from "./ClaudeSubscriptionCard";
import {
  CLAUDE_SERVICE_ENVIRONMENT_VARIABLE_NAMES,
  ClaudeServiceSettings,
} from "./ClaudeServiceSettings";
import { UniversalServiceSettings } from "./UniversalServiceSettings";
import { ClaudeRolesSection } from "./ClaudeRolesSection";
import {
  deriveProviderModelsForDisplay,
  nextConfigBlobWithValue,
  readConfigStringArray,
} from "./ProviderInstanceCard";
import { ProviderAccentColorPicker } from "./ProviderAccentColorPicker";
import { ProviderEnvironmentSection } from "./ProviderEnvironmentSection";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { ProviderModelsSection } from "./ProviderModelsSection";
import { ProviderSettingsForm } from "./ProviderSettingsForm";
import { ProviderSetupNotice } from "./ProviderSetupNotice";
import { StatusBadge } from "./StatusBadge";
import { AddProviderInstanceDialog } from "./AddProviderInstanceDialog";
import { OPENROUTER_LOGO_URL, resolveClaudeInstanceService } from "../../claudeServices";
import { getDriverOption } from "./providerDriverMeta";
import {
  PROVIDER_STATUS_STYLES,
  getProviderSummary,
  resolveProviderStatusKey,
} from "./providerStatus";
import { buildProviderInstanceUpdatePatch } from "./SettingsPanels.logic";
import {
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";

function withoutRecordKey<V>(
  record: Readonly<Record<ProviderInstanceId, V>> | undefined,
  key: ProviderInstanceId,
): Record<ProviderInstanceId, V> {
  const next = { ...record } as Record<ProviderInstanceId, V>;
  delete next[key];
  return next;
}

/**
 * Dedicated per-instance editor behind Settings → Subscription (IDE)
 * Providers. The flat list keeps its inline expansion for other drivers;
 * subscriptions get a page because the feature keeps growing (service
 * identity, roles, integrations) and outgrew the card.
 */
export function ProviderInstanceEditPage(props: {
  readonly instanceId: ProviderInstanceId;
  readonly environmentId: EnvironmentId;
  readonly recoveryDriver?: ProviderDriverKind;
}) {
  const { environmentId, instanceId } = props;
  const navigate = useNavigate();
  const settings = useEnvironmentSettings(environmentId);
  const updateSettings = useUpdateEnvironmentSettings(environmentId);
  const serverProviders =
    useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? EMPTY_SERVER_PROVIDERS;

  // The envelope carries its own driver; for a missing envelope the id itself
  // is the driver slug (default slots are keyed by `defaultInstanceIdForDriver`).
  const explicitEnvelope = settings.providerInstances?.[instanceId];
  const profile = Object.values(settings.harnesses?.profiles ?? {}).find(
    (candidate) => String(candidate.instanceId) === String(instanceId),
  );
  const driver =
    explicitEnvelope?.driver ??
    (profile ? ProviderDriverKind.make(String(profile.harnessKind)) : undefined) ??
    props.recoveryDriver ??
    ProviderDriverKind.make(String(instanceId));
  const slot: ResolvedInstanceSlot | undefined = resolveProviderInstanceSlot(
    settings,
    driver,
    instanceId,
  );
  const familySlots = listProviderInstanceSlots(settings, [driver], {
    includeUnlistedDrivers: false,
  });

  const entry = useMemo(() => {
    return deriveProviderInstanceEntries(serverProviders).find(
      (candidate) => candidate.instanceId === instanceId,
    );
  }, [serverProviders, instanceId]);
  const [recreateOpen, setRecreateOpen] = useState(false);

  if (!slot) {
    const driverOption = getDriverOption(driver);
    return (
      <SettingsPageContainer>
        <SettingsSection title={driverOption?.label ?? "Agent Harness"}>
          <SettingsRow
            title="This instance was removed."
            description="The saved route no longer exists in this environment. Create a new instance to continue."
          />
          <div className="flex flex-wrap gap-2 px-3 sm:px-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigate({ to: "/settings/providers" })}
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to {driverOption?.label ?? "harnesses"}
            </Button>
            <Button size="sm" onClick={() => setRecreateOpen(true)}>
              Create new instance
            </Button>
          </div>
        </SettingsSection>
        <AddProviderInstanceDialog
          open={recreateOpen}
          environmentId={environmentId}
          environmentLabel="this device"
          initialDriver={driver}
          onOpenChange={setRecreateOpen}
        />
      </SettingsPageContainer>
    );
  }

  return (
    <ProviderInstanceEditContent
      slot={slot}
      entry={entry}
      settings={settings}
      updateSettings={updateSettings}
      serverProviders={serverProviders}
      environmentId={environmentId}
      familySlots={familySlots}
      onOpenInstance={(nextInstanceId) =>
        void navigate({
          to: "/settings/providers/$instanceId",
          params: { instanceId: String(nextInstanceId) },
          search: { env: String(environmentId), driver: String(slot.driver) },
        })
      }
      onBack={() => void navigate({ to: "/settings/providers" })}
    />
  );
}

function ProviderInstanceEditContent(props: {
  readonly slot: ResolvedInstanceSlot;
  readonly entry: ReturnType<typeof deriveProviderInstanceEntries>[number] | undefined;
  readonly settings: UnifiedSettings;
  readonly updateSettings: ReturnType<typeof useUpdateEnvironmentSettings>;
  readonly serverProviders: ReadonlyArray<ServerProvider>;
  readonly environmentId: EnvironmentId;
  readonly familySlots: ReadonlyArray<ResolvedInstanceSlot>;
  readonly onOpenInstance: (instanceId: ProviderInstanceId) => void;
  readonly onBack: () => void;
}) {
  const {
    slot,
    entry,
    settings,
    updateSettings,
    environmentId,
    familySlots,
    onOpenInstance,
    onBack,
  } = props;
  const instance = slot.instance;
  const instanceId = slot.instanceId;
  const driverOption = getDriverOption(slot.driver);
  const isClaude = String(slot.driver) === String(CLAUDE_SUBSCRIPTION_DRIVER);

  const enabled = resolveProviderInstanceEnabled(instance);
  const statusKey = resolveProviderStatusKey(entry?.snapshot, {
    driver: slot.driver,
    enabled,
  });
  const summary = getProviderSummary(entry?.snapshot);
  const displayName = instance.displayName?.trim() || driverOption?.label || String(slot.driver);
  const accentColor = normalizeProviderAccentColor(instance.accentColor);
  const badge = entry ? instanceBadgePresentation(entry, [entry]) : null;

  // ── Writes ─────────────────────────────────────────────────────────
  const applyUpdate = (
    next: ProviderInstanceConfig,
    options?: {
      /** Disabling the text-generation instance must clear the app selection. */
      readonly clearTextGeneration?: boolean;
    },
  ) => {
    const selectionPatch = options?.clearTextGeneration
      ? { textGenerationModelSelection: DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection }
      : {};
    if (slot.source === "profile") {
      updateSettings({
        ...buildProfileInstanceUpdatePatch({ settings, slot, instance: next }),
        ...selectionPatch,
      });
      return;
    }
    updateSettings({
      ...buildProviderInstanceUpdatePatch({
        settings,
        instanceId,
        instance: next,
        driver: slot.driver,
        isDefault: slot.isDefault,
      }),
      ...selectionPatch,
    });
  };

  // Mirrors the flat list's onUpdate branch: disabling the instance that owns
  // the text-generation selection clears it instead of leaving a dead pick.
  const handleEnabledChange = (checked: boolean) => {
    const wasEnabled = resolveProviderInstanceEnabled(instance);
    const textGenInstanceId = resolveAppModelSelectionState(
      settings,
      props.serverProviders,
    ).instanceId;
    applyUpdate(
      { ...instance, enabled: checked },
      {
        clearTextGeneration:
          checked === false && wasEnabled && textGenInstanceId === String(instanceId),
      },
    );
  };

  const updateDisplayName = (value: string) => {
    const trimmed = value.trim();
    const { displayName: _omit, ...rest } = instance;
    applyUpdate(
      trimmed.length > 0
        ? ({ ...rest, displayName: trimmed } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateAccentColor = (value: string) => {
    const normalized = normalizeProviderAccentColor(value);
    const { accentColor: _omit, ...rest } = instance;
    applyUpdate(
      normalized
        ? ({ ...rest, accentColor: normalized } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateConfig = (nextConfig: Record<string, unknown> | undefined) => {
    const { config: _omit, ...rest } = instance;
    applyUpdate(
      nextConfig !== undefined
        ? ({ ...rest, config: nextConfig } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateCustomModels = (next: ReadonlyArray<string>) => {
    const nextConfig = nextConfigBlobWithValue(instance.config, "customModels", [...next]);
    const { config: _omit, ...rest } = instance;
    applyUpdate({ ...rest, config: nextConfig } as ProviderInstanceConfig);
  };

  const updateEnvironment = (environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>) => {
    const cleaned = environment.filter((variable) => variable.name.trim().length > 0);
    const { environment: _omit, ...rest } = instance;
    applyUpdate(
      cleaned.length > 0
        ? ({ ...rest, environment: cleaned } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateModelPreferences = (next: {
    readonly hiddenModels: ReadonlyArray<string>;
    readonly modelOrder: ReadonlyArray<string>;
  }) => {
    const hiddenModels = [...new Set(next.hiddenModels.filter((slug) => slug.trim().length > 0))];
    const modelOrder = [...new Set(next.modelOrder.filter((slug) => slug.trim().length > 0))];
    const rest = withoutRecordKey(settings.providerModelPreferences, instanceId);
    updateSettings({
      providerModelPreferences:
        hiddenModels.length === 0 && modelOrder.length === 0
          ? rest
          : { ...rest, [instanceId]: { hiddenModels, modelOrder } },
    });
  };

  const updateFavoriteModels = (nextFavoriteModels: ReadonlyArray<string>) => {
    const favoriteModels = [
      ...new Set(
        Arr.filterMap(nextFavoriteModels, (slug) => {
          const trimmedSlug = slug.trim();
          return trimmedSlug.length > 0 ? Result.succeed(trimmedSlug) : Result.failVoid;
        }),
      ),
    ];
    updateSettings({
      favorites: [
        ...withoutRecordKeyFavorites(settings.favorites ?? [], instanceId),
        ...favoriteModels.map((model) => ({ provider: instanceId, model })),
      ],
    });
  };

  const resetDefault = () => {
    updateSettings(buildProviderInstanceResetPatch({ settings, instanceId, driver: slot.driver }));
  };

  const [deleteArmed, setDeleteArmed] = useState(false);
  const [isAddInstanceOpen, setIsAddInstanceOpen] = useState(false);
  const deleteInstance = () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    updateSettings(buildProviderInstanceRemovalPatch({ settings, instanceId }));
    onBack();
  };

  const duplicateInstance = () => {
    const existingIds = new Set([
      ...Object.keys(settings.providerInstances ?? {}),
      ...Object.values(settings.harnesses?.profiles ?? {}).map((profile) => String(profile.instanceId)),
    ]);
    const base = `${String(instanceId)}_copy`;
    let candidate = base;
    let suffix = 2;
    while (existingIds.has(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }
    const copyId = ProviderInstanceId.make(candidate);
    const copyName = `${displayName} Copy`;
    if (slot.source === "profile" && slot.profileId !== undefined) {
      const profile = settings.harnesses?.profiles?.[slot.profileId];
      if (profile !== undefined) {
        const copyProfileId = ProfileId.make(candidate);
        updateSettings({
          harnesses: {
            profiles: {
              ...settings.harnesses?.profiles,
              [copyProfileId]: {
                ...profile,
                profileId: copyProfileId,
                instanceId: copyId,
                displayName: copyName,
                enabled: true,
              },
            },
            services: settings.harnesses?.services ?? {},
          },
        });
      }
    } else {
      updateSettings({
        providerInstances: {
          ...settings.providerInstances,
          [copyId]: {
            ...instance,
            displayName: copyName,
            enabled: true,
            config: withIsolatedProviderInstanceConfig(slot.driver, copyId, instance.config, {
              overwriteExisting: true,
            }),
          },
        },
      });
    }
    onOpenInstance(copyId);
  };

  // ── Model data (same sourcing rules as the inline card) ────────────
  const customModels = readConfigStringArray(instance.config, "customModels");
  const modelsForDisplay = deriveProviderModelsForDisplay({
    liveModels: entry?.snapshot.models,
    customModels,
  });
  const modelPreferences = settings.providerModelPreferences?.[instanceId] ?? {
    hiddenModels: [],
    modelOrder: [],
  };
  const favoriteModels = Arr.filterMap(settings.favorites ?? [], (favorite) =>
    favorite.provider === instanceId ? Result.succeed(favorite.model) : Result.failVoid,
  );
  const roleModelOptions = useMemo(() => {
    const slugs = new Set<string>(customModels);
    for (const model of entry?.snapshot.models ?? []) slugs.add(model.slug);
    return [...slugs].sort((left, right) => left.localeCompare(right));
  }, [customModels, entry]);

  return (
    <SettingsPageContainer>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 px-3 sm:px-4">
          <Button
            size="icon-sm"
            variant="ghost-muted"
            onClick={onBack}
            aria-label="Back to providers"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <ProviderInstanceIcon
            driverKind={slot.driver}
            displayName={displayName}
            accentColor={accentColor}
            showBadge={badge?.show ?? false}
            badgeContent={badge?.content ?? "initials"}
            {...(badge?.logoUrl ? { badgeLogoUrl: badge.logoUrl } : {})}
            statusDotClassName={PROVIDER_STATUS_STYLES[statusKey].dot}
            indicatorBackground="var(--background)"
            className="size-8"
            iconClassName="size-6"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground">
                {displayName}
              </h1>
              {!slot.isDefault ? (
                <code className="truncate rounded bg-muted/60 px-1 py-0.5 text-[10px] text-muted-foreground">
                  {String(instanceId)}
                </code>
              ) : null}
              <StatusBadge statusKey={statusKey} className="bg-background" />
            </div>
          </div>
          <ProviderSetupNotice driver={slot.driver} provider={entry?.snapshot} />
          <div className="flex items-center gap-2">
            {slot.isDefault && slot.isDirty ? (
              <SettingResetButton
                label={`${displayName} provider settings`}
                onClick={resetDefault}
              />
            ) : null}
            {!slot.isDefault ? (
              <Button
                size="compact"
                variant={deleteArmed ? "destructive" : "ghost-muted"}
                onBlur={() => setDeleteArmed(false)}
                onClick={deleteInstance}
              >
                <Trash2Icon className="size-3.5" />
                {deleteArmed ? "Confirm delete" : "Delete"}
              </Button>
            ) : null}
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => handleEnabledChange(Boolean(checked))}
              aria-label={`Enable ${displayName}`}
            />
          </div>
        </div>

        <SettingsSection title={`${driverOption?.label ?? String(slot.driver)} instances`}>
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2 sm:px-4">
            {familySlots.map((candidate) => {
              const candidateEntry = props.serverProviders.find(
                (provider) => provider.instanceId === candidate.instanceId,
              );
              const candidateStatus = resolveProviderStatusKey(candidateEntry, {
                driver: candidate.driver,
                enabled: resolveProviderInstanceEnabled(candidate.instance),
              });
              const candidateName =
                candidate.instance.displayName?.trim() ||
                getDriverOption(candidate.driver)?.label ||
                String(candidate.driver);
              const candidateService = resolveClaudeInstanceService(candidate.instance);
              return (
                <button
                  key={String(candidate.instanceId)}
                  type="button"
                  aria-current={candidate.instanceId === instanceId ? "page" : undefined}
                  onClick={() => onOpenInstance(candidate.instanceId)}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    candidate.instanceId === instanceId
                      ? "border-primary/40 bg-primary/8"
                      : "border-border/60 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <ProviderInstanceIcon
                    driverKind={candidate.driver}
                    displayName={candidateName}
                    accentColor={normalizeProviderAccentColor(candidate.instance.accentColor)}
                    showBadge={candidateService === "openrouter"}
                    badgeContent={candidateService === "openrouter" ? "logo" : "initials"}
                    {...(candidateService === "openrouter"
                      ? { badgeLogoUrl: OPENROUTER_LOGO_URL }
                      : {})}
                    className="size-7"
                    iconClassName="size-5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          PROVIDER_STATUS_STYLES[candidateStatus].dot,
                        )}
                        aria-hidden
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {candidateName}
                      </span>
                      {candidate.isDefault ? (
                        <Badge variant="outline" size="sm">
                          Default
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {candidateEntry?.models.length ?? 0} models ·{" "}
                      {getProviderSummary(candidateEntry).headline}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 px-3 pb-4 sm:px-4">
            <Button size="sm" variant="outline" onClick={() => setIsAddInstanceOpen(true)}>
              Add {driverOption?.label ?? "provider"} instance
            </Button>
            <Button size="sm" variant="ghost-muted" onClick={duplicateInstance}>
              Duplicate this instance
            </Button>
          </div>
        </SettingsSection>

        {driverOption ? (
          <>
            {/* Identity */}
            <SettingsSection title="Identity">
              <div className="grid gap-5 px-3 pb-4 sm:px-4">
                <label htmlFor={`edit-page-${String(instanceId)}-display-name`} className="block">
                  <span className="text-xs font-medium text-foreground">Display name</span>
                  <DraftInput
                    id={`edit-page-${String(instanceId)}-display-name`}
                    className="mt-1.5"
                    value={instance.displayName ?? ""}
                    onCommit={updateDisplayName}
                    placeholder={driverOption.label}
                    spellCheck={false}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Optional label shown in picker rails and model lists.
                  </span>
                </label>
                <ProviderAccentColorPicker
                  displayName={displayName}
                  value={accentColor}
                  onCommit={updateAccentColor}
                  commitDelayMs={120}
                  description="Used to distinguish this instance in picker rails and model lists."
                />
              </div>
            </SettingsSection>

            {/* Service connection */}
            <SettingsSection title="Service connection">
              <div className="px-3 pb-4 sm:px-4">
                <UniversalServiceSettings
                  driverKind={slot.driver}
                  idPrefix={`edit-page-${String(instanceId)}-service`}
                  instanceId={String(instanceId)}
                  instanceLabel={displayName}
                  environment={instance.environment ?? []}
                  settings={settings}
                  onChange={updateEnvironment}
                />
              </div>
            </SettingsSection>

            {/* Models */}
            <SettingsSection title="Model routing">
              <div className="px-3 pb-4 sm:px-4">
                <ProviderModelsSection
                  instanceId={instanceId}
                  driverKind={slot.driver}
                  models={modelsForDisplay}
                  customModels={customModels}
                  hiddenModels={modelPreferences.hiddenModels}
                  favoriteModels={favoriteModels}
                  modelOrder={modelPreferences.modelOrder}
                  onChange={updateCustomModels}
                  onHiddenModelsChange={(hiddenModels) =>
                    updateModelPreferences({ ...modelPreferences, hiddenModels })
                  }
                  onFavoriteModelsChange={updateFavoriteModels}
                  onModelOrderChange={(modelOrder) =>
                    updateModelPreferences({ ...modelPreferences, modelOrder })
                  }
                />
              </div>
            </SettingsSection>

            {/* Model roles */}
            {isClaude ? (
              <SettingsSection title="Model roles">
                <div className="px-3 pb-4 sm:px-4">
                  <ClaudeRolesSection
                    environment={instance.environment ?? []}
                    onChange={updateEnvironment}
                    modelOptions={roleModelOptions}
                  />
                </div>
              </SettingsSection>
            ) : null}

            {/* Connection settings */}
            <SettingsSection title="Connection settings">
              <div className="px-3 pb-4 sm:px-4">
                <ProviderSettingsForm
                  definition={driverOption}
                  value={instance.config}
                  idPrefix={`edit-page-${String(instanceId)}`}
                  variant="card"
                  onChange={updateConfig}
                />
              </div>
            </SettingsSection>

            {/* Advanced environment variables */}
            <SettingsSection title="Advanced environment variables">
              <div className="px-3 pb-4 sm:px-4">
                <ProviderEnvironmentSection
                  environment={instance.environment ?? []}
                  onChange={updateEnvironment}
                  {...(isClaude
                    ? {
                        hiddenVariableNames: [
                          ...CLAUDE_SERVICE_ENVIRONMENT_VARIABLE_NAMES,
                          ...CLAUDE_ROLE_ENVIRONMENT_VARIABLE_NAMES,
                        ],
                        description:
                          "Optional variables passed to Claude Code. Service URL, credentials, and role pins are managed above.",
                      }
                    : {})}
                />
              </div>
            </SettingsSection>
          </>
        ) : (
          <SettingsSection title="Identity">
            <div className="px-3 pb-4 sm:px-4">
              <p className="text-xs text-muted-foreground">
                This instance uses a driver (
                <code className="text-foreground">{String(slot.driver)}</code>) that is not shipped
                with the current build. Configuration values are preserved but cannot be edited from
                this surface.
              </p>
            </div>
          </SettingsSection>
        )}
      </div>
      <AddProviderInstanceDialog
        open={isAddInstanceOpen}
        environmentId={environmentId}
        environmentLabel="this device"
        initialDriver={slot.driver}
        onOpenChange={setIsAddInstanceOpen}
      />
    </SettingsPageContainer>
  );
}

function withoutRecordKeyFavorites(
  favorites: ReadonlyArray<{ readonly provider: ProviderInstanceId; readonly model: string }>,
  instanceId: ProviderInstanceId,
): Array<{ readonly provider: ProviderInstanceId; readonly model: string }> {
  return favorites.filter((favorite) => favorite.provider !== instanceId);
}
