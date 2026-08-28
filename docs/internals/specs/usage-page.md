# Usage / Cost — "The Special Page"

> Spec status: **draft, awaiting maintainer review**. Generated from a code review of `apps/web/src/routes/usage.tsx`, `apps/web/src/components/usage/`, `apps/web/src/components/chat/ContextWindowMeter.tsx`, `packages/contracts/src/usage.ts`, `packages/contracts/src/providerRuntime.ts`, `packages/shared/src/usageMerge.ts`, `packages/shared/src/usageFormat.ts`, `apps/server/src/usage/`, `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`, `apps/server/src/provider/Services/ClaudeAdapter.ts`.

## 1. What the page is

A destination for "I want to understand what I spent." Not a billboard. Not a hero with a delta. The page answers three questions:

- How much did I spend, in this window, broken down by provider + model + day?
- Where is the spend concentrated (which project, which thread)?
- Why is the cost what it is (provider-reported vs model-priced vs unpriced)?

The page is honest about missing coverage. If a provider does not report cost, the page says so with a per-provider empty state, not a zero. The current `UsagePage` (`apps/web/src/components/usage/UsagePage.tsx:215-292`) is decorated with a hero comparison, a top-3 sparkline tile row, a 14-day overlay, a period-alignment toggle, a rate card, and a forecast. All of that is rejected. Click-through to the underlying work is the right pattern: a model row opens the chat thread for the most recent run on that model; a time-bucket row opens the chat filtered to that day.

## 2. Principles

- **Three levels of drill-down, no new sections.** The dollar, the project, the thread. They live in the existing Breakdown tables (Model and Time) as click-through rows, not as three new dedicated sections.
- **Live per-turn cost.** Cost is a property of the turn, surfaced where the turn is (composer popover, subagent row, message header), not aggregated into a tile.
- **Honest about provenance.** "API estimate" stays. `CostQualityBadge` renders only when any share > 5% — today's behavior, kept narrow.
- **No decoration.** No top-3 sparkline tiles, no day-over-week comparison, no 14-day hero sparkline, no forecast, no period-alignment toggle, no rate card section. The user can hover a Model row to see the rate; the page does not need a dedicated table.
- **No continuous animations.** Sparklines are gone. The chart hover coalesces through `requestAnimationFrame` so a 240Hz pointer does not cause 240 React renders per second.

## 3. Wire contract changes

### 3.1 `UsageBucket` (packages/contracts/src/usage.ts:82-101)

`UsageBucket` already carries `sessionIds` from the prior spec. Extend it to also carry `projectKeys: string[]` so the client can roll up by either axis without a re-fetch. Both arrays are capped at 100 per cell to bound payload size. The aggregator already has both pieces of data (`apps/server/src/usage/usageAggregation.ts:84-213`).

### 3.2 `UsagePricing` (packages/contracts/src/usage.ts:155-161)

`UsagePricing` currently carries only `status: "fresh" | "cached" | "unavailable"`, `source`, `fetchedAt`, `knownModels`. Add optional `rates: ReadonlyArray<RateEntry>` capped at 200 entries. The rate card section is rejected; the rates themselves are still useful for the row hover (see §6.3).

```ts
type RateEntry = {
  model: string;             // canonical slug
  inputPer1M: number;        // USD
  outputPer1M: number;
  cacheReadPer1M: number;
  cacheCreationPer1M: number;
};
```

### 3.3 `ThreadTokenUsageSnapshot` (packages/contracts/src/providerRuntime.ts:316-333)

Add optional `costUsd?: number` and `cacheSavingsUsd?: number`. The server attaches these at emission time by pricing the snapshot via the new `RateTableService` (§4.1). This is the field the chat surfaces live in the popover and the message chip.

### 3.4 `RuntimeTaskUsage` (packages/contracts/src/providerRuntime.ts:526-535)

Add optional `costUsd?: number`. The subagent row in `AgentsPanel.tsx:170-175` lights up automatically when this is present.

