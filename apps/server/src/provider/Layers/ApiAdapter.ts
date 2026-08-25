import {
  ApprovalRequestId,
  EventId,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderRuntimeEvent,
  ProviderSession,
  ProviderSessionStartInput,
  ProviderSendTurnInput,
  ProviderTurnStartResult,
  RuntimeItemId,
  ThreadId,
  TurnId,
  type ProviderApprovalDecision,
  type ProviderUserInputAnswers,
} from "@t3tools/contracts";
import * as Clock from "effect/Clock";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as PubSub from "effect/PubSub";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";

import {
  apiProviderEndpoint,
  normalizeApiProviderBaseUrl,
} from "@t3tools/contracts";
import { makeCoalescedDeltaSink, resultFromSseLine } from "./ApiSse.ts";
import {
  type ProviderAdapterError,
  ProviderAdapterRequestError,
  ProviderAdapterValidationError,
  ProviderAdapterSessionClosedError,
  ProviderAdapterSessionNotFoundError,
} from "../Errors.ts";
import type {
  ProviderAdapterCapabilities,
  ProviderAdapterShape,
  ProviderThreadSnapshot,
} from "../Services/ProviderAdapter.ts";

interface ApiChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

interface ApiTurnRecord {
  readonly id: TurnId;
  readonly items: Array<unknown>;
}

interface ApiSessionContext {
  readonly threadId: ThreadId;
  session: ProviderSession;
  messages: ApiChatMessage[];
  turns: ApiTurnRecord[];
  activeFiber: Fiber.Fiber<void, never> | undefined;
  activeTurnId: TurnId | undefined;
  stopped: boolean;
}

export interface ApiAdapterOptions {
  readonly provider: ProviderDriverKind;
  readonly instanceId: ProviderInstanceId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly defaultModel: string;
  readonly requestHeaders?: Readonly<Record<string, string>>;
}

export interface ApiProviderAdapter extends ProviderAdapterShape<ProviderAdapterError> {
  readonly fetchModels: (
    operation?: string,
  ) => Effect.Effect<unknown, ProviderAdapterRequestError>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (!isRecord(part)) return "";
      return typeof part.text === "string" ? part.text : "";
    })
    .join("");
}

export function extractOpenAiCompatibleText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  if (typeof payload.output_text === "string") return payload.output_text;
  const choices = payload.choices;
  if (!Array.isArray(choices) || !isRecord(choices[0])) return "";
  const message = choices[0].message;
  if (!isRecord(message)) return "";
  return readTextContent(message.content);
}

export function extractOpenAiCompatibleModelIds(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
  return payload.data.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string") return [];
    const id = entry.id.trim();
    return id.length > 0 ? [id] : [];
  });
}

function requestError(
  provider: ProviderDriverKind,
  operation: string,
  cause: unknown,
): ProviderAdapterRequestError {
  return new ProviderAdapterRequestError({
    provider,
    method: operation,
    detail: "The API request could not be completed.",
    cause,
  });
}

