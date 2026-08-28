/**
 * ServerSettings - Server-authoritative settings service.
 *
 * Owns persistence, validation, and change notification of settings that affect
 * server-side behavior (binary paths, streaming mode, env mode, custom models,
 * text generation model selection).
 *
 * Follows the same pattern as `keybindings.ts`: JSON file + Cache + PubSub +
 * Semaphore + FileSystem.watch for concurrency and external edit detection.
 *
 * @module ServerSettings
 */
import {
  DEFAULT_TEXT_GENERATION_MODEL,
  DEFAULT_TEXT_GENERATION_MODEL_BY_PROVIDER,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_SERVER_SETTINGS,
  type ModelSelection,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
  type ModelServiceConfig,
  ProviderDriverKind,
  ProviderInstanceId,
  ServerSettings,
  ServerSettingsError,
  type ServerSettingsPatch,
} from "@rune/contracts";
import * as Cache from "effect/Cache";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Duration from "effect/Duration";
import * as Equal from "effect/Equal";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PubSub from "effect/PubSub";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { writeFileStringAtomically } from "./atomicWrite.ts";
import * as ServerConfig from "./config.ts";
import { type DeepPartial, deepMerge } from "@rune/shared/Struct";
import { fromJsonStringPretty, fromLenientJson } from "@rune/shared/schemaJson";
import {
  applyServerSettingsPatch,
  isModelSelectionProviderEnabled,
} from "@rune/shared/serverSettings";
import * as ServerSecretStore from "./auth/ServerSecretStore.ts";
import { deriveHarnessProfileProviderInstances } from "./provider/ProviderInstanceProfile.ts";

export { resolveSourceControlWriterModelSelection } from "@rune/shared/serverSettings";

const encodeServerSettings = Schema.encodeEffect(ServerSettings);
const encodeServerSettingsJson = Schema.encodeUnknownEffect(fromJsonStringPretty(ServerSettings));
const decodeServerSettings = Schema.decodeUnknownEffect(ServerSettings);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Materialize a connected OpenRouter service into the environment
 * variable understood by the selected CLI harness. The settings UI stores a
 * service credential by reference so it can be shared without exposing the
 * secret; Claude Code and Codex still need their provider-specific variable at
 * process launch time.
 */
