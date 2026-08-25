import { useAtomValue } from "@effect/atom-react";
import { BoxesIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { EnvironmentId, ProviderInstanceConfig, ProviderInstanceId } from "@t3tools/contracts";

import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { buildProviderWorkspaceEntries, groupProviderWorkspaceEntries } from "../../providerWorkspace";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { ProviderModelsSection } from "./ProviderModelsSection";

type ModelGroupFilter = "all" | "subscription" | "api" | "local" | "remote";

function readConfigStringArray(config: unknown, key: string): string[] {
  if (config === null || typeof config !== "object") return [];
  const value = (config as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function updateConfigValue(
  config: unknown,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const base = config !== null && typeof config === "object" ? { ...(config as Record<string, unknown>) } : {};
  base[key] = value;
  return base;
}

function ModelProviderCard({
  environmentId,
  entry,
  searchQuery,
}: {
  readonly environmentId: EnvironmentId;
  readonly entry: ReturnType<typeof buildProviderWorkspaceEntries>[number];
  readonly searchQuery: string;
}) {
  const settings = useEnvironmentSettings(environmentId);
  const updateSettings = useUpdateEnvironmentSettings(environmentId);
  const snapshot = entry.snapshot;
  const models = snapshot?.models ?? [];
  const config = settings.providerInstances?.[entry.instanceId] ?? entry.config;
  const customModels = readConfigStringArray(config.config, "customModels");
  const preferences = settings.providerModelPreferences?.[entry.instanceId] ?? {
    hiddenModels: [],
    modelOrder: [],
  };
  const favoriteModels = (settings.favorites ?? [])
    .filter((favorite) => favorite.provider === entry.instanceId)
    .map((favorite) => favorite.model);

  const updateInstance = (next: ProviderInstanceConfig) => {
    updateSettings({
      providerInstances: {
        ...(settings.providerInstances ?? {}),
        [entry.instanceId]: next,
      },
    });
  };
  const updateCustomModels = (next: ReadonlyArray<string>) => {
    updateInstance({ ...config, config: updateConfigValue(config.config, "customModels", [...next]) });
  };
  const updatePreferences = (next: {
    readonly hiddenModels: ReadonlyArray<string>;
    readonly modelOrder: ReadonlyArray<string>;
  }) => {
    const existing = settings.providerModelPreferences ?? {};
    const rest = Object.fromEntries(
      Object.entries(existing).filter(([instanceId]) => instanceId !== String(entry.instanceId)),
    );
    updateSettings({
      providerModelPreferences:
        next.hiddenModels.length === 0 && next.modelOrder.length === 0
          ? rest
          : { ...rest, [entry.instanceId]: next },
    });
  };
  const updateFavorites = (next: ReadonlyArray<string>) => {
    const withoutCurrent = (settings.favorites ?? []).filter(
      (favorite) => favorite.provider !== entry.instanceId,
    );
    updateSettings({
      favorites: [
        ...withoutCurrent,
        ...next.map((model) => ({ provider: entry.instanceId, model })),
      ],
    });
  };

  return (
    <SettingsSection
      title={entry.displayName}
      icon={<span className="size-2 rounded-full bg-[var(--rune-violet-strong)]" aria-hidden />}
      className="rounded-2xl border border-border/55 bg-card/35 px-1 py-3 sm:px-2"
      data-model-settings-provider={entry.instanceId}
    >
      <SettingsRow
        title={entry.category === "api" ? "API model policy" : "Composer model policy"}
        description={`${entry.modelCount} discovered model${entry.modelCount === 1 ? "" : "s"}. Favorites, visibility, ordering, and custom IDs are scoped to this provider instance.`}
      >
        <ProviderModelsSection
          instanceId={entry.instanceId}
          driverKind={entry.driver}
          models={models}
          customModels={customModels}
          hiddenModels={preferences.hiddenModels}
          favoriteModels={favoriteModels}
          modelOrder={preferences.modelOrder}
          searchQuery={searchQuery}
          onChange={updateCustomModels}
          onHiddenModelsChange={(hiddenModels) =>
            updatePreferences({ hiddenModels, modelOrder: preferences.modelOrder })
          }
          onFavoriteModelsChange={updateFavorites}
          onModelOrderChange={(modelOrder) =>
            updatePreferences({ hiddenModels: preferences.hiddenModels, modelOrder })
          }
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export function ModelSettingsPanel() {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  // Keep hook order stable while the environment catalog hydrates. The empty
  // sentinel produces the normal empty-state query and is never rendered as a
  // real environment target.
  const environmentId = primaryEnvironmentId ?? ("" as EnvironmentId);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<ModelGroupFilter>("all");
  const settings = useEnvironmentSettings(environmentId);
  const serverProviders =
    useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? EMPTY_SERVER_PROVIDERS;
  const entries = useMemo(
    () =>
      buildProviderWorkspaceEntries({
        configs: settings.providerInstances,
        snapshots: serverProviders,
        modelPreferences: settings.providerModelPreferences,
      }),
    [serverProviders, settings.providerInstances, settings.providerModelPreferences],
  );
  const filteredEntries = useMemo(
    () => entries.filter((entry) => groupFilter === "all" || entry.category === groupFilter),
    [entries, groupFilter],
  );
  const groups = useMemo(() => groupProviderWorkspaceEntries(entries), [entries]);
  const totalModels = entries.reduce((sum, entry) => sum + entry.modelCount, 0);

  return (
    <SettingsPageContainer width="wide">
      <SettingsSection
        title="Models"
        icon={<BoxesIcon className="size-4 text-[var(--rune-violet-strong)]" aria-hidden />}
        data-rune-model-settings
      >
        <SettingsRow
          title="Shape the model picker"
          description="Search every connected provider, hide noise, favorite the models you trust, and add a custom model ID without exposing API keys."
          control={
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Filter models"
                aria-label="Filter models"
                className="h-8 pl-8 text-xs"
              />
            </div>
          }
        >
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(["all", "subscription", "api", "local", "remote"] as const).map((filter) => (
              <Button
                key={filter}
                type="button"
                size="xs"
                variant={groupFilter === filter ? "secondary" : "ghost-muted"}
                className="rounded-full px-2.5 text-[11px] capitalize"
                onClick={() => setGroupFilter(filter)}
              >
                {filter === "all" ? "All connections" : filter}
                <span className="ms-1 tabular-nums text-muted-foreground">
                  {filter === "all"
                    ? entries.length
                    : filter === "subscription"
                      ? groups.subscriptions.length
                      : groups[filter].length}
                </span>
              </Button>
            ))}
            <span className="ms-auto text-[11px] text-muted-foreground">
              {totalModels} total models
            </span>
          </div>
        </SettingsRow>
      </SettingsSection>

      {filteredEntries.length === 0 ? (
        <SettingsSection title="No model sources">
          <SettingsRow
            title={entries.length === 0 ? "Connect a provider first" : "No connections match this filter"}
            description={
              entries.length === 0
                ? "Open Settings → Providers to add an IDE subscription or API connection."
                : "Choose another connection category or clear the filter."
            }
          />
        </SettingsSection>
      ) : (
        filteredEntries.map((entry) => (
          <ModelProviderCard
            key={entry.instanceId}
            environmentId={environmentId}
            entry={entry}
            searchQuery={searchQuery}
          />
        ))
      )}
    </SettingsPageContainer>
  );
}
