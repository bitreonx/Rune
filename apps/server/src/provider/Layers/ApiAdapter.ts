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
  RuntimeRequestId,
  ThreadId,
  TurnId,
  type ProviderApprovalDecision,
  type ApiModelCapabilities,
  type ProviderApprovalPolicy,
  type ProviderSandboxMode,
  type ProviderUserInputAnswers,
  type UserInputQuestion,
  type RuntimeRouteReceipt,
} from "@rune/contracts";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as PubSub from "effect/PubSub";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

import { apiProviderEndpoint, normalizeApiProviderBaseUrl } from "@rune/contracts";
import { ProcessRunner } from "../../processRunner.ts";
import { WorkspaceEntries } from "../../workspace/WorkspaceEntries.ts";
import { WorkspaceFileSystem } from "../../workspace/WorkspaceFileSystem.ts";
import { runAgenticTurn, type AgentLoopDeps, type AgentLoopMessage } from "./ApiAgentLoop.ts";
import { askUserTool, NATIVE_TOOLS, SAFE_TOOLS, type NativeToolContext } from "./ApiTools.ts";
import { ApiHarnessLedger, compileOutcomeContract } from "./ApiHarness.ts";
import { decodeApiResumeCursor, encodeApiResumeCursor } from "./ApiSessionState.ts";
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
  approvalPolicy: ProviderApprovalPolicy | undefined;
  sandboxMode: ProviderSandboxMode | undefined;
  workspaceInstructions: string | undefined;
  harnessLedger: ApiHarnessLedger | undefined;
  pendingApprovals: Map<ApprovalRequestId, ApiPendingApproval>;
  pendingUserInputs: Map<ApprovalRequestId, ApiPendingUserInput>;
}

interface ApiPendingApproval {
  readonly deferred: Deferred.Deferred<ProviderApprovalDecision, ProviderAdapterError>;
  readonly requestType: "command_execution_approval" | "file_change_approval";
}

interface ApiPendingUserInput {
  readonly deferred: Deferred.Deferred<ProviderUserInputAnswers, ProviderAdapterError>;
}

export interface ApiAdapterToolServices {
  readonly workspaceFileSystem: typeof WorkspaceFileSystem.Service;
  readonly workspaceEntries: typeof WorkspaceEntries.Service;
  readonly processRunner?: typeof ProcessRunner.Service | undefined;
}

export interface ApiAdapterOptions {
  readonly provider: ProviderDriverKind;
  readonly instanceId: ProviderInstanceId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly defaultModel: string;
  readonly requestHeaders?: Readonly<Record<string, string>>;
  /** Optional protocol features explicitly advertised by this API instance. */
  readonly apiCapabilities?: Partial<ApiModelCapabilities> | undefined;
  /** Secret-free route metadata copied into turn-start diagnostics. */
  readonly runtimeRoute?: Pick<RuntimeRouteReceipt, "connectionId" | "serviceKind" | "accountLabel">;
  /** Workspace services powering the native agent loop's tools. */
  readonly toolServices?: ApiAdapterToolServices | undefined;
}