const materializeOpenRouterHarnessCredential = (input: {
  readonly settings: ServerSettings;
  readonly instanceId: string;
  readonly driver: string;
  readonly connectionId?: string;
  readonly environment: ProviderInstanceEnvironmentVariable[];
  readonly secretStore: ServerSecretStore.ServerSecretStore["Service"];
}): Effect.Effect<ProviderInstanceEnvironmentVariable[], ServerSettingsError> =>
  Effect.gen(function* () {
    const isClaude = input.driver === "claudeAgent" || input.driver === "claude";
    const isCodex = input.driver === "codex";
    if (!isClaude && !isCodex) return input.environment;

    const baseUrlName = isClaude ? "ANTHROPIC_BASE_URL" : "OPENAI_BASE_URL";
    const credentialName = isClaude ? "ANTHROPIC_AUTH_TOKEN" : "OPENAI_API_KEY";
    const baseUrl =
      input.environment.find((variable) => variable.name === baseUrlName)?.value ?? "";
    const allServices = Object.values(input.settings.harnesses.services);
    const boundService =
      input.connectionId === undefined
        ? undefined
        : allServices.find((candidate) => String(candidate.serviceId) === input.connectionId);
    let isOpenRouterEndpoint = false;

    // A current instance binding is the source of truth. In particular, do
    // not infer a managed gateway from a URL string: custom gateways can use
    // the same protocol and an empty/incomplete form must not borrow another
    // connection's secret.
    let service = boundService?.kind === "openrouter" ? boundService : undefined;
    if (input.connectionId === undefined) {
      try {
        const hostname = new URL(baseUrl).hostname.toLowerCase();
        isOpenRouterEndpoint = hostname === "openrouter.ai" || hostname.endsWith(".openrouter.ai");
      } catch {
        // Invalid/custom URLs are left untouched; the provider will surface
        // its normal validation error instead of receiving an unrelated
        // credential.
      }
      const legacyServices = allServices.filter((candidate) => candidate.kind === "openrouter");
      // Compatibility bridge for old settings with no explicit binding. It
      // is intentionally unavailable once the configuration is ambiguous.
      service = isOpenRouterEndpoint && legacyServices.length === 1 ? legacyServices[0] : undefined;
      if (!service) {
        if (isOpenRouterEndpoint) {
          const legacyCredential = input.environment.find(
            (variable) => variable.name === "OPENROUTER_API_KEY",
          );
          if (legacyCredential && legacyCredential.value.trim().length > 0) {
            return [
              ...input.environment,
              { name: credentialName, value: legacyCredential.value, sensitive: true },
            ];
          }
        }
      }
    }
    // A bound connection that is missing or points at a non-OpenRouter
    // service must not fall back to an arbitrary global service.
    if (!service) return input.environment;
    const secretName = service.credentialRef ?? `model-service:${service.serviceId}:api-key`;
    const secret = yield* input.secretStore.get(secretName).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath: "global OpenRouter service",
            operation: "read-secret",
            providerInstanceId: input.instanceId,
            environmentVariable: credentialName,
            cause,
          }),
      ),
    );
    if (Option.isNone(secret)) return input.environment;
    const credential = textDecoder.decode(secret.value);
    const values = new Map(input.environment.map((variable) => [variable.name, variable]));
    const set = (name: string, value: string, sensitive = false) =>
      values.set(name, { name, value, sensitive });

    // OpenRouter's Anthropic-compatible endpoint is /api, while its OpenAI
    // compatibility endpoint is /api/v1. These are mandatory profile values,
    // not user-entered URL heuristics.
    if (isClaude) {
      set("ANTHROPIC_BASE_URL", "https://openrouter.ai/api");
      set("ANTHROPIC_AUTH_TOKEN", credential, true);
      set("ANTHROPIC_API_KEY", "");
      set("OPENROUTER_API_KEY", credential, true);
      set("CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK", "1");
      set("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1");
    } else {
      set("OPENAI_BASE_URL", "https://openrouter.ai/api/v1");
      set("OPENAI_API_KEY", credential, true);
      set("OPENROUTER_API_KEY", credential, true);
    }
    return [...values.values()];
  });

/**
 * Compile a bound model service into the launch environment consumed by the
 * provider driver. Service connections are configuration, not decoration:
 * the endpoint and credential must travel together through the same
 * secret-backed runtime boundary as an explicitly configured instance.
 */
const materializeBoundModelService = (input: {
  readonly service: ModelServiceConfig | undefined;
  readonly environment: ProviderInstanceEnvironmentVariable[];
  readonly secretStore: ServerSecretStore.ServerSecretStore["Service"];
  readonly settingsPath: string;
  readonly instanceId: string;
}): Effect.Effect<ProviderInstanceEnvironmentVariable[], ServerSettingsError> =>
  Effect.gen(function* () {
    const service = input.service;
    if (service === undefined || service.kind === "native") return input.environment;

    const values = new Map<string, ProviderInstanceEnvironmentVariable>(
      input.environment.map((variable) => [variable.name, variable]),
    );
    const set = (name: string, value: string, sensitive = false) =>
      values.set(name, { name, value, sensitive });
    const baseUrl = service.baseUrl?.trim() ?? "";
    if (baseUrl.length > 0) {
      switch (service.kind) {
        case "anthropic":
        case "custom-anthropic-compatible":
          set("ANTHROPIC_BASE_URL", baseUrl);
          break;
        case "google":
          break;
        default:
          set("OPENAI_BASE_URL", baseUrl);
          break;
      }
    }

    const secretName = service.credentialRef?.trim();
    if (secretName === undefined || secretName.length === 0) return [...values.values()];
    const secret = yield* input.secretStore.get(secretName).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath: input.settingsPath,
            operation: "read-secret",
            providerInstanceId: input.instanceId,
            cause,
          }),
      ),
    );
    if (Option.isNone(secret)) return [...values.values()];
    const credential = textDecoder.decode(secret.value);
    switch (service.kind) {
      case "anthropic":
      case "custom-anthropic-compatible":
        set("ANTHROPIC_AUTH_TOKEN", credential, true);
        set("ANTHROPIC_API_KEY", "");
        break;
      case "google":
        set("GOOGLE_API_KEY", credential, true);
        set("GEMINI_API_KEY", credential, true);
        break;
      default:
        set("OPENAI_API_KEY", credential, true);
        break;
    }
    return [...values.values()];
  });

