import type {
  ProviderDriverKind,
  ProviderInstanceConfig,
  ProviderInstanceEnvironment,
  ProviderInstanceId,
} from "./providerInstance.ts";
import type {
  ServerProvider,
  ServerProviderAvailability,
  ServerProviderAuthStatus,
} from "./server.ts";

export type ProviderConnectionCategory = "subscription" | "api" | "local" | "remote";

export interface ProviderWorkspaceSummary {
  readonly instanceId: ProviderInstanceId;
  readonly driver: ProviderDriverKind;
  readonly displayName: string;
  readonly category: ProviderConnectionCategory;
  readonly authStatus: ServerProviderAuthStatus | "unknown";
  readonly enabled: boolean;
  readonly availability: ServerProviderAvailability;
  readonly modelCount: number;
  readonly defaultModel: string | null;
  readonly scope: string;
}

function readConfigString(config: unknown, key: string): string | null {
  if (config === null || typeof config !== "object") return null;
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function hasEnvironmentVariable(
  environment: ProviderInstanceEnvironment | undefined,
  names: ReadonlyArray<string>,
): boolean {
  const nameSet = new Set(names);
  return environment?.some((variable) => nameSet.has(variable.name)) ?? false;
}

export function classifyProviderConnection(input: {
  readonly driver: ProviderDriverKind;
  readonly config: unknown;
  readonly environment?: ProviderInstanceEnvironment;
}): ProviderConnectionCategory {
  const driver = String(input.driver).toLowerCase();
  if (
    driver === "openaiapi" ||
    driver === "openai-api" ||
    driver === "openrouter" ||
    driver.includes("api") ||
    readConfigString(input.config, "baseUrl")?.startsWith("https://api.")
  ) {
    return "api";
  }
  if (
    driver.includes("ollama") ||
    driver.includes("lmstudio") ||
    driver.includes("local") ||
    readConfigString(input.config, "baseUrl")?.startsWith("http://localhost") ||
    readConfigString(input.config, "baseUrl")?.startsWith("http://127.0.0.1")
  ) {
    return "local";
  }
  if (
    readConfigString(input.config, "remoteUrl") !== null ||
    readConfigString(input.config, "environmentId") !== null ||
    hasEnvironmentVariable(input.environment, ["RUNE_REMOTE_URL", "T3_REMOTE_URL"])
  ) {
    return "remote";
  }
  return "subscription";
}

function readModelPreferenceString(modelPreferences: unknown): string | null {
  if (modelPreferences === null || typeof modelPreferences !== "object") return null;
  const value = (modelPreferences as Record<string, unknown>).defaultModel;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function buildProviderWorkspaceSummary(input: {
  readonly config: ProviderInstanceConfig & { readonly instanceId?: ProviderInstanceId };
  readonly snapshot?: ServerProvider;
  readonly modelPreferences?: unknown;
}): ProviderWorkspaceSummary {
  const snapshot = input.snapshot;
  const category = classifyProviderConnection({
    driver: input.config.driver,
    config: input.config.config,
    ...(input.config.environment ? { environment: input.config.environment } : {}),
  });
  const models = snapshot?.models ?? [];
  const defaultModel =
    readModelPreferenceString(input.modelPreferences) ??
    models.find((model) => model.isDefault)?.slug ??
    models[0]?.slug ??
    null;
  return {
    instanceId: input.config.instanceId ?? ("unknown" as ProviderInstanceId),
    driver: input.config.driver,
    displayName: input.config.displayName?.trim() || snapshot?.displayName || String(input.config.driver),
    category,
    authStatus: snapshot?.auth.status ?? "unknown",
    enabled: input.config.enabled !== false && (snapshot?.enabled ?? true),
    availability: snapshot?.availability ?? "available",
    modelCount: models.length,
    defaultModel,
    scope:
      readConfigString(input.config.config, "scope") ??
      readConfigString(input.config.config, "environment") ??
      "This device",
  };
}
