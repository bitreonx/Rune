import type {
  OrchestrationThreadActivity,
  RuntimeRequestBudget,
  RuntimeRequestPurpose,
  RuntimeTurnTotals,
  TurnId,
} from "@rune/contracts";

const TRACE_ACTIVITY_KINDS = new Set(["turn.trace.started", "turn.trace.request"]);
const TOOL_ACTIVITY_KINDS = new Set([
  "tool.started",
  "tool.updated",
  "tool.completed",
  "tool.progress",
]);

export interface TurnTraceRequest {
  readonly requestId: string;
  readonly requestNumber: number;
  readonly retry: boolean;
  readonly timeToFirstByteMs: number | null;
  readonly streamDurationMs: number | null;
  readonly purpose?: RuntimeRequestPurpose;
  readonly parentRequestId?: string;
  readonly budget?: RuntimeRequestBudget;
  readonly inputTokens?: number;
  readonly cachedInputTokens?: number;
  readonly outputTokens?: number;
  readonly reasoningTokens?: number;
  readonly queueWaitMs?: number;
  readonly promptCompilationMs?: number;
  readonly providerResolutionMs?: number;
  readonly sessionAcquisitionMs?: number;
  readonly timeToFirstTokenMs?: number;
  readonly firstUsefulActivityMs?: number;
  readonly firstEditMs?: number;
  readonly verificationMs?: number;
}

export type TurnTraceTotals = RuntimeTurnTotals;

export interface TurnTrace {
  readonly turnId: TurnId | null;
  readonly provider: string | null;
  readonly providerInstanceId: string | null;
  readonly model: string | null;
  readonly requests: number;
  readonly retries: number;
  readonly tools: number;
  readonly timeToFirstByteMs: number | null;
  readonly latencyMs: number | null;
  readonly requestDetails: readonly TurnTraceRequest[];
  readonly budget?: RuntimeRequestBudget;
  readonly queueWaitMs?: number;
  readonly promptCompilationMs?: number;
  readonly contextPlanningMs?: number;
  readonly providerResolutionMs?: number;
  readonly sessionAcquisitionMs?: number;
  readonly timeToFirstTokenMs?: number;
  readonly timeToFirstUsefulActivityMs?: number;
  readonly timeToFirstEditMs?: number;
  readonly verificationMs?: number;
  readonly turnDurationMs?: number;
  readonly totals?: TurnTraceTotals;
}

