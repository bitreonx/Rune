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
import { resolveSpawnCommand } from "@rune/shared/shell";
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
import {
  parseAntigravityModelList,
  type AntigravityModelListEntry,
} from "../antigravityProtocol.ts";

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

function normalizeAntigravityDiscoveredModels(
  discovered: ReadonlyArray<AntigravityModelListEntry>,
): ReadonlyArray<ServerProviderModel> {
  const modelMap = new Map<
    string,
    {
      baseSlug: string;
      baseName: string;
      efforts: Set<string>;
      rawSlugs: string[];
    }
  >();

  for (const item of discovered) {
    const effortMatch = item.slug.match(/^(.*?)-(low|medium|high)$/i);
    const nameEffortMatch = item.name.match(/^(.*?)\s*\((Low|Medium|High)\)$/i);

    const baseSlug = effortMatch?.[1] ?? item.slug;
    const rawCleanName = item.name.replace(/\s*\((Low|Medium|High)\)$/i, "").trim();
    const baseName = nameEffortMatch?.[1]?.trim() ?? (rawCleanName || baseSlug);
    const effort = effortMatch?.[2]?.toLowerCase() ?? nameEffortMatch?.[2]?.toLowerCase();

    const existing = modelMap.get(baseSlug);
    if (existing) {
      if (effort) existing.efforts.add(effort);
      existing.rawSlugs.push(item.slug);
    } else {
      modelMap.set(baseSlug, {
        baseSlug,
        baseName,
        efforts: effort ? new Set([effort]) : new Set(),
        rawSlugs: [item.slug],
      });
    }
  }

  const result: ServerProviderModel[] = [];
  for (const entry of modelMap.values()) {
    const hasEfforts = entry.efforts.size > 0;
    const effortOptions = hasEfforts
      ? Array.from(entry.efforts).map((e) => ({
          value: e,
          label: e.charAt(0).toUpperCase() + e.slice(1),
        }))
      : [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ];

    const capabilities: ModelCapabilities = createModelCapabilities({
      optionDescriptors: [
        buildSelectOptionDescriptor({
          id: "effort",
          label: "Reasoning",
          description: "Antigravity headless effort passed to agy at session start.",
          options: effortOptions,
        }),
      ],
    });

    const isDefault =
      entry.rawSlugs.includes(DEFAULT_ANTIGRAVITY_MODEL) ||
      entry.baseSlug === DEFAULT_ANTIGRAVITY_MODEL ||
      result.length === 0;

    result.push({
      slug: entry.rawSlugs.includes(DEFAULT_ANTIGRAVITY_MODEL)
        ? DEFAULT_ANTIGRAVITY_MODEL
        : (entry.rawSlugs[0] ?? entry.baseSlug),
      name: entry.baseName,
      isCustom: false,
      ...(isDefault ? { isDefault: true } : {}),
      capabilities,
    });
  }

  return result;
}

function modelsFromDiscovery(
  customModels: ReadonlyArray<string> | undefined,
  output: string,
): ReadonlyArray<ServerProviderModel> {
  const discovered = parseAntigravityModelList(output);
  if (discovered.length === 0) {
    return antigravityModelsFromSettings(customModels);
  }

  const builtInModels = normalizeAntigravityDiscoveredModels(discovered);
  return antigravityModelsFromSettings(customModels, builtInModels);
}

function findAntigravityCandidates(binaryPath?: string): string[] {
  const candidates: string[] = [];
  if (binaryPath?.trim()) {
    candidates.push(binaryPath.trim());
  }
  candidates.push("agy");
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      candidates.push(`${localAppData}\\agy\\bin\\agy.exe`);
      candidates.push(`${localAppData}\\Programs\\antigravity\\agy.exe`);
      candidates.push(`${localAppData}\\Programs\\agy\\agy.exe`);
    }
    const userProfile = process.env.USERPROFILE;
    if (userProfile) {
      candidates.push(`${userProfile}\\.antigravity\\bin\\agy.exe`);
      candidates.push(`${userProfile}\\.local\\bin\\agy.exe`);
    }
  } else {
    const home = process.env.HOME;
    if (home) {
      candidates.push(`${home}/.local/bin/agy`);
      candidates.push(`${home}/.antigravity/bin/agy`);
    }
    candidates.push("/usr/local/bin/agy");
    candidates.push("/opt/homebrew/bin/agy");
  }
  return candidates;
}

function runAntigravityCommand(
  settings: AntigravitySettings,
  args: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return Effect.gen(function* () {
    const candidates = findAntigravityCandidates(settings.binaryPath);
    let lastError: unknown;

    for (const candidate of candidates) {
      const spawnResult = yield* resolveSpawnCommand(candidate, [...args], { env: environment }).pipe(
        Effect.result,
      );
      if (Result.isSuccess(spawnResult)) {
        const spawnCommand = spawnResult.success;
        const result = yield* spawnAndCollect(
          candidate,
          ChildProcess.make(spawnCommand.command, spawnCommand.args, {
            env: environment,
            shell: spawnCommand.shell,
            stdin: "ignore",
          }),
        ).pipe(Effect.result);

        if (Result.isSuccess(result)) {
          return result.success;
        }
        lastError = result.failure;
      } else {
        lastError = spawnResult.failure;
      }
    }

    return yield* Effect.fail(lastError as never);
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
            message: "Antigravity is disabled in RUNE settings.",
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
          message: "Antigravity is disabled in RUNE settings.",
        },
      });
    }

    const versionResult = yield* runAntigravityCommand(settings, ["--version"], environment).pipe(
      Effect.timeoutOption(VERSION_PROBE_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(versionResult)) {
      const error = versionResult.failure as unknown as { readonly _tag?: string };
      yield* Effect.logWarning("Antigravity CLI health check failed.", { errorTag: error._tag });
      return buildServerProvider({
        presentation: ANTIGRAVITY_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: !isCommandMissingCause(versionResult.failure as any),
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
      const error = modelsResult.failure as unknown as { readonly _tag?: string };
      yield* Effect.logWarning("Antigravity model discovery failed.", {
        errorTag: error._tag,
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
