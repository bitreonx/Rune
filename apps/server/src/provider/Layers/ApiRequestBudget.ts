import {
  DEFAULT_API_EXECUTION_POLICY,
  type ApiExecutionPolicy,
} from "./ApiExecutionPolicy.ts";

export { DEFAULT_API_EXECUTION_POLICY } from "./ApiExecutionPolicy.ts";
export type { ApiExecutionPolicy } from "./ApiExecutionPolicy.ts";

export type RequestStartDecision =
  | { readonly kind: "allowed"; readonly requestNumber: number }
  | { readonly kind: "budgetExhausted"; readonly snapshot: ApiRequestBudgetSnapshot };

export type RetryStartDecision =
  | { readonly kind: "allowedRetry"; readonly retryNumber: number }
  | { readonly kind: "retryExhausted"; readonly snapshot: ApiRequestBudgetSnapshot }
  | { readonly kind: "retryUnavailable"; readonly reason: "responseStarted" };

export interface ApiRequestBudgetSnapshot {
  readonly requests: number;
  readonly retries: number;
  readonly maxRequests: number;
  readonly maxRetries: number;
  readonly outcome: "running" | "completed" | "exhausted" | "failed" | "interrupted";
  readonly responseStarted: boolean;
}

export interface ApiRequestBudget {
  readonly tryStartRequest: () => RequestStartDecision;
  readonly tryStartRetry: () => RetryStartDecision;
  readonly recordResponseBytes: () => void;
  readonly markOutcome: (outcome: Exclude<ApiRequestBudgetSnapshot["outcome"], "running">) => void;
  readonly snapshot: () => ApiRequestBudgetSnapshot;
}

export function makeRequestBudget(policy: ApiExecutionPolicy = DEFAULT_API_EXECUTION_POLICY): ApiRequestBudget {
  let requests = 0;
  let retries = 0;
  let responseStarted = false;
  let outcome: ApiRequestBudgetSnapshot["outcome"] = "running";

  const snapshot = (): ApiRequestBudgetSnapshot => ({
    requests,
    retries,
    maxRequests: policy.maxProviderRequests,
    maxRetries: policy.maxTransportRetries,
    outcome,
    responseStarted,
  });

  return {
    tryStartRequest: () => {
      if (requests >= policy.maxProviderRequests) {
        outcome = "exhausted";
        return { kind: "budgetExhausted", snapshot: snapshot() };
      }
      requests += 1;
      responseStarted = false;
      return { kind: "allowed", requestNumber: requests };
    },
    tryStartRetry: () => {
      if (responseStarted) return { kind: "retryUnavailable", reason: "responseStarted" };
      if (retries >= policy.maxTransportRetries) {
        return { kind: "retryExhausted", snapshot: snapshot() };
      }
      retries += 1;
      return { kind: "allowedRetry", retryNumber: retries };
    },
    recordResponseBytes: () => {
      responseStarted = true;
    },
    markOutcome: (nextOutcome) => {
      outcome = nextOutcome;
    },
    snapshot,
  };
}