/**
 * Fold the legacy in-config `enabled` flag into the envelope-level
 * `ProviderInstanceConfig.enabled` and strip it from the config blob, so
 * explicit provider instances carry exactly one enabled flag. Old settings
 * files can hold both flags with conflicting values; an explicit false on
 * either side wins so a user's disable is never silently undone. Runs on
 * every load and update — the file converges on the next write.
 */
const foldProviderInstanceEnabledFlags = (settings: ServerSettings): ServerSettings => {
  let changed = false;
  const providerInstances: Record<string, ProviderInstanceConfig> = {};
  for (const [instanceId, instance] of Object.entries(settings.providerInstances)) {
    const config = instance.config;
    // Only fold boolean flags: a malformed `enabled` (e.g. `"false"`) must
    // stay in the blob so driver schema validation flags it instead of the
    // fold silently repairing the config.
    if (
      config === null ||
      typeof config !== "object" ||
      Array.isArray(config) ||
      typeof (config as { readonly enabled?: unknown }).enabled !== "boolean"
    ) {
      providerInstances[instanceId] = instance;
      continue;
    }
    const { enabled: configEnabled, ...restConfig } = config as Record<string, unknown> & {
      readonly enabled: boolean;
    };
    const resolved =
      instance.enabled === false || configEnabled === false
        ? false
        : (instance.enabled ?? configEnabled);
    changed = true;
    providerInstances[instanceId] = {
      ...instance,
      enabled: resolved,
      config: restConfig,
    } satisfies ProviderInstanceConfig;
  }
  if (!changed) {
    return settings;
  }
  return {
    ...settings,
    providerInstances: providerInstances as ServerSettings["providerInstances"],
  };
};

const normalizeServerSettings = (
  settings: ServerSettings,
): Effect.Effect<ServerSettings, ServerSettingsError> =>
  encodeServerSettings(settings).pipe(
    Effect.flatMap(decodeServerSettings),
    Effect.map(foldProviderInstanceEnabledFlags),
    Effect.mapError(
      (cause) =>
        new ServerSettingsError({
          settingsPath: "<memory>",
          operation: "normalize",
          cause,
        }),
    ),
  );

function providerEnvironmentSecretName(input: {
  readonly instanceId: string;
  readonly name: string;
}): string {
  return `provider-env-${Buffer.from(input.instanceId, "utf8").toString("base64url")}-${Buffer.from(input.name, "utf8").toString("base64url")}`;
}

function redactProviderEnvironmentVariable(
  variable: ProviderInstanceEnvironmentVariable,
): ProviderInstanceEnvironmentVariable {
  if (!variable.sensitive) {
    const { valueRedacted: _omit, ...rest } = variable;
    return rest;
  }
  return {
    ...variable,
    value: "",
    ...(variable.value.length > 0 || variable.valueRedacted ? { valueRedacted: true } : {}),
  };
}