### 3.5 `UsageProviderKind` (packages/contracts/src/usage.ts:26)

Extend from `["claude", "codex"]` to include the runtime-supported providers: `["claude", "codex", "cursor", "grok", "opencode", "antigravity"]`. Where the upstream does not report cost, the page shows an honest empty state — see §7.

### 3.6 Version bump

`USAGE_CONTRACT_VERSION` goes from `4` to `5` (`packages/contracts/src/usage.ts:24`). The version delta belongs on the wire, not buried in a changelog.

## 4. Server changes

### 4.1 `RateTableService` (new — `apps/server/src/usage/RateTableService.ts`)

Hoist the rate table and `priceUsage` from `apps/server/src/usage/usagePricing.ts:118-138` into a shared Effect layer that both `UsageService` and `ProviderRuntimeIngestion` can `yield*`. The current `ensureRates` lives in `UsageService` only (`apps/server/src/usage/UsageService.ts:131-185`); the runtime ingestion path at `ProviderRuntimeIngestion.ts:773-790` cannot see it. A `RateTableService` Effect layer fixes this with one source of truth.

```ts
class RateTableService extends Effect.Service<RateTableService>()("RateTableService", {
  effect: Effect.gen(function* () {
    const rates = yield* ensureRates();      // same as UsageService.ensureRates
    return {
      priceUsage: (model, totals) => priceUsage(rates, model, totals, null),
      cacheSavingsUsd: (model, totals) => cacheSavingsUsd(rates, model, totals),
    };
  }),
}) {}
```

### 4.2 `ProviderRuntimeIngestion` (apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts:251-258, 773-790)

- `buildContextWindowActivityPayload` (lines 251-258, currently gates on `usedTokens > 0`) gains a `priceUsage` call after building the snapshot. Attach `costUsd` and `cacheSavingsUsd` to the `context-window.updated` activity payload.
- The same change applies to `task.progress` / `task.updated` / `task.completed` for `RuntimeTaskUsage` (the typed `usage` is at `packages/contracts/src/providerRuntime.ts:672-710`).
- The `offerRuntimeEvent({ type: "thread.token-usage.updated", ... payload: { usage } })` call site at `apps/server/src/provider/Services/ClaudeAdapter.ts:2110-2149` prices the snapshot before emission.

### 4.3 `usageAggregation.ts` (apps/server/src/usage/usageAggregation.ts:84-213)

Extend the aggregator so each `UsageBucket` carries `sessionIds: string[]` and `projectKeys: string[]`, both capped at 100. The session-to-project resolution is Claude's `<cwd>/.claude/projects/<encoded-cwd>` layout plus the existing fingerprint (`apps/server/src/usage/usageTranscripts.ts:86-137`); Codex already has cwd in `session_meta` (line 152, 162, 290). This is a small refactor, not a new parser.

### 4.4 `UsageService.readSummary` (apps/server/src/usage/UsageService.ts:432-440)

- Include `rates: [...rates.entries()].slice(0, 200).map(toRateEntry)` on the response.
- Do not compute `previousWindow`. The hero no longer needs it; the comparison is rejected.
- Do not compute `projects` / `sessions` rollups. The drill-down lives in the existing Breakdown tables; the dedicated sections are dropped.

### 4.5 `usageTranscripts.ts` (apps/server/src/usage/usageTranscripts.ts:11-298)

- Add a `parseCursorLine` / `parseGrokLine` / `parseOpencodeLine` / `parseAntigravityLine` per provider where the upstream CLI emits anything cost-relevant. Each parser returns the same `UsageRecord` shape (lines 11-23) with `costUSD` populated where available.
- Where the upstream does not report cost, the parser returns `costUSD: null` and the page renders the per-provider empty state (§7.2). Do not coerce null to zero; that is the bug we are fixing.

## 5. Hero block (above the chart) — stripped

`apps/web/src/components/usage/UsagePage.tsx:215-227` becomes:

