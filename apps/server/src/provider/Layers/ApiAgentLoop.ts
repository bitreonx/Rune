import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { apiProviderEndpoint, RuntimeItemId, RuntimeRequestId } from "@rune/contracts";
import type {
  AgentExecutionOutcome,
  AgentExecutionStage,
  ApiModelCapabilities,
  EventId,
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
  type NativeToolContext,
  type NativeToolDef,
} from "./ApiTools.ts";
import { DEFAULT_API_EXECUTION_POLICY, makeRequestBudget } from "./ApiRequestBudget.ts";
import { ApiContextLedger, fingerprintToolCall } from "./ApiContextLedger.ts";
import { scheduleToolCalls } from "./ApiToolScheduler.ts";
import { buildApiRequestBody, resolveApiModelCapabilities } from "./ApiCapabilities.ts";

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
  /** Explicit protocol features advertised by the configured API instance. */
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

const toUsageSnapshot = (raw: Record<string, unknown>): ThreadTokenUsageSnapshot => {
  const inputTokens = nonNegativeInt(raw.prompt_tokens);
  const outputTokens = nonNegativeInt(raw.completion_tokens);
  const usedTokens = nonNegativeInt(raw.total_tokens) ?? (inputTokens ?? 0) + (outputTokens ?? 0);
  const promptDetails = isRecord(raw.prompt_tokens_details) ? raw.prompt_tokens_details : undefined;
  const completionDetails = isRecord(raw.completion_tokens_details)
    ? raw.completion_tokens_details
    : undefined;
  const cachedInputTokens =
    nonNegativeInt(raw.cached_tokens) ??
    nonNegativeInt(raw.prompt_cache_hit_tokens) ??
    nonNegativeInt(promptDetails?.cached_tokens);
  const reasoningOutputTokens = nonNegativeInt(completionDetails?.reasoning_tokens);
  return {
    usedTokens: usedTokens ?? 0,
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(cachedInputTokens !== undefined ? { cachedInputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(reasoningOutputTokens !== undefined ? { reasoningOutputTokens } : {}),
  };
};

const addOptional = (left: number | undefined, right: number | undefined): number | undefined =>
  left === undefined && right === undefined ? undefined : (left ?? 0) + (right ?? 0);

const addUsage = (
  current: ThreadTokenUsageSnapshot | undefined,
  next: ThreadTokenUsageSnapshot,
): ThreadTokenUsageSnapshot => ({
  usedTokens: (current?.usedTokens ?? 0) + next.usedTokens,
  ...(addOptional(current?.inputTokens, next.inputTokens) !== undefined
    ? { inputTokens: addOptional(current?.inputTokens, next.inputTokens) }
    : {}),
  ...(addOptional(current?.outputTokens, next.outputTokens) !== undefined
    ? { outputTokens: addOptional(current?.outputTokens, next.outputTokens) }
    : {}),
  ...(addOptional(current?.cachedInputTokens, next.cachedInputTokens) !== undefined
    ? { cachedInputTokens: addOptional(current?.cachedInputTokens, next.cachedInputTokens) }
    : {}),
  ...(addOptional(current?.reasoningOutputTokens, next.reasoningOutputTokens) !== undefined
    ? {
        reasoningOutputTokens: addOptional(
          current?.reasoningOutputTokens,
          next.reasoningOutputTokens,
        ),
      }
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

const requestUsageFields = (raw: Record<string, unknown> | undefined) => {
  if (raw === undefined) return {};
  const promptDetails = isRecord(raw.prompt_tokens_details) ? raw.prompt_tokens_details : undefined;
  const completionDetails = isRecord(raw.completion_tokens_details)
    ? raw.completion_tokens_details
    : undefined;
  const inputTokens = nonNegativeInt(raw.prompt_tokens);
  const outputTokens = nonNegativeInt(raw.completion_tokens);
  const cachedInputTokens =
    nonNegativeInt(raw.cached_tokens) ??
    nonNegativeInt(raw.prompt_cache_hit_tokens) ??
    nonNegativeInt(promptDetails?.cached_tokens);
  const reasoningTokens = nonNegativeInt(completionDetails?.reasoning_tokens);
  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(cachedInputTokens !== undefined ? { cachedInputTokens } : {}),
    ...(reasoningTokens !== undefined ? { reasoningTokens } : {}),
  };
};

export const runAgenticTurn = (
  deps: AgentLoopDeps,
  input: AgentTurnInput,
): Effect.Effect<AgentTurnResult, ProviderAdapterError> =>
  Effect.gen(function* () {
    // Stable prefix first: identity/guidance never change mid-session, so
    // provider prompt caches reuse them across rounds.
    const systemPrompt = compileSystemPrompt({
      identity: defaultIdentity,
      toolGuidance: defaultToolGuidance,
      ...(input.workspaceInstructions === undefined
        ? {}
        : { workspaceInstructions: input.workspaceInstructions }),
    });
    const systemPromptHash = hashPrompt(systemPrompt);
    const offered: ReadonlyArray<NativeToolDef> =
      input.toolsOverride ?? (input.sandboxReadOnly ? SAFE_TOOLS : NATIVE_TOOLS);
    const toolsWire = offered.map((def) => ({
      type: "function",
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parametersJsonSchema,
      },
    }));
    const apiCapabilities = resolveApiModelCapabilities({
      driver: deps.provider,
      advertised: input.apiCapabilities,
    });
    const url = apiProviderEndpoint(input.baseUrl, "chat/completions");
    const contextLedger = new ApiContextLedger(input.messages);
    const seenToolCalls = new Set<string>();
    const budget = makeRequestBudget(DEFAULT_API_EXECUTION_POLICY);
    const executionStartedAt = yield* Clock.currentTimeMillis;
    let lastUsage: ThreadTokenUsageSnapshot | undefined;
    let finalText: string | undefined;

    const instanceFields =
      deps.providerInstanceId !== undefined ? { providerInstanceId: deps.providerInstanceId } : {};

    const publishExecutionProgress = (progress: {
      readonly stage: AgentExecutionStage;
      readonly requestNumber: number;
      readonly toolCalls: number;
      readonly outcome?: AgentExecutionOutcome;
    }) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
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
        return yield* def.execute(args, deps.toolContext);
      });

    for (let round = 0; ; round += 1) {
      const requestStart = budget.tryStartRequest();
      if (requestStart.kind === "budgetExhausted") {
        yield* publishExecutionProgress({
          stage: "finalize",
          requestNumber: requestStart.snapshot.requestsStarted,
          toolCalls: 0,
          outcome: "exhausted",
        });
        return yield* requestFailed(
          deps.provider,
          `The agent exceeded ${requestStart.snapshot.maxRequests} provider round-trips without completing the task.`,
        );
      }
      const itemId = RuntimeItemId.make(`${String(input.itemIdPrefix)}-${round}`);
      let assembled = "";
      const accumulator = makeToolCallAccumulator();
      let roundUsage: Record<string, unknown> | undefined;
      let firstByteAt: number | undefined;
      let requestAttempt = 0;
      let activeAttempt:
        | {
            readonly requestId: RuntimeRequestId;
            readonly requestNumber: number;
            readonly retry: boolean;
            readonly startedAt: number;
          }
        | undefined;
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
        messages: contextLedger.toMessages() as ReadonlyArray<Record<string, unknown>>,
        tools: toolsWire,
        capabilities: apiCapabilities,
      });

      const publishRequestUsage = (
        attempt:
          | {
              readonly requestId: RuntimeRequestId;
              readonly requestNumber: number;
              readonly retry: boolean;
              readonly startedAt: number;
            }
          | undefined,
        finishedAt: number,
      ) => {
        if (attempt === undefined) return Effect.void;
        return Effect.flatMap(deps.stamp, (stamp) =>
          deps.publish({
            type: "api.request.usage",
            ...stamp,
            provider: deps.provider,
            ...instanceFields,
            threadId: input.threadId,
            turnId: input.turnId,
            requestId: attempt.requestId,
            payload: {
              requestId: attempt.requestId,
              requestNumber: attempt.requestNumber,
              retry: attempt.retry,
              ...requestUsageFields(roundUsage),
              ...(firstByteAt !== undefined
                ? { timeToFirstByteMs: Math.max(0, firstByteAt - attempt.startedAt) }
                : {}),
              streamDurationMs: Math.max(0, finishedAt - attempt.startedAt),
            },
          }),
        );
      };

      const acquireAttempt = (retry: boolean) =>
        Effect.gen(function* () {
          requestAttempt += 1;
          const startedAt = yield* Clock.currentTimeMillis;
          activeAttempt = {
            requestId: RuntimeRequestId.make(
              `${String(input.turnId)}:request:${round + 1}:${requestAttempt}`,
            ),
            requestNumber: round + 1,
            retry,
            startedAt,
          };
          return yield* deps.httpPost(url, body);
        });

      // Transport failures get exactly one retry; the second surfaces. Retries
      // only cover acquiring the stream — once bytes flowed, restarting would
      // double-publish deltas.
      const acquireStream: Effect.Effect<
        Stream.Stream<Uint8Array, ProviderAdapterRequestError>,
        ProviderAdapterRequestError
      > = acquireAttempt(false).pipe(
        Effect.catch((error) => {
          const classified = classifyTransportError({ status: extractStatus(error) });
          if (!classified.retryable) {
            return Clock.currentTimeMillis.pipe(
              Effect.flatMap((finishedAt) =>
                publishRequestUsage(activeAttempt, finishedAt).pipe(
                  Effect.flatMap(() =>
                    Effect.fail(requestFailed(deps.provider, classified.message, error)),
                  ),
                ),
              ),
            );
          }
          const retry = budget.tryStartRetry();
          if (retry.kind !== "allowedRetry") {
            return Clock.currentTimeMillis.pipe(
              Effect.flatMap((finishedAt) =>
                publishRequestUsage(activeAttempt, finishedAt).pipe(
                  Effect.flatMap(() =>
                    Effect.fail(
                      requestFailed(
                        deps.provider,
                        retry.kind === "retryExhausted"
                          ? "The provider request failed after the retry limit was reached."
                          : "The provider request failed after the response had started.",
                        error,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }
          return Clock.currentTimeMillis.pipe(
            Effect.flatMap((finishedAt) =>
              publishRequestUsage(activeAttempt, finishedAt).pipe(
                Effect.flatMap(() =>
                  Effect.sleep("1 seconds").pipe(Effect.flatMap(() => acquireAttempt(true))),
                ),
              ),
            ),
          );
        }),
      );

      yield* publishExecutionProgress({
        stage: round === 0 ? "inspect" : "verify",
        requestNumber: round + 1,
        toolCalls: 0,
      });

      yield* acquireStream.pipe(
        Effect.flatMap((byteStream) =>
          byteStream.pipe(
            Stream.decodeText(),
            Stream.splitLines,
            Stream.runForEach((line) => {
              budget.recordResponseBytes();
              const markFirstByte =
                firstByteAt === undefined
                  ? Clock.currentTimeMillis.pipe(
                      Effect.tap((now) => Effect.sync(() => (firstByteAt = now))),
                    )
                  : Effect.void;
              const parsed = resultFromSseLine(line);
              return markFirstByte.pipe(
                Effect.flatMap(() => {
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
        Effect.ensuring(
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((finishedAt) => publishRequestUsage(activeAttempt, finishedAt)),
          ),
        ),
      );

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

      const calls = accumulator.finish();
      if (calls.length === 0) {
        finalText = assembled.trim();
        yield* publishExecutionProgress({
          stage: "finalize",
          requestNumber: round + 1,
          toolCalls: 0,
          outcome: "completed",
        });
        break;
      }

      yield* publishExecutionProgress({
        stage: "execute",
        requestNumber: round + 1,
        toolCalls: calls.length,
        outcome: "continued",
      });

      contextLedger.add({
        role: "assistant",
        content: assembled.length > 0 ? assembled : null,
        tool_calls: calls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments },
        })),
      });
      const observations = yield* scheduleToolCalls(
        calls.map((call) => ({
          id: call.id,
          name: call.name,
          arguments: parseToolArgs(call.arguments) ?? {},
          rawArguments: call.arguments,
          mutation:
            offered.find((candidate) => candidate.name === call.name)?.requiresApproval ?? false,
        })),
        {
          maxConcurrentSafeTools: DEFAULT_API_EXECUTION_POLICY.maxConcurrentSafeTools,
          execute: (call) =>
            executeToolCall({
              id: call.id,
              name: call.name,
              arguments: call.rawArguments ?? JSON.stringify(call.arguments),
            }),
        },
      );
      for (const observation of observations) {
        contextLedger.add(
          { role: "tool", tool_call_id: observation.id, content: observation.content },
          { key: observation.id },
        );
      }
      contextLedger.compact(DEFAULT_API_EXECUTION_POLICY.maxObservationChars);
    }

    // Unreachable today (the loop only exits via completed text, transport
    // failure, or budget exhaustion), but keeps `finalText` honestly non-empty
    // if an exit path is ever added.
    if (finalText === undefined) {
      return yield* requestFailed(
        deps.provider,
        "The agent ended its turn without a final answer.",
      );
    }

    return {
      finalText,
      ...(lastUsage !== undefined ? { usage: lastUsage } : {}),
      systemPromptHash,
    };
  });
