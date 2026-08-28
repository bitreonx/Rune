import type { RuntimeRequestBudget, RuntimeRequestPurpose } from "@rune/contracts";

/** Small immutable accounting state used by a Native/request governor. */
export interface TraceLedger {
  readonly requestCount: number;
  readonly toolCalls: number;
  readonly elapsedMs: number;
}

export interface TraceRequestCharge {
  readonly purpose: RuntimeRequestPurpose;
  readonly toolCalls?: number;
  readonly elapsedMs?: number;
}

export type TraceAdmission =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "requests" | "toolCalls" | "elapsedMs" };

export const EMPTY_TRACE_LEDGER: TraceLedger = {
  requestCount: 0,
  toolCalls: 0,
  elapsedMs: 0,
};

/** Checks a hard budget before an inference call is started. */
export function admitTraceRequest(
  ledger: TraceLedger,
  budget: RuntimeRequestBudget | undefined,
  charge: Pick<TraceRequestCharge, "toolCalls" | "elapsedMs"> = {},
): TraceAdmission {
  if (budget?.maxRequests !== undefined && ledger.requestCount >= budget.maxRequests) {
    return { allowed: false, reason: "requests" };
  }
  if (
    budget?.maxToolCalls !== undefined &&
    ledger.toolCalls + (charge.toolCalls ?? 0) > budget.maxToolCalls
  ) {
    return { allowed: false, reason: "toolCalls" };
  }
  if (
    budget?.maxElapsedMs !== undefined &&
    ledger.elapsedMs + (charge.elapsedMs ?? 0) > budget.maxElapsedMs
  ) {
    return { allowed: false, reason: "elapsedMs" };
  }
  return { allowed: true };
}

/** Records one admitted logical request without mutating shared state. */
export function recordTraceRequest(ledger: TraceLedger, charge: TraceRequestCharge): TraceLedger {
  return {
    requestCount: ledger.requestCount + 1,
    toolCalls: ledger.toolCalls + (charge.toolCalls ?? 0),
    elapsedMs: ledger.elapsedMs + (charge.elapsedMs ?? 0),
  };
}

/** Adds completion metrics to a request that was already admitted. */
export function recordTraceMetrics(
  ledger: TraceLedger,
  charge: Pick<TraceRequestCharge, "toolCalls" | "elapsedMs">,
): TraceLedger {
  return {
    ...ledger,
    toolCalls: ledger.toolCalls + (charge.toolCalls ?? 0),
    elapsedMs: ledger.elapsedMs + (charge.elapsedMs ?? 0),
  };
}