export const makeApiAdapter = Effect.fn("makeApiAdapter")(function* (
  options: ApiAdapterOptions,
) {
  const crypto = yield* Crypto.Crypto;
  const httpClient = yield* HttpClient.HttpClient;
  const adapterScope = yield* Effect.scope;
  const sessions = new Map<ThreadId, ApiSessionContext>();
  const events = yield* PubSub.unbounded<ProviderRuntimeEvent>();
  const capabilities: ProviderAdapterCapabilities = { sessionModelSwitch: "in-session" };
  const baseUrl = normalizeApiProviderBaseUrl(options.baseUrl, options.baseUrl);

  const nowIso = Effect.map(DateTime.now, DateTime.formatIso);
  const nextId = crypto.randomUUIDv4;
  const nextIdentifier = nextId.pipe(
    Effect.mapError((cause) => requestError(options.provider, "crypto.randomUUID", cause)),
  );
  const makeStamp = Effect.all({
    eventId: nextIdentifier.pipe(Effect.map(EventId.make)),
    createdAt: nowIso,
  });
  const publish = (event: ProviderRuntimeEvent) => PubSub.publish(events, event).pipe(Effect.asVoid);

  const makeRequest = (
    operation: string,
    request: ReturnType<typeof HttpClientRequest.get>,
  ) =>
    Effect.succeed(request).pipe(
      Effect.flatMap(httpClient.execute),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Unknown)),
      Effect.mapError((cause) => requestError(options.provider, operation, cause)),
    );

  const withHeaders = (request: ReturnType<typeof HttpClientRequest.get>) => {
    let next = request.pipe(HttpClientRequest.acceptJson);
    if (options.apiKey.trim().length > 0) {
      next = next.pipe(HttpClientRequest.bearerToken(options.apiKey.trim()));
    }
    for (const [name, value] of Object.entries(options.requestHeaders ?? {})) {
      if (value.trim().length > 0) next = next.pipe(HttpClientRequest.setHeader(name, value));
    }
    return next;
  };

  const fetchJson = (operation: string, request: ReturnType<typeof HttpClientRequest.get>) =>
    makeRequest(operation, withHeaders(request));

  const postJson = (operation: string, url: string, body: unknown) => {
    let request = HttpClientRequest.post(url).pipe(HttpClientRequest.acceptJson);
    if (options.apiKey.trim().length > 0) {
      request = request.pipe(HttpClientRequest.bearerToken(options.apiKey.trim()));
    }
    for (const [name, value] of Object.entries(options.requestHeaders ?? {})) {
      if (value.trim().length > 0) request = request.pipe(HttpClientRequest.setHeader(name, value));
    }
    return HttpClientRequest.bodyJson(body)(request).pipe(
      Effect.flatMap(httpClient.execute),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Unknown)),
      Effect.mapError((cause) => requestError(options.provider, operation, cause)),
    );
  };

  // Streaming variant: same envelope as postJson but hands back the live
  // response so the SSE body can be consumed incrementally.
  const postStream = (operation: string, url: string, body: unknown) => {
    let request = HttpClientRequest.post(url).pipe(HttpClientRequest.acceptJson);
    if (options.apiKey.trim().length > 0) {
      request = request.pipe(HttpClientRequest.bearerToken(options.apiKey.trim()));
    }
    for (const [name, value] of Object.entries(options.requestHeaders ?? {})) {
      if (value.trim().length > 0) request = request.pipe(HttpClientRequest.setHeader(name, value));
    }
    return HttpClientRequest.bodyJson(body)(request).pipe(
      Effect.flatMap(httpClient.execute),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.mapError((cause) => requestError(options.provider, operation, cause)),
    );
  };

  const requireSession = (threadId: ThreadId): Effect.Effect<ApiSessionContext, ProviderAdapterError> => {
    const context = sessions.get(threadId);
    if (!context) {
      return Effect.fail(
        new ProviderAdapterSessionNotFoundError({
          provider: options.provider,
          threadId,
        }),
      );
    }
    if (context.stopped || context.session.status === "closed") {
      return Effect.fail(
        new ProviderAdapterSessionClosedError({
          provider: options.provider,
          threadId,
        }),
      );
    }
    return Effect.succeed(context);
  };

  const runTurn = (context: ApiSessionContext, input: ProviderSendTurnInput, turnId: TurnId) =>
    Effect.gen(function* () {
      const selectedModel =
        input.modelSelection?.instanceId === options.instanceId && input.modelSelection.model.trim()
          ? input.modelSelection.model.trim()
          : context.session.model ?? options.defaultModel;
      const userText = input.input?.trim() ?? "";
      if (userText.length === 0) {
        return yield* new ProviderAdapterValidationError({
          provider: options.provider,
          operation: "sendTurn",
          issue: "API providers require text input.",
        });
      }

      context.messages.push({ role: "user", content: userText });
      context.session = {
        ...context.session,
        status: "running",
        model: selectedModel,
        activeTurnId: turnId,
        updatedAt: yield* nowIso,
      };

      // Stream the completion over SSE and forward assistant text as it
      // arrives, coalesced so the orchestration event rate stays bounded.
      const itemId = RuntimeItemId.make(`${String(turnId)}:assistant`);
      let assembled = "";
      const publishDelta = (delta: string) =>
        Effect.flatMap(makeStamp, (stamp) =>
          publish({
            type: "content.delta",
            ...stamp,
            provider: options.provider,
            providerInstanceId: options.instanceId,
            threadId: context.threadId,
            turnId,
            itemId,
            payload: { streamKind: "assistant_text", delta },
          }));
      const sink = makeCoalescedDeltaSink({
        flush: publishDelta,
        now: Clock.currentTimeMillis,
      });

      const streamFailure = (cause: unknown) =>
        requestError(options.provider, "chat/completions", cause);
      yield* postStream(
        "chat/completions",
        apiProviderEndpoint(baseUrl, "chat/completions"),
        { model: selectedModel, messages: context.messages, stream: true },
      ).pipe(
        HttpClientResponse.stream,
        Stream.decodeText,
        Stream.splitLines,
        Stream.runForEach((line) => {
          const parsed = resultFromSseLine(line);
          if (parsed.kind !== "delta" || parsed.text.length === 0) return Effect.void;
          assembled += parsed.text;
          return sink.add(parsed.text);
        }),
        Effect.flatMap(() => sink.end()),
        Effect.mapError(streamFailure),
      );

      const text = assembled.trim();
      if (text.length === 0) {
        return yield* new ProviderAdapterRequestError({
          provider: options.provider,
          method: "chat/completions",
          detail: "The provider returned an empty assistant message.",
        });
      }

      context.messages.push({ role: "assistant", content: text });
      yield* publish({
        type: "item.completed",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId: context.threadId,
        turnId,
        itemId,
        payload: { itemType: "assistant_message", status: "completed", data: { text } },
      });
      context.turns.push({ id: turnId, items: [{ role: "user", content: userText }, { role: "assistant", content: text }] });
      const updatedAt = yield* nowIso;
      const { activeTurnId: _activeTurnId, ...readySession } = context.session;
      context.activeTurnId = undefined;
      context.activeFiber = undefined;
      context.session = { ...readySession, status: "ready", updatedAt };
      yield* publish({
        type: "turn.completed",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId: context.threadId,
        turnId,
        payload: { state: "completed", stopReason: "completed" },
      });
    }).pipe(
      Effect.catch((cause) =>
        Effect.gen(function* () {
          context.activeFiber = undefined;
          context.activeTurnId = undefined;
          context.session = { ...context.session, status: "error", updatedAt: yield* nowIso };
          yield* publish({
            type: "turn.completed",
            ...(yield* makeStamp),
            provider: options.provider,
            providerInstanceId: options.instanceId,
            threadId: context.threadId,
            turnId,
            payload: {
              state: "failed",
              errorMessage: cause instanceof Error ? cause.message : String(cause),
            },
          });
        }),
      ),
      Effect.catch(() => Effect.void),
    );

  const startSession = (input: ProviderSessionStartInput) =>
    Effect.gen(function* () {
      const existing = sessions.get(input.threadId);
      if (existing) {
        existing.stopped = true;
        if (existing.activeFiber) yield* Fiber.interrupt(existing.activeFiber).pipe(Effect.ignore);
      }
      const now = yield* nowIso;
      const selectedModel =
        input.modelSelection?.instanceId === options.instanceId
          ? input.modelSelection.model
          : options.defaultModel;
      const session: ProviderSession = {
        provider: options.provider,
        providerInstanceId: options.instanceId,
        status: "ready",
        runtimeMode: input.runtimeMode,
        ...(input.cwd ? { cwd: input.cwd } : {}),
        ...(selectedModel ? { model: selectedModel } : {}),
        threadId: input.threadId,
        ...(input.resumeCursor !== undefined ? { resumeCursor: input.resumeCursor } : {}),
        createdAt: now,
        updatedAt: now,
      };
      const context: ApiSessionContext = {
        threadId: input.threadId,
        session,
        messages: [],
        turns: [],
        activeFiber: undefined,
        activeTurnId: undefined,
        stopped: false,
      };
      sessions.set(input.threadId, context);
      yield* publish({
        type: "session.started",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId: input.threadId,
        payload: { message: "API session ready" },
      });
      yield* publish({
        type: "session.state.changed",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId: input.threadId,
        payload: { state: "ready" },
      });
      return session;
    });

  const sendTurn = (input: ProviderSendTurnInput): Effect.Effect<ProviderTurnStartResult, ProviderAdapterError> =>
    Effect.gen(function* () {
      const context = yield* requireSession(input.threadId);
      if (context.activeFiber) {
        return yield* new ProviderAdapterValidationError({
          provider: options.provider,
          operation: "sendTurn",
          issue: "This API session is still processing the previous turn.",
        });
      }
      const turnId = TurnId.make(yield* nextIdentifier);
      context.activeTurnId = turnId;
      context.session = { ...context.session, status: "running", activeTurnId: turnId, updatedAt: yield* nowIso };
      yield* publish({
        type: "turn.started",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId: input.threadId,
        turnId,
        payload: { model: context.session.model ?? options.defaultModel },
      });
      context.activeFiber = yield* runTurn(context, input, turnId).pipe(Effect.forkIn(adapterScope));
      return { threadId: input.threadId, turnId } satisfies ProviderTurnStartResult;
    });

  const interruptTurn = (threadId: ThreadId, turnId?: TurnId) =>
    Effect.gen(function* () {
      const context = yield* requireSession(threadId);
      if (turnId !== undefined && context.activeTurnId !== turnId) return;
      const activeTurnId = context.activeTurnId;
      if (context.activeFiber) yield* Fiber.interrupt(context.activeFiber).pipe(Effect.ignore);
      context.activeFiber = undefined;
      context.activeTurnId = undefined;
      context.session = { ...context.session, status: "ready", activeTurnId: undefined, updatedAt: yield* nowIso };
      if (activeTurnId) {
        yield* publish({
          type: "turn.completed",
          ...(yield* makeStamp),
          provider: options.provider,
          providerInstanceId: options.instanceId,
          threadId,
          turnId: activeTurnId,
          payload: { state: "interrupted", stopReason: "interrupted" },
        });
      }
    });

  const stopSession = (threadId: ThreadId) =>
    Effect.gen(function* () {
      const context = yield* requireSession(threadId);
      if (context.activeFiber) yield* Fiber.interrupt(context.activeFiber).pipe(Effect.ignore);
      context.activeFiber = undefined;
      context.activeTurnId = undefined;
      context.stopped = true;
      context.session = { ...context.session, status: "closed", updatedAt: yield* nowIso };
      yield* publish({
        type: "session.exited",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId,
        payload: { reason: "Stopped by user", exitKind: "graceful" },
      });
    });

  const unsupported = (operation: string) =>
    Effect.fail(
      new ProviderAdapterValidationError({
        provider: options.provider,
        operation,
        issue: "API providers do not support interactive approvals or user-input requests.",
      }),
    );

  return {
    provider: options.provider,
    capabilities,
    startSession,
    sendTurn,
    interruptTurn,
    respondToRequest: (_threadId: ThreadId, _requestId: ApprovalRequestId, _decision: ProviderApprovalDecision) => unsupported("respondToRequest"),
    respondToUserInput: (_threadId: ThreadId, _requestId: ApprovalRequestId, _answers: ProviderUserInputAnswers) => unsupported("respondToUserInput"),
    stopSession,
    listSessions: () => Effect.succeed([...sessions.values()].map((context) => context.session)),
    hasSession: (threadId: ThreadId) => Effect.succeed(sessions.has(threadId)),
    readThread: (threadId: ThreadId): Effect.Effect<ProviderThreadSnapshot, ProviderAdapterError> =>
      requireSession(threadId).pipe(
        Effect.map((context) => ({ threadId, turns: context.turns })),
      ),
    rollbackThread: (threadId: ThreadId, numTurns: number): Effect.Effect<ProviderThreadSnapshot, ProviderAdapterError> =>
      requireSession(threadId).pipe(
        Effect.map((context) => {
          context.turns.splice(Math.max(0, context.turns.length - numTurns));
          context.messages = context.turns.flatMap((turn) =>
            turn.items.flatMap((item) => {
              if (!isRecord(item) || typeof item.role !== "string" || typeof item.content !== "string") return [];
              return item.role === "user" || item.role === "assistant"
                ? [{ role: item.role, content: item.content } satisfies ApiChatMessage]
                : [];
            }),
          );
          return { threadId, turns: context.turns };
        }),
      ),
    stopAll: () => Effect.forEach([...sessions.keys()], stopSession, { discard: true }),
    streamEvents: Stream.fromPubSub(events),
    fetchModels: (operation = "models") => fetchJson(operation, HttpClientRequest.get(apiProviderEndpoint(baseUrl, "models"))),
  } satisfies ApiProviderAdapter;
});
