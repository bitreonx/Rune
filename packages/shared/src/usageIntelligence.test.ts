// @effect-diagnostics globalDate:off -- range tests use fixed instants.
import { describe, expect, it } from "vite-plus/test";

import { USAGE_CONTRACT_VERSION } from "@rune/contracts";
import { mergeUsage } from "./usageMerge.ts";
import {
  deriveUsageDiagnostics,
  deriveUsageIntelligenceSummary,
  deriveUsageProviderDrilldown,
  makeUsageRange,
  validateCustomUsageWindow,
} from "./usageIntelligence.ts";

describe("usage intelligence ranges", () => {
  const now = new Date("2026-08-11T12:37:42.123Z");

  it("builds a one-hour and 24-hour exact request", () => {
    const hour = makeUsageRange("1h", now);
    const day = makeUsageRange("24h", now);

    expect(hour.resolution).toBe("hour");
    expect(hour.sinceTime).toBe("2026-08-11T11:37:00.000Z");
    expect(hour.untilTime).toBe("2026-08-11T12:37:00.000Z");
    expect(day.sinceTime).toBe("2026-08-10T12:37:00.000Z");
    expect(day.untilTime).toBe("2026-08-11T12:37:00.000Z");
  });

  it("accepts calendar custom windows and rejects invalid zones or order", () => {
    expect(
      validateCustomUsageWindow({
        sinceDay: "2026-08-01",
        untilDay: "2026-08-11",
        timeZone: "UTC",
      }),
    ).toEqual({
      valid: true,
      window: {
        sinceDay: "2026-08-01",
        untilDay: "2026-08-11",
        timeZone: "UTC",
        resolution: "day",
      },
    });
    expect(
      validateCustomUsageWindow({
        sinceDay: "2026-08-12",
        untilDay: "2026-08-11",
        timeZone: "UTC",
      }).valid,
    ).toBe(false);
    expect(
      validateCustomUsageWindow({
        sinceDay: "2026-08-01",
        untilDay: "2026-08-11",
        timeZone: "Mars/Base",
      }).valid,
    ).toBe(false);
  });

  it("accepts exact custom times only within the server's hourly limit", () => {
    const result = validateCustomUsageWindow({
      sinceDay: "2026-08-11",
      untilDay: "2026-08-11",
      timeZone: "UTC",
      sinceTime: "2026-08-11T11:37:00.000Z",
      untilTime: "2026-08-11T12:37:00.000Z",
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.window.resolution).toBe("hour");
      expect(result.window.sinceDay).toBe("2026-08-11");
    }
    expect(
      validateCustomUsageWindow({
        sinceDay: "2026-08-10",
        untilDay: "2026-08-11",
        timeZone: "UTC",
        sinceTime: "2026-08-10T00:00:00.000Z",
        untilTime: "2026-08-11T00:01:00.000Z",
      }).valid,
    ).toBe(false);
  });
});

describe("usage intelligence summaries", () => {
  it("derives cache rate and preserves unsupported telemetry as null", () => {
    const merged = {
      ...mergeUsage([], USAGE_CONTRACT_VERSION),
      uncachedInputTokens: 60,
      cachedInputTokens: 30,
      cacheCreationTokens: 10,
      outputTokens: 50,
      totalTokens: 150,
      records: 3,
      sessions: 1,
    };
    const summary = deriveUsageIntelligenceSummary(merged);
    expect(summary.inputTokens).toBe(100);
    expect(summary.cacheHitRate).toBe(0.3);
    expect(summary.requests).toBe(3);
    expect(summary.activeAgentTimeMinutes).toBeNull();
    expect(summary.verifiedMissionCount).toBeNull();
  });

  it("always explains retry and Mission coverage without inventing measurements", () => {
    const merged = mergeUsage([], USAGE_CONTRACT_VERSION);
    const diagnostics = deriveUsageDiagnostics(merged);
    expect(diagnostics.find((entry) => entry.id === "retries")?.detail).toContain("not expose");
    expect(diagnostics.find((entry) => entry.id === "missions")?.detail).toContain("not currently");
    expect(deriveUsageProviderDrilldown(merged)).toEqual([]);
  });
});