```
┌──────────────────────────────────────────────────────────────────┐
│  $124.50                                                         │
│  API estimate · 7 days                                           │
│  ✓ 78% priced by provider · 22% from model rates                 │
└──────────────────────────────────────────────────────────────────┘
```

- Total cost (or total tokens, depending on the metric toggle). `formatUsd` (`packages/shared/src/usageFormat.ts:18-20`).
- Sub-line: "API estimate · {window days} days" only. No delta. No percent. No 14-day sparkline. No forecast.
- `CostQualityBadge` (`packages/shared/src/usageMerge.ts:57-62`) renders when any share > 5%; the threshold is the only place the badge earns its keep.
- The metric toggle (Cost / Tokens) and the duration toggle (1 / 7 / 30 / 90 days) at `UsagePage.tsx:35-42` both stay. They are selectors, not decoration.
- The second toggle group (the rejected period-alignment toggle) is removed.

## 6. Existing sections — kept, with click-through

### 6.1 The provider chart (apps/web/src/components/usage/UsageProviderChart.tsx:190-266)

- Keep the chart shape. Drop the comparison overlay (no `previousWindowDaily` prop).
- `onMouseMove` (lines 309-323) coalesces through `requestAnimationFrame`. A 240Hz pointer must not cause 240 React renders per second. This is the only animation-adjacent work on the page.
- **Legend rows are clickable.** A click on a provider's legend entry navigates to `apps/web/src/routes/usage.$filter.tsx` with `provider=<driverKind>`, `sinceDay=<window start>`, `untilDay=<window end>`. The page renders a filtered thread list (§6.2).

### 6.2 The two breakdown tables — click opens a filtered thread list

- Model breakdown (`UsagePage.tsx:337-384`): each row becomes a link. Click → navigates to `apps/web/src/routes/usage.$filter.tsx?model=<slug>&sinceDay=<window start>&untilDay=<window end>`. The new page renders a filtered thread list of every thread that contributed to that model in the window. This is correct behavior when multiple threads share a model — opening the "most recent" one hides the others.
- Time breakdown (`UsagePage.tsx:386-446`): each row becomes a link. Click → same destination with `day=<YYYY-MM-DD>`. The list shows every thread that contributed on that day.
- The filtered thread list reads the same `UsageSummary` from the SWR cache and filters client-side by intersecting `UsageBucket.sessionIds` against the requested model / day / provider filter. Selecting a thread opens `/thread/:id`.
- Both rows use `UsageBucket.sessionIds`, `UsageBucket.projectKeys`, and `UsageBucket.threadTitles` (added in §8) for navigation. The title map is a separate fetch from the project store.
- The new page lives at `apps/web/src/routes/usage.$filter.tsx` (TanStack router file route) and the list component at `apps/web/src/components/usage/UsageFilteredThreadList.tsx`. Mobile renders the same content as a sheet.

### 6.3 Row hover — the rate survives without the card

- A hover (or a long-press on mobile) on a Model row shows `$X / 1M input · $Y / 1M output` from `UsagePricing.rates`. This is a tooltip, not a section. It uses the rates we added to the wire (§3.2) and adds zero new UI surface.

### 6.4 The cost-quality badge (packages/shared/src/usageMerge.ts:57-62)

- Renders when any share (`providerReportedShare` / `modelPricedShare` / `unpricedShare`) > 5%. This is the only place the badge appears on the page; it does not get a tile of its own.

## 7. Provider coverage — honest empty states (dynamic derivation)

### 7.1 Why this is P0

`UsageProviderKind` is closed to `["claude", "codex"]` (`packages/contracts/src/usage.ts:26`). A user on Cursor, Grok, OpenCode, or Antigravity today sees zero cost with no signal that the page is incomplete. This is the worst kind of decoration: a zero that looks like an answer.

The empty-state copy is not hardcoded per provider. It is derived from the actual `MergedUsage` shape at runtime. The page must not claim "token totals are tracked" if `MergedUsage.totalTokens` is zero for that provider in that window.

