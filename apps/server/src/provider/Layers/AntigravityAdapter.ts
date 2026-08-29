import {
  EventId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderApprovalDecision,
  type ProviderRuntimeEvent,
  type ProviderSendTurnInput,
  type ProviderSession,
  type ProviderSessionStartInput,
  type ProviderUserInputAnswers,
  type ThreadId,
  TurnId,
} from "@rune/contracts";
import { getModelSelectionStringOptionValue } from "@rune/shared/model";
import { resolveSpawnCommand } from "@rune/shared/shell";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as PubSub from "effect/PubSub";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { ChildProcess } from "effect/unstable/process";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterSessionClosedError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
  type ProviderAdapterErrorStage,
  type ProviderAdapterError,
} from "../Errors.ts";
import type {
  ProviderAdapterShape,
  ProviderThreadSnapshot,
  ProviderThreadTurnSnapshot,
} from "../Services/ProviderAdapter.ts";
import type { AntigravitySettings } from "@rune/contracts";
import {
  buildAntigravityCliArgs,
  makeAntigravityResumeCursor,
  parseAntigravityStreamLine,
  readAntigravityConversationId,
  serializeAntigravityUserMessage,
} from "../antigravityProtocol.ts";

const PROVIDER = ProviderDriverKind.make("antigravity");
const MAX_STDERR_TAIL_CHARS = 8_000;
const MAX_FAILURE_TOMBSTONES = 256;
const SESSION_READY_TIMEOUT_MS = 30_000;

type AntigravityEffort = "low" | "medium" | "high";

export interface AntigravityAdapterLiveOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly instanceId?: ProviderInstanceId;
  /** Testable bound for the provider init handshake; production defaults to 30s. */
  readonly sessionReadyTimeoutMs?: number;
}

