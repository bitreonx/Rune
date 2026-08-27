/**
 * Claude "service" classification.
 *
 * A Claude service is a `claudeAgent` provider instance whose environment
 * points Claude Code at an Anthropic-compatible gateway (OpenRouter, or a
 * custom base URL) instead of a first-party Anthropic login — see
 * `buildClaudeServiceEnvironment` for how that environment is written. This
 * module owns the canonical OpenRouter constant and reads managed variables
 * back out of an instance envelope so presentation layers can decide which
 * badge an instance carries. The badge decision itself lives with the other
 * entry projections in `providerInstances.ts`.
 *
 * @module claudeServices
 */
import type { ProviderInstanceConfig } from "@rune/contracts";

import { LOGO_URLS } from "./lib/logoUrls";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

export const OPENROUTER_LOGO_URL = LOGO_URLS.openrouter;

/** Kind of upstream service a `claudeAgent` instance is pointed at. */
export type ClaudeServiceBadgeKind = "openrouter" | "gateway";

function normalizedBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Read the managed service variables off an instance envelope's environment
 * and classify which upstream service it targets. Returns `undefined` when
 * the instance is plain Anthropic (no gateway configuration) or not a Claude
 * driver at all.
 */
export function resolveClaudeInstanceService(
  config: Pick<ProviderInstanceConfig, "driver" | "environment"> | undefined,
): ClaudeServiceBadgeKind | undefined {
  if (!config || String(config.driver) !== "claudeAgent") return undefined;
  const baseUrl =
    config.environment?.find((variable) => variable.name === "ANTHROPIC_BASE_URL")?.value ?? "";
  if (baseUrl.trim().length > 0) {
    return normalizedBaseUrl(baseUrl) === normalizedBaseUrl(OPENROUTER_BASE_URL)
      ? "openrouter"
      : "gateway";
  }
  const hasAuthToken = config.environment?.some(
    (variable) => variable.name === "ANTHROPIC_AUTH_TOKEN",
  );
  return hasAuthToken ? "gateway" : undefined;
}