### 7.2 `UsageCoverage` — the shared derivation

A pure function `deriveUsageCoverage(merged: MergedUsage, provider: UsageProviderKind): UsageCoverage` lives in `packages/shared/src/usageCoverage.ts` (new file). The function returns one of four states:

```ts
type UsageCoverage =
  | { kind: "cost-available"; costUsd: number; tokens: number; sessions: number }
  | { kind: "token-usage-available"; tokens: number; sessions: number; costUnavailable: true }
  | { kind: "session-usage-available"; sessions: number; tokensUnavailable: true; costUnavailable: true }
  | { kind: "no-telemetry"; note: string };
```

The derivation:

- `costUsd > 0` AND `totalTokens > 0` AND `sessions > 0` → `cost-available`.
- `costUsd === 0` AND `totalTokens > 0` AND `sessions > 0` → `token-usage-available`.
- `costUsd === 0` AND `totalTokens === 0` AND `sessions > 0` → `session-usage-available`.
- All three are zero AND no buckets for the provider → `no-telemetry`.

The page renders one of four copy blocks based on this state, per provider in `PROVIDER_PRESENTATION` (`apps/web/src/components/usage/usageProviders.ts:16-27`).

### 7.3 The four copy blocks

| `kind` | Copy |
|---|---|
| `cost-available` | Normal chart + breakdown. The cost quality badge handles provenance. |
| `token-usage-available` | "This integration does not report per-call cost. Token totals are tracked." |
| `session-usage-available` | "This integration does not report per-call cost or token totals. Session count is tracked." |
| `no-telemetry` | "Usage telemetry unavailable from this integration." |

The "Cursor doesn't report per-call cost yet. Token totals are tracked" copy from the prior spec is **only** shown if the runtime actually evaluates to `token-usage-available` for Cursor. If it evaluates to `no-telemetry`, the copy is the `no-telemetry` block, and the "token totals are tracked" claim is dropped. The same rule applies to Grok / OpenCode / Antigravity — the page never asserts data it does not have.

### 7.4 Unit test — `packages/shared/src/usageCoverage.test.ts`

A new test file covers all four states per provider. Test fixtures use `MergedUsage` shapes that match the wire (`packages/contracts/src/usage.ts:155-161`). The test asserts:

- Claude + populated `costUSD` and `totalTokens` → `cost-available`.
- Cursor + zero `costUSD`, non-zero `totalTokens`, non-zero `sessions` → `token-usage-available`.
- Hypothetical provider with sessions but no tokens → `session-usage-available`.
- Empty buckets for a provider → `no-telemetry`.

The function is pure and fully unit-testable; no React, no SWR, no fetch.

`PROVIDER_PRESENTATION` in `apps/web/src/components/usage/usageProviders.ts:16-27` gains an entry per provider — label, color, mark — so the empty state is consistent. The empty state replaces the chart, not a tile.

### 7.5 New-user empty state

A user with no transcripts (no `~/.claude/projects`, no `~/.codex/sessions`) sees a single CTA-shaped empty state: "Connect a CLI to start tracking spend." Not a wall of zero cells.

## 8. Wire schema changes — `UsageBucket` extension

`UsageBucket` (already carries `sessionIds: string[]` from the prior spec, capped at 100 per cell — see `packages/contracts/src/usage.ts:82-101`) gains two more fields:

- `projectKeys: string[]` — capped at 100 per cell, same bound as `sessionIds`. The aggregator already knows the project key for each session (`apps/server/src/usage/usageAggregation.ts:84-213`).
- `threadTitles: Record<sessionId, string>` — capped at 100 entries per cell. The title is a separate fetch from the project store; the aggregator does not duplicate the title. The client resolves the title lazily: if the key is missing from the map, the client fetches the title via the existing session title resolver before rendering the filtered thread list (§6.2).

Both extensions are additive. Old clients ignore the new fields. The schema bump from `4` → `5` (§3.6) covers this.

