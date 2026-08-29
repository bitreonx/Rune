import type { UsageProviderKind } from "@rune/contracts";
import { CheckIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { DailyTotals, HourlyTotals } from "@rune/shared/usageMerge";
import { deriveUsageCoverage } from "@rune/shared/usageCoverage";
import {
  deriveUsageDiagnostics,
  deriveUsageIntelligenceSummary,
  deriveUsageProviderDrilldown,
  makeUsageRange,
  USAGE_RANGE_OPTIONS,
  validateCustomUsageWindow,
  type UsageRangeKey,
} from "@rune/shared/usageIntelligence";

import { isElectron } from "../../env";
import { cn } from "../../lib/utils";
import { useUsage, type EnvironmentUsageStatus } from "../../state/usage";
import {
  enumerateDays,
  enumerateHourStarts,
  formatCount,
  formatDateTimeShort,
  formatDayShort,
  formatHourShort,
  formatPercent,
  formatTokens,
  formatUsd,
} from "@rune/shared/usageFormat";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SidebarInset } from "../ui/sidebar";
import { Toggle, ToggleGroup } from "../ui/toggle-group";
import {
  WorkspaceBreadcrumb,
  WorkspaceBreadcrumbItem,
  WorkspaceBreadcrumbSeparator,
} from "../WorkspaceBreadcrumb";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { UsageProviderChart, type UsageChartMetric } from "./UsageProviderChart";
import { PROVIDER_ORDER, PROVIDER_PRESENTATION, providersWithUsage } from "./usageProviders";

type UsageSelectionKey = UsageRangeKey | "custom";

