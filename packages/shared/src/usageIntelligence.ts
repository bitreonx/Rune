/** Pure range, summary, and diagnostic helpers for the Usage workspace. */
import type { UsageSummaryInput } from "@rune/contracts";

import { UsageDay } from "@rune/contracts";
import type { MergedUsage } from "./usageMerge.ts";
import { makeRollingWindow, makeWindow } from "./usageFormat.ts";

export const USAGE_RANGE_OPTIONS = [
  { key: "1h", label: "Past hour" },
  { key: "24h", label: "Past 24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
] as const;

export type UsageRangeKey = (typeof USAGE_RANGE_OPTIONS)[number]["key"];

export function makeUsageRange(key: UsageRangeKey, now = new Date()): UsageSummaryInput {
  switch (key) {
    case "1h":
      return makeRollingWindow(1, now);
    case "24h":
      return makeWindow(1, now, "hour");
    case "7d":
      return makeWindow(7, now);
    case "30d":
      return makeWindow(30, now);
    case "90d":
      return makeWindow(90, now);
  }
}

export interface CustomUsageWindowInput {
  readonly sinceDay: string;
  readonly untilDay: string;
  readonly timeZone: string;
  readonly sinceTime?: string;
  readonly untilTime?: string;
}

export type CustomUsageWindowResult =
  | { readonly valid: true; readonly window: UsageSummaryInput }
  | { readonly valid: false; readonly reason: string };

function parseUsageDay(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayOfMonth = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, dayOfMonth);
  return new Date(timestamp).toISOString().slice(0, 10) === day ? timestamp : null;
}

