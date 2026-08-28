import type { UsageProviderKind } from "@rune/contracts";

import type { MergedUsage } from "./usageMerge.ts";

export type UsageCoverage =
  | {
      readonly kind: "cost-available";
      readonly costUsd: number;
      readonly tokens: number;
      readonly sessions: number;
    }
  | {
      readonly kind: "token-usage-available";
      readonly tokens: number;
      readonly sessions: number;
      readonly costUnavailable: true;
    }
  | {
      readonly kind: "session-usage-available";
      readonly sessions: number;
      readonly tokensUnavailable: true;
      readonly costUnavailable: true;
    }
  | { readonly kind: "no-telemetry"; readonly note: string };

/** Derives honest provider coverage from observed data, never from provider name. */
export function deriveUsageCoverage(
  merged: MergedUsage,
  provider: UsageProviderKind,
): UsageCoverage {
  const totals = merged.providers.find((entry) => entry.provider === provider);
  const costUsd = totals?.costUsd ?? 0;
  const tokens = totals?.totalTokens ?? 0;
  const sessions = totals?.sessions ?? 0;
  if (costUsd > 0 && tokens > 0 && sessions > 0) {
    return { kind: "cost-available", costUsd, tokens, sessions };
  }
  if (tokens > 0 && sessions > 0) {
    return { kind: "token-usage-available", tokens, sessions, costUnavailable: true };
  }
  if (sessions > 0) {
    return {
      kind: "session-usage-available",
      sessions,
      tokensUnavailable: true,
      costUnavailable: true,
    };
  }
  return { kind: "no-telemetry", note: "Usage telemetry unavailable from this integration." };
}