export function redactServerSettingsForClient(settings: ServerSettings): ServerSettings {
  const providerInstances = Object.fromEntries(
    Object.entries(settings.providerInstances).map(([instanceId, instance]) => [
      instanceId,
      instance.environment
        ? {
            ...instance,
            environment: instance.environment.map(redactProviderEnvironmentVariable),
          }
        : instance,
    ]),
  );
  return { ...settings, providerInstances };
}

export class ServerSettingsService extends Context.Service<
  ServerSettingsService,
  {
    /** Start the settings runtime and attach file watching. */
    readonly start: Effect.Effect<void, ServerSettingsError>;

    /** Await settings runtime readiness. */
    readonly ready: Effect.Effect<void, ServerSettingsError>;

    /** Read the current settings. */
    readonly getSettings: Effect.Effect<ServerSettings, ServerSettingsError>;

    /** Patch settings and persist. Returns the new full settings object. */
    readonly updateSettings: (
      patch: ServerSettingsPatch,
    ) => Effect.Effect<ServerSettings, ServerSettingsError>;

    /** Stream of settings change events. */
    readonly streamChanges: Stream.Stream<ServerSettings>;

    /**
     * Acquire a settings change subscription synchronously in the current
     * fiber. Use this before reading a snapshot when changes between the
     * snapshot and a lazily started stream must not be lost.
     */
    readonly subscribeChanges: Effect.Effect<Stream.Stream<ServerSettings>, never, Scope.Scope>;
  }
>()("rune/serverSettings/ServerSettingsService") {
  /** @deprecated Import and use `layerTest` from this module. */
  static readonly layerTest = (overrides: DeepPartial<ServerSettings> = {}) => layerTest(overrides);
}

const makeTest = (overrides: DeepPartial<ServerSettings> = {}) =>
  Effect.gen(function* () {
    const { automaticGitFetchInterval, providerHealthRefreshInterval, ...overridesForMerge } =
      overrides;
    const merged = deepMerge(DEFAULT_SERVER_SETTINGS, overridesForMerge);
    const initialSettings = yield* normalizeServerSettings({
      ...merged,
      ...(automaticGitFetchInterval !== undefined
        ? { automaticGitFetchInterval: automaticGitFetchInterval as Duration.Duration }
        : {}),
      ...(providerHealthRefreshInterval !== undefined
        ? { providerHealthRefreshInterval: providerHealthRefreshInterval as Duration.Duration }
        : {}),
    });
    const currentSettingsRef = yield* Ref.make<ServerSettings>(initialSettings);

    return {
      start: Effect.void,
      ready: Effect.void,
      getSettings: Ref.get(currentSettingsRef).pipe(Effect.map(resolveTextGenerationProvider)),
      updateSettings: (patch) =>
        Ref.get(currentSettingsRef).pipe(
          Effect.map((currentSettings) => applyServerSettingsPatch(currentSettings, patch)),
          Effect.flatMap(normalizeServerSettings),
          Effect.tap((nextSettings) => Ref.set(currentSettingsRef, nextSettings)),
          Effect.map(resolveTextGenerationProvider),
        ),
      streamChanges: Stream.empty,
      subscribeChanges: Effect.succeed(Stream.empty),
    } satisfies ServerSettingsService["Service"];
  });

export const layerTest = (overrides: DeepPartial<ServerSettings> = {}) =>
  Layer.effect(ServerSettingsService, makeTest(overrides));

const ServerSettingsJson = fromLenientJson(ServerSettings);
const decodeServerSettingsJsonExit = Schema.decodeUnknownExit(ServerSettingsJson);

function resolveTextGenerationProvider(settings: ServerSettings): ServerSettings {
  return isModelSelectionProviderEnabled(settings, settings.textGenerationModelSelection)
    ? settings
    : fallbackTextGenerationProvider(settings);
}

