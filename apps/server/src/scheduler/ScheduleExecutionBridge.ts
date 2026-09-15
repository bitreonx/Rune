import {
  CommandId,
  isProviderAvailable,
  MessageId,
  type OrchestrationCommand,
  type ProviderInstanceId,
  type ProviderRuntimeEvent,
  type ServerProvider,
  type RuneSchedule,
  type ScheduleExecutionResult,
  type ScheduleRun,
} from "@rune/contracts";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";

import {
  OrchestrationEngineService,
  type OrchestrationEngineShape,
} from "../orchestration/Services/OrchestrationEngine.ts";
import {
  ProjectionSnapshotQuery,
  type ProjectionSnapshotQueryShape,
} from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import {
  ProviderRegistry,
  type ProviderRegistryShape,
} from "../provider/Services/ProviderRegistry.ts";
import {
  ProviderService,
  type ProviderServiceShape,
} from "../provider/Services/ProviderService.ts";
import type { ScheduleExecutionBridgeShape } from "./ScheduleRunner.ts";

export interface ScheduleExecutionBridgeConfig {
  readonly orchestrationEngine: OrchestrationEngineShape;
  readonly projectionSnapshotQuery: ProjectionSnapshotQueryShape;
  readonly providerService: ProviderServiceShape;
  readonly providerRegistry: ProviderRegistryShape;
  /** Maximum time to wait for a correlated provider terminal event. */
  readonly outcomeTimeoutMs?: number;
}

type PromptTarget = Extract<RuneSchedule["target"], { readonly type: "prompt" }>;
type TerminalEvent = Extract<
  ProviderRuntimeEvent,
  {
    type:
      | "turn.completed"
      | "turn.aborted"
      | "request.opened"
      | "user-input.requested"
      | "runtime.error";
  }
>;
type TurnStartedEvent = Extract<ProviderRuntimeEvent, { type: "turn.started" }>;

const commandIdForRun = (runId: ScheduleRun["id"]): CommandId =>
  CommandId.make(`schedule:${runId}:command`);

const messageIdForRun = (runId: ScheduleRun["id"]): MessageId =>
  MessageId.make(`schedule:${runId}:message`);

const unavailableProviderReason = "Scheduled provider is unavailable.";

const isUsableProvider = (provider: ServerProvider) =>
  isProviderAvailable(provider) &&
  provider.enabled &&
  provider.installed &&
  provider.status !== "error" &&
  provider.status !== "disabled";

const selectProviderInstance = (input: {
  readonly schedule: RuneSchedule;
  readonly threadProviderInstanceId: ProviderInstanceId;
  readonly providers: ReadonlyArray<ServerProvider>;
}): ProviderInstanceId | undefined => {
  const requestedInstanceId =
    input.schedule.policy.providerInstanceId ?? input.threadProviderInstanceId;
  const requested = input.providers.find((provider) => provider.instanceId === requestedInstanceId);
  if (requested !== undefined && isUsableProvider(requested)) {
    return requested.instanceId;
  }

  if (!input.schedule.policy.allowProviderFallback) {
    return undefined;
  }

  // The policy has no alternate list. Registry order is the configured order;
  // selecting the first usable different instance makes fallback deterministic
  // and, importantly, limits one run to one alternate route.
  return input.providers.find(
    (provider) => provider.instanceId !== requestedInstanceId && isUsableProvider(provider),
  )?.instanceId;
};

const sameProviderRoute = (event: ProviderRuntimeEvent, providerInstanceId: ProviderInstanceId) =>
  event.providerInstanceId === providerInstanceId;

const sameTurn = (event: ProviderRuntimeEvent, turnId: TurnStartedEvent["turnId"]) =>
  event.turnId === turnId;