function isValidTimeZone(timeZone: string): boolean {
  if (timeZone.trim().length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

/** Validates a custom request before it crosses the usage RPC boundary. */
export function validateCustomUsageWindow(input: CustomUsageWindowInput): CustomUsageWindowResult {
  const sinceDayMs = parseUsageDay(input.sinceDay);
  const untilDayMs = parseUsageDay(input.untilDay);
  if (sinceDayMs === null || untilDayMs === null) {
    return { valid: false, reason: "Use valid YYYY-MM-DD start and end dates." };
  }
  if (untilDayMs < sinceDayMs) {
    return { valid: false, reason: "The end date must be on or after the start date." };
  }
  if (!isValidTimeZone(input.timeZone)) {
    return { valid: false, reason: "Use a valid IANA time zone, such as UTC." };
  }

  const hasSinceTime = input.sinceTime !== undefined && input.sinceTime.trim().length > 0;
  const hasUntilTime = input.untilTime !== undefined && input.untilTime.trim().length > 0;
  if (hasSinceTime !== hasUntilTime) {
    return { valid: false, reason: "Provide both custom times or leave both times blank." };
  }

  if (hasSinceTime && hasUntilTime) {
    const sinceTimeMs = Date.parse(input.sinceTime ?? "");
    const untilTimeMs = Date.parse(input.untilTime ?? "");
    const durationMs = untilTimeMs - sinceTimeMs;
    if (!Number.isFinite(sinceTimeMs) || !Number.isFinite(untilTimeMs) || durationMs <= 0) {
      return { valid: false, reason: "The custom end time must be after the start time." };
    }
    if (durationMs > 24 * 60 * 60 * 1_000) {
      return { valid: false, reason: "Hourly custom windows cannot exceed 24 hours." };
    }
    const formatDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: input.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return {
      valid: true,
      window: {
        sinceDay: UsageDay.make(formatDay.format(new Date(sinceTimeMs))),
        untilDay: UsageDay.make(formatDay.format(new Date(untilTimeMs))),
        timeZone: input.timeZone,
        resolution: "hour",
        sinceTime: new Date(sinceTimeMs).toISOString(),
        untilTime: new Date(untilTimeMs).toISOString(),
      },
    };
  }

  return {
    valid: true,
    window: {
      sinceDay: UsageDay.make(input.sinceDay),
      untilDay: UsageDay.make(input.untilDay),
      timeZone: input.timeZone,
      resolution: "day",
    },
  };
}

export interface UsageIntelligenceSummary {
  readonly costUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  /** Distinct assistant responses in the scanned transcripts. */
  readonly requests: number;
  readonly sessions: number;
  readonly cachedInputTokens: number;
  readonly cacheHitRate: number | null;
  /** Not synthesised: RUNE does not currently receive active-time telemetry. */
  readonly activeAgentTimeMinutes: null;
  /** Not synthesised: Mission attribution is not present in usage transcripts. */
  readonly verifiedMissionCount: null;
  readonly tokensPerVerifiedMission: null;
  readonly costPerVerifiedMissionUsd: null;
}

export function deriveUsageIntelligenceSummary(merged: MergedUsage): UsageIntelligenceSummary {
  const inputTokens =
    merged.uncachedInputTokens + merged.cachedInputTokens + merged.cacheCreationTokens;
  return {
    costUsd: merged.costUsd,
    inputTokens,
    outputTokens: merged.outputTokens,
    totalTokens: merged.totalTokens,
    requests: merged.records,
    sessions: merged.sessions,
    cachedInputTokens: merged.cachedInputTokens,
    cacheHitRate: inputTokens === 0 ? null : merged.cachedInputTokens / inputTokens,
    activeAgentTimeMinutes: null,
    verifiedMissionCount: null,
    tokensPerVerifiedMission: null,
    costPerVerifiedMissionUsd: null,
  };
}

export type UsageDiagnosticTone = "positive" | "attention" | "neutral";

export interface UsageDiagnostic {
  readonly id: "cache" | "pricing" | "duplicates" | "retries" | "missions";
  readonly tone: UsageDiagnosticTone;
  readonly title: string;
  readonly detail: string;
}

/** Deterministic explanations of measurable efficiency and known blind spots. */
export function deriveUsageDiagnostics(merged: MergedUsage): readonly UsageDiagnostic[] {
  const diagnostics: UsageDiagnostic[] = [];
  if (merged.costQuality.cacheSavingsUsd > 0) {
    diagnostics.push({
      id: "cache",
      tone: "positive",
      title: "Cache reuse is reducing cost",
      detail: "Provider-reported cached input has measurable savings in this window.",
    });
  } else if (merged.cachedInputTokens > 0) {
    diagnostics.push({
      id: "cache",
      tone: "neutral",
      title: "Cached input is present",
      detail: "The provider reported cached input, but no comparable price savings were available.",
    });
  }
  if (merged.costQuality.unpricedShare > 0) {
    diagnostics.push({
      id: "pricing",
      tone: "attention",
      title: "Some requests are unpriced",
      detail: "Tokens remain included, but model rates were unavailable for part of the window.",
    });
  }
  if (merged.duplicateSources.length > 0) {
    diagnostics.push({
      id: "duplicates",
      tone: "neutral",
      title: "Duplicate transcript sources were collapsed",
      detail: "Shared transcript directories were counted once to prevent inflated totals.",
    });
  }
  diagnostics.push({
    id: "retries",
    tone: "neutral",
    title: "Retries are not reported",
    detail: "This usage source does not expose retry counts, so retry waste is not estimated.",
  });
  diagnostics.push({
    id: "missions",
    tone: "neutral",
    title: "Mission attribution is unavailable",
    detail: "Transcript usage is not currently linked to verified Mission telemetry.",
  });
  return diagnostics;
}

export interface UsageProviderDrilldown {
  readonly provider: MergedUsage["providers"][number]["provider"];
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly records: number;
  readonly models: readonly MergedUsage["models"][number][];
  /** No instance identity crosses the usage contract today. */
  readonly instance: null;
}

/** Provider → model drill-down, preserving the contract's honest granularity. */
export function deriveUsageProviderDrilldown(
  merged: MergedUsage,
): readonly UsageProviderDrilldown[] {
  return merged.providers.map((provider) => ({
    provider: provider.provider,
    costUsd: provider.costUsd,
    totalTokens: provider.totalTokens,
    records: provider.records,
    models: merged.models.filter((model) => model.provider === provider.provider),
    instance: null,
  }));
}
