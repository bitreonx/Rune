import * as Schema from "effect/Schema";
import { apiKeyEnvironmentVariableForDriver, normalizeApiProviderBaseUrl } from "./apiProvider.ts";
import { NonNegativeInt, TrimmedNonEmptyString } from "./baseSchemas.ts";
import {
  defaultInstanceIdForDriver,
  ProviderDriverKind,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironment,
  ProviderInstanceId,
} from "./providerInstance.ts";
import {
  type ServerProvider,
  ServerProviderAuthStatus,
  ServerProviderAvailability,
} from "./server.ts";

export const ProviderConnectionCategory = Schema.Literals([
  "subscription",
  "api",
  "local",
  "remote",
]);
export type ProviderConnectionCategory = typeof ProviderConnectionCategory.Type;

/**
 * Minimal safe presentation contract for a configured provider instance.
 *
 * This deliberately excludes the opaque instance config and environment
 * variables. Consumers receive only the derived connection state they need
 * to render a provider workspace.
 */
export const ProviderWorkspaceSummary = Schema.Struct({
  instanceId: ProviderInstanceId,
  driver: ProviderDriverKind,
  displayName: TrimmedNonEmptyString,
  category: ProviderConnectionCategory,
  authStatus: ServerProviderAuthStatus,
  enabled: Schema.Boolean,
  availability: ServerProviderAvailability,
  modelCount: NonNegativeInt,
  defaultModel: Schema.NullOr(TrimmedNonEmptyString),
  scope: TrimmedNonEmptyString,
});
export type ProviderWorkspaceSummary = typeof ProviderWorkspaceSummary.Type;

function readConfigString(config: unknown, key: string): string | null {
  if (config === null || typeof config !== "object" || Array.isArray(config)) return null;
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizedEndpoint(config: unknown, key: string): URL | undefined {
  const value = readConfigString(config, key);
  if (!value) return undefined;
  const normalized = normalizeApiProviderBaseUrl(value, "");
  if (!normalized) return undefined;
  return new URL(normalized);
}

export function classifyProviderConnection(input: {
  readonly driver: ProviderDriverKind;
  readonly config: unknown;
  readonly environment?: ProviderInstanceEnvironment;
}): ProviderConnectionCategory {
  // Environment entries can contain credentials. Categories must be stable
  // even when their values are redacted, so use only the driver and the
  // normalized, non-secret configuration endpoint.
  void input.environment;
  if (apiKeyEnvironmentVariableForDriver(input.driver)) {
    return "api";
  }
  const baseUrl = normalizedEndpoint(input.config, "baseUrl");
  if (baseUrl && ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname)) {
    return "local";
  }
  if (normalizedEndpoint(input.config, "remoteUrl")) {
    return "remote";
  }
  if (baseUrl) return "api";
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
    instanceId:
      input.config.instanceId ??
      snapshot?.instanceId ??
      defaultInstanceIdForDriver(input.config.driver),
    driver: input.config.driver,
    displayName:
      input.config.displayName?.trim() || snapshot?.displayName || String(input.config.driver),
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