const observeTurnOutcome = (input: {
  readonly events: Stream.Stream<ProviderRuntimeEvent>;
  readonly threadId: ScheduleRun["threadId"];
  readonly providerInstanceId: ProviderInstanceId;
  readonly orchestrationCommandId: CommandId;
  readonly timeoutMs: number;
}) => {
  let started = false;
  let startedTurnId: TurnStartedEvent["turnId"];

  const outcome = input.events.pipe(
    Stream.filter((event) => {
      if (
        !sameProviderRoute(event, input.providerInstanceId) ||
        event.threadId !== input.threadId ||
        event.orchestrationCommandId !== input.orchestrationCommandId
      ) {
        return false;
      }

      if (!started) {
        if (event.type !== "turn.started") return false;
        started = true;
        startedTurnId = event.turnId;
        return false;
      }

      if (!sameTurn(event, startedTurnId)) return false;
      return (
        event.type === "turn.completed" ||
        event.type === "turn.aborted" ||
        event.type === "request.opened" ||
        event.type === "user-input.requested" ||
        event.type === "runtime.error"
      );
    }),
    Stream.runHead,
  );

  return outcome.pipe(
    Effect.timeout(Duration.millis(input.timeoutMs)),
    Effect.map(Option.flatten),
  );
};

const invalidProvenance = (threadId: ScheduleRun["threadId"]): ScheduleExecutionResult => ({
  status: "blocked",
  reason: "Scheduled target provenance is invalid.",
  threadId,
});

const missingThread = (threadId: ScheduleRun["threadId"]): ScheduleExecutionResult => ({
  status: "failed",
  reason: "Scheduled thread is unavailable.",
  threadId,
});

const missingProject = (threadId: ScheduleRun["threadId"]): ScheduleExecutionResult => ({
  status: "failed",
  reason: "Scheduled project is unavailable.",
  threadId,
});

const actionUnsupported = (threadId: ScheduleRun["threadId"]): ScheduleExecutionResult => ({
  status: "blocked",
  reason: "Scheduled action targets are not supported yet.",
  threadId,
});

const turnFailed = (threadId: ScheduleRun["threadId"], commandId: CommandId): ScheduleExecutionResult => ({
  status: "failed",
  reason: "Scheduled provider turn failed.",
  threadId,
  orchestrationCommandId: commandId,
});

const runtimeModeForApprovalPolicy = (
  approvalPolicy: RuneSchedule["policy"]["approvalPolicy"],
  inherited: Extract<OrchestrationCommand, { type: "thread.turn.start" }>["runtimeMode"],
) => {
  switch (approvalPolicy) {
    case "never":
      return "full-access" as const;
    case "always":
      return "approval-required" as const;
    case "inherit":
      return inherited;
  }
};

const dispatchUncertain = (
  threadId: ScheduleRun["threadId"],
  commandId: CommandId,
): ScheduleExecutionResult => ({
  status: "dispatch-uncertain",
  reason: "Scheduled provider turn outcome is unknown.",
  threadId,
  orchestrationCommandId: commandId,
});

const makeTurnStartCommand = (input: {
  readonly prompt: PromptTarget;
  readonly run: ScheduleRun;
  readonly runtimeMode: Extract<OrchestrationCommand, { type: "thread.turn.start" }>["runtimeMode"];
  readonly interactionMode: Extract<OrchestrationCommand, { type: "thread.turn.start" }>["interactionMode"];
  readonly modelSelection: NonNullable<
    Extract<OrchestrationCommand, { type: "thread.turn.start" }>["modelSelection"]
  >;
}): Extract<OrchestrationCommand, { type: "thread.turn.start" }> => ({
  type: "thread.turn.start",
  commandId: commandIdForRun(input.run.id),
  threadId: input.run.threadId,
  message: {
    messageId: messageIdForRun(input.run.id),
    role: "user",
    text: input.prompt.prompt,
    attachments: [],
  },
  modelSelection: input.modelSelection,
  runtimeMode: input.runtimeMode,
  interactionMode: input.interactionMode,
  createdAt: input.run.createdAt,
});