## 9. Live per-turn cost (the only "hero" we ship)

The page is the destination. The chat is where the cost lives. Three surfaces:

- **`ContextWindowMeter` popover** (`apps/web/src/components/chat/ContextWindowMeter.tsx:81-136`): a single `formatUsd(usage.costUsd)` line next to the existing "Total processed" row. The meter ring stays tokens-only; the popover carries the cost. Requires the `RateTableService` hoist (§4.1).
- **`AgentsPanel` subagent row** (`apps/web/src/components/agents/AgentsPanel.tsx:170-175`): a small "~$X" inline, beside the token count, when `agent.usage.costUsd` is present. No tile. No sparkline.
- **`MessageCard` header** (chat spec): a `$0.0123` chip when the message's `tokenUsage.costUsd` is present.

All three read from the same `costUsd` field added in §3.3 and §3.4.

## 10. Mobile parity

`apps/mobile/src/features/usage/UsageRouteScreen.tsx` mirrors the stripped hero, the chart (with the rejected comparison overlay also removed), the two breakdown tables with the same click-through to the filtered thread list (§6.2), the per-provider empty states derived from `UsageCoverage` (§7.2), and the rate-on-hover. The shared layer (`packages/shared/src/usageFormat.ts`, `usageMerge.ts`, `usageCoverage.ts`) is web/mobile-agnostic. A single mobile PR follows the web one.

## 11. Performance

- `UsageProviderChart.onMouseMove` coalesces through `requestAnimationFrame` (§6.1). This is the only animation-adjacent code on the page.
- Sparklines are removed entirely. No per-cell `Sparkline` memoization is needed because the cells do not exist.
- The 60s SWR window at `apps/web/src/state/usage.ts:60-72` is preserved. `UsageView` (line 60) keeps `refresh`.
- No new intervals on the page.
- The chart re-renders only when its props change identity. No polling-driven prop churn.

## 12. Files in scope

Web: `apps/web/src/routes/usage.tsx`, `apps/web/src/routes/usage.$filter.tsx` (NEW; the filtered thread list page), `apps/web/src/components/usage/UsagePage.tsx`, `UsageProviderChart.tsx`, `usageProviders.ts`, `UsagePage.test.tsx`, `UsageProviderChart.test.ts`, `apps/web/src/components/usage/UsageFilteredThreadList.tsx` (NEW; the filtered list component), `apps/web/src/state/usage.ts`, `apps/web/src/components/chat/ContextWindowMeter.tsx`, `apps/web/src/lib/contextWindow.ts`, `apps/web/src/components/agents/AgentsPanel.tsx`, `apps/web/src/components/chat/MessageCard.tsx` (cross-ref chat spec).

Shared: `packages/contracts/src/usage.ts`, `packages/contracts/src/providerRuntime.ts`, `packages/shared/src/usageMerge.ts`, `packages/shared/src/usageFormat.ts`, `packages/shared/src/usageCoverage.ts` (NEW; the dynamic `UsageCoverage` derivation), `packages/shared/src/usageCoverage.test.ts` (NEW; covers all four `UsageCoverage` states).

Server: `apps/server/src/usage/UsageService.ts`, `usageAggregation.ts`, `usageTranscripts.ts`, `usagePricing.ts`, `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`, `apps/server/src/provider/Services/ClaudeAdapter.ts`. New: `apps/server/src/usage/RateTableService.ts`.

Docs: `docs/user/usage.md` (extend with the per-provider empty states + click-through to filtered thread list).

## 13. PR breakdown

