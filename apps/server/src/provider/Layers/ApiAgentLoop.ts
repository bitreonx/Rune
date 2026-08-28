import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { apiProviderEndpoint, RuntimeItemId, RuntimeRequestId } from "@rune/contracts";
import type {
  AgentExecutionOutcome,
  AgentExecutionStage,
  EventId,
  ApiModelCapabilities,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderRuntimeEvent,
  ThreadTokenUsageSnapshot,
  ThreadId,
  TurnId,
} from "@rune/contracts";

import type { ProviderAdapterError } from "../Errors.ts";
import { ProviderAdapterRequestError } from "../Errors.ts";
import {
  compileSystemPrompt,
  defaultIdentity,
  defaultToolGuidance,
  hashPrompt,
} from "./ApiPrompt.ts";
import { makeCoalescedDeltaSink, makeToolCallAccumulator, resultFromSseLine } from "./ApiSse.ts";
import {
  NATIVE_TOOLS,
  SAFE_TOOLS,
  askUserTool,
  parseAskUserQuestions,
  type NativeToolContext,
  type NativeToolDef,
} from "./ApiTools.ts";
import { ApiHarnessLedger } from "./ApiHarness.ts";
import { ApiContextLedger, fingerprintToolCall } from "./ApiContextLedger.ts";
import { DEFAULT_API_EXECUTION_POLICY, makeRequestBudget } from "./ApiRequestBudget.ts";
import { scheduleToolCalls } from "./ApiToolScheduler.ts";
import { buildApiRequestBody, resolveApiModelCapabilities } from "./ApiCapabilities.ts";
import {
  admitTraceRequest,
  EMPTY_TRACE_LEDGER,
  recordTraceMetrics,
  recordTraceRequest,
} from "@rune/shared/traceLedger";

/**
 * The native agent loop for API providers (OpenAI-compatible chat completions).
 *
 * One agentic turn is a bounded conversation with the model: stream a
 * completion, execute any requested tools against workspace services, feed
 * observations back, repeat until the model answers in plain text or the
 * round-trip cap trips. Text streams out as canonical `content.delta` events
 * so clients render the loop like any other provider.
 */

export interface ApiChatMessage {
  readonly role: "user" | "system";
  readonly content: string;
}

export interface ApiAssistantToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: { readonly name: string; readonly arguments: string };
}

export interface ApiAssistantToolMessage {
  readonly role: "assistant";
  readonly content?: string | null;
  readonly tool_calls: ReadonlyArray<ApiAssistantToolCall>;
}

export interface ApiToolResultMessage {
  readonly role: "tool";
  readonly tool_call_id: string;
  readonly content: string;
}

export type AgentLoopMessage = ApiChatMessage | ApiAssistantToolMessage | ApiToolResultMessage;

export interface AgentLoopDeps {
  readonly provider: ProviderDriverKind;
  readonly providerInstanceId?: ProviderInstanceId | undefined;
  readonly threadId: ThreadId;
  /** POSTs one chat-completion request and hands back the SSE byte stream. */
  readonly httpPost: (
    url: string,
    body: unknown,
  ) => Effect.Effect<
    Stream.Stream<Uint8Array, ProviderAdapterRequestError>,
    ProviderAdapterRequestError
  >;
  readonly publish: (event: ProviderRuntimeEvent) => Effect.Effect<void>;
  /** Stamps events with identity/time; supplied by the adapter's clock stack. */
  readonly stamp: Effect.Effect<{ eventId: EventId; createdAt: string }, ProviderAdapterError>;
  /** Required whenever any offered tool may execute. */
  readonly toolContext?: NativeToolContext | undefined;
  /**
   * Consulted before gated tools execute. Completing means approved; failing
   * means denied (the observation tells the model). Undefined runs everything.
   */
  readonly approvalGate?:
    | ((input: { toolName: string; summary: string }) => Effect.Effect<void, ProviderAdapterError>)
    | undefined;
  readonly harnessLedger?: ApiHarnessLedger | undefined;
  /** Pauses the current turn and presents structured questions in the composer. */
  readonly userInputRequest?: (input: {
    readonly questions: ReadonlyArray<import("@rune/contracts").UserInputQuestion>;
    readonly toolCallId: string;
  }) => Effect.Effect<import("@rune/contracts").ProviderUserInputAnswers, ProviderAdapterError>;
}

