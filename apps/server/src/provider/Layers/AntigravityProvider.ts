import {
  type AntigravitySettings,
  type ModelCapabilities,
  type ServerProvider,
  type ServerProviderModel,
} from "@rune/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { HttpClient } from "effect/unstable/http";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { createModelCapabilities } from "@rune/shared/model";
import {
  CommandResolutionError,
  resolveSpawnCommand,
} from "@rune/shared/shell";
import {
  buildSelectOptionDescriptor,
  buildServerProvider,
  isCommandMissingCause,
  parseGenericCliVersion,
  providerModelsFromSettings,
  spawnAndCollect,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";
import {
  enrichProviderSnapshotWithVersionAdvisory,
  type ProviderMaintenanceCapabilities,
} from "../providerMaintenance.ts";
import { parseAntigravityModelList } from "../antigravityProtocol.ts";

const ANTIGRAVITY_PRESENTATION = {
  displayName: "Antigravity",
  showInteractionModeToggle: false,
  requiresNewThreadForModelChange: true,
} as const;

const DEFAULT_ANTIGRAVITY_MODEL = "gemini-3.7-flash-high";
const VERSION_PROBE_TIMEOUT_MS = 4_000;
// `agy models` can perform its first authenticated catalog refresh before it
// prints the table. Give that network-backed operation a reasonable window,
// but never make catalog enrichment a prerequisite for using the CLI.
const MODEL_PROBE_TIMEOUT_MS = 30_000;
const MODEL_CATALOG_CACHE_TTL_MS = 5 * 60 * 1_000;

interface LastKnownGoodModelCatalog {
  readonly models: ReadonlyArray<ServerProviderModel>;
  readonly checkedAtMs: number;
}

const lastKnownGoodCatalogs = new Map<string, LastKnownGoodModelCatalog>();

export interface AntigravityProviderProbeOptions {
  readonly modelProbeTimeoutMs?: number | undefined;
}

const ANTIGRAVITY_MODEL_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [
    buildSelectOptionDescriptor({
      id: "effort",
      label: "Reasoning",
      description: "Antigravity headless effort passed to agy at session start.",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    }),
  ],
});

const FALLBACK_ANTIGRAVITY_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: DEFAULT_ANTIGRAVITY_MODEL,
    name: "Gemini 3.7 Flash (High)",
    isCustom: false,
    isDefault: true,
    capabilities: ANTIGRAVITY_MODEL_CAPABILITIES,
  },
];

function antigravityModelsFromSettings(
  customModels: ReadonlyArray<string> | undefined,
  builtInModels: ReadonlyArray<ServerProviderModel> = FALLBACK_ANTIGRAVITY_MODELS,
): ReadonlyArray<ServerProviderModel> {
  return providerModelsFromSettings(
    builtInModels,
    customModels ?? [],
    ANTIGRAVITY_MODEL_CAPABILITIES,
  );
}

function authFailureMessage(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("auth") ||
    lower.includes("credential") ||
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in") ||
    lower.includes("unauthenticated")
  );
}

function isAntigravityCommandMissingCause(error: unknown): boolean {
  return isCommandMissingCause(error) || error instanceof CommandResolutionError;
}

function modelDisplayName(slug: string, fallbackName: string | undefined): string {
  return fallbackName?.trim() || slug;
}

function modelsFromDiscovery(
  customModels: ReadonlyArray<string> | undefined,
  output: string,
): ReadonlyArray<ServerProviderModel> {
  const discovered = parseAntigravityModelList(output);
  if (discovered.length === 0) {
    return antigravityModelsFromSettings(customModels);
  }

  const defaultSlug = discovered.some((model) => model.slug === DEFAULT_ANTIGRAVITY_MODEL)
    ? DEFAULT_ANTIGRAVITY_MODEL
    : discovered[0]?.slug;
  const builtInModels = discovered.map((model) => ({
    slug: model.slug,
    name: modelDisplayName(model.slug, model.name),
    isCustom: false,
    ...(model.slug === defaultSlug ? { isDefault: true } : {}),
    capabilities: ANTIGRAVITY_MODEL_CAPABILITIES,
  }));
  return antigravityModelsFromSettings(customModels, builtInModels);
}

