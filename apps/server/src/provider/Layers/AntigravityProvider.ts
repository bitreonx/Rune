import {
  type AntigravitySettings,
  type ModelCapabilities,
  type ServerProvider,
  type ServerProviderModel,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { HttpClient } from "effect/unstable/http";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { createModelCapabilities } from "@t3tools/shared/model";
import { resolveSpawnCommand } from "@t3tools/shared/shell";
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
const MODEL_PROBE_TIMEOUT_MS = 15_000;

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

function runAntigravityCommand(
  settings: AntigravitySettings,
  args: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return Effect.gen(function* () {
    const binary = settings.binaryPath || "agy";
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
    const checkedAt = DateTime.formatIso(yield* DateTime.now);
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
            message: "Antigravity is disabled in T3 Code settings.",
          },
    });
  });
}

export const checkAntigravityProviderStatus = Effect.fn("checkAntigravityProviderStatus")(
  function* (
    settings: AntigravitySettings,
    environment: NodeJS.ProcessEnv = process.env,
  ): Effect.fn.Return<ServerProviderDraft, never, ChildProcessSpawner.ChildProcessSpawner> {
    const checkedAt = DateTime.formatIso(yield* DateTime.now);
    const fallbackModels = antigravityModelsFromSettings(settings.customModels);

    if (!settings.enabled) {
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: false,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: "Antigravity is disabled in T3 Code settings.",
        },
      });
    }

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
          installed: !isCommandMissingCause(error),
          version: null,
          status: "error",
          auth: { status: "unknown" },
          message: isCommandMissingCause(error)
            ? "Antigravity CLI (`agy`) is not installed or not on PATH."
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
      Effect.timeoutOption(MODEL_PROBE_TIMEOUT_MS),
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
          message: "Antigravity CLI is installed, but model discovery failed.",
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
          message: `Antigravity model discovery timed out after ${MODEL_PROBE_TIMEOUT_MS}ms.`,
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
    const models =
      discoveredModels.length > 0
        ? modelsFromDiscovery(settings.customModels, modelsOutput.stdout)
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
            : discoveredModels.length > 0
              ? "authenticated"
              : "unknown",
        },
        ...(needsAuth
          ? {
              message:
                "Antigravity CLI needs authentication. Run `agy` once in a terminal to sign in.",
            }
          : discoveredModels.length === 0
            ? { message: "Antigravity CLI returned no usable models." }
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