interface MutableTrace {
  readonly turnId: TurnId | null;
  provider: string | null;
  providerInstanceId: string | null;
  model: string | null;
  budget?: RuntimeRequestBudget;
  readonly requests: Map<string, TurnTraceRequest>;
  readonly tools: Set<string>;
  readonly milestones: Set<string>;
  latencyMs: number;
  queueWaitMs: number;
  promptCompilationMs: number;
  contextPlanningMs: number;
  providerResolutionMs: number;
  sessionAcquisitionMs: number;
  timeToFirstUsefulActivityMs: number | null;
  timeToFirstEditMs: number | null;
  timeToFirstTokenMs: number | null;
  verificationMs: number;
  turnDurationMs: number | null;
  totals?: TurnTraceTotals;
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

function traceFor(traces: Map<string, MutableTrace>, turnId: TurnId | null): MutableTrace {
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
    milestones: new Set(),
    latencyMs: 0,
    queueWaitMs: 0,
    promptCompilationMs: 0,
    contextPlanningMs: 0,
    providerResolutionMs: 0,
    sessionAcquisitionMs: 0,
    timeToFirstUsefulActivityMs: null,
    timeToFirstEditMs: null,
    timeToFirstTokenMs: null,
    verificationMs: 0,
    turnDurationMs: null,
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

function optionalNumber(payload: Record<string, unknown>, key: string): number | undefined {
  return nonNegativeInt(payload[key]) ?? undefined;
}

function requestFromPayload(trace: MutableTrace, payload: Record<string, unknown>): void {
  const requestId = stringValue(payload.requestId);
  if (requestId === null) return;

  const existing = trace.requests.get(requestId);
  const requestNumber =
    nonNegativeInt(payload.requestNumber) ?? existing?.requestNumber ?? trace.requests.size + 1;
  const request = {
    ...(existing ?? {}),
    requestId,
    requestNumber,
    retry: payload.retry === true || existing?.retry === true,
    timeToFirstByteMs:
      nonNegativeInt(payload.timeToFirstByteMs) ?? existing?.timeToFirstByteMs ?? null,
    streamDurationMs:
      nonNegativeInt(payload.streamDurationMs) ?? existing?.streamDurationMs ?? null,
  } as { -readonly [Key in keyof TurnTraceRequest]: TurnTraceRequest[Key] };

  const purpose = stringValue(payload.purpose) as RuntimeRequestPurpose | null;
  const parentRequestId = stringValue(payload.parentRequestId);
  const budget = asRecord(payload.budget) as RuntimeRequestBudget | null;
  if (purpose !== null) request.purpose = purpose;
  if (parentRequestId !== null) request.parentRequestId = parentRequestId;
  if (budget !== null) request.budget = budget;
  for (const key of [
    "inputTokens",
    "cachedInputTokens",
    "outputTokens",
    "reasoningTokens",
    "queueWaitMs",
    "promptCompilationMs",
    "providerResolutionMs",
    "sessionAcquisitionMs",
    "timeToFirstTokenMs",
    "firstUsefulActivityMs",
    "firstEditMs",
    "verificationMs",
  ] as const) {
    const value = optionalNumber(payload, key);
    if (value !== undefined) request[key] = value;
  }

  trace.requests.set(requestId, request);
  const streamDurationMs = request.streamDurationMs;
  const previousStreamDurationMs = existing?.streamDurationMs ?? null;
  if (streamDurationMs !== null && streamDurationMs !== previousStreamDurationMs) {
    trace.latencyMs += streamDurationMs - (previousStreamDurationMs ?? 0);
  }
}

function foldMilestone(
  trace: MutableTrace,
  activity: OrchestrationThreadActivity,
  payload: Record<string, unknown>,
): void {
  const stage = stringValue(payload.stage);
  if (stage === null || trace.milestones.has(activity.id)) return;
  trace.milestones.add(activity.id);

  const durationMs = nonNegativeInt(payload.durationMs);
  const first = (
    field: "timeToFirstUsefulActivityMs" | "timeToFirstEditMs",
    value: number | undefined,
  ) => {
    if (value !== undefined && trace[field] === null) trace[field] = value;
  };
  switch (stage) {
    case "queue.wait":
    case "queue_wait":
      trace.queueWaitMs += optionalNumber(payload, "queueWaitMs") ?? durationMs ?? 0;
      break;
    case "prompt.compile":
    case "prompt_compilation":
      trace.promptCompilationMs +=
        optionalNumber(payload, "promptCompilationMs") ?? durationMs ?? 0;
      break;
    case "context.plan":
    case "context_planning":
      trace.contextPlanningMs += optionalNumber(payload, "contextPlanningMs") ?? durationMs ?? 0;
      break;
    case "provider.resolve":
    case "provider_resolution":
      trace.providerResolutionMs +=
        optionalNumber(payload, "providerResolutionMs") ?? durationMs ?? 0;
      break;
    case "session.acquire":
    case "session_acquisition":
      trace.sessionAcquisitionMs +=
        optionalNumber(payload, "sessionAcquisitionMs") ?? durationMs ?? 0;
      break;
    case "first.useful.activity":
    case "first_useful_activity":
      first(
        "timeToFirstUsefulActivityMs",
        optionalNumber(payload, "firstUsefulActivityMs") ?? durationMs ?? undefined,
      );
      break;
    case "first.byte":
    case "first.token":
      if (trace.timeToFirstTokenMs === null) {
        trace.timeToFirstTokenMs =
          optionalNumber(payload, "timeToFirstTokenMs") ?? durationMs ?? null;
      }
      break;
    case "first.edit":
    case "first_edit":
      first("timeToFirstEditMs", optionalNumber(payload, "firstEditMs") ?? durationMs ?? undefined);
      break;
    case "verification":
      trace.verificationMs += optionalNumber(payload, "verificationMs") ?? durationMs ?? 0;
      break;
    case "completion":
      trace.turnDurationMs =
        optionalNumber(payload, "turnDurationMs") ?? durationMs ?? trace.turnDurationMs;
      break;
    default:
      break;
  }
}

function hasMeasuredTrace(trace: MutableTrace): boolean {
  return (
    trace.budget !== undefined ||
    trace.milestones.size > 0 ||
    trace.totals !== undefined ||
    [...trace.requests.values()].some(
      (request) =>
        request.purpose !== undefined ||
        request.parentRequestId !== undefined ||
        request.budget !== undefined ||
        request.queueWaitMs !== undefined ||
        request.promptCompilationMs !== undefined ||
        request.providerResolutionMs !== undefined ||
        request.sessionAcquisitionMs !== undefined ||
        request.timeToFirstTokenMs !== undefined ||
        request.firstUsefulActivityMs !== undefined ||
        request.firstEditMs !== undefined ||
        request.verificationMs !== undefined ||
        request.inputTokens !== undefined ||
        request.cachedInputTokens !== undefined ||
        request.outputTokens !== undefined ||
        request.reasoningTokens !== undefined ||
        request.timeToFirstTokenMs !== undefined,
    )
  );
}

function measuredTotals(
  trace: MutableTrace,
  requestDetails: readonly TurnTraceRequest[],
): TurnTraceTotals | undefined {
  if (!hasMeasuredTrace(trace)) return undefined;
  const requestTimingTotal = (
    key: keyof Pick<
      TurnTraceRequest,
      | "queueWaitMs"
      | "promptCompilationMs"
      | "providerResolutionMs"
      | "sessionAcquisitionMs"
      | "verificationMs"
    >,
  ): number => requestDetails.reduce((total, request) => total + (request[key] ?? 0), 0);
  const queueWaitMs = Math.max(trace.queueWaitMs, requestTimingTotal("queueWaitMs"));
  const promptCompilationMs = Math.max(
    trace.promptCompilationMs,
    requestTimingTotal("promptCompilationMs"),
  );
  const providerResolutionMs = Math.max(
    trace.providerResolutionMs,
    requestTimingTotal("providerResolutionMs"),
  );
  const sessionAcquisitionMs = Math.max(
    trace.sessionAcquisitionMs,
    requestTimingTotal("sessionAcquisitionMs"),
  );
  const verificationMs = Math.max(trace.verificationMs, requestTimingTotal("verificationMs"));
  const wallDurationMs = trace.turnDurationMs ?? trace.totals?.wallDurationMs;
  const sumRequestField = (
    key: keyof Pick<
      TurnTraceRequest,
      "inputTokens" | "cachedInputTokens" | "outputTokens" | "reasoningTokens"
    >,
  ): number => requestDetails.reduce((total, request) => total + (request[key] ?? 0), 0);
  const totals: RuntimeTurnTotals = {
    requestCount: requestDetails.length,
    retryCount: requestDetails.filter((request) => request.retry).length,
    toolCalls: trace.tools.size,
    ...(sumRequestField("inputTokens") > 0 ? { inputTokens: sumRequestField("inputTokens") } : {}),
    ...(sumRequestField("cachedInputTokens") > 0
      ? { cachedInputTokens: sumRequestField("cachedInputTokens") }
      : {}),
    ...(sumRequestField("outputTokens") > 0
      ? { outputTokens: sumRequestField("outputTokens") }
      : {}),
    ...(sumRequestField("reasoningTokens") > 0
      ? { reasoningTokens: sumRequestField("reasoningTokens") }
      : {}),
    ...(queueWaitMs > 0 ? { queueWaitMs } : {}),
    ...(promptCompilationMs > 0 ? { promptCompilationMs } : {}),
    ...(trace.contextPlanningMs > 0 ? { contextPlanningMs: trace.contextPlanningMs } : {}),
    ...(providerResolutionMs > 0 ? { providerResolutionMs } : {}),
    ...(sessionAcquisitionMs > 0 ? { sessionAcquisitionMs } : {}),
    ...(trace.timeToFirstUsefulActivityMs !== null
      ? { firstUsefulActivityMs: trace.timeToFirstUsefulActivityMs }
      : {}),
    ...(trace.timeToFirstEditMs !== null ? { firstEditMs: trace.timeToFirstEditMs } : {}),
    ...(verificationMs > 0 ? { verificationMs } : {}),
    ...(wallDurationMs !== undefined ? { wallDurationMs } : {}),
  };
  return { ...(trace.totals ?? {}), ...totals };
}

/** Folds the persisted technical activity stream into bounded per-turn summaries. */
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
      if (payload) {
        if (asRecord(payload.budget)) trace.budget = payload.budget as RuntimeRequestBudget;
        requestFromPayload(trace, payload);
        foldMilestone(trace, activity, payload);
        const totals = payload.totals ?? payload.turnTotals;
        if (asRecord(totals)) trace.totals = totals as RuntimeTurnTotals;
      }
      continue;
    }