function fallbackTextGenerationProvider(settings: ServerSettings): ServerSettings {
  const fallbackEntry = Object.entries(settings.providers).find(([, provider]) => provider.enabled);
  const fallback = fallbackEntry ? ProviderDriverKind.make(fallbackEntry[0]) : undefined;
  if (!fallback) {
    return settings;
  }

  return {
    ...settings,
    textGenerationModelSelection: {
      instanceId: ProviderInstanceId.make(fallback),
      model:
        DEFAULT_TEXT_GENERATION_MODEL_BY_PROVIDER[fallback] ??
        DEFAULT_MODEL_BY_PROVIDER[fallback] ??
        DEFAULT_TEXT_GENERATION_MODEL,
    } satisfies ModelSelection,
  };
}

// Values under these keys are compared as a whole — never stripped field-by-field.
const ATOMIC_SETTINGS_KEYS: ReadonlySet<string> = new Set([
  "backgroundActivity",
  "automaticGitFetchInterval",
  "providerHealthRefreshInterval",
  "sourceControlWriterModelSelection",
  "textGenerationModelSelection",
]);

function stripDefaultServerSettings(current: unknown, defaults: unknown): unknown | undefined {
  if (Array.isArray(current) || Array.isArray(defaults)) {
    return Equal.equals(current, defaults) ? undefined : current;
  }

  if (
    current !== null &&
    defaults !== null &&
    typeof current === "object" &&
    typeof defaults === "object"
  ) {
    const currentRecord = current as Record<string, unknown>;
    const defaultsRecord = defaults as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const key of Object.keys(currentRecord)) {
      if (ATOMIC_SETTINGS_KEYS.has(key)) {
        if (!Equal.equals(currentRecord[key], defaultsRecord[key])) {
          next[key] = currentRecord[key];
        }
      } else {
        const stripped = stripDefaultServerSettings(currentRecord[key], defaultsRecord[key]);
        if (stripped !== undefined) {
          next[key] = stripped;
        }
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  return Object.is(current, defaults) ? undefined : current;
}

const make = Effect.gen(function* () {
  const { settingsPath } = yield* ServerConfig.ServerConfig;
  const fs = yield* FileSystem.FileSystem;
  const pathService = yield* Path.Path;
  const secretStore = yield* ServerSecretStore.ServerSecretStore;
  const writeSemaphore = yield* Semaphore.make(1);
  const cacheKey = "settings" as const;
  const changesPubSub = yield* PubSub.unbounded<ServerSettings>();
  const startedRef = yield* Ref.make(false);
  const startedDeferred = yield* Deferred.make<void, ServerSettingsError>();
  const watcherScope = yield* Scope.make("sequential");
  yield* Effect.addFinalizer(() => Scope.close(watcherScope, Exit.void));

  const emitChange = (settings: ServerSettings) =>
    PubSub.publish(changesPubSub, settings).pipe(Effect.asVoid);

  const readConfigExists = fs.exists(settingsPath).pipe(
    Effect.mapError(
      (cause) =>
        new ServerSettingsError({
          settingsPath,
          operation: "check-exists",
          cause,
        }),
    ),
  );

  const readRawConfig = fs.readFileString(settingsPath).pipe(
    Effect.mapError(
      (cause) =>
        new ServerSettingsError({
          settingsPath,
          operation: "read-file",
          cause,
        }),
    ),
  );

  const loadSettingsFromDisk = Effect.gen(function* () {
    if (!(yield* readConfigExists)) {
      return DEFAULT_SERVER_SETTINGS;
    }

    const raw = yield* readRawConfig;
    const decoded = decodeServerSettingsJsonExit(raw);
    if (decoded._tag === "Failure") {
      yield* Effect.logWarning("failed to parse settings.json, using defaults", {
        path: settingsPath,
        issues: Cause.pretty(decoded.cause),
        cause: decoded.cause,
      });
      return DEFAULT_SERVER_SETTINGS;
    }
    return foldProviderInstanceEnabledFlags(decoded.value);
  });

  const settingsCache = yield* Cache.make<typeof cacheKey, ServerSettings, ServerSettingsError>({
    capacity: 1,
    lookup: () => loadSettingsFromDisk,
  });

  const getSettingsFromCache = Cache.get(settingsCache, cacheKey);

  const materializeProviderEnvironmentSecrets = (
    settings: ServerSettings,
  ): Effect.Effect<ServerSettings, ServerSettingsError> =>
    Effect.gen(function* () {
      const providerInstances: Record<string, ProviderInstanceConfig> = {
        ...settings.providerInstances,
        ...deriveHarnessProfileProviderInstances(settings),
      };
      for (const [instanceId, instance] of Object.entries(providerInstances)) {
        const environment: ProviderInstanceEnvironmentVariable[] = [];
        for (const variable of instance.environment ?? []) {
          if (!variable.sensitive || !variable.valueRedacted) {
            environment.push(variable);
            continue;
          }
          const secret = yield* secretStore
            .get(providerEnvironmentSecretName({ instanceId, name: variable.name }))
            .pipe(
              Effect.mapError(
                (cause) =>
                  new ServerSettingsError({
                    settingsPath,
                    operation: "read-secret",
                    providerInstanceId: instanceId,
                    environmentVariable: variable.name,
                    cause,
                  }),
              ),
            );
          environment.push({
            ...variable,
            value: Option.isSome(secret) ? textDecoder.decode(secret.value) : "",
          });
        }
        const boundService =
          instance.connectionId === undefined
            ? undefined
            : Object.values(settings.harnesses.services).find(
                (candidate) => String(candidate.serviceId) === instance.connectionId,
              );
        const serviceEnvironment = yield* materializeBoundModelService({
          service: boundService,
          environment: [],
          secretStore,
          settingsPath,
          instanceId,
        });
        const materializedEnvironment = yield* materializeOpenRouterHarnessCredential({
          settings,
          instanceId,
          driver: String(instance.driver),
          ...(instance.connectionId !== undefined ? { connectionId: instance.connectionId } : {}),
          environment: [...serviceEnvironment, ...environment],
          secretStore,
        });
        const isManagedConnection = boundService !== undefined && boundService.kind !== "native";
        const compatibilityProfileId =
          instance.compatibilityProfileId ??
          boundService?.compatibilityProfileId ??
          (boundService?.kind === "openrouter"
            ? `${String(instance.driver)}-openrouter`
            : undefined);
        const protocol =
          instance.protocol ??
          boundService?.protocol ??
          (boundService?.kind === "openrouter"
            ? String(instance.driver) === "claudeAgent"
              ? "anthropic-compatible"
              : String(instance.driver) === "codex"
                ? "openai-responses"
                : undefined
            : undefined);
        if (
          instance.environment !== undefined ||
          materializedEnvironment.length > 0 ||
          boundService !== undefined
        ) {
          providerInstances[instanceId] = {
            ...instance,
            environment: materializedEnvironment,
            ...(isManagedConnection && instance.authMode === undefined
              ? { authMode: "rune-managed" as const }
              : {}),
            ...(isManagedConnection && instance.runtimeHomePolicy === undefined
              ? { runtimeHomePolicy: "isolated" as const }
              : {}),
            ...(compatibilityProfileId !== undefined ? { compatibilityProfileId } : {}),
            ...(compatibilityProfileId !== undefined &&
            instance.compatibilityProfileVersion === undefined
              ? { compatibilityProfileVersion: "1" }
              : {}),
            ...(protocol !== undefined ? { protocol } : {}),
          } satisfies ProviderInstanceConfig;
        }
      }
      return {
        ...settings,
        providerInstances: providerInstances as ServerSettings["providerInstances"],
      };
    });

  const materializeChanges = (changes: Stream.Stream<ServerSettings>) =>
    changes.pipe(
      Stream.mapEffect((settings) =>
        materializeProviderEnvironmentSecrets(settings).pipe(
          Effect.catch((error: ServerSettingsError) =>
            Effect.logWarning("failed to materialize provider environment secrets", {
              operation: error.operation,
              providerInstanceId: error.providerInstanceId,
              environmentVariable: error.environmentVariable,
              cause: error.cause,
            }).pipe(Effect.as(settings)),
          ),
        ),
      ),
      Stream.map(resolveTextGenerationProvider),
    );

  const persistProviderEnvironmentSecrets = (
    current: ServerSettings,
    next: ServerSettings,
  ): Effect.Effect<ServerSettings, ServerSettingsError> =>
    Effect.gen(function* () {
      const providerInstances: Record<string, ProviderInstanceConfig> = {
        ...next.providerInstances,
      };

      const nextSecretKeys = new Set<string>();
      for (const [instanceId, instance] of Object.entries(next.providerInstances)) {
        if (!instance.environment) continue;
        const environment: ProviderInstanceEnvironmentVariable[] = [];
        for (const variable of instance.environment) {
          const secretName = providerEnvironmentSecretName({ instanceId, name: variable.name });
          if (!variable.sensitive) {
            yield* secretStore.remove(secretName).pipe(
              Effect.mapError(
                (cause) =>
                  new ServerSettingsError({
                    settingsPath,
                    operation: "remove-secret",
                    providerInstanceId: instanceId,
                    environmentVariable: variable.name,
                    cause,
                  }),
              ),
            );
            environment.push(redactProviderEnvironmentVariable(variable));
            continue;
          }

          nextSecretKeys.add(secretName);
          if (!variable.valueRedacted) {
            if (variable.value.length > 0) {
              yield* secretStore.set(secretName, textEncoder.encode(variable.value)).pipe(
                Effect.mapError(
                  (cause) =>
                    new ServerSettingsError({
                      settingsPath,
                      operation: "write-secret",
                      providerInstanceId: instanceId,
                      environmentVariable: variable.name,
                      cause,
                    }),
                ),
              );
              environment.push({ ...variable, value: "", valueRedacted: true });
            } else {
              yield* secretStore.remove(secretName).pipe(
                Effect.mapError(
                  (cause) =>
                    new ServerSettingsError({
                      settingsPath,
                      operation: "remove-secret",
                      providerInstanceId: instanceId,
                      environmentVariable: variable.name,
                      cause,
                    }),
                ),
              );
              const { valueRedacted: _omit, ...rest } = variable;
              environment.push(rest);
            }
            continue;
          }

          environment.push(redactProviderEnvironmentVariable(variable));
        }
        providerInstances[instanceId] = {
          ...instance,
          environment,
        } satisfies ProviderInstanceConfig;
      }

      for (const [instanceId, instance] of Object.entries(current.providerInstances)) {
        for (const variable of instance.environment ?? []) {
          if (!variable.sensitive) continue;
          const secretName = providerEnvironmentSecretName({ instanceId, name: variable.name });
          if (nextSecretKeys.has(secretName)) continue;
          yield* secretStore.remove(secretName).pipe(
            Effect.mapError(
              (cause) =>
                new ServerSettingsError({
                  settingsPath,
                  operation: "remove-stale-secret",
                  providerInstanceId: instanceId,
                  environmentVariable: variable.name,
                  cause,
                }),
            ),
          );
        }
      }

      return {
        ...next,
        providerInstances: providerInstances as ServerSettings["providerInstances"],
      };
    });

  const writeSettingsAtomically = Effect.fnUntraced(
    function* (settings: ServerSettings) {
      const sparseSettingsJson = yield* encodeServerSettingsJson(
        stripDefaultServerSettings(settings, DEFAULT_SERVER_SETTINGS) ?? {},
      );

      return yield* writeFileStringAtomically({
        filePath: settingsPath,
        contents: `${sparseSettingsJson}\n`,
      }).pipe(
        Effect.provideService(FileSystem.FileSystem, fs),
        Effect.provideService(Path.Path, pathService),
      );
    },
    Effect.mapError(
      (cause) =>
        new ServerSettingsError({
          settingsPath,
          operation: "write-file",
          cause,
        }),
    ),
  );

  const revalidateAndEmit = writeSemaphore.withPermits(1)(
    Effect.gen(function* () {
      yield* Cache.invalidate(settingsCache, cacheKey);
      const settings = yield* getSettingsFromCache;
      yield* emitChange(settings);
    }),
  );

  const startWatcher = Effect.gen(function* () {
    const settingsDir = pathService.dirname(settingsPath);
    const settingsFile = pathService.basename(settingsPath);
    const settingsPathResolved = pathService.resolve(settingsPath);

    yield* fs.makeDirectory(settingsDir, { recursive: true }).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath,
            operation: "prepare-directory",
            cause,
          }),
      ),
    );

    const revalidateAndEmitSafely = revalidateAndEmit.pipe(Effect.ignoreCause({ log: true }));

    // Debounce watch events so the file is fully written before we read it.
    // Editors emit multiple events per save (truncate, write, rename) and
    // `fs.watch` can fire before the content has been flushed to disk.
    const debouncedSettingsEvents = fs.watch(settingsDir).pipe(
      Stream.filter((event) => {
        return (
          event.path === settingsFile ||
          event.path === settingsPath ||
          pathService.resolve(settingsDir, event.path) === settingsPathResolved
        );
      }),
      Stream.debounce(Duration.millis(100)),
    );

    yield* Stream.runForEach(debouncedSettingsEvents, () => revalidateAndEmitSafely).pipe(
      Effect.ignoreCause({ log: true }),
      Effect.forkIn(watcherScope),
      Effect.asVoid,
    );
  });

  const start = Effect.gen(function* () {
    const shouldStart = yield* Ref.modify(startedRef, (started) => [!started, true]);
    if (!shouldStart) {
      return yield* Deferred.await(startedDeferred);
    }

    const startup = Effect.gen(function* () {
      yield* startWatcher;
      yield* Cache.invalidate(settingsCache, cacheKey);
      yield* getSettingsFromCache;
    });

    const startupExit = yield* Effect.exit(startup);
    if (startupExit._tag === "Failure") {
      yield* Deferred.failCause(startedDeferred, startupExit.cause).pipe(Effect.orDie);
      return yield* Effect.failCause(startupExit.cause);
    }

    yield* Deferred.succeed(startedDeferred, undefined).pipe(Effect.orDie);
  });

  return {
    start,
    ready: Deferred.await(startedDeferred),
    getSettings: getSettingsFromCache.pipe(
      Effect.flatMap(materializeProviderEnvironmentSecrets),
      Effect.map(resolveTextGenerationProvider),
    ),
    updateSettings: (patch) =>
      writeSemaphore.withPermits(1)(
        Effect.gen(function* () {
          const current = yield* getSettingsFromCache;
          const nextPersisted = yield* persistProviderEnvironmentSecrets(
            current,
            applyServerSettingsPatch(current, patch),
          );
          const next = yield* normalizeServerSettings(nextPersisted);
          yield* writeSettingsAtomically(next);
          yield* Cache.set(settingsCache, cacheKey, next);
          yield* emitChange(next);
          const materialized = yield* materializeProviderEnvironmentSecrets(next);
          return resolveTextGenerationProvider(materialized);
        }),
      ),
    get streamChanges() {
      return materializeChanges(Stream.fromPubSub(changesPubSub));
    },
    get subscribeChanges() {
      return PubSub.subscribe(changesPubSub).pipe(
        Effect.map((subscription) => materializeChanges(Stream.fromSubscription(subscription))),
      );
    },
  } satisfies ServerSettingsService["Service"];
});

export const layer = Layer.effect(ServerSettingsService, make);