export const makeScheduleExecutionBridge = (
  config: ScheduleExecutionBridgeConfig,
): ScheduleExecutionBridgeShape => ({
  execute: ({ schedule, run }) =>
    Effect.gen(function* () {
      const target = schedule.target;
      if (run.scheduleId !== schedule.id || run.threadId !== target.threadId) {
        return invalidProvenance(run.threadId);
      }

      const threadOption = yield* config.projectionSnapshotQuery
        .getThreadShellById(run.threadId)
        .pipe(Effect.catchAll(() => Effect.succeed(Option.none())));
      if (Option.isNone(threadOption)) return missingThread(run.threadId);
      const thread = threadOption.value;

      const projectOption = yield* config.projectionSnapshotQuery
        .getProjectShellById(thread.projectId)
        .pipe(Effect.catchAll(() => Effect.succeed(Option.none())));
      if (Option.isNone(projectOption)) return missingProject(run.threadId);

      if (schedule.projectId !== undefined && schedule.projectId !== thread.projectId) {
        return invalidProvenance(run.threadId);
      }
      if (target.type === "action") {
        if (
          target.projectId !== thread.projectId ||
          (schedule.projectId !== undefined && schedule.projectId !== target.projectId)
        ) {
          return invalidProvenance(run.threadId);
        }
        return actionUnsupported(run.threadId);
      }

      const providersExit = yield* Effect.exit(config.providerRegistry.getProviders);
      if (Exit.isFailure(providersExit)) return turnFailed(run.threadId, commandIdForRun(run.id));

      const providerInstanceId = selectProviderInstance({
        schedule,
        threadProviderInstanceId: thread.modelSelection.instanceId,
        providers: providersExit.value,
      });
      if (providerInstanceId === undefined) {
        return {
          status: "blocked" as const,
          reason: unavailableProviderReason,
          threadId: run.threadId,
        };
      }

      const command = makeTurnStartCommand({
        prompt: target,
        run,
        runtimeMode: runtimeModeForApprovalPolicy(schedule.policy.approvalPolicy, thread.runtimeMode),
        interactionMode: thread.interactionMode,
        modelSelection: {
          ...thread.modelSelection,
          instanceId: providerInstanceId,
        },
      });
      const events =
        config.providerService.subscribeEvents === undefined
          ? config.providerService.streamEvents
          : yield* config.providerService.subscribeEvents;
      const observer = observeTurnOutcome({
        events,
        threadId: run.threadId,
        providerInstanceId,
        orchestrationCommandId: command.commandId,
        timeoutMs: config.outcomeTimeoutMs ?? 15 * 60 * 1_000,
      });
      const observerFiber = yield* observer.pipe(Effect.forkScoped);

      return yield* Effect.gen(function* () {
        const dispatchExit = yield* Effect.exit(config.orchestrationEngine.dispatch(command));
        if (Exit.isFailure(dispatchExit)) {
          return dispatchUncertain(run.threadId, command.commandId);
        }

        const outcome = yield* Fiber.join(observerFiber);
        if (Option.isNone(outcome)) {
          return dispatchUncertain(run.threadId, command.commandId);
        }

        const event = outcome.value as TerminalEvent;
        switch (event.type) {
          case "request.opened":
          case "user-input.requested": {
            yield* config.providerService
              .interruptTurn({ threadId: run.threadId, turnId: event.turnId })
              .pipe(
                Effect.catchAll((error) =>
                  Effect.logWarning("Could not stop an interactive scheduled turn.", {
                    threadId: run.threadId,
                    turnId: event.turnId,
                    error,
                  }),
                ),
              );
            return {
              status: "blocked" as const,
              reason: "Scheduled turn requires interactive input.",
              threadId: run.threadId,
            };
          }
          case "turn.aborted":
            return turnFailed(run.threadId, command.commandId);
          case "runtime.error":
            return turnFailed(run.threadId, command.commandId);
          case "turn.completed":
            return event.payload.state === "completed"
              ? {
                  status: "succeeded" as const,
                  summary: "Scheduled prompt completed",
                  providerInstanceId,
                  threadId: run.threadId,
                  orchestrationCommandId: command.commandId,
                  providerReceiptId: event.eventId,
                }
              : turnFailed(run.threadId, command.commandId);
        }
      }).pipe(Effect.ensuring(Fiber.interrupt(observerFiber)));
    }),
});

export class ScheduleExecutionBridge extends Context.Service<
  ScheduleExecutionBridge,
  ScheduleExecutionBridgeShape
>()("rune/scheduler/ScheduleExecutionBridge") {}

export const ScheduleExecutionBridgeLive = Layer.effect(
  ScheduleExecutionBridge,
  Effect.gen(function* () {
    const orchestrationEngine = yield* OrchestrationEngineService;
    const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
    const providerService = yield* ProviderService;
    const providerRegistry = yield* ProviderRegistry;
    return makeScheduleExecutionBridge({
      orchestrationEngine,
      projectionSnapshotQuery,
      providerService,
      providerRegistry,
    });
  }),
);
