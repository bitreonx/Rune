import { ProviderDriverKind } from "./providerInstance.ts";

/** First-party API-backed provider drivers shipped by RUNE. */
export const OPENAI_API_DRIVER = ProviderDriverKind.make("openaiApi");
export const OPENROUTER_DRIVER = ProviderDriverKind.make("openrouter");
/** RUNE's provider-neutral native loop uses the OpenAI-compatible API seam. */
export const RUNE_NATIVE_DRIVER = ProviderDriverKind.make("runeNative");

export const API_PROVIDER_DRIVER_KINDS = [
  OPENAI_API_DRIVER,
  OPENROUTER_DRIVER,
  RUNE_NATIVE_DRIVER,
] as const;
export type ApiProviderDriverKind = (typeof API_PROVIDER_DRIVER_KINDS)[number];

export type ApiReasoningMode = "none" | "optional" | "required";

/** Optional protocol features an OpenAI-compatible API instance advertises. */
export interface ApiModelCapabilities {
  readonly parallelToolCalls: boolean;
  readonly strictToolSchemas: boolean;
  readonly reasoningMode: ApiReasoningMode;
  readonly reportsCachedTokens: boolean;
  readonly supportsFim: boolean;
}

export const OPENAI_API_DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export const OPENAI_API_KEY_ENVIRONMENT_VARIABLE = "OPENAI_API_KEY";
export const OPENROUTER_API_KEY_ENVIRONMENT_VARIABLE = "OPENROUTER_API_KEY";

export function apiKeyEnvironmentVariableForDriver(
  driver: ProviderDriverKind | string,
): string | undefined {
  switch (String(driver)) {
    case "openaiApi":
    case "openai-api":
    case "runeNative":
      return OPENAI_API_KEY_ENVIRONMENT_VARIABLE;
    case "openrouter":
      return OPENROUTER_API_KEY_ENVIRONMENT_VARIABLE;
    default:
      return undefined;
  }
}

/**
 * Keep provider URLs canonical at the boundary. Query strings and paths are
 * deliberately preserved so compatible gateways can be used without a
 * second custom-driver path.
 */
export function normalizeApiProviderBaseUrl(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    return url.toString().replace(/\/$/u, "");
  } catch {
    return fallback;
  }
}

export function apiProviderEndpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/u, "")}/${path.replace(/^\//u, "")}`;
}