function readLastKnownGoodCatalog(
  binary: string,
  checkedAtMs: number,
): ReadonlyArray<ServerProviderModel> | undefined {
  const cached = lastKnownGoodCatalogs.get(binary);
  if (!cached) return undefined;
  if (checkedAtMs - cached.checkedAtMs > MODEL_CATALOG_CACHE_TTL_MS) {
    lastKnownGoodCatalogs.delete(binary);
    return undefined;
  }
  return cached.models;
}

function runAntigravityCommand(
  settings: AntigravitySettings,
  args: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return Effect.gen(function* () {
    const binary = settings.binaryPath?.trim() || "agy";
    const spawnCommand = yield* resolveSpawnCommand(binary, [...args], { env: environment });
    return yield* spawnAndCollect(
      binary,
      ChildProcess.make(spawnCommand.command, spawnCommand.args, {
        env: environment,
        shell: spawnCommand.shell,
      }),
    );
  });
}

export function buildInitialAntigravityProviderSnapshot(
  settings: AntigravitySettings,
): Effect.Effect<ServerProviderDraft> {
  return Effect.gen(function* () {
    const checkedAtTime = yield* DateTime.now;
    const checkedAt = DateTime.formatIso(checkedAtTime);
    const models = antigravityModelsFromSettings(settings.customModels);
    return buildServerProvider({
      presentation: ANTIGRAVITY_PRESENTATION,
      enabled: settings.enabled,
      checkedAt,
      models,
      probe: settings.enabled
        ? {
            installed: true,
            version: null,
            status: "warning",
            auth: { status: "unknown" },
            message: "Checking Antigravity CLI availability...",
          }
        : {
            installed: false,
            version: null,
            status: "warning",
            auth: { status: "unknown" },
            message: "Antigravity is disabled in RUNE settings.",
          },
    });
  });
}