interface AntigravitySessionContext {
  readonly threadId: ThreadId;
  readonly generation: number;
  readonly scope: Scope.Closeable;
  readonly child: ChildProcessSpawner.ChildProcessHandle;
  readonly turns: ProviderThreadTurnSnapshot[];
  session: ProviderSession;
  currentModel: string | undefined;
  currentEffort: AntigravityEffort | undefined;
  readonly ready: Deferred.Deferred<void, ProviderAdapterProcessError>;
  readonly expectedConversationId: string | undefined;
  stderrTail: string;
  failure: ProviderAdapterProcessError | undefined;
  activeTurnId: TurnId | undefined;
  responseTextSeen: boolean;
  stopped: boolean;
  outputFiber: Fiber.Fiber<void, never> | undefined;
  stderrFiber: Fiber.Fiber<void, never> | undefined;
  exitFiber: Fiber.Fiber<void, never> | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

const SENSITIVE_DIAGNOSTIC_KEY =
  /^(?:authorization|access[_-]?token|refresh[_-]?token|token|api[_-]?key|password|secret|credential)s?$/i;

function redactSensitiveText(value: string): string {
  return value
    .replace(
      /((?:authorization|access[_-]?token|refresh[_-]?token|token|api[_-]?key|password|secret|credential)s?\s*[:=]\s*)(?:Bearer\s+)?[^\s"',}]+/gi,
      "$1[redacted]",
    )
    .replace(
      /((?:["'])(?:authorization|access[_-]?token|refresh[_-]?token|token|api[_-]?key|password|secret|credential)s?(?:["'])\s*:\s*["'])[^"']*(["'])/gi,
      "$1[redacted]$2",
    );
}

function sanitizeDiagnosticValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") return redactSensitiveText(value).slice(0, MAX_STDERR_TAIL_CHARS);
  if (Array.isArray(value)) {
    return value.slice(0, 64).map((entry) => sanitizeDiagnosticValue(entry, depth + 1));
  }
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 128)
      .map(([key, entry]) => [
        key,
        SENSITIVE_DIAGNOSTIC_KEY.test(key)
          ? "[redacted]"
          : sanitizeDiagnosticValue(entry, depth + 1),
      ]),
  );
}

function serializeDiagnostic(value: unknown): string | undefined {
  if (typeof value === "string") {
    const redacted = redactSensitiveText(value).trim();
    return redacted.slice(0, MAX_STDERR_TAIL_CHARS) || undefined;
  }
  try {
    const serialized = JSON.stringify(sanitizeDiagnosticValue(value));
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
}

function redactStderrTail(value: string): string {
  return redactSensitiveText(value).replace(/\r/g, "").slice(-MAX_STDERR_TAIL_CHARS).trim();
}

function causeClass(cause: unknown): string | undefined {
  if (cause instanceof Error && cause.name.trim()) return cause.name.trim();
  if (cause === undefined || cause === null) return undefined;
  return typeof cause;
}

function makeProcessFailure(input: {
  readonly threadId: ThreadId;
  readonly providerInstanceId?: ProviderInstanceId;
  readonly generation?: number;
  readonly stage: ProviderAdapterErrorStage;
  readonly detail: string;
  readonly recoverable?: boolean;
  readonly cause?: unknown;
  readonly stderrTail?: string;
  readonly exitCode?: number;
}): ProviderAdapterProcessError {
  const detail = redactSensitiveText(input.detail).trim();
  return new ProviderAdapterProcessError({
    provider: PROVIDER,
    threadId: input.threadId,
    detail,
    ...(input.providerInstanceId ? { providerInstanceId: input.providerInstanceId } : {}),
    ...(input.generation !== undefined ? { generation: input.generation } : {}),
    stage: input.stage,
    ...(input.recoverable !== undefined ? { recoverable: input.recoverable } : {}),
    ...(causeClass(input.cause) ? { causeClass: causeClass(input.cause) } : {}),
    safeMessage: detail,
    ...(input.stderrTail ? { stderrTail: redactStderrTail(input.stderrTail) } : {}),
    ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
    occurredAt: DateTime.formatIso(DateTime.nowUnsafe()),
    ...(input.cause !== undefined ? { cause: input.cause } : {}),
  });
}

function classifyFailureStage(
  detail: string,
  fallback: ProviderAdapterErrorStage,
): ProviderAdapterErrorStage {
  if (
    /\b(?:auth(?:entication|enticated)?|sign(?:ed)?[- ]?in|log[- ]?in|credential|unauthori[sz]ed|forbidden)\b/i.test(
      detail,
    )
  ) {
    return "authentication";
  }
  if (
    /(?:\b(?:model|engine)\b.{0,80}\b(?:not found|unavailable|invalid|unsupported|does not exist)\b|\b(?:not found|unavailable|invalid|unsupported|does not exist)\b.{0,80}\b(?:model|engine)\b)/i.test(
      detail,
    )
  ) {
    return "model-discovery";
  }
  return fallback;
}

function appendStderrTail(ctx: AntigravitySessionContext, chunk: string): void {
  const next = redactStderrTail(`${ctx.stderrTail}${chunk}`);
  ctx.stderrTail = next;
}

function stderrDetail(ctx: AntigravitySessionContext): string {
  const stderr = redactStderrTail(ctx.stderrTail);
  return stderr ? ` Provider output:\n${stderr}` : "";
}

function readEffort(
  selection: ProviderSendTurnInput["modelSelection"] | ProviderSessionStartInput["modelSelection"],
): { readonly value: AntigravityEffort | undefined; readonly invalid: string | undefined } {
  if (!selection) return { value: undefined, invalid: undefined };
  const raw = getModelSelectionStringOptionValue(selection, "effort");
  if (raw === undefined) return { value: undefined, invalid: undefined };
  if (raw === "low" || raw === "medium" || raw === "high") {
    return { value: raw, invalid: undefined };
  }
  return { value: undefined, invalid: raw };
}

function turnStateFromResultStatus(
  status: string | undefined,
): "completed" | "failed" | "interrupted" | "cancelled" {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "INTERRUPTED":
      return "interrupted";
    default:
      return "failed";
  }
}

export function makeAntigravityAdapter(
  antigravitySettings: AntigravitySettings,
  options: AntigravityAdapterLiveOptions = {},
) {
  return Effect.gen(function* () {
    const childProcessSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const crypto = yield* Crypto.Crypto;
    const sessions = new Map<ThreadId, AntigravitySessionContext>();
    const runtimeEventPubSub = yield* PubSub.unbounded<ProviderRuntimeEvent>();
    const boundInstanceId = options.instanceId;
    const sessionReadyTimeoutMs = Math.max(
      0,
      options.sessionReadyTimeoutMs ?? SESSION_READY_TIMEOUT_MS,
    );
    const generationByThread = new Map<ThreadId, number>();
    const failureByThread = new Map<ThreadId, ProviderAdapterProcessError>();
    const rememberFailure = (threadId: ThreadId, failure: ProviderAdapterProcessError): void => {
      if (!failureByThread.has(threadId) && failureByThread.size >= MAX_FAILURE_TOMBSTONES) {
        const oldestThreadId = failureByThread.keys().next().value;
        if (oldestThreadId !== undefined) failureByThread.delete(oldestThreadId);
      }
      failureByThread.set(threadId, failure);
    };

    const nowIso = Effect.map(DateTime.now, DateTime.formatIso);
    const randomUUID = (method: string) =>
      crypto.randomUUIDv4.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterRequestError({
              provider: PROVIDER,
              method,
              detail: "Failed to allocate an Antigravity runtime identifier.",
              cause,
            }),
        ),
      );
    const nextEventId = randomUUID("crypto/randomUUIDv4").pipe(
      Effect.map((value) => EventId.make(value)),
    );
    const nextTurnId = randomUUID("crypto/randomUUIDv4").pipe(
      Effect.map((value) => TurnId.make(value)),
    );
    const makeEventStamp = () => Effect.all({ eventId: nextEventId, createdAt: nowIso });

    const offerRuntimeEvent = (event: ProviderRuntimeEvent) =>
      PubSub.publish(runtimeEventPubSub, event).pipe(Effect.asVoid);

    const rawFor = (event: Record<string, unknown>) => {
      const messageType = stringValue(event.event);
      return {
        source: "antigravity.cli" as const,
        ...(messageType ? { messageType } : {}),
        payload: sanitizeDiagnosticValue(event) as Record<string, unknown>,
      };
    };

    const requireSession = (
      threadId: ThreadId,
    ): Effect.Effect<
      AntigravitySessionContext,
      | ProviderAdapterProcessError
      | ProviderAdapterSessionClosedError
      | ProviderAdapterSessionNotFoundError
    > => {
      const failure = failureByThread.get(threadId);
      if (failure) {
        return Effect.fail(failure);
      }
      const ctx = sessions.get(threadId);
      if (ctx && ctx.stopped) {
        return Effect.fail(new ProviderAdapterSessionClosedError({ provider: PROVIDER, threadId }));
      }
      if (!ctx) {
        return Effect.fail(
          new ProviderAdapterSessionNotFoundError({ provider: PROVIDER, threadId }),
        );
      }
      return Effect.succeed(ctx);
    };

    const isCurrentContext = (ctx: AntigravitySessionContext): boolean =>
      sessions.get(ctx.threadId) === ctx &&
      generationByThread.get(ctx.threadId) === ctx.generation &&
      !ctx.stopped;

    const appendTurnItem = (ctx: AntigravitySessionContext, turnId: TurnId, item: unknown) => {
      const index = ctx.turns.findIndex((entry) => entry.id === turnId);
      if (index < 0) return;
      const turn = ctx.turns[index];
      if (!turn) return;
      ctx.turns[index] = { ...turn, items: [...turn.items, item] };
    };

    const emitTurnCompleted = (
      ctx: AntigravitySessionContext,
      turnId: TurnId,
      state: "completed" | "failed" | "interrupted" | "cancelled",
      options?: {
        readonly errorMessage?: string;
        readonly usage?: unknown;
        readonly raw?: unknown;
      },
    ) =>
      Effect.gen(function* () {
        const stamp = yield* makeEventStamp();
        yield* offerRuntimeEvent({
          type: "turn.completed",
          ...stamp,
          provider: PROVIDER,
          threadId: ctx.threadId,
          turnId,
          ...(isRecord(options?.raw) ? { raw: rawFor(options.raw) } : {}),
          payload: {
            state,
            ...(options?.usage !== undefined ? { usage: options.usage } : {}),
            ...(options?.errorMessage ? { errorMessage: options.errorMessage } : {}),
          },
        });
      });

    const processStreamEvent = (ctx: AntigravitySessionContext, event: Record<string, unknown>) =>
      Effect.gen(function* () {
        if (!isCurrentContext(ctx)) return;
        switch (event.event) {
          case "init": {
            const conversationId = stringValue(event.conversation_id);
            const model = stringValue(event.model);
            if (
              ctx.expectedConversationId !== undefined &&
              ctx.expectedConversationId !== conversationId
            ) {
              const resumeError = makeProcessFailure({
                threadId: ctx.threadId,
                ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
                generation: ctx.generation,
                stage: "resume",
                recoverable: true,
                detail:
                  "Antigravity CLI initialized a different conversation than the persisted resume cursor.",
                stderrTail: ctx.stderrTail,
              });
              ctx.failure = resumeError;
              ctx.stopped = true;
              rememberFailure(ctx.threadId, resumeError);
              sessions.delete(ctx.threadId);
              ctx.session = {
                ...ctx.session,
                status: "error",
                lastError: resumeError.message,
                updatedAt: yield* nowIso,
              };
              yield* Deferred.fail(ctx.ready, resumeError).pipe(Effect.ignore);
              yield* offerRuntimeEvent({
                type: "session.state.changed",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                raw: rawFor(event),
                payload: { state: "error", reason: resumeError.message },
              });
              yield* offerRuntimeEvent({
                type: "session.exited",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                payload: { exitKind: "error", recoverable: true, reason: resumeError.detail },
              });
              yield* Scope.close(ctx.scope, Exit.void).pipe(Effect.ignoreCause({ log: false }));
              return;
            }
            ctx.currentModel = model ?? ctx.currentModel;
            const resumeCursor = conversationId
              ? makeAntigravityResumeCursor(conversationId)
              : undefined;
            ctx.session = {
              ...ctx.session,
              status: "ready",
              ...(ctx.currentModel ? { model: ctx.currentModel } : {}),
              ...(resumeCursor ? { resumeCursor } : {}),
              updatedAt: yield* nowIso,
            };
            yield* Deferred.succeed(ctx.ready, undefined).pipe(Effect.ignore);
            const stamp = yield* makeEventStamp();
            const raw = rawFor(event);
            yield* offerRuntimeEvent({
              type: "session.state.changed",
              ...stamp,
              provider: PROVIDER,
              threadId: ctx.threadId,
              raw,
              payload: { state: "ready", reason: "Antigravity CLI session initialized" },
            });
            if (conversationId) {
              yield* offerRuntimeEvent({
                type: "thread.started",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                raw,
                payload: { providerThreadId: conversationId },
              });
            }
            return;
          }
          case "step_update": {
            const turnId = ctx.activeTurnId;
            if (!turnId) return;
            const stepType = stringValue(event.step_type);
            const raw = rawFor(event);
            const textDelta = stringValue(event.text_delta);
            if (stepType === "agent_response" && textDelta) {
              ctx.responseTextSeen = true;
              appendTurnItem(ctx, turnId, { type: "assistant_message", text: textDelta });
              yield* offerRuntimeEvent({
                type: "content.delta",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                turnId,
                raw,
                payload: { streamKind: "assistant_text", delta: textDelta },
              });
              return;
            }

            if (stepType === "tool") {
              const toolName = stringValue(event.tool_name);
              const toolInfo = serializeDiagnostic(event.tool_info);
              yield* offerRuntimeEvent({
                type: "tool.progress",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                turnId,
                raw,
                payload: {
                  ...(toolName ? { toolName } : {}),
                  ...(toolInfo ? { summary: toolInfo } : {}),
                },
              });
            }
            return;
          }
          case "result": {
            const turnId = ctx.activeTurnId;
            if (!turnId) return;
            const response = stringValue(event.response);
            if (response && !ctx.responseTextSeen) {
              ctx.responseTextSeen = true;
              appendTurnItem(ctx, turnId, { type: "assistant_message", text: response });
              yield* offerRuntimeEvent({
                type: "content.delta",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                turnId,
                raw: rawFor(event),
                payload: { streamKind: "assistant_text", delta: response },
              });
            }

            const status = stringValue(event.status);
            const state = turnStateFromResultStatus(status);
            const errorMessage = serializeDiagnostic(event.error);
            const usage = event.usage;
            appendTurnItem(ctx, turnId, { type: "result", status, response, usage });
            yield* emitTurnCompleted(ctx, turnId, state, {
              ...(errorMessage ? { errorMessage } : {}),
              ...(usage !== undefined ? { usage } : {}),
              raw: event,
            });
            if (state === "failed" && errorMessage) {
              const safeMessage = redactSensitiveText(errorMessage).trim();
              yield* offerRuntimeEvent({
                type: "runtime.error",
                ...(yield* makeEventStamp()),
                provider: PROVIDER,
                threadId: ctx.threadId,
                turnId,
                raw: rawFor(event),
                payload: {
                  message: safeMessage,
                  class: "provider_error",
                  detail: {
                    provider: PROVIDER,
                    ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
                    generation: ctx.generation,
                    stage: classifyFailureStage(errorMessage, "provider-stream"),
                    recoverable: true,
                    safeMessage,
                    ...(ctx.stderrTail ? { stderrTail: redactStderrTail(ctx.stderrTail) } : {}),
                  },
                },
              });
            }
            ctx.activeTurnId = undefined;
            ctx.responseTextSeen = false;
            ctx.session = {
              ...ctx.session,
              status: state === "failed" ? "error" : "ready",
              activeTurnId: undefined,
              ...(errorMessage ? { lastError: errorMessage } : { lastError: undefined }),
              updatedAt: yield* nowIso,
            };
            return;
          }
        }
      });

    const handleOutputLine = (ctx: AntigravitySessionContext, line: string) => {
      const parsed = parseAntigravityStreamLine(line);
      if (!parsed) return Effect.void;
      return processStreamEvent(ctx, parsed).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Failed to process Antigravity CLI stream event.", {
            threadId: ctx.threadId,
            cause,
          }),
        ),
      );
    };

    const handleProcessExit = (
      ctx: AntigravitySessionContext,
      exitCode: number | undefined,
    ): Effect.Effect<void, never> =>
      Effect.gen(function* () {
        if (
          sessions.get(ctx.threadId) !== ctx ||
          generationByThread.get(ctx.threadId) !== ctx.generation
        ) {
          return;
        }
        if (ctx.stopped) return;
        ctx.stopped = true;
        // The stderr reader continuously appends to a bounded tail. Do not
        // wait for stderr EOF here: a provider can close its exit signal before
        // closing stderr, and lifecycle failure reporting must never stall on
        // an unclosed diagnostic stream.
        const stderr = redactStderrTail(ctx.stderrTail);
        const detail = `Antigravity CLI exited before completing the current lifecycle${exitCode === undefined ? "" : ` (code ${exitCode})`}.${stderr ? ` Provider output:\n${stderr}` : ""}`;
        const failure = makeProcessFailure({
          threadId: ctx.threadId,
          ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
          generation: ctx.generation,
          stage: classifyFailureStage(
            `${detail}\n${stderr}`,
            ctx.activeTurnId ? "provider-stream" : "process-initialization",
          ),
          recoverable: exitCode !== 0,
          detail,
          stderrTail: ctx.stderrTail,
          ...(exitCode !== undefined ? { exitCode } : {}),
        });
        ctx.failure = failure;
        rememberFailure(ctx.threadId, failure);
        sessions.delete(ctx.threadId);
        yield* Deferred.fail(ctx.ready, failure).pipe(Effect.ignore);
        const activeTurnId = ctx.activeTurnId;
        if (activeTurnId) {
          yield* emitTurnCompleted(ctx, activeTurnId, "failed", {
            errorMessage: detail,
          });
          ctx.activeTurnId = undefined;
        }
        ctx.session = {
          ...ctx.session,
          status: "error",
          activeTurnId: undefined,
          lastError: detail,
          updatedAt: yield* nowIso,
        };
        yield* offerRuntimeEvent({
          type: "session.state.changed",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: ctx.threadId,
          payload: { state: "error", reason: detail },
        });
        yield* offerRuntimeEvent({
          type: "session.exited",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: ctx.threadId,
          payload: {
            exitKind: exitCode === 0 ? "graceful" : "error",
            recoverable: exitCode !== 0,
            reason: detail,
          },
        });
        yield* Scope.close(ctx.scope, Exit.void).pipe(Effect.ignoreCause({ log: false }));
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Antigravity CLI exit handling failed.", {
            threadId: ctx.threadId,
            cause,
          }),
        ),
      );

    const startOutputReaders = (ctx: AntigravitySessionContext): Effect.Effect<void, never> =>
      Effect.gen(function* () {
        ctx.outputFiber = yield* ctx.child.stdout.pipe(
          Stream.decodeText(),
          Stream.splitLines,
          Stream.runForEach((line) => handleOutputLine(ctx, line)),
          Effect.catchCause((cause) =>
            Effect.logWarning("Antigravity CLI stdout reader stopped.", {
              threadId: ctx.threadId,
              cause,
            }),
          ),
          Effect.forkIn(ctx.scope),
        );
        ctx.stderrFiber = yield* ctx.child.stderr.pipe(
          Stream.decodeText(),
          Stream.runForEach((chunk) => Effect.sync(() => appendStderrTail(ctx, chunk))),
          Effect.catchCause((cause) =>
            Effect.logWarning("Antigravity CLI stderr reader stopped.", {
              threadId: ctx.threadId,
              cause,
            }),
          ),
          Effect.forkIn(ctx.scope),
        );
        ctx.exitFiber = yield* ctx.child.exitCode.pipe(
          Effect.map(Number),
          Effect.flatMap((exitCode) => handleProcessExit(ctx, exitCode)),
          Effect.catchCause((cause) =>
            Effect.logWarning("Antigravity CLI exit watcher stopped.", {
              threadId: ctx.threadId,
              cause,
            }),
          ),
          Effect.forkIn(ctx.scope),
        );
      });

    const stopSessionInternal = (
      ctx: AntigravitySessionContext,
      options?: {
        readonly turnState?: "interrupted" | "cancelled";
        readonly exitKind?: "graceful" | "error";
        readonly reason?: string;
        readonly diagnostic?: Readonly<Record<string, unknown>>;
      },
    ): Effect.Effect<void, ProviderAdapterRequestError> =>
      Effect.gen(function* () {
        if (ctx.stopped) return;
        ctx.stopped = true;
        sessions.delete(ctx.threadId);
        const activeTurnId = ctx.activeTurnId;
        if (activeTurnId && options?.turnState) {
          yield* offerRuntimeEvent({
            type: "turn.aborted",
            ...(yield* makeEventStamp()),
            provider: PROVIDER,
            threadId: ctx.threadId,
            turnId: activeTurnId,
            payload: {
              reason:
                options.reason ??
                (options.turnState === "interrupted"
                  ? "Antigravity turn interrupted by the user."
                  : "Antigravity session stopped before the turn completed."),
            },
          });
          yield* emitTurnCompleted(
            ctx,
            activeTurnId,
            options.turnState,
            options.reason ? { errorMessage: options.reason } : undefined,
          );
          ctx.activeTurnId = undefined;
        }
        yield* Scope.close(ctx.scope, Exit.void).pipe(Effect.ignoreCause({ log: false }));
        const exitKind = options?.exitKind ?? "graceful";
        if (exitKind === "error") {
          yield* offerRuntimeEvent({
            type: "session.state.changed",
            ...(yield* makeEventStamp()),
            provider: PROVIDER,
            threadId: ctx.threadId,
            payload: {
              state: "error",
              ...(options?.reason ? { reason: options.reason } : {}),
              ...(options?.diagnostic ? { detail: options.diagnostic } : {}),
            },
          });
        }
        yield* offerRuntimeEvent({
          type: "session.exited",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: ctx.threadId,
          payload: {
            exitKind,
            ...(exitKind === "error" ? { recoverable: true } : {}),
            ...(options?.reason ? { reason: options.reason } : {}),
          },
        });
      });

    const writeUserMessage = (ctx: AntigravitySessionContext, content: string) =>
      Stream.run(
        Stream.encodeText(Stream.make(serializeAntigravityUserMessage(content))),
        ctx.child.stdin,
      ).pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterRequestError({
              provider: PROVIDER,
              method: "stream/user",
              detail: `Failed to write a user turn to the Antigravity CLI process.${stderrDetail(ctx)}`,
              cause,
            }),
        ),
      );

    const startSession: ProviderAdapterShape<ProviderAdapterError>["startSession"] = (input) =>
      Effect.gen(function* () {
        if (input.provider !== undefined && input.provider !== PROVIDER) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "startSession",
            issue: `Expected provider '${PROVIDER}' but received '${input.provider}'.`,
          });
        }
        if (!input.cwd?.trim()) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "startSession",
            issue: "cwd is required and must be non-empty.",
          });
        }

        const modelSelection =
          input.modelSelection?.instanceId === boundInstanceId ? input.modelSelection : undefined;
        const resumeConversationId = readAntigravityConversationId(input.resumeCursor);
        const resumeCursor = resumeConversationId
          ? makeAntigravityResumeCursor(resumeConversationId)
          : undefined;
        const effort = readEffort(modelSelection);
        if (effort.invalid) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "startSession",
            issue: `Unsupported Antigravity effort '${effort.invalid}'. Use low, medium, or high.`,
          });
        }

        const existing = sessions.get(input.threadId);
        if (existing) yield* stopSessionInternal(existing);
        failureByThread.delete(input.threadId);
        const generation = (generationByThread.get(input.threadId) ?? 0) + 1;
        generationByThread.set(input.threadId, generation);

        const sessionScope = yield* Scope.make("sequential");
        let sessionScopeTransferred = false;
        yield* Effect.addFinalizer(() =>
          sessionScopeTransferred ? Effect.void : Scope.close(sessionScope, Exit.void),
        );

        const binary = antigravitySettings.binaryPath || "agy";
        const cliArgs = buildAntigravityCliArgs({
          ...(modelSelection?.model ? { model: modelSelection.model } : {}),
          ...(effort.value ? { effort: effort.value } : {}),
          ...(resumeConversationId ? { conversationId: resumeConversationId } : {}),
          dangerouslySkipPermissions: input.runtimeMode === "full-access",
        });
        const spawnCommand = yield* resolveSpawnCommand(
          binary,
          cliArgs,
          options.environment ? { env: options.environment } : {},
        ).pipe(
          Effect.mapError(
            (cause) =>
              makeProcessFailure({
                threadId: input.threadId,
                ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
                generation,
                stage: "binary-discovery",
                recoverable: true,
                detail: "Failed to resolve the Antigravity CLI command.",
                cause,
              }),
          ),
          Effect.tapError((failure) =>
            Effect.sync(() => rememberFailure(input.threadId, failure)),
          ),
        );
        const child = yield* childProcessSpawner
          .spawn(
            ChildProcess.make(spawnCommand.command, spawnCommand.args, {
              cwd: input.cwd.trim(),
              env: options.environment,
              shell: spawnCommand.shell,
            }),
          )
          .pipe(
            Effect.mapError(
              (cause) =>
                makeProcessFailure({
                  threadId: input.threadId,
                  ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
                  generation,
                  stage: "process-spawn",
                  recoverable: true,
                  detail: `Failed to start Antigravity CLI '${binary}'.`,
                  cause,
                }),
            ),
            Effect.tapError((failure) =>
              Effect.sync(() => rememberFailure(input.threadId, failure)),
            ),
          );

        yield* Scope.addFinalizer(
          sessionScope,
          child.kill({ killSignal: "SIGTERM" }).pipe(Effect.catch(() => Effect.void)),
        );

        const createdAt = yield* nowIso;
        const ready = yield* Deferred.make<void, ProviderAdapterProcessError>();
        const session: ProviderSession = {
          provider: PROVIDER,
          ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
          status: "connecting",
          runtimeMode: input.runtimeMode,
          cwd: input.cwd.trim(),
          ...(modelSelection?.model ? { model: modelSelection.model } : {}),
          threadId: input.threadId,
          ...(resumeCursor ? { resumeCursor } : {}),
          createdAt,
          updatedAt: createdAt,
        };
        const ctx: AntigravitySessionContext = {
          threadId: input.threadId,
          generation,
          scope: sessionScope,
          child,
          turns: [],
          session,
          currentModel: modelSelection?.model,
          currentEffort: effort.value,
          ready,
          expectedConversationId: resumeConversationId,
          stderrTail: "",
          failure: undefined,
          activeTurnId: undefined,
          responseTextSeen: false,
          stopped: false,
          outputFiber: undefined,
          stderrFiber: undefined,
          exitFiber: undefined,
        };
        sessions.set(input.threadId, ctx);
        sessionScopeTransferred = true;
        yield* startOutputReaders(ctx);

        yield* offerRuntimeEvent({
          type: "session.started",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: input.threadId,
          payload: {
            message: "Antigravity CLI session starting.",
            ...(resumeCursor ? { resume: resumeCursor } : {}),
          },
        });
        yield* offerRuntimeEvent({
          type: "session.state.changed",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: input.threadId,
          payload: { state: "starting", reason: "Waiting for Antigravity CLI initialization." },
        });
        yield* offerRuntimeEvent({
          type: "runtime.warning",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: input.threadId,
          payload: {
            message:
              "Antigravity headless mode does not expose RUNE's approval control channel; agy's own permission policy remains authoritative. Provider conversations resume by their persisted conversation id.",
          },
        });

        return session;
      }).pipe(Effect.scoped);

    const sendTurn: ProviderAdapterShape<ProviderAdapterError>["sendTurn"] = (input) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(input.threadId);
        const text = input.input?.trim();
        if (!text) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "sendTurn",
            issue: "Antigravity requires non-empty text input.",
          });
        }
        if (ctx.activeTurnId) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "sendTurn",
            issue:
              "Antigravity does not support steering an active turn; interrupt it or wait for completion.",
          });
        }

        // The CLI documents that the first stream prompt can be lost while it
        // is still initializing. Waiting on the init event also guarantees
        // that the durable conversation id is available before RUNE persists
        // the turn start.
        const ready = yield* Deferred.await(ctx.ready).pipe(
          Effect.timeoutOption(Duration.millis(sessionReadyTimeoutMs)),
        );
        if (Option.isNone(ready)) {
          const failure = makeProcessFailure({
            threadId: input.threadId,
            ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
            generation: ctx.generation,
            stage: "process-initialization",
            recoverable: true,
            detail:
              `Antigravity CLI did not initialize within ${sessionReadyTimeoutMs / 1000} seconds.${stderrDetail(ctx)}`,
            stderrTail: ctx.stderrTail,
          });
          ctx.failure = failure;
          ctx.session = {
            ...ctx.session,
            status: "error",
            lastError: failure.detail,
            updatedAt: yield* nowIso,
          };
          rememberFailure(input.threadId, failure);
          yield* stopSessionInternal(ctx, {
            exitKind: "error",
            reason: failure.detail,
            diagnostic: {
              provider: PROVIDER,
              ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
              generation: failure.generation,
              stage: failure.stage,
              recoverable: failure.recoverable,
              safeMessage: failure.safeMessage,
              ...(failure.stderrTail ? { stderrTail: failure.stderrTail } : {}),
              ...(failure.occurredAt ? { occurredAt: failure.occurredAt } : {}),
            },
          }).pipe(Effect.ignore);
          return yield* failure;
        }

        const modelSelection =
          input.modelSelection?.instanceId === boundInstanceId ? input.modelSelection : undefined;
        if (
          modelSelection?.model &&
          ctx.currentModel &&
          modelSelection.model !== ctx.currentModel
        ) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "sendTurn",
            issue: "Changing the Antigravity model requires starting a new session.",
          });
        }
        const effort = readEffort(modelSelection);
        if (effort.invalid) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "sendTurn",
            issue: `Unsupported Antigravity effort '${effort.invalid}'. Use low, medium, or high.`,
          });
        }
        if (effort.value && ctx.currentEffort && effort.value !== ctx.currentEffort) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "sendTurn",
            issue: "Changing Antigravity effort requires starting a new session.",
          });
        }

        const turnId = yield* nextTurnId;
        ctx.activeTurnId = turnId;
        ctx.responseTextSeen = false;
        ctx.session = {
          ...ctx.session,
          status: "running",
          activeTurnId: turnId,
          updatedAt: yield* nowIso,
        };
        ctx.turns.push({ id: turnId, items: [] });
        yield* offerRuntimeEvent({
          type: "turn.started",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: input.threadId,
          turnId,
          payload: {
            ...(ctx.currentModel ? { model: ctx.currentModel } : {}),
            ...(ctx.currentEffort ? { effort: ctx.currentEffort } : {}),
          },
        });

        const writeResult = yield* writeUserMessage(ctx, text).pipe(Effect.result);
        if (writeResult._tag === "Failure") {
          const failure = makeProcessFailure({
            threadId: input.threadId,
            ...(boundInstanceId ? { providerInstanceId: boundInstanceId } : {}),
            generation: ctx.generation,
            stage: "turn-dispatch",
            recoverable: true,
            detail: writeResult.failure.detail,
            cause: writeResult.failure,
            stderrTail: ctx.stderrTail,
          });
          ctx.failure = failure;
          rememberFailure(input.threadId, failure);
          ctx.stopped = true;
          sessions.delete(input.threadId);
          const failedTurnId = ctx.activeTurnId;
          ctx.activeTurnId = undefined;
          ctx.session = {
            ...ctx.session,
            status: "error",
            activeTurnId: undefined,
            lastError: failure.message,
            updatedAt: yield* nowIso,
          };
          if (failedTurnId) {
            yield* emitTurnCompleted(ctx, failedTurnId, "failed", {
              errorMessage: failure.detail,
            });
          }
          yield* Scope.close(ctx.scope, Exit.void).pipe(Effect.ignoreCause({ log: false }));
          yield* offerRuntimeEvent({
            type: "session.exited",
            ...(yield* makeEventStamp()),
            provider: PROVIDER,
            threadId: input.threadId,
            payload: { exitKind: "error", recoverable: true, reason: failure.detail },
          });
          return yield* failure;
        }

        return {
          threadId: input.threadId,
          turnId,
          ...(ctx.session.resumeCursor !== undefined
            ? { resumeCursor: ctx.session.resumeCursor }
            : {}),
        };
      });

    const unsupportedControl = (
      method: string,
      detail: string,
    ): Effect.Effect<never, ProviderAdapterRequestError> =>
      Effect.fail(new ProviderAdapterRequestError({ provider: PROVIDER, method, detail }));

    const interruptTurn: ProviderAdapterShape<ProviderAdapterError>["interruptTurn"] = (
      threadId,
      turnId,
    ) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(threadId);
        if (turnId !== undefined && ctx.activeTurnId !== turnId) return;
        if (!ctx.activeTurnId) return;
        yield* stopSessionInternal(ctx, {
          turnState: "interrupted",
          reason:
            "Antigravity headless mode has no turn-cancel control channel, so the session was terminated.",
        });
      });

    const respondToRequest: ProviderAdapterShape<ProviderAdapterError>["respondToRequest"] = (
      threadId,
      _requestId,
      _decision: ProviderApprovalDecision,
    ) =>
      requireSession(threadId).pipe(
        Effect.andThen(
          unsupportedControl(
            "control_response",
            "Antigravity stream-json does not support interactive approval responses.",
          ),
        ),
      );

    const respondToUserInput: ProviderAdapterShape<ProviderAdapterError>["respondToUserInput"] = (
      threadId,
      _requestId,
      _answers: ProviderUserInputAnswers,
    ) =>
      requireSession(threadId).pipe(
        Effect.andThen(
          unsupportedControl(
            "control_response",
            "Antigravity stream-json does not support interactive user-input responses.",
          ),
        ),
      );

    const stopSession: ProviderAdapterShape<ProviderAdapterError>["stopSession"] = (threadId) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(threadId);
        yield* stopSessionInternal(ctx, { turnState: "cancelled" });
      });

    const listSessions: ProviderAdapterShape<ProviderAdapterError>["listSessions"] = () =>
      Effect.sync(() => Array.from(sessions.values(), (ctx) => ({ ...ctx.session })));

    const hasSession: ProviderAdapterShape<ProviderAdapterError>["hasSession"] = (threadId) =>
      Effect.sync(() => {
        const ctx = sessions.get(threadId);
        return ctx !== undefined && !ctx.stopped;
      });

    const readThread: ProviderAdapterShape<ProviderAdapterError>["readThread"] = (threadId) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(threadId);
        return { threadId, turns: ctx.turns } satisfies ProviderThreadSnapshot;
      });

    const rollbackThread: ProviderAdapterShape<ProviderAdapterError>["rollbackThread"] = (
      threadId,
      numTurns,
    ) =>
      Effect.gen(function* () {
        yield* requireSession(threadId);
        if (!Number.isInteger(numTurns) || numTurns < 1) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "rollbackThread",
            issue: "numTurns must be an integer >= 1.",
          });
        }
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "thread/rollback",
          detail: "Antigravity sessions do not support provider-side rollback.",
        });
      });

    const stopAll: ProviderAdapterShape<ProviderAdapterError>["stopAll"] = () =>
      Effect.forEach(Array.from(sessions.values()), (ctx) => stopSessionInternal(ctx), {
        discard: true,
      });

    yield* Effect.addFinalizer(() =>
      Effect.ignore(stopAll()).pipe(Effect.tap(() => PubSub.shutdown(runtimeEventPubSub))),
    );

    return {
      provider: PROVIDER,
      capabilities: {
        sessionModelSwitch: "unsupported",
        supportsResume: true,
        supportsSteering: false,
        supportsApprovals: false,
        supportsToolStream: true,
        supportsUsage: true,
        supportsNativeSubagents: false,
        supportsPlanEvents: false,
      },
      startSession,
      sendTurn,
      interruptTurn,
      respondToRequest,
      respondToUserInput,
      stopSession,
      listSessions,
      hasSession,
      readThread,
      rollbackThread,
      stopAll,
      streamEvents: Stream.fromPubSub(runtimeEventPubSub),
    } satisfies ProviderAdapterShape<ProviderAdapterError>;
  });
}