| # | Title | What ships |
|---|---|---|
| 1 | `feat(usage): strip the hero — drop the comparison, sparkline, forecast, period-alignment toggle` | The hero becomes total + quality badge + "API estimate · {days} days". The top-3 sparkline tiles are deleted. The period-alignment toggle is deleted. The rate card is deleted. The forecast is deleted. The cost-quality badge stays. |
| 2 | `feat(usage): click-through from Model + Time rows to the filtered thread list (new page)` | `UsageBucket.sessionIds` + `projectKeys` + `threadTitles` on the wire (§8). The Model + Time rows + provider chart legend navigate to `apps/web/src/routes/usage.$filter.tsx`, which renders a filtered thread list scoped to model / day / provider. The list is paginated above 1000 threads, inlined below 10. |
| 3 | `feat(usage): RateTableService hoist + costUsd on ThreadTokenUsageSnapshot + RuntimeTaskUsage` | The new `RateTableService`. The wire schema bump. The ingestion path attaches `costUsd`. |
| 4 | `feat(usage): live per-turn cost in the meter popover + subagent row + message header` | The chat surfaces the new field. The popover + the row + the message chip. |
| 5 | `feat(usage): extend provider coverage to cursor/grok/opencode/antigravity` | `UsageProviderKind` extension + transcript parsers + `PROVIDER_PRESENTATION` entries. |
| 6 | `perf(usage): rAF coalesce the chart hover` | `onMouseMove` throttling. |
| 7 | `feat(usage): honest per-provider empty state` | A new user on Cursor sees the empty state matching the runtime-derived `UsageCoverage` (§7.2), not a hardcoded "no per-call cost yet" line. |
| 8 | `feat(usage): dynamic per-provider coverage derivation` | The `UsageCoverage` shared function in `packages/shared/src/usageCoverage.ts` + the four-state render. The page asserts only what the wire data actually supports. |

Each PR is small and reversible. PR 1 is a deletion-only PR; PR 3 is the only wire-schema-touching PR; PR 5 unblocks PR 7.

## 14. Severity-1 findings

- `UsageBucket` has `sessionIds` but no `projectKeys` / `threadTitles` — PR 2.
- `ThreadTokenUsageSnapshot` has no `costUsd` — PR 3.
- `RuntimeTaskUsage` has no `costUsd` — PR 3.
- `UsageProviderKind` is closed to `["claude", "codex"]` — PR 5.
- `UsagePricing` only carries `status` / `source` / `fetchedAt` / `knownModels` — PR 3.
- The hero is decoration (top-3 sparkline tiles, comparison, forecast, period-alignment) — PR 1.
- The chart hover is unthrottled — PR 6.
- Cursor / Grok / OpenCode / Antigravity show zero cost with no signal — PR 5.
- Hardcoded "Cursor doesn't report per-call cost yet" copy can lie. Derive coverage from the wire shape (`UsageCoverage` shared function, §7.2); only claim what the data actually supports — PR 8.
- Click on a model row opens the most recent thread — wrong when multiple threads contributed. Open a filtered thread list scoped to the click target — PR 2.

## 15. Open questions

- `cacheSavingsUsd` on the snapshot: include it on the wire, or fold it into the headline cost? Recommend include; the popover shows both lines.
- The rate table on the wire: cap at 200 entries (current proposal). Tight enough for a 90-day window across all providers?
- Period-alignment: the maintainer rejected the toggle. A "this month" shortcut that snaps to a calendar month may be requested as a follow-up. Hold; not in MVS.
- Per-project section: the maintainer dropped it from MVS. The drill-down folds into the existing tables via `projectKeys`. A dedicated section may be a follow-up after the click-through lands.
- The filtered thread list reuses the `UsageSummary` SWR cache. If the user clicks a model, the page navigates with the filter in the URL; the SWR cache may be stale beyond the 60s window. Acceptable for MVS; a server-side filtered endpoint is a follow-up.

## 16. Out of scope

Subscription vs. pay-as-you-go comparison (would need a billing-credential handshake). Alert thresholds ("notify me when this thread crosses $5"). Per-team aggregation (no team concept in the data model). CSV/JSON export. The shell, chat, settings, skills, mobile shell, server internals beyond what's listed, the database, contracts beyond what's listed. The filtered thread list page is in scope (PR 2).