    if (!TOOL_ACTIVITY_KINDS.has(activity.kind)) continue;
    const trace = traceFor(traces, activity.turnId);
    trace.tools.add(toolIdentity(activity));
  }

  return [...traces.values()]
    .filter((trace) => trace.requests.size > 0 || trace.tools.size > 0 || hasMeasuredTrace(trace))
    .slice(-Math.max(0, Math.floor(maxTurns)))
    .map((trace) => {
      const requestDetails = [...trace.requests.values()].toSorted(
        (left, right) =>
          left.requestNumber - right.requestNumber || left.requestId.localeCompare(right.requestId),
      );
      const requestTimingTotal = (
        key: keyof Pick<
          TurnTraceRequest,
          | "queueWaitMs"
          | "promptCompilationMs"
          | "providerResolutionMs"
          | "sessionAcquisitionMs"
          | "verificationMs"
        >,
      ): number => requestDetails.reduce((total, request) => total + (request[key] ?? 0), 0);
      const queueWaitMs = Math.max(trace.queueWaitMs, requestTimingTotal("queueWaitMs"));
      const promptCompilationMs = Math.max(
        trace.promptCompilationMs,
        requestTimingTotal("promptCompilationMs"),
      );
      const providerResolutionMs = Math.max(
        trace.providerResolutionMs,
        requestTimingTotal("providerResolutionMs"),
      );
      const sessionAcquisitionMs = Math.max(
        trace.sessionAcquisitionMs,
        requestTimingTotal("sessionAcquisitionMs"),
      );
      const verificationMs = Math.max(trace.verificationMs, requestTimingTotal("verificationMs"));
      const turnDurationMs = trace.turnDurationMs ?? trace.totals?.wallDurationMs ?? null;
      const timeToFirstTokenMs =
        trace.timeToFirstTokenMs ??
        requestDetails.find((request) => request.timeToFirstTokenMs !== undefined)
          ?.timeToFirstTokenMs ??
        null;
      const totals = measuredTotals(trace, requestDetails);
      return {
        turnId: trace.turnId,
        provider: trace.provider,
        providerInstanceId: trace.providerInstanceId,
        model: trace.model,
        requests: requestDetails.length,
        retries: requestDetails.filter((request) => request.retry).length,
        tools: trace.tools.size,
        timeToFirstByteMs:
          requestDetails.find((request) => request.timeToFirstByteMs !== null)?.timeToFirstByteMs ??
          null,
        latencyMs: trace.latencyMs > 0 ? trace.latencyMs : null,
        requestDetails,
        ...(trace.budget ? { budget: trace.budget } : {}),
        ...(queueWaitMs > 0 ? { queueWaitMs } : {}),
        ...(promptCompilationMs > 0 ? { promptCompilationMs } : {}),
        ...(trace.contextPlanningMs > 0 ? { contextPlanningMs: trace.contextPlanningMs } : {}),
        ...(providerResolutionMs > 0 ? { providerResolutionMs } : {}),
        ...(sessionAcquisitionMs > 0 ? { sessionAcquisitionMs } : {}),
        ...(trace.timeToFirstUsefulActivityMs !== null
          ? { timeToFirstUsefulActivityMs: trace.timeToFirstUsefulActivityMs }
          : {}),
        ...(trace.timeToFirstEditMs !== null ? { timeToFirstEditMs: trace.timeToFirstEditMs } : {}),
        ...(timeToFirstTokenMs !== null ? { timeToFirstTokenMs } : {}),
        ...(verificationMs > 0 ? { verificationMs } : {}),
        ...(turnDurationMs !== null ? { turnDurationMs } : {}),
        ...(totals ? { totals } : {}),
      } satisfies TurnTrace;
    });
}