export interface ApiProviderAdapter extends ProviderAdapterShape<ProviderAdapterError> {
  readonly fetchModels: (operation?: string) => Effect.Effect<unknown, ProviderAdapterRequestError>;
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

export const makeApiAdapter = Effect.fn("makeApiAdapter")(function* (options: ApiAdapterOptions) {
  const crypto = yield* Crypto.Crypto;
  const httpClient = yield* HttpClient.HttpClient;
  const adapterScope = yield* Effect.scope;
  const sessions = new Map<ThreadId, ApiSessionContext>();
  const events = yield* PubSub.unbounded<ProviderRuntimeEvent>();
  const capabilities: ProviderAdapterCapabilities = {
    sessionModelSwitch: "in-session",
    supportsResume: false,
    supportsSteering: false,
    supportsApprovals: true,
    supportsToolStream: true,
    supportsUsage: true,
    supportsNativeSubagents: false,
    supportsPlanEvents: false,
  };
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
  const publish = (event: ProviderRuntimeEvent) =>
    PubSub.publish(events, event).pipe(Effect.asVoid);

  const makeRequest = (operation: string, request: ReturnType<typeof HttpClientRequest.get>) =>
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

  const requireSession = (
    threadId: ThreadId,
  ): Effect.Effect<ApiSessionContext, ProviderAdapterError> => {
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

  /** Best-effort project instructions, kept bounded before entering prompts. */
  const readWorkspaceInstructions = (cwd: string): Effect.Effect<string | undefined, never> =>
    Effect.gen(function* () {
      for (const relativePath of ["AGENTS.md", "CLAUDE.md"]) {
        const contents = yield* options
          .toolServices!.workspaceFileSystem.readFile({ cwd, relativePath })
          .pipe(
            Effect.map((result) => result.contents),
            Effect.orElseSucceed(() => undefined),
          );
        if (contents !== undefined && contents.trim().length > 0) {
          const trimmed = contents.trim();
          return trimmed.length > 8_000 ? `${trimmed.slice(0, 8_000)}\n[truncated]` : trimmed;
        }
      }
      return undefined;
    });

  const runTurn = (context: ApiSessionContext, input: ProviderSendTurnInput, turnId: TurnId) =>
    Effect.gen(function* () {
      const selectedModel =
        input.modelSelection?.instanceId === options.instanceId && input.modelSelection.model.trim()
          ? input.modelSelection.model.trim()
          : (context.session.model ?? options.defaultModel);
      const userText = input.input?.trim() ?? "";
      if (userText.length === 0) {
        return yield* new ProviderAdapterValidationError({
          provider: options.provider,
          operation: "sendTurn",
          issue: "API providers require text input.",
        });
      }

      context.messages.push({ role: "user", content: userText });
      context.harnessLedger = new ApiHarnessLedger(compileOutcomeContract(userText));
      context.session = {
        ...context.session,
        status: "running",
        model: selectedModel,
        activeTurnId: turnId,
        updatedAt: yield* nowIso,
      };

      const cwd = context.session.cwd;
      const toolsAvailable = options.toolServices !== undefined && cwd !== undefined;
      const offeredTools = !toolsAvailable
        ? [askUserTool]
        : context.sandboxMode === "read-only"
          ? SAFE_TOOLS
          : options.toolServices?.processRunner
            ? NATIVE_TOOLS
            : NATIVE_TOOLS.filter((tool) => tool.name !== "shell");
      const toolContext: NativeToolContext | undefined = toolsAvailable
        ? {
            cwd,
            workspaceFileSystem: options.toolServices!.workspaceFileSystem,
            workspaceEntries: options.toolServices!.workspaceEntries,
            processRunner: options.toolServices!.processRunner,
          }
        : undefined;
      const approvalGate: AgentLoopDeps["approvalGate"] =
        toolContext !== undefined &&
        (context.approvalPolicy === "untrusted" || context.approvalPolicy === "on-request")
          ? (gateInput) =>
              Effect.gen(function* () {
                const rawRequestId = yield* nextIdentifier;
                const requestId = ApprovalRequestId.make(rawRequestId);
                const deferred = yield* Deferred.make<
                  ProviderApprovalDecision,
                  ProviderAdapterError
                >();
                const requestType =
                  gateInput.toolName === "shell" || gateInput.toolName === "bash"
                    ? ("command_execution_approval" as const)
                    : ("file_change_approval" as const);
                context.pendingApprovals.set(requestId, { deferred, requestType });
                yield* publish({
                  type: "request.opened",
                  ...(yield* makeStamp),
                  provider: options.provider,
                  providerInstanceId: options.instanceId,
                  threadId: context.threadId,
                  turnId,
                  requestId: RuntimeRequestId.make(rawRequestId),
                  payload: {
                    requestType,
                    detail: gateInput.summary,
                    args: { toolName: gateInput.toolName },
                    options: [
                      { decision: "accept", label: "Allow once" },
                      { decision: "acceptForSession", label: "Allow for session" },
                      { decision: "decline", label: "Deny" },
                    ],
                  },
                });
                const decision = yield* Deferred.await(deferred);
                context.pendingApprovals.delete(requestId);
                if (decision === "decline" || decision === "cancel") {
                  return yield* new ProviderAdapterRequestError({
                    provider: options.provider,
                    method: "approval",
                    detail: `User denied ${gateInput.toolName}.`,
                  });
                }
              })
          : undefined;
      const userInputRequest: NonNullable<AgentLoopDeps["userInputRequest"]> = ({ questions }) =>
        Effect.gen(function* () {
          const requestId = ApprovalRequestId.make(yield* nextIdentifier);
          const deferred = yield* Deferred.make<ProviderUserInputAnswers, ProviderAdapterError>();
          context.pendingUserInputs.set(requestId, { deferred });
          yield* publish({
            type: "user-input.requested",
            ...(yield* makeStamp),
            provider: options.provider,
            providerInstanceId: options.instanceId,
            threadId: context.threadId,
            turnId,
            requestId: RuntimeRequestId.make(String(requestId)),
            payload: { questions: questions satisfies ReadonlyArray<UserInputQuestion> },
          });
          const answers = yield* Deferred.await(deferred);
          context.pendingUserInputs.delete(requestId);
          return answers;
        });
      const result = yield* runAgenticTurn(
        {
          provider: options.provider,
          providerInstanceId: options.instanceId,
          threadId: context.threadId,
          httpPost: (url, body) => {
            const response = postStream("chat/completions", url, body);
            return response.pipe(
              Effect.map((httpResponse) =>
                httpResponse.stream.pipe(
                  Stream.mapError((cause) =>
                    requestError(options.provider, "chat/completions", cause),
                  ),
                ),
              ),
            );
          },
          publish,
          stamp: makeStamp,
          toolContext,
          approvalGate,
          userInputRequest,
          harnessLedger: context.harnessLedger,
        },
        {
          threadId: context.threadId,
          turnId,
          itemIdPrefix: RuntimeItemId.make(`${String(turnId)}:assistant`),
          messages: context.messages as Array<AgentLoopMessage>,
          model: selectedModel,
          baseUrl,
          apiKey: options.apiKey,
          requestHeaders: options.requestHeaders,
          workspaceInstructions: context.workspaceInstructions,
          sandboxReadOnly: context.sandboxMode === "read-only",
          toolsOverride: offeredTools,
          apiCapabilities: options.apiCapabilities,
        },
      );

      const text = result.finalText.trim();
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
        itemId: RuntimeItemId.make(`${String(turnId)}:assistant`),
        payload: { itemType: "assistant_message", status: "completed", data: { text } },
      });
      context.turns.push({
        id: turnId,
        items: [
          { role: "user", content: userText },
          { role: "assistant", content: text },
        ],
      });
      context.session = {
        ...context.session,
        resumeCursor: encodeApiResumeCursor({
          messages: context.messages,
          turns: context.turns.map((turn) => ({
            id: String(turn.id),
            items: turn.items.flatMap((item) => {
              if (
                !isRecord(item) ||
                typeof item.role !== "string" ||
                typeof item.content !== "string"
              ) {
                return [];
              }
              return item.role === "user" || item.role === "assistant"
                ? [{ role: item.role, content: item.content }]
                : [];
            }),
          })),
        }),
      };
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
          yield* failPendingApprovals(
            context,
            cause instanceof Error ? cause.message : String(cause),
          );
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
      const resume = decodeApiResumeCursor(input.resumeCursor);
      const selectedModel =
        input.modelSelection?.instanceId === options.instanceId
          ? input.modelSelection.model
          : options.defaultModel;
      const session: ProviderSession = {
        provider: options.provider,
        providerInstanceId: options.instanceId,
        ...(options.runtimeRoute?.connectionId
          ? { serviceConnectionId: options.runtimeRoute.connectionId }
          : {}),
        status: "ready",
        runtimeMode: input.runtimeMode,
        ...(input.cwd ? { cwd: input.cwd } : {}),
        ...(selectedModel ? { model: selectedModel } : {}),
        threadId: input.threadId,
        ...(resume !== undefined ? { resumeCursor: resume } : {}),
        createdAt: now,
        updatedAt: now,
      };
      const context: ApiSessionContext = {
        threadId: input.threadId,
        session,
        messages:
          resume?.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })) ?? [],
        turns:
          resume?.turns.map(
            (turn): ApiTurnRecord => ({
              id: TurnId.make(turn.id),
              items: turn.items.map((item) => ({ role: item.role, content: item.content })),
            }),
          ) ?? [],
        activeFiber: undefined,
        activeTurnId: undefined,
        stopped: false,
        approvalPolicy: input.approvalPolicy,
        sandboxMode: input.sandboxMode,
        workspaceInstructions: undefined,
        harnessLedger: undefined,
        pendingApprovals: new Map(),
        pendingUserInputs: new Map(),
      };
      if (options.toolServices !== undefined && input.cwd !== undefined) {
        context.workspaceInstructions = yield* readWorkspaceInstructions(input.cwd);
      }
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