export interface AgentTurnInput {
  readonly turnId: TurnId;
  readonly threadId: ThreadId;
  readonly itemIdPrefix: RuntimeItemId;
  readonly messages: Array<AgentLoopMessage>;
  readonly model: string;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly requestHeaders?: Readonly<Record<string, string>> | undefined;
  readonly workspaceInstructions?: string | undefined;
  /** Read-only sandboxes never see edit_file/bash at all. */
  readonly sandboxReadOnly: boolean;
  /** Explicit tool set after session policy has been applied by the adapter. */
  readonly toolsOverride?: ReadonlyArray<NativeToolDef> | undefined;
  readonly apiCapabilities?: Partial<ApiModelCapabilities> | undefined;
}

export interface AgentTurnResult {
  readonly finalText: string;
  readonly usage?: ThreadTokenUsageSnapshot | undefined;
  readonly systemPromptHash: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const classifyTransportError = (cause: unknown): { retryable: boolean; message: string } => {
  const status =
    (cause as { status?: number }).status ?? (cause as { statusCode?: number }).statusCode;
  if (status === 401)
    return {
      retryable: false,
      message: "Provider rejected the API key. Check the key in provider settings.",
    };
  if (status === 402) return { retryable: false, message: "Provider account is out of credits." };
  if (status === 429)
    return {
      retryable: false,
      message: "Rate limit exceeded: free-models-per-day. Add credits to unlock more requests.",
    };
  if ((typeof status === "number" && status >= 500) || status === undefined)
    return { retryable: true, message: "Transient provider failure." };
  return {
    retryable: false,
    message: `Provider request failed${typeof status === "number" ? ` (HTTP ${status})` : ""}.`,
  };
};

/** Status codes live on the wire error, which adapters wrap; walk the chain. */
const extractStatus = (error: unknown): number | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth += 1) {
    const candidate = current as { status?: unknown; statusCode?: unknown };
    if (typeof candidate.status === "number") return candidate.status;
    if (typeof candidate.statusCode === "number") return candidate.statusCode;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
};

/**
 * Parse model-emitted tool arguments. Models occasionally wrap JSON in code
 * fences; stripping them counts as the single repair attempt.
 */