export const checkAntigravityProviderStatus = Effect.fn("checkAntigravityProviderStatus")(
  function* (
    settings: AntigravitySettings,
    environment: NodeJS.ProcessEnv = process.env,
    probeOptions: AntigravityProviderProbeOptions = {},
  ): Effect.fn.Return<ServerProviderDraft, never, ChildProcessSpawner.ChildProcessSpawner> {
    const checkedAtTime = yield* DateTime.now;
    const checkedAt = DateTime.formatIso(checkedAtTime);
    const configuredFallbackModels = antigravityModelsFromSettings(settings.customModels);

    if (!settings.enabled) {
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: false,
        checkedAt,
        models: configuredFallbackModels,
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: "Antigravity is disabled in RUNE settings.",
        },
      });
    }

    const binary = settings.binaryPath?.trim() || "agy";
    const cachedCatalog = readLastKnownGoodCatalog(
      binary,
      DateTime.toEpochMillis(yield* DateTime.now),
    );
    const fallbackModels = cachedCatalog
      ? antigravityModelsFromSettings(settings.customModels, cachedCatalog)
      : configuredFallbackModels;

    const versionResult = yield* runAntigravityCommand(settings, ["--version"], environment).pipe(
      Effect.timeoutOption(VERSION_PROBE_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(versionResult)) {
      const error = versionResult.failure;
      yield* Effect.logWarning("Antigravity CLI health check failed.", { errorTag: error._tag });
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: !isAntigravityCommandMissingCause(error),
          version: null,
          status: "error",
          auth: { status: "unknown" },
          message: isAntigravityCommandMissingCause(error)
            ? settings.binaryPath?.trim()
              ? `Configured Antigravity CLI path '${settings.binaryPath.trim()}' was not found.`
              : "Antigravity CLI (`agy`) is not installed or not on PATH."
            : "Failed to execute the Antigravity CLI health check.",
        },
      });
    }

    if (Option.isNone(versionResult.success)) {
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version: null,
          status: "error",
          auth: { status: "unknown" },
          message: "Antigravity CLI is installed but timed out while running `agy --version`.",
        },
      });
    }

    const versionOutput = versionResult.success.value;
    const version = parseGenericCliVersion(`${versionOutput.stdout}\n${versionOutput.stderr}`);
    if (versionOutput.code !== 0) {
      const detail = `${versionOutput.stdout}\n${versionOutput.stderr}`.trim();
      const authenticated = !authFailureMessage(detail);
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version,
          status: authenticated ? "error" : "warning",
          auth: { status: authenticated ? "unknown" : "unauthenticated" },
          message: authenticated
            ? "Antigravity CLI is installed but failed its version probe."
            : "Antigravity CLI needs authentication. Run `agy` once in a terminal to sign in.",
        },
      });
    }

    const modelsResult = yield* runAntigravityCommand(settings, ["models"], environment).pipe(
      Effect.timeoutOption(probeOptions.modelProbeTimeoutMs ?? MODEL_PROBE_TIMEOUT_MS),
      Effect.result,
    );
    if (Result.isFailure(modelsResult)) {
      yield* Effect.logWarning("Antigravity model discovery failed.", {
        errorTag: modelsResult.failure._tag,
      });
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version,
          status: "warning",
          auth: { status: "unknown" },
          message: cachedCatalog
            ? "Antigravity CLI is installed, but model discovery failed; using the last-known-good model catalog."
            : "Antigravity CLI is installed, but model discovery failed.",
        },
      });
    }

    if (Option.isNone(modelsResult.success)) {
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version,
          status: "warning",
          auth: { status: "unknown" },
          message: cachedCatalog
            ? "Antigravity model discovery timed out; using the last-known-good model catalog."
            : "Antigravity model discovery timed out; using the configured default model until it can be refreshed.",
        },
      });
    }

    const modelsOutput = modelsResult.success.value;
    const combinedOutput = `${modelsOutput.stdout}\n${modelsOutput.stderr}`;
    if (modelsOutput.code !== 0) {
      const needsAuth = authFailureMessage(combinedOutput);
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version,
          status: "warning",
          auth: { status: needsAuth ? "unauthenticated" : "unknown" },
          message: needsAuth
            ? "Antigravity CLI needs authentication. Run `agy` once in a terminal to sign in."
            : "Antigravity CLI is installed, but `agy models` failed.",
        },
      });
    }

    const discoveredModels = parseAntigravityModelList(modelsOutput.stdout);
    const discoveredCatalog =
      discoveredModels.length > 0 ? modelsFromDiscovery(undefined, modelsOutput.stdout) : undefined;
    if (discoveredCatalog) {
      lastKnownGoodCatalogs.set(binary, {
        models: discoveredCatalog,
        checkedAtMs: DateTime.toEpochMillis(checkedAtTime),
      });
    }
    const models = discoveredCatalog
      ? antigravityModelsFromSettings(settings.customModels, discoveredCatalog)
      : fallbackModels;
    const needsAuth = authFailureMessage(combinedOutput);
    return buildServerProvider({
      presentation: ANTIGRAVITY_PRESENTATION,
      enabled: true,
      checkedAt,
      models,
      probe: {
        installed: true,
        version,
        status: discoveredModels.length > 0 ? "ready" : "warning",
        auth: {
          status: needsAuth
            ? "unauthenticated"
            : discoveredModels.length > 0 || cachedCatalog
              ? "authenticated"
              : "unknown",
        },
        ...(needsAuth
          ? {
              message:
                "Antigravity CLI needs authentication. Run `agy` once in a terminal to sign in.",
            }
          : discoveredModels.length === 0
            ? {
                message: cachedCatalog
                  ? "Antigravity CLI returned no usable models; using the last-known-good model catalog."
                  : "Antigravity CLI returned no usable models.",
              }
            : {}),
      },
    });
  },
);

export const enrichAntigravitySnapshot = (input: {
  readonly snapshot: ServerProvider;
  readonly maintenanceCapabilities: ProviderMaintenanceCapabilities;
  readonly enableProviderUpdateChecks?: boolean;
  readonly publishSnapshot: (snapshot: ServerProvider) => Effect.Effect<void>;
  readonly httpClient: HttpClient.HttpClient;
}): Effect.Effect<void> =>
  enrichProviderSnapshotWithVersionAdvisory(input.snapshot, input.maintenanceCapabilities, {
    enableProviderUpdateChecks: input.enableProviderUpdateChecks,
  }).pipe(
    Effect.provideService(HttpClient.HttpClient, input.httpClient),
    Effect.flatMap(input.publishSnapshot),
    Effect.catchCause((cause) =>
      Effect.logWarning("Antigravity version advisory enrichment failed.", { cause }),
    ),
    Effect.asVoid,
  );