  const sendTurn = (
    input: ProviderSendTurnInput,
  ): Effect.Effect<ProviderTurnStartResult, ProviderAdapterError> =>
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
      const selectedModel =
        input.modelSelection?.instanceId === options.instanceId && input.modelSelection.model.trim()
          ? input.modelSelection.model.trim()
          : (context.session.model ?? options.defaultModel);
      context.activeTurnId = turnId;
      context.session = {
        ...context.session,
        status: "running",
        model: selectedModel,
        activeTurnId: turnId,
        updatedAt: yield* nowIso,
      };
      yield* publish({
        type: "turn.started",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId: input.threadId,
        turnId,
        payload: {
          model: selectedModel,
          route: {
            harness: options.provider,
            instanceId: options.instanceId,
            ...(options.runtimeRoute?.connectionId
              ? { connectionId: options.runtimeRoute.connectionId }
              : {}),
            ...(options.runtimeRoute?.serviceKind
              ? { serviceKind: options.runtimeRoute.serviceKind }
              : {}),
            model: selectedModel,
            ...(options.runtimeRoute?.accountLabel
              ? { accountLabel: options.runtimeRoute.accountLabel }
              : {}),
          },
        },
      });
      context.activeFiber = yield* runTurn(context, input, turnId).pipe(
        Effect.forkIn(adapterScope),
      );
      return { threadId: input.threadId, turnId } satisfies ProviderTurnStartResult;
    });

  const interruptTurn = (threadId: ThreadId, turnId?: TurnId) =>
    Effect.gen(function* () {
      const context = yield* requireSession(threadId);
      if (turnId !== undefined && context.activeTurnId !== turnId) return;
      const activeTurnId = context.activeTurnId;
      if (context.activeFiber) yield* Fiber.interrupt(context.activeFiber).pipe(Effect.ignore);
      yield* failPendingApprovals(context, "The turn was interrupted.");
      context.activeFiber = undefined;
      context.activeTurnId = undefined;
      context.session = {
        ...context.session,
        status: "ready",
        activeTurnId: undefined,
        updatedAt: yield* nowIso,
      };
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
      yield* failPendingApprovals(context, "The session was stopped.");
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

  const failPendingApprovals = (context: ApiSessionContext, detail: string) =>
    Effect.gen(function* () {
      for (const pending of context.pendingApprovals.values()) {
        yield* Deferred.fail(
          pending.deferred,
          new ProviderAdapterRequestError({
            provider: options.provider,
            method: "approval",
            detail,
          }),
        ).pipe(Effect.ignore);
      }
      context.pendingApprovals.clear();
      for (const pending of context.pendingUserInputs.values()) {
        yield* Deferred.fail(
          pending.deferred,
          new ProviderAdapterRequestError({
            provider: options.provider,
            method: "user-input",
            detail,
          }),
        ).pipe(Effect.ignore);
      }
      context.pendingUserInputs.clear();
    });

  const respondToRequest = (
    threadId: ThreadId,
    requestId: ApprovalRequestId,
    decision: ProviderApprovalDecision,
  ): Effect.Effect<void, ProviderAdapterError> =>
    Effect.gen(function* () {
      const context = yield* requireSession(threadId);
      const pending = context.pendingApprovals.get(requestId);
      if (!pending) {
        return yield* new ProviderAdapterValidationError({
          provider: options.provider,
          operation: "respondToRequest",
          issue: "No pending approval request with that id.",
        });
      }
      context.pendingApprovals.delete(requestId);
      if (decision === "acceptForSession" || decision === "acceptAlways") {
        context.approvalPolicy = "never";
      }
      yield* Deferred.succeed(pending.deferred, decision);
      yield* publish({
        type: "request.resolved",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId,
        requestId: RuntimeRequestId.make(String(requestId)),
        payload: { requestType: pending.requestType, decision },
      });
    });

  const respondToUserInput = (
    threadId: ThreadId,
    requestId: ApprovalRequestId,
    answers: ProviderUserInputAnswers,
  ): Effect.Effect<void, ProviderAdapterError> =>
    Effect.gen(function* () {
      const context = yield* requireSession(threadId);
      const pending = context.pendingUserInputs.get(requestId);
      if (!pending) {
        return yield* new ProviderAdapterValidationError({
          provider: options.provider,
          operation: "respondToUserInput",
          issue: "No pending user-input request with that id.",
        });
      }
      context.pendingUserInputs.delete(requestId);
      yield* Deferred.succeed(pending.deferred, answers);
      yield* publish({
        type: "user-input.resolved",
        ...(yield* makeStamp),
        provider: options.provider,
        providerInstanceId: options.instanceId,
        threadId,
        requestId: RuntimeRequestId.make(String(requestId)),
        payload: { answers },
      });
    });

  return {
    provider: options.provider,
    capabilities,
    startSession,
    sendTurn,
    interruptTurn,
    respondToRequest,
    respondToUserInput,
    stopSession,
    listSessions: () => Effect.succeed([...sessions.values()].map((context) => context.session)),
    hasSession: (threadId: ThreadId) => Effect.succeed(sessions.has(threadId)),
    readThread: (threadId: ThreadId): Effect.Effect<ProviderThreadSnapshot, ProviderAdapterError> =>
      requireSession(threadId).pipe(Effect.map((context) => ({ threadId, turns: context.turns }))),
    rollbackThread: (
      threadId: ThreadId,
      numTurns: number,
    ): Effect.Effect<ProviderThreadSnapshot, ProviderAdapterError> =>
      requireSession(threadId).pipe(
        Effect.map((context) => {
          context.turns.splice(Math.max(0, context.turns.length - numTurns));
          context.messages = context.turns.flatMap((turn) =>
            turn.items.flatMap((item) => {
              if (
                !isRecord(item) ||
                typeof item.role !== "string" ||
                typeof item.content !== "string"
              )
                return [];
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
    fetchModels: (operation = "models") =>
      fetchJson(operation, HttpClientRequest.get(apiProviderEndpoint(baseUrl, "models"))),
  } satisfies ApiProviderAdapter;
});
