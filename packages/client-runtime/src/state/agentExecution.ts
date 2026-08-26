import type {
  AgentExecutionOutcome,
  AgentExecutionStage,
  ProviderRuntimeEvent,
} from "@rune/contracts";

export interface AgentExecutionTokens {
  readonly input: number;
  readonly output: number;
  readonly cachedInput: number;
  readonly reasoning: number;
}

export interface AgentExecutionState {
  readonly stage: AgentExecutionStage | null;
  readonly requests: number;
  readonly retries: number;
  readonly tokens: AgentExecutionTokens;
  readonly elapsedMs: number;
  readonly outcome: AgentExecutionOutcome | "running" | null;
  readonly isBudgetExhausted: boolean;
}

const EMPTY_TOKENS: AgentExecutionTokens = {
  input: 0,
  output: 0,
  cachedInput: 0,
  reasoning: 0,
};

const EMPTY_STATE: AgentExecutionState = {
  stage: null,
  requests: 0,
  retries: 0,
  tokens: EMPTY_TOKENS,
  elapsedMs: 0,
  outcome: null,
  isBudgetExhausted: false,
};

/**
 * Derive one source-neutral execution snapshot for web and mobile. Request
 * attempts are counted from request-boundary events, never from token or text
 * events, and duplicate event delivery cannot double-count an attempt.
 */
export function deriveAgentExecutionState(
  events: ReadonlyArray<ProviderRuntimeEvent>,
): AgentExecutionState {
  let state = EMPTY_STATE;
  const requestIds = new Set<string>();
  const retryIds = new Set<string>();

  for (const event of events) {
    if (event.type === "agent.execution.progress") {
      state = {
        ...state,
        stage: event.payload.stage,
        requests: Math.max(state.requests, event.payload.requestNumber),
        elapsedMs: Math.max(state.elapsedMs, event.payload.elapsedMs),
        outcome: event.payload.outcome ?? (state.outcome === null ? "running" : state.outcome),
        isBudgetExhausted: state.isBudgetExhausted || event.payload.outcome === "exhausted",
      };
      continue;
    }

    if (event.type !== "api.request.usage") continue;
    const requestId = String(event.payload.requestId);
    if (requestIds.has(requestId)) continue;
    requestIds.add(requestId);
    if (event.payload.retry) retryIds.add(requestId);
    state = {
      ...state,
      requests: Math.max(state.requests, requestIds.size, event.payload.requestNumber),
      retries: retryIds.size,
      tokens: {
        input: state.tokens.input + (event.payload.inputTokens ?? 0),
        output: state.tokens.output + (event.payload.outputTokens ?? 0),
        cachedInput: state.tokens.cachedInput + (event.payload.cachedInputTokens ?? 0),
        reasoning: state.tokens.reasoning + (event.payload.reasoningTokens ?? 0),
      },
      elapsedMs: Math.max(state.elapsedMs, event.payload.streamDurationMs ?? 0),
    };
  }

  return state;
}
