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
} from "@t3tools/contracts";
import { getModelSelectionStringOptionValue } from "@t3tools/shared/model";
import { resolveSpawnCommand } from "@t3tools/shared/shell";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as PubSub from "effect/PubSub";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { ChildProcess } from "effect/unstable/process";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
  type ProviderAdapterError,
} from "../Errors.ts";
import type {
  ProviderAdapterShape,
  ProviderThreadSnapshot,
  ProviderThreadTurnSnapshot,
} from "../Services/ProviderAdapter.ts";
import type { AntigravitySettings } from "@t3tools/contracts";
import {
  buildAntigravityCliArgs,
  makeAntigravityResumeCursor,
  parseAntigravityStreamLine,
  readAntigravityConversationId,
  serializeAntigravityUserMessage,
} from "../antigravityProtocol.ts";

const PROVIDER = ProviderDriverKind.make("antigravity");

type AntigravityEffort = "low" | "medium" | "high";

export interface AntigravityAdapterLiveOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly instanceId?: ProviderInstanceId;
}

interface AntigravitySessionContext {
  readonly threadId: ThreadId;
  readonly scope: Scope.Closeable;
  readonly child: ChildProcessSpawner.ChildProcessHandle;
  readonly turns: ProviderThreadTurnSnapshot[];
  session: ProviderSession;
  currentModel: string | undefined;
  currentEffort: AntigravityEffort | undefined;
  readonly ready: Deferred.Deferred<void, ProviderAdapterProcessError>;
  readonly expectedConversationId: string | undefined;
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

function serializeDiagnostic(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
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
        payload: event,
      };
    };

    const requireSession = (
      threadId: ThreadId,
    ): Effect.Effect<AntigravitySessionContext, ProviderAdapterSessionNotFoundError> => {
      const ctx = sessions.get(threadId);
      if (!ctx || ctx.stopped) {
        return Effect.fail(
          new ProviderAdapterSessionNotFoundError({ provider: PROVIDER, threadId }),
        );
      }
      return Effect.succeed(ctx);
    };

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
        switch (event.event) {
          case "init": {
            const conversationId = stringValue(event.conversation_id);
            const model = stringValue(event.model);
            if (
              ctx.expectedConversationId !== undefined &&
              ctx.expectedConversationId !== conversationId
            ) {
              const resumeError = new ProviderAdapterProcessError({
                provider: PROVIDER,
                threadId: ctx.threadId,
                detail:
                  "Antigravity CLI initialized a different conversation than the persisted resume cursor.",
              });
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
        if (ctx.stopped) return;
        ctx.stopped = true;
        sessions.delete(ctx.threadId);
        yield* Deferred.fail(
          ctx.ready,
          new ProviderAdapterProcessError({
            provider: PROVIDER,
            threadId: ctx.threadId,
            detail: `Antigravity CLI exited before initialization${exitCode === undefined ? "" : ` (code ${exitCode})`}.`,
          }),
        ).pipe(Effect.ignore);
        const activeTurnId = ctx.activeTurnId;
        if (activeTurnId) {
          yield* emitTurnCompleted(ctx, activeTurnId, "failed", {
            errorMessage: `Antigravity CLI exited before completing the turn${exitCode === undefined ? "" : ` (code ${exitCode})`}.`,
          });
          ctx.activeTurnId = undefined;
        }
        yield* offerRuntimeEvent({
          type: "session.exited",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: ctx.threadId,
          payload: {
            exitKind: exitCode === 0 ? "graceful" : "error",
            recoverable: exitCode !== 0,
            ...(exitCode === undefined
              ? { reason: "Antigravity CLI process exited without an exit code." }
              : { reason: `Antigravity CLI exited with code ${exitCode}.` }),
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
          Stream.runForEach((_chunk) => Effect.void),
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
        readonly reason?: string;
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
        yield* offerRuntimeEvent({
          type: "session.exited",
          ...(yield* makeEventStamp()),
          provider: PROVIDER,
          threadId: ctx.threadId,
          payload: { exitKind: "graceful", reason: options?.reason },
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
              detail: "Failed to write a user turn to the Antigravity CLI process.",
              cause,
            }),
        ),
        Effect.catchCause((cause) =>
          Effect.fail(
            new ProviderAdapterRequestError({
              provider: PROVIDER,
              method: "stream/user",
              detail: "The Antigravity CLI stdin stream closed unexpectedly.",
              cause,
            }),
          ),
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
              new ProviderAdapterProcessError({
                provider: PROVIDER,
                threadId: input.threadId,
                detail: "Failed to resolve the Antigravity CLI command.",
                cause,
              }),
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
                new ProviderAdapterProcessError({
                  provider: PROVIDER,
                  threadId: input.threadId,
                  detail: `Failed to start Antigravity CLI '${binary}'.`,
                  cause,
                }),
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
          scope: sessionScope,
          child,
          turns: [],
          session,
          currentModel: modelSelection?.model,
          currentEffort: effort.value,
          ready,
          expectedConversationId: resumeConversationId,
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
              "Antigravity headless mode does not expose T3 Code's approval control channel; agy's own permission policy remains authoritative. Provider conversations resume by their persisted conversation id.",
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
        // that the durable conversation id is available before T3 persists
        // the turn start.
        yield* Deferred.await(ctx.ready);

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
          ctx.activeTurnId = undefined;
          ctx.session = {
            ...ctx.session,
            status: "error",
            activeTurnId: undefined,
            lastError: writeResult.failure.message,
            updatedAt: yield* nowIso,
          };
          yield* emitTurnCompleted(ctx, turnId, "failed", {
            errorMessage: writeResult.failure.message,
          });
          return yield* writeResult.failure;
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
      capabilities: { sessionModelSwitch: "unsupported" },
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
