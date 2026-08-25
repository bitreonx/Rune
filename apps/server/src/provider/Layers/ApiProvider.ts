import {
  apiKeyEnvironmentVariableForDriver,
  normalizeApiProviderBaseUrl,
  type OpenAiApiSettings,
  type OpenRouterSettings,
  ProviderDriverKind,
  type ServerProvider,
  type ServerProviderModel,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { ServerSettingsService } from "../../serverSettings.ts";
import { makeApiTextGeneration } from "../../textGeneration/ApiTextGeneration.ts";
import { makeManualOnlyProviderMaintenanceCapabilities } from "../providerMaintenance.ts";
import { makeManagedServerProvider } from "../makeManagedServerProvider.ts";
import {
  haveProviderSnapshotSettingsChanged,
  makeProviderSnapshotSettingsSource,
  type ProviderSnapshotSettings,
} from "../providerUpdateSettings.ts";
import { mergeProviderInstanceEnvironment } from "../ProviderInstanceEnvironment.ts";
import {
  buildServerProvider,
  providerModelsFromSettings,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";
import {
  defaultProviderContinuationIdentity,
  type ProviderInstance,
} from "../ProviderDriver.ts";
import { makeApiAdapter } from "./ApiAdapter.ts";

export type ApiProviderSettings = OpenAiApiSettings | OpenRouterSettings;

export interface ApiProviderFactoryInput<Settings extends ApiProviderSettings> {
  readonly driver: ProviderDriverKind;
  readonly settings: Settings;
  readonly instanceId: ProviderInstance["instanceId"];
  readonly displayName: string | undefined;
  readonly accentColor: string | undefined;
  readonly environment: Parameters<typeof mergeProviderInstanceEnvironment>[0];
  readonly enabled: boolean;
  readonly defaultBaseUrl: string;
  readonly defaultModel: string;
  readonly apiKeyLabel: string;
  readonly requestHeaders: Readonly<Record<string, string>>;
}

function withInstanceIdentity(input: {
  readonly instanceId: ProviderInstance["instanceId"];
  readonly driver: ProviderDriverKind;
  readonly displayName: string | undefined;
  readonly accentColor: string | undefined;
  readonly continuationKey: string;
}) {
  return (snapshot: ServerProviderDraft): ServerProvider => ({
    ...snapshot,
    instanceId: input.instanceId,
    driver: input.driver,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    continuation: { groupKey: input.continuationKey },
  });
}

function configuredApiModels(settings: ApiProviderSettings): ReadonlyArray<ServerProviderModel> {
  const configured = settings.customModels ?? [];
  return providerModelsFromSettings([], configured, {});
}

function apiAuth(input: { readonly apiKey: string; readonly label: string }): ServerProvider["auth"] {
  return input.apiKey.trim().length > 0
    ? { status: "authenticated", type: "apiKey", label: input.label }
    : { status: "unauthenticated", type: "apiKey", label: input.label };
}

function apiProbe(input: {
  readonly driver: ProviderDriverKind;
  readonly enabled: boolean;
  readonly apiKey: string;
  readonly apiKeyLabel: string;
  readonly checkedAt: string;
  readonly models: ReadonlyArray<ServerProviderModel>;
  readonly identity: (snapshot: ServerProviderDraft) => ServerProvider;
}): ServerProvider {
  const hasKey = input.apiKey.trim().length > 0;
  return input.identity(
    buildServerProvider({
      driver: input.driver,
      presentation: {
        displayName: input.apiKeyLabel.replace(/ API Key$/u, ""),
        badgeLabel: "API",
        requiresNewThreadForModelChange: false,
      },
      enabled: input.enabled,
      checkedAt: input.checkedAt,
      models: input.models,
      probe: {
        installed: true,
        version: null,
        status: input.enabled ? (hasKey ? "ready" : "warning") : "warning",
        auth: apiAuth({ apiKey: input.apiKey, label: input.apiKeyLabel }),
        ...(hasKey ? {} : { message: "Add an API key to use this provider." }),
      },
    }),
  );
}

export const makeApiProviderInstance = Effect.fn("makeApiProviderInstance")(function* <
  Settings extends ApiProviderSettings,
>(input: ApiProviderFactoryInput<Settings>) {
  const serverSettings = yield* ServerSettingsService;
  const processEnv = mergeProviderInstanceEnvironment(input.environment);
  const apiKeyName = apiKeyEnvironmentVariableForDriver(input.driver);
  const apiKey = apiKeyName ? processEnv[apiKeyName] ?? "" : "";
  const baseUrl = normalizeApiProviderBaseUrl(input.settings.baseUrl, input.defaultBaseUrl);
  const continuationIdentity = defaultProviderContinuationIdentity({
    driverKind: input.driver,
    instanceId: input.instanceId,
  });
  const stampIdentity = withInstanceIdentity({
    instanceId: input.instanceId,
    driver: input.driver,
    displayName: input.displayName,
    accentColor: input.accentColor,
    continuationKey: continuationIdentity.continuationKey,
  });
  const adapter = yield* makeApiAdapter({
    provider: input.driver,
    instanceId: input.instanceId,
    baseUrl,
    apiKey,
    defaultModel: input.settings.customModels[0] ?? input.defaultModel,
    requestHeaders: input.requestHeaders,
  });
  const textGeneration = yield* makeApiTextGeneration(input.settings, {
    baseUrl,
    apiKey,
    defaultModel: input.settings.customModels[0] ?? input.defaultModel,
    requestHeaders: input.requestHeaders,
  });
  const maintenanceCapabilities = makeManualOnlyProviderMaintenanceCapabilities({
    provider: input.driver,
    packageName: null,
  });
  const initialModels = configuredApiModels(input.settings);
  const makeSnapshot = (checkedAt: string, models: ReadonlyArray<ServerProviderModel>) =>
    apiProbe({
      driver: input.driver,
      enabled: input.enabled,
      apiKey,
      apiKeyLabel: input.apiKeyLabel,
      checkedAt,
      models,
      identity: stampIdentity,
    });
  const checkProvider = Effect.gen(function* () {
    return makeSnapshot(yield* Effect.map(DateTime.now, DateTime.formatIso), initialModels);
  });
  const snapshotSettings = makeProviderSnapshotSettingsSource(input.settings, serverSettings);
  const snapshot = yield* makeManagedServerProvider<ProviderSnapshotSettings<Settings>>({
    maintenanceCapabilities,
    getSettings: snapshotSettings.getSettings,
    streamSettings: snapshotSettings.streamSettings,
    haveSettingsChanged: haveProviderSnapshotSettingsChanged,
    initialSnapshot: (settings) =>
      Effect.map(DateTime.now, DateTime.formatIso).pipe(
        Effect.map((checkedAt) => makeSnapshot(checkedAt, configuredApiModels(settings.provider))),
      ),
    checkProvider,
    enrichSnapshot: ({ snapshot: currentSnapshot, publishSnapshot }) =>
      apiKey.trim().length === 0
        ? Effect.void
        : adapter.fetchModels("models").pipe(
            Effect.map((payload) => {
              const remoteModels = (payload as { readonly data?: unknown }).data;
              const remoteIds = Array.isArray(remoteModels)
                ? remoteModels.flatMap((model) =>
                    typeof model === "object" && model !== null && "id" in model && typeof model.id === "string"
                      ? [model.id]
                      : [],
                  )
                : [];
              const remoteModelEntries = providerModelsFromSettings(
                remoteIds.map((slug) => ({ slug, name: slug, isCustom: false, capabilities: null })),
                [],
                {},
              );
              const configuredSlugs = new Set(currentSnapshot.models.map((model) => model.slug));
              const merged = [
                ...currentSnapshot.models,
                ...remoteModelEntries.filter((model) => !configuredSlugs.has(model.slug)),
              ];
              return {
                ...currentSnapshot,
                status: input.enabled ? "ready" : "disabled",
                auth: apiAuth({ apiKey, label: input.apiKeyLabel }),
                models: merged,
                message: undefined,
              } as ServerProvider;
            }),
            Effect.flatMap(publishSnapshot),
            Effect.catchCause(() => Effect.void),
          ),
  });

  return {
    instanceId: input.instanceId,
    driverKind: input.driver,
    continuationIdentity,
    displayName: input.displayName,
    accentColor: input.accentColor,
    enabled: input.enabled,
    snapshot,
    adapter,
    textGeneration,
  } satisfies ProviderInstance;
});