const parseToolArgs = (raw: string): Record<string, unknown> | undefined => {
  const attempt = (text: string): Record<string, unknown> | undefined => {
    try {
      const parsed: unknown = JSON.parse(text);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };
  const repaired = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return attempt(raw.trim()) ?? attempt(repaired);
};

const nonNegativeInt = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;

const toUsageSnapshot = (raw: Record<string, number>): ThreadTokenUsageSnapshot => {
  const inputTokens = nonNegativeInt(raw.prompt_tokens);
  const outputTokens = nonNegativeInt(raw.completion_tokens);
  const usedTokens = nonNegativeInt(raw.total_tokens) ?? (inputTokens ?? 0) + (outputTokens ?? 0);
  return {
    usedTokens: usedTokens ?? 0,
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
  };
};

const addUsage = (
  current: ThreadTokenUsageSnapshot | undefined,
  next: ThreadTokenUsageSnapshot,
): ThreadTokenUsageSnapshot => ({
  usedTokens: (current?.usedTokens ?? 0) + next.usedTokens,
  ...(current?.inputTokens !== undefined || next.inputTokens !== undefined
    ? { inputTokens: (current?.inputTokens ?? 0) + (next.inputTokens ?? 0) }
    : {}),
  ...(current?.outputTokens !== undefined || next.outputTokens !== undefined
    ? { outputTokens: (current?.outputTokens ?? 0) + (next.outputTokens ?? 0) }
    : {}),
});

const summarizeArgs = (args: Record<string, unknown>): string => {
  let rendered: string;
  try {
    rendered = JSON.stringify(args);
  } catch {
    rendered = "";
  }
  return rendered.length > 120 ? `${rendered.slice(0, 117)}…` : rendered;
};

const requestFailed = (
  provider: ProviderDriverKind,
  detail: string,
  cause?: unknown,
): ProviderAdapterRequestError =>
  new ProviderAdapterRequestError({ provider, method: "chat/completions", detail, cause });

export const runAgenticTurn = (
  deps: AgentLoopDeps,
  input: AgentTurnInput,
): Effect.Effect<AgentTurnResult, ProviderAdapterError> =>
  Effect.gen(function* () {
    // Stable prefix first: identity/guidance never change mid-session, so
    // provider prompt caches reuse them across rounds.
    const offered: ReadonlyArray<NativeToolDef> =
      input.toolsOverride ?? (input.sandboxReadOnly ? SAFE_TOOLS : NATIVE_TOOLS);
    const toolsWire: Array<{ type: "function"; function: Record<string, unknown> }> = offered.map(
      (def) => ({
        type: "function",
        function: {
          name: def.name,
          description: def.description,
          parameters: def.parametersJsonSchema,
        },
      }),
    );
    const url = apiProviderEndpoint(input.baseUrl, "chat/completions");
    const contextLedger = new ApiContextLedger(input.messages);
    const messages: Array<AgentLoopMessage> = [...input.messages];
    const requestBudget = makeRequestBudget(DEFAULT_API_EXECUTION_POLICY);
    const traceBudget = { maxRequests: DEFAULT_API_EXECUTION_POLICY.maxProviderRequests };
    let traceLedger = EMPTY_TRACE_LEDGER;
    const apiCapabilities = resolveApiModelCapabilities({
      driver: deps.provider,
      advertised: input.apiCapabilities,
    });
    const seenToolCalls = new Set<string>();
    let lastUsage: ThreadTokenUsageSnapshot | undefined;
    let lastRequestId: RuntimeRequestId | undefined;
    let finalText: string | undefined;
    let systemPromptHash = "";
    const executionStartedAt = yield* Clock.currentTimeMillis;

    const instanceFields =
      deps.providerInstanceId !== undefined ? { providerInstanceId: deps.providerInstanceId } : {};

    const publishExecutionProgress = (progress: {
      readonly stage: AgentExecutionStage;
      readonly requestNumber: number;
      readonly toolCalls: number;
      readonly outcome?: AgentExecutionOutcome;
    }) =>
      Effect.flatMap(Clock.currentTimeMillis, (now) =>
        Effect.flatMap(deps.stamp, (stamp) =>
          deps.publish({
            type: "agent.execution.progress",
            ...stamp,
            provider: deps.provider,
            ...instanceFields,
            threadId: input.threadId,
            turnId: input.turnId,
            payload: {
              stage: progress.stage,
              requestNumber: progress.requestNumber,
              maxRequests: DEFAULT_API_EXECUTION_POLICY.maxProviderRequests,
              toolCalls: progress.toolCalls,
              elapsedMs: Math.max(0, now - executionStartedAt),
              ...(progress.outcome !== undefined ? { outcome: progress.outcome } : {}),
            },
          }),
        ),
      );

    const executeToolCall = (call: {
      id: string;
      name: string;
      arguments: string;
    }): Effect.Effect<string, ProviderAdapterError> =>
      Effect.gen(function* () {
        const def = offered.find((candidate) => candidate.name === call.name);
        if (!def) return `Error: unknown tool ${call.name}`;
        const args = parseToolArgs(call.arguments);
        if (!args) {
          return `Error: could not parse arguments as JSON: ${call.arguments.slice(0, 200)}`;
        }
        const fingerprint = fingerprintToolCall(call.name, args);
        if (seenToolCalls.has(fingerprint))
          return "Error: repeated tool call with unchanged inputs";
        seenToolCalls.add(fingerprint);
        if (def.name === askUserTool.name) {
          const questions = parseAskUserQuestions(args);
          if (questions.length === 0) return "Error: ask_user needs at least one valid question";
          if (!deps.userInputRequest)
            return "Error: native user input is unavailable in this context";
          const answers = yield* deps.userInputRequest({ questions, toolCallId: call.id });
          return `User answers: ${JSON.stringify(answers)}`;
        }
        if (!deps.toolContext) return "Error: tools are unavailable in this context";
        if (def.requiresApproval && deps.approvalGate) {
          let denied = false;
          yield* deps
            .approvalGate({ toolName: def.name, summary: `${def.name} ${summarizeArgs(args)}` })
            .pipe(
              Effect.catch(() =>
                Effect.sync(() => {
                  denied = true;
                }),
              ),
            );
          if (denied) return `Error: user denied ${def.name}`;
        }
        const observation = yield* def.execute(args, deps.toolContext);
        deps.harnessLedger?.recordToolObservation({
          toolName: def.name,
          observation,
          ...(def.verificationTool ? { verificationTool: true } : {}),
          ...(def.invalidatesVerification ? { invalidatesVerification: true } : {}),
        });
        return observation;
      });

    for (let round = 0; ; round += 1) {
      const requestStart = requestBudget.tryStartRequest();
      if (requestStart.kind !== "allowed") {
        requestBudget.markOutcome("exhausted");
        return yield* requestFailed(
          deps.provider,
          `The agent exceeded the provider request budget (${requestStart.snapshot.maxRequests} requests).`,
        );
      }
      const traceAdmission = admitTraceRequest(traceLedger, traceBudget);
      if (!traceAdmission.allowed) {
        requestBudget.markOutcome("exhausted");
        return yield* requestFailed(
          deps.provider,
          `The agent exceeded the trace request budget (${traceBudget.maxRequests} requests).`,
        );
      }
      traceLedger = recordTraceRequest(traceLedger, {
        purpose: round === 0 ? "main" : "tool-followup",
      });
      let requestNumber = requestStart.requestNumber;
      let isRetry = false;
      const systemPrompt = compileSystemPrompt({
        identity: defaultIdentity,
        toolGuidance: defaultToolGuidance,
        ...(input.workspaceInstructions === undefined
          ? {}
          : { workspaceInstructions: input.workspaceInstructions }),
        ...(deps.harnessLedger ? { outcomeContract: deps.harnessLedger.promptSummary() } : {}),
      });
      systemPromptHash = hashPrompt(systemPrompt);
      yield* publishExecutionProgress({
        stage: round === 0 ? "inspect" : "verify",
        requestNumber: requestStart.requestNumber,
        toolCalls: 0,
      });
      const itemId = RuntimeItemId.make(`${String(input.itemIdPrefix)}-${round}`);
      let assembled = "";
      const accumulator = makeToolCallAccumulator();
      let roundUsage: Record<string, number> | undefined;
      let firstByteAt: number | undefined;
      const requestStartedAt = yield* Clock.currentTimeMillis;
      const sink = makeCoalescedDeltaSink({
        flush: (delta) =>
          Effect.flatMap(deps.stamp, (stamp) =>
            deps.publish({
              type: "content.delta",
              ...stamp,
              provider: deps.provider,
              ...instanceFields,
              threadId: input.threadId,
              turnId: input.turnId,
              itemId,
              payload: { streamKind: "assistant_text", delta },
            }),
          ),
        now: Clock.currentTimeMillis,
      });

      const body = buildApiRequestBody({
        model: input.model,
        systemPrompt,
        messages: messages as unknown as Array<Record<string, unknown>>,
        tools: toolsWire,
        capabilities: apiCapabilities,
      });

      // Transport failures get exactly one retry; the second surfaces. Retries
      // only cover acquiring the stream — once bytes flowed, restarting would
      // double-publish deltas.
      const acquireStream: Effect.Effect<
        Stream.Stream<Uint8Array, ProviderAdapterRequestError>,
        ProviderAdapterRequestError
      > = deps.httpPost(url, body).pipe(
        Effect.catch((error) => {
          const classified = classifyTransportError({ status: extractStatus(error) });
          if (!classified.retryable) {
            return Effect.fail(requestFailed(deps.provider, classified.message, error));
          }
          const retry = requestBudget.tryStartRetry();
          if (retry.kind !== "allowedRetry") {
            return Effect.fail(
              requestFailed(
                deps.provider,
                "The provider request failed and no retry is available.",
              ),
            );
          }
          const retryRequest = requestBudget.tryStartRequest();
          if (retryRequest.kind !== "allowed") {
            return Effect.fail(
              requestFailed(
                deps.provider,
                "The provider request budget was exhausted during retry.",
              ),
            );
          }
          requestNumber = retryRequest.requestNumber;
          isRetry = true;
          const retryAdmission = admitTraceRequest(traceLedger, traceBudget);
          if (!retryAdmission.allowed) {
            return Effect.fail(
              requestFailed(deps.provider, "The trace request budget was exhausted during retry."),
            );
          }
          traceLedger = recordTraceRequest(traceLedger, { purpose: "retry" });
          return deps.httpPost(url, body);
        }),
      );

      yield* acquireStream.pipe(
        Effect.flatMap((byteStream) =>
          byteStream.pipe(
            Stream.decodeText(),
            Stream.splitLines,
            Stream.runForEach((line) => {
              const hasResponseBytes = line.trim().length > 0;
              if (hasResponseBytes) requestBudget.recordResponseBytes();
              const markFirstByte =
                hasResponseBytes && firstByteAt === undefined
                  ? Clock.currentTimeMillis.pipe(
                      Effect.map((now) => {
                        firstByteAt = now;
                      }),
                    )
                  : Effect.void;
              return markFirstByte.pipe(
                Effect.flatMap(() => {
                  const parsed = resultFromSseLine(line);
                  switch (parsed.kind) {
                    case "delta":
                      assembled += parsed.text;
                      return sink.add(parsed.text);
                    case "toolCallDelta":
                      accumulator.add(parsed);
                      return Effect.void;
                    case "finish":
                      return Effect.void;
                    case "usage":
                      roundUsage = parsed.usage;
                      return Effect.void;
                    default:
                      return Effect.void;
                  }
                }),
              );
            }),
            Effect.flatMap(() => sink.end()),
            Effect.mapError((cause) =>
              requestFailed(deps.provider, "The completion stream ended early.", cause),
            ),
          ),
        ),
      );

      const streamCompletedAt = yield* Clock.currentTimeMillis;
      const calls = accumulator.finish();
      traceLedger = recordTraceMetrics(traceLedger, {
        toolCalls: calls.length,
        elapsedMs: Math.max(0, streamCompletedAt - requestStartedAt),
      });
      const traceTotals = {
        requestCount: traceLedger.requestCount,
        toolCalls: traceLedger.toolCalls,
        elapsedMs: traceLedger.elapsedMs,
      };
      const requestId = RuntimeRequestId.make(`${String(input.turnId)}:request:${requestNumber}`);
      const budgetSnapshot = requestBudget.snapshot();
      yield* Effect.flatMap(deps.stamp, (stamp) =>
        deps.publish({
          type: "api.request.usage",
          ...stamp,
          provider: deps.provider,
          ...instanceFields,
          threadId: input.threadId,
          turnId: input.turnId,
          requestId,
          payload: {
            requestId,
            requestNumber,
            retry: isRetry,
            purpose: isRetry ? "retry" : round === 0 ? "main" : "tool-followup",
            ...(lastRequestId !== undefined ? { parentRequestId: lastRequestId } : {}),
            budget: {
              maxRequests: budgetSnapshot.maxRequests,
              remainingRequests: Math.max(0, budgetSnapshot.maxRequests - budgetSnapshot.requests),
            },
            ...(roundUsage !== undefined
              ? {
                  ...(toUsageSnapshot(roundUsage).inputTokens !== undefined
                    ? { inputTokens: toUsageSnapshot(roundUsage).inputTokens }
                    : {}),
                  ...(toUsageSnapshot(roundUsage).outputTokens !== undefined
                    ? { outputTokens: toUsageSnapshot(roundUsage).outputTokens }
                    : {}),
                }
              : {}),
            ...(firstByteAt !== undefined
              ? { timeToFirstByteMs: Math.max(0, firstByteAt - requestStartedAt) }
              : {}),
            streamDurationMs: Math.max(0, streamCompletedAt - requestStartedAt),
            totals: traceTotals,
          },
        }),
      );
      lastRequestId = requestId;

      if (roundUsage !== undefined) {
        const usage = toUsageSnapshot(roundUsage);
        const cumulativeUsage = addUsage(lastUsage, usage);
        lastUsage = cumulativeUsage;
        yield* Effect.flatMap(deps.stamp, (stamp) =>
          deps.publish({
            type: "thread.token-usage.updated",
            ...stamp,
            provider: deps.provider,
            ...instanceFields,
            threadId: input.threadId,
            turnId: input.turnId,
            payload: { usage: cumulativeUsage },
          }),
        );
      }

      if (calls.length === 0) {
        finalText = assembled.trim();
        yield* publishExecutionProgress({
          stage: "finalize",
          requestNumber: requestStart.requestNumber,
          toolCalls: 0,
          outcome: "completed",
        });
        break;
      }
      yield* publishExecutionProgress({
        stage: "execute",
        requestNumber: requestStart.requestNumber,
        toolCalls: calls.length,
        outcome: "continued",
      });

      messages.push({
        role: "assistant",
        content: assembled.length > 0 ? assembled : null,
        tool_calls: calls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments },
        })),
      });
      contextLedger.add(messages[messages.length - 1]!);
      const observations = yield* scheduleToolCalls(
        calls.map((call) => {
          const tool = offered.find((candidate) => candidate.name === call.name);
          const argumentsObject = parseToolArgs(call.arguments) ?? {};
          return {
            id: call.id,
            name: call.name,
            arguments: argumentsObject,
            rawArguments: call.arguments,
            mutation: tool?.invalidatesVerification === true,
            ...(tool?.dedupeSafeRead === true
              ? { dedupeKey: fingerprintToolCall(call.name, argumentsObject) }
              : {}),
          };
        }),
        {
          maxConcurrentSafeTools: 8,
          execute: (call) =>
            executeToolCall({
              id: call.id,
              name: call.name,
              arguments: call.rawArguments ?? JSON.stringify(call.arguments),
            }).pipe(
              Effect.catch((error) =>
                Effect.succeed(`Error: ${error instanceof Error ? error.message : String(error)}`),
              ),
            ),
        },
      );
      for (const observation of observations) {
        messages.push({ role: "tool", tool_call_id: observation.id, content: observation.content });
        contextLedger.add(messages[messages.length - 1]!);
      }
      contextLedger.compact(48_000);
      messages.splice(
        0,
        messages.length,
        ...(contextLedger.toMessages() as Array<AgentLoopMessage>),
      );
    }

    if (finalText === undefined) {
      return yield* requestFailed(
        deps.provider,
        "The agent completed its provider request budget without producing a final answer.",
      );
    }

    requestBudget.markOutcome("completed");
    return {
      finalText,
      ...(lastUsage !== undefined ? { usage: lastUsage } : {}),
      systemPromptHash,
    };
  });