const DEFAULT_USAGE_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function daysForRange(key: UsageRangeKey): number {
  switch (key) {
    case "1h":
    case "24h":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

export function UsagePage() {
  const [windowSelection, setWindowSelection] = useState(() => ({
    range: "30d" as UsageSelectionKey,
    days: 30,
    window: makeUsageRange("30d"),
  }));
  const [metric, setMetric] = useState<UsageChartMetric>("cost");
  const [breakdown, setBreakdown] = useState<"model" | "time">("model");
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    sinceDay: "",
    untilDay: "",
    timeZone: DEFAULT_USAGE_TIME_ZONE,
  });
  const [customError, setCustomError] = useState<string | null>(null);
  const { days: windowDays, window } = windowSelection;
  const rangeKey: UsageSelectionKey =
    windowSelection.range ?? (windowDays === 1 ? "24h" : (`${windowDays}d` as UsageSelectionKey));
  const isHourly = window.resolution === "hour";
  const { merged, environments, isPending, isPartial, refresh } = useUsage(window);

  // Hold the content until every environment is terminal. Rendering merged
  // totals while devices are still answering makes every number on the page
  // jump as each one lands.
  const settling = isPending || isPartial;

  const days = useMemo(
    () => enumerateDays(window.sinceDay, window.untilDay),
    [window.sinceDay, window.untilDay],
  );
  const hours = useMemo(
    () =>
      window.sinceTime === undefined || window.untilTime === undefined
        ? []
        : enumerateHourStarts(window.sinceTime, window.untilTime),
    [window.sinceTime, window.untilTime],
  );
  // Newest first: the window can run 90 periods, so the interesting end
  // belongs at the top of the table.
  const breakdownPeriods = useMemo<readonly (DailyTotals | HourlyTotals)[]>(
    () => (isHourly ? merged.hourly : merged.daily).toReversed(),
    [isHourly, merged.daily, merged.hourly],
  );
  const activeProviders = useMemo(() => providersWithUsage(merged.providers), [merged.providers]);
  const coverageNotices = useMemo(
    () =>
      activeProviders.flatMap((provider) => {
        const coverage = deriveUsageCoverage(merged, provider);
        if (coverage.kind === "cost-available") return [];
        return [{ provider, coverage }];
      }),
    [activeProviders, merged],
  );
  const timeValueColumnWidth = `${60 / (activeProviders.length + 2)}%`;
  const intelligenceSummary = useMemo(() => deriveUsageIntelligenceSummary(merged), [merged]);
  const diagnostics = useMemo(() => deriveUsageDiagnostics(merged), [merged]);
  const providerDrilldown = useMemo(() => deriveUsageProviderDrilldown(merged), [merged]);

  const selectRange = (key: UsageRangeKey) => {
    setWindowSelection({
      range: key,
      days: daysForRange(key),
      window: makeUsageRange(key),
    });
    setCustomOpen(false);
    setCustomError(null);
  };
  const refreshWindow = () => {
    if (rangeKey === "custom") {
      refresh();
      return;
    }
    const nextWindow = makeUsageRange(rangeKey);
    if (
      nextWindow.sinceDay === window.sinceDay &&
      nextWindow.untilDay === window.untilDay &&
      nextWindow.timeZone === window.timeZone &&
      nextWindow.resolution === window.resolution &&
      nextWindow.sinceTime === window.sinceTime &&
      nextWindow.untilTime === window.untilTime
    ) {
      refresh();
    } else {
      setWindowSelection({ range: rangeKey, days: windowDays, window: nextWindow });
    }
  };
  const applyCustomWindow = () => {
    const result = validateCustomUsageWindow(customDraft);
    if (!result.valid) {
      setCustomError(result.reason);
      return;
    }
    setWindowSelection({ range: "custom", days: 0, window: result.window });
    setCustomError(null);
    setCustomOpen(false);
  };
  const windowLabel =
    isHourly && window.sinceTime !== undefined && window.untilTime !== undefined
      ? `${formatDateTimeShort(window.sinceTime, window.timeZone)} to ${formatDateTimeShort(window.untilTime, window.timeZone)}`
      : `${formatDayShort(window.sinceDay)} to ${formatDayShort(window.untilDay)}`;
  const topbarContent = (
    <div className="flex w-full min-w-0 items-center gap-3">
      <WorkspaceBreadcrumb ariaLabel="Usage breadcrumb" className="min-w-0">
        <WorkspaceBreadcrumbItem current>
          <h1>Usage</h1>
        </WorkspaceBreadcrumbItem>
        <WorkspaceBreadcrumbSeparator className="hidden md:flex" />
        <WorkspaceBreadcrumbItem className="hidden min-w-0 shrink md:flex">
          <span className="truncate">{windowLabel}</span>
        </WorkspaceBreadcrumbItem>
      </WorkspaceBreadcrumb>
      <div className="ms-auto hidden min-w-0 items-center justify-end gap-2 lg:flex">
        <ToggleGroup
          aria-label="Usage metric"
          variant="segmented"
          value={[metric]}
          onValueChange={(next) => {
            const value = next[0];
            if (value === "cost" || value === "tokens") setMetric(value);
          }}
        >
          {(["cost", "tokens"] as const).map((option) => (
            <Toggle key={option} value={option}>
              {option === "cost" ? "Cost" : "Tokens"}
            </Toggle>
          ))}
        </ToggleGroup>
        <ToggleGroup
          aria-label="Usage period"
          variant="segmented"
          value={rangeKey === "custom" ? [] : [rangeKey]}
          onValueChange={(next) => {
            const value = next[0];
            if (USAGE_RANGE_OPTIONS.some((option) => option.key === value)) {
              selectRange(value as UsageRangeKey);
            }
          }}
        >
          {USAGE_RANGE_OPTIONS.map((option) => (
            <Toggle key={option.key} value={option.key}>
              {option.label}
            </Toggle>
          ))}
        </ToggleGroup>
        <Button
          onClick={() => setCustomOpen((open) => !open)}
          aria-label="Choose a custom usage range"
          variant={rangeKey === "custom" || customOpen ? "secondary" : "ghost"}
          size="sm"
        >
          Custom
        </Button>
        <Button onClick={refreshWindow} aria-label="Refresh usage" size="icon-sm" variant="ghost">
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>
      <div className="ms-auto flex min-w-0 items-center justify-end gap-1 lg:hidden">
        <Select
          value={metric}
          onValueChange={(value) => {
            if (value === "cost" || value === "tokens") setMetric(value);
          }}
        >
          <SelectTrigger
            aria-label="Usage metric"
            size="compact"
            variant="ghost"
            className="w-auto min-w-0"
          >
            <SelectValue>{metric === "cost" ? "Cost" : "Tokens"}</SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            <SelectItem value="cost">Cost</SelectItem>
            <SelectItem value="tokens">Tokens</SelectItem>
          </SelectPopup>
        </Select>
        <Select
          value={rangeKey}
          onValueChange={(value) => {
            if (value === "custom") {
              setCustomOpen(true);
            } else if (USAGE_RANGE_OPTIONS.some((option) => option.key === value)) {
              selectRange(value as UsageRangeKey);
            }
          }}
        >
          <SelectTrigger
            aria-label="Usage period"
            size="compact"
            variant="ghost"
            className="w-auto min-w-0"
          >
            <SelectValue>
              {rangeKey === "custom"
                ? "Custom"
                : USAGE_RANGE_OPTIONS.find((option) => option.key === rangeKey)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            {USAGE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom…</SelectItem>
          </SelectPopup>
        </Select>
        <Button onClick={refreshWindow} aria-label="Refresh usage" size="icon-sm" variant="ghost">
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground isolate">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        <WorkspacePageHeader electron={isElectron}>{topbarContent}</WorkspacePageHeader>

        {customOpen ? (
          <div className="border-b border-border/70 bg-card/30 px-4 py-3 md:px-6">
            <form
              className="mx-auto flex max-w-5xl flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                applyCustomWindow();
              }}
            >
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Start date
                <input
                  type="date"
                  value={customDraft.sinceDay}
                  onChange={(event) =>
                    setCustomDraft((draft) => ({ ...draft, sinceDay: event.target.value }))
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                End date
                <input
                  type="date"
                  value={customDraft.untilDay}
                  onChange={(event) =>
                    setCustomDraft((draft) => ({ ...draft, untilDay: event.target.value }))
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
                  required
                />
              </label>
              <label className="flex min-w-40 flex-col gap-1 text-xs text-muted-foreground">
                Time zone
                <input
                  value={customDraft.timeZone}
                  onChange={(event) =>
                    setCustomDraft((draft) => ({ ...draft, timeZone: event.target.value }))
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
                  placeholder="UTC"
                  required
                />
              </label>
              <Button type="submit" size="sm">
                Apply range
              </Button>
              {customError ? <span className="text-xs text-destructive">{customError}</span> : null}
            </form>
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1">
          <WorkspacePageContainer width="wide">
            {settling ? (
              <>
                {environments.length > 1 ? <UsageDeviceStrip environments={environments} /> : null}
                <UsageSkeleton />
              </>
            ) : (
              <>
                <UsageCoverageNotice
                  environments={environments}
                  duplicateSources={merged.duplicateSources}
                  staleEnvironments={merged.staleEnvironments}
                />

                <section className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                  <div className="flex min-w-0 flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-4xl font-semibold text-foreground tabular-nums">
                        {metric === "cost"
                          ? formatUsd(merged.costUsd)
                          : formatTokens(merged.totalTokens)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {metric === "cost"
                          ? `${formatCount(merged.sessions)} sessions · API estimate`
                          : `${formatCount(merged.sessions)} sessions`}
                      </span>
                    </div>

                    {activeProviders.map((provider) => {
                      const totals = merged.providers.find((entry) => entry.provider === provider);
                      const share =
                        metric === "cost" ? (totals?.costShare ?? 0) : (totals?.tokenShare ?? 0);
                      const providerSessions = totals?.sessions ?? 0;
                      const sessionLabel = `${formatCount(providerSessions)} ${
                        providerSessions === 1 ? "session" : "sessions"
                      }`;
                      return (
                        <div key={provider} className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                              <span
                                aria-hidden
                                className="size-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: PROVIDER_PRESENTATION[provider].color,
                                }}
                              />
                              <ProviderMark provider={provider} className="size-4" />
                              <span className="flex min-w-0 items-baseline gap-1.5">
                                <span className="truncate">
                                  {PROVIDER_PRESENTATION[provider].label}
                                </span>
                                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                                  {sessionLabel}
                                </span>
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
                              {metric === "cost"
                                ? formatUsd(totals?.costUsd ?? 0)
                                : formatTokens(totals?.totalTokens ?? 0)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {metric === "cost"
                              ? `${formatPercent(share)} of cost · ${formatTokens(totals?.totalTokens ?? 0)} tokens`
                              : `${formatPercent(share)} of tokens · ${formatUsd(totals?.costUsd ?? 0)}`}
                          </span>
                        </div>
                      );
                    })}
                    {coverageNotices.length > 0 ? (
                      <div className="flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        {coverageNotices.map(({ provider, coverage }) => (
                          <span key={provider}>
                            {PROVIDER_PRESENTATION[provider].label}:{" "}
                            {coverage.kind === "token-usage-available"
                              ? "Token totals are tracked; per-call cost is unavailable."
                              : coverage.kind === "session-usage-available"
                                ? "Session count is tracked; token and cost telemetry is unavailable."
                                : coverage.note}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <h2 className="text-sm font-medium text-foreground">
                      {isHourly ? "Hourly" : "Daily"}{" "}
                      {metric === "tokens" ? "processed tokens" : "cost"}
                    </h2>
                    <UsageProviderChart
                      providers={activeProviders}
                      days={days}
                      daily={merged.daily}
                      hours={hours}
                      hourly={merged.hourly}
                      metric={metric}
                      referenceTime={window.untilTime}
                      resolution={isHourly ? "hour" : "day"}
                      timeZone={window.timeZone}
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-medium text-foreground">Intelligence</h2>
                    <span className="text-xs text-muted-foreground">
                      Measured from provider transcript telemetry
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <IntelligenceMetric
                      label="API-equivalent cost"
                      value={formatUsd(intelligenceSummary.costUsd)}
                    />
                    <IntelligenceMetric
                      label="Requests"
                      value={formatCount(intelligenceSummary.requests)}
                    />
                    <IntelligenceMetric
                      label="Input tokens"
                      value={formatTokens(intelligenceSummary.inputTokens)}
                    />
                    <IntelligenceMetric
                      label="Output tokens"
                      value={formatTokens(intelligenceSummary.outputTokens)}
                    />
                    <IntelligenceMetric
                      label="Cache hit"
                      value={
                        intelligenceSummary.cacheHitRate === null
                          ? "Not reported"
                          : formatPercent(intelligenceSummary.cacheHitRate)
                      }
                    />
                    <IntelligenceMetric label="Active agent time" value="Not reported" />
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-medium text-foreground">Efficiency signals</h2>
                    <span className="text-xs text-muted-foreground">
                      Deterministic, no inferred scores
                    </span>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {diagnostics.map((diagnostic) => (
                      <div
                        key={diagnostic.id}
                        className={cn(
                          "border px-3 py-2",
                          diagnostic.tone === "positive"
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : diagnostic.tone === "attention"
                              ? "border-amber-500/40 bg-amber-500/5"
                              : "border-border/70 bg-card/20",
                        )}
                      >
                        <div className="text-xs font-medium text-foreground">
                          {diagnostic.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {diagnostic.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium text-foreground">Totals</h2>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-1 md:grid-cols-5">
                    <Metric label="Processed tokens" value={formatTokens(merged.totalTokens)} />
                    <Metric label="Cached input" value={formatTokens(merged.cachedInputTokens)} />
                    <Metric
                      label="Uncached input"
                      value={formatTokens(merged.uncachedInputTokens)}
                    />
                    <Metric label="Output" value={formatTokens(merged.outputTokens)} />
                    <Metric
                      label="Cache savings"
                      value={formatUsd(merged.costQuality.cacheSavingsUsd)}
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-medium text-foreground">Breakdown</h2>
                    <ToggleGroup
                      aria-label="Usage breakdown"
                      variant="segmented"
                      value={[breakdown]}
                      onValueChange={(next) => {
                        const value = next[0];
                        if (value === "model" || value === "time") setBreakdown(value);
                      }}
                    >
                      {(
                        [
                          { value: "model", label: "Model" },
                          { value: "time", label: isHourly ? "Hour" : "Day" },
                        ] as const
                      ).map((option) => (
                        <Toggle key={option.value} value={option.value}>
                          {option.label}
                        </Toggle>
                      ))}
                    </ToggleGroup>
                  </div>

                  {breakdown === "model" ? (
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col className="w-2/5" />
                        <col className="w-1/5" />
                        <col className="w-1/5" />
                        <col className="w-1/5" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-2 font-normal">Model</th>
                          <th className="py-2 text-right font-normal">Cost</th>
                          <th className="py-2 text-right font-normal">Share</th>
                          <th className="py-2 text-right font-normal">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providerDrilldown.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-muted-foreground">
                              No activity in this window.
                            </td>
                          </tr>
                        ) : (
                          providerDrilldown.flatMap((provider) =>
                            provider.models.map((model) => (
                              <tr
                                key={`${model.provider}:${model.model}`}
                                className="border-b border-border/50 transition-colors hover:bg-muted/50"
                              >
                                <td className="py-2 text-foreground">
                                  <span className="flex items-center gap-2">
                                    <ProviderMark provider={model.provider} className="size-3.5" />
                                    {model.model}
                                  </span>
                                </td>
                                <td className="py-2 text-right text-foreground tabular-nums">
                                  {formatUsd(model.costUsd)}
                                </td>
                                <td className="py-2 text-right text-muted-foreground tabular-nums">
                                  {formatPercent(model.costShare)}
                                </td>
                                <td className="py-2 text-right text-muted-foreground tabular-nums">
                                  {formatTokens(model.totalTokens)}
                                </td>
                              </tr>
                            )),
                          )
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col className="w-2/5" />
                        {activeProviders.map((provider) => (
                          <col key={provider} style={{ width: timeValueColumnWidth }} />
                        ))}
                        <col style={{ width: timeValueColumnWidth }} />
                        <col style={{ width: timeValueColumnWidth }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-2 font-normal">{isHourly ? "Hour" : "Day"}</th>
                          {activeProviders.map((provider) => (
                            <th key={provider} className="py-2 text-right font-normal">
                              {PROVIDER_PRESENTATION[provider].label}
                            </th>
                          ))}
                          <th className="py-2 text-right font-normal">Total</th>
                          <th className="py-2 text-right font-normal">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdownPeriods.length === 0 ? (
                          <tr>
                            <td
                              colSpan={activeProviders.length + 3}
                              className="py-6 text-center text-muted-foreground"
                            >
                              No activity in this window.
                            </td>
                          </tr>
                        ) : (
                          breakdownPeriods.map((period) => (
                            <tr
                              key={"hourStart" in period ? period.hourStart : period.day}
                              className="border-b border-border/50 transition-colors hover:bg-muted/50"
                            >
                              <td className="py-2 text-foreground">
                                {"hourStart" in period
                                  ? formatHourShort(period.hourStart, window.timeZone)
                                  : formatDayShort(period.day)}
                              </td>
                              {activeProviders.map((provider) => (
                                <td
                                  key={provider}
                                  className="py-2 text-right text-muted-foreground tabular-nums"
                                >
                                  {formatUsd(period.byProvider.get(provider)?.costUsd ?? 0)}
                                </td>
                              ))}
                              <td className="py-2 text-right text-foreground tabular-nums">
                                {formatUsd(period.costUsd)}
                              </td>
                              <td className="py-2 text-right text-muted-foreground tabular-nums">
                                {formatTokens(period.totalTokens)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </section>
              </>
            )}
          </WorkspacePageContainer>
        </ScrollArea>
      </div>
    </SidebarInset>
  );
}

/** Brand mark for the harness a row belongs to. */
function ProviderMark({
  provider,
  className,
}: {
  readonly provider: UsageProviderKind;
  readonly className: string;
}) {
  const Mark = PROVIDER_PRESENTATION[provider].mark;
  return <Mark className={cn("shrink-0", className)} aria-hidden />;
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function IntelligenceMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border/70 bg-card/20 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-medium text-foreground tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Says plainly when the totals are incomplete: an environment that failed, or
 * one whose transcripts another environment already reported. Environments
 * that are still answering never reach this notice; the page shows the
 * loading skeleton until every one is terminal.
 */
function UsageCoverageNotice({
  environments,
  duplicateSources,
  staleEnvironments,
}: {
  readonly environments: readonly EnvironmentUsageStatus[];
  readonly duplicateSources: readonly string[];
  readonly staleEnvironments: readonly string[];
}) {
  const failed = environments.filter((environment) => environment.error !== null);
  const stale = environments.filter((environment) =>
    staleEnvironments.includes(environment.environmentId),
  );
  if (failed.length === 0 && stale.length === 0 && duplicateSources.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 border border-border px-3 py-2 text-xs text-muted-foreground">
      {failed.map((environment) => (
        <span key={environment.label}>{environment.label} could not report usage.</span>
      ))}
      {stale.map((environment) => (
        <span key={environment.label}>
          {environment.label} runs an older server version and is excluded from totals.
        </span>
      ))}
      {duplicateSources.length > 0 ? (
        <span>
          Counted once across environments sharing a transcript directory:{" "}
          {duplicateSources.join(", ")}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Per-device progress while the page waits for every environment to answer.
 * Only rendered with two or more devices; a lone device has nothing to
 * enumerate.
 */
function UsageDeviceStrip({
  environments,
}: {
  readonly environments: readonly EnvironmentUsageStatus[];
}) {
  const scanning = environments.filter(
    (environment) => environment.summary === null && environment.error === null,
  );
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border border-border px-3 py-2 text-xs">
      {environments.map((environment) => {
        if (environment.summary !== null) {
          return (
            <span
              key={environment.environmentId}
              className="flex items-center gap-1 text-foreground"
            >
              <CheckIcon className="size-3 text-emerald-600 dark:text-emerald-300/90" aria-hidden />
              {environment.label}
            </span>
          );
        }
        if (environment.error !== null) {
          return (
            <span
              key={environment.environmentId}
              className="flex items-center gap-1 text-destructive"
            >
              <XIcon className="size-3" aria-hidden />
              {environment.label}
            </span>
          );
        }
        return (
          <span key={environment.environmentId} className="text-muted-foreground">
            {environment.label}…
          </span>
        );
      })}
      <span className="ms-auto text-muted-foreground">
        {scanning.length === 1
          ? "1 device still scanning"
          : `${scanning.length} devices still scanning`}
      </span>
    </div>
  );
}

/**
 * Static stand-in with the loaded page's shape. No shimmer; blocks fill in
 * exactly once when the last device answers.
 */
function UsageSkeleton() {
  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="h-10 w-36 rounded-sm bg-muted" />
            <div className="h-4 w-32 rounded-sm bg-muted" />
          </div>
          {PROVIDER_ORDER.map((provider) => (
            <div key={provider} className="flex flex-col gap-1">
              <div className="flex min-h-5 items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PROVIDER_PRESENTATION[provider].color }}
                  />
                  <ProviderMark provider={provider} className="size-4" />
                  <div className="h-3.5 w-20 rounded-sm bg-muted" />
                </span>
                <div className="h-3.5 w-14 rounded-sm bg-muted" />
              </div>
              <div className="h-4 w-36 rounded-sm bg-muted" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="h-5 w-24 rounded-sm bg-muted" />
          <div className="flex flex-col gap-1">
            <div className="ml-16 h-56 rounded-sm bg-muted/35" />
            <div className="ml-16 h-3 rounded-sm bg-muted/35" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">Totals</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-1 md:grid-cols-5">
          {["Processed tokens", "Cached input", "Uncached input", "Output", "Cache savings"].map(
            (label) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="my-0.5 h-4 w-16 rounded-sm bg-muted" />
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}
