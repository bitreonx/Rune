import { describe, expect, it } from "vite-plus/test";

import type { MergedUsage, ProviderTotals } from "./usageMerge.ts";
import { deriveUsageCoverage } from "./usageCoverage.ts";

function mergedWith(provider?: ProviderTotals): MergedUsage {
  return {
    costUsd: provider?.costUsd ?? 0,
    uncachedInputTokens: 0,
    cachedInputTokens: 0,
    cacheCreationTokens: 0,
    outputTokens: provider?.totalTokens ?? 0,
    reasoningTokens: 0,
    totalTokens: provider?.totalTokens ?? 0,
    records: provider?.records ?? 0,
    sessions: provider?.sessions ?? 0,
    providers: provider ? [provider] : [],
    models: [],
    daily: [],
    hourly: [],
    costQuality: {
      providerReportedShare: 0,
      modelPricedShare: 0,
      unpricedShare: 0,
      cacheSavingsUsd: 0,
    },
    duplicateSources: [],
    contributingEnvironments: [],
    staleEnvironments: [],
  };
}

const provider = (costUsd: number, totalTokens: number, sessions: number): ProviderTotals => ({
  provider: "antigravity",
  costUsd,
  totalTokens,
  sessions,
  records: sessions,
  costShare: costUsd > 0 ? 1 : 0,
  tokenShare: totalTokens > 0 ? 1 : 0,
});

describe("deriveUsageCoverage", () => {
  it("derives every coverage state from observed totals", () => {
    expect(deriveUsageCoverage(mergedWith(provider(2, 100, 1)), "antigravity").kind).toBe(
      "cost-available",
    );
    expect(deriveUsageCoverage(mergedWith(provider(0, 100, 1)), "antigravity").kind).toBe(
      "token-usage-available",
    );
    expect(deriveUsageCoverage(mergedWith(provider(0, 0, 1)), "antigravity").kind).toBe(
      "session-usage-available",
    );
    expect(deriveUsageCoverage(mergedWith(), "antigravity").kind).toBe("no-telemetry");
  });
});
