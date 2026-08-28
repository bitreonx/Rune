import type { OrchestrationThreadActivity, TurnId } from "@rune/contracts";

const TRACE_ACTIVITY_KINDS = new Set(["turn.trace.started", "turn.trace.request"]);
const TOOL_ACTIVITY_KINDS = new Set(["tool.started", "tool.updated", "tool.completed", "tool.progress"]);

export interface TurnTraceRequest {
  readonly requestId: string;
  readonly requestNumber: number;
  readonly retry: boolean;
  readonly timeToFirstByteMs: number | null;
  readonly streamDurationMs: number | null;
}

export interface TurnTrace {
  readonly turnId: TurnId | null;
  readonly provider: string | null;
  readonly providerInstanceId: string | null;
  readonly model: string | null;
  readonly requests: number;
  readonly retries: number;
  readonly tools: number;
  /** First known request TTFT for this turn. */
  readonly timeToFirstByteMs: number | null;
  /** Sum of known request stream durations for this turn. */
  readonly latencyMs: number | null;
  readonly requestDetails: readonly TurnTraceRequest[];
}

interface MutableTrace {
  readonly turnId: TurnId | null;
  provider: string | null;
  providerInstanceId: string | null;
  model: string | null;
  readonly requests: Map<string, TurnTraceRequest>;
  readonly tools: Set<string>;
  latencyMs: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function traceFor(
  traces: Map<string, MutableTrace>,
  turnId: TurnId | null,
): MutableTrace {
  const key = turnId ?? "__no-turn__";
  const existing = traces.get(key);
  if (existing) return existing;
  const created: MutableTrace = {
    turnId,
    provider: null,
    providerInstanceId: null,
    model: null,
    requests: new Map(),
    tools: new Set(),
    latencyMs: 0,
  };
  traces.set(key, created);
  return created;
}

function toolIdentity(activity: OrchestrationThreadActivity): string {
  const payload = asRecord(activity.payload);
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const id =
    stringValue(payload?.toolCallId) ??
    stringValue(payload?.toolUseId) ??
    stringValue(data?.toolCallId) ??
    stringValue(data?.toolUseId) ??
    stringValue(item?.id);
  return id === null ? `activity:${activity.id}` : `tool:${id}`;
}

/**
 * Folds the persisted technical activity stream into bounded per-turn trace
 * summaries. Request/tool lifecycle rows are identity-deduplicated because a
 * reconnect can replay the same activity and tool updates are not requests.
 */
export function deriveTurnTraces(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  maxTurns = 12,
): readonly TurnTrace[] {
  const traces = new Map<string, MutableTrace>();

  for (const activity of activities) {
    const payload = asRecord(activity.payload);
    if (TRACE_ACTIVITY_KINDS.has(activity.kind)) {
      const trace = traceFor(traces, activity.turnId);
      const provider = stringValue(payload?.provider);
      const providerInstanceId = stringValue(payload?.providerInstanceId);
      const model = stringValue(payload?.model);
      if (provider !== null) trace.provider = provider;
      if (providerInstanceId !== null) trace.providerInstanceId = providerInstanceId;
      if (model !== null) trace.model = model;

      if (activity.kind === "turn.trace.request") {
        const requestId = stringValue(payload?.requestId);
        const requestNumber = nonNegativeInt(payload?.requestNumber);
        if (requestId === null || requestNumber === null || trace.requests.has(requestId)) continue;
        const timeToFirstByteMs = nonNegativeInt(payload?.timeToFirstByteMs);
        const streamDurationMs = nonNegativeInt(payload?.streamDurationMs);
        trace.requests.set(requestId, {
          requestId,
          requestNumber,
          retry: payload?.retry === true,
          timeToFirstByteMs,
          streamDurationMs,
        });
        if (streamDurationMs !== null) trace.latencyMs += streamDurationMs;
      }
      continue;
    }

    if (!TOOL_ACTIVITY_KINDS.has(activity.kind)) continue;
    const trace = traceFor(traces, activity.turnId);
    trace.tools.add(toolIdentity(activity));
  }

  return [...traces.values()]
    .filter((trace) => trace.requests.size > 0 || trace.tools.size > 0)
    .slice(-Math.max(0, Math.floor(maxTurns)))
    .map((trace) => {
      const requestDetails = [...trace.requests.values()].toSorted(
        (left, right) => left.requestNumber - right.requestNumber || left.requestId.localeCompare(right.requestId),
      );
      return {
        turnId: trace.turnId,
        provider: trace.provider,
        providerInstanceId: trace.providerInstanceId,
        model: trace.model,
        requests: requestDetails.length,
        retries: requestDetails.filter((request) => request.retry).length,
        tools: trace.tools.size,
        timeToFirstByteMs: requestDetails.find((request) => request.timeToFirstByteMs !== null)?.timeToFirstByteMs ?? null,
        latencyMs: trace.latencyMs > 0 ? trace.latencyMs : null,
        requestDetails,
      } satisfies TurnTrace;
    });
}
