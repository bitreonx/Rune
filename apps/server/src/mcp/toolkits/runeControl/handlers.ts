import {
  type ScheduleAccessScope,
  type ScheduleCommandReceipt,
  type ScheduleCreateInput,
  type ScheduleListInput,
  type ScheduleRunsInput,
  type ScheduleUpdateInput,
  type RuneSchedule,
  type ScheduleRun,
  type ProjectId,
  type ThreadId,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as ProjectionThreadRepository from "../../../persistence/Services/ProjectionThreads.ts";
import {
  ScheduleRegistry,
  scheduleRegistryFailure,
} from "../../../persistence/Services/ScheduleRegistry.ts";
import {
  RuneControlToolkit,
  type RuneSchedulesCreateInput,
  type RuneSchedulesHistoryInput,
  type RuneSchedulesListInput,
  type RuneSchedulesUpdateInput,
} from "./tools.ts";

const scopeFailure = (message: string, scheduleId?: RuneSchedule["id"]) =>
  scheduleRegistryFailure(
    "authorization-required",
    message,
    scheduleId === undefined ? {} : { scheduleId },
  );

const resolveProjectId = Effect.fn("RuneControlToolkit.resolveProjectId")(function* (
  invocation: McpInvocationContext.McpInvocationScope,
) {
  const threads = yield* ProjectionThreadRepository.ProjectionThreadRepository;
  const result = yield* threads
    .getById({ threadId: invocation.threadId })
    .pipe(Effect.mapError(() => scopeFailure("The authenticated thread scope could not be verified.")));
  return yield* Option.match(result, {
    onNone: () => Effect.fail(scopeFailure("The authenticated thread no longer exists.")),
    onSome: (thread) =>
      thread.deletedAt === null
        ? Effect.succeed(thread.projectId)
        : Effect.fail(scopeFailure("The authenticated thread no longer exists.")),
  });
});

const resolveScope = Effect.fn("RuneControlToolkit.resolveScope")(function* (
  capability: "schedules-read" | "schedules-write",
) {
  const invocation = yield* McpInvocationContext.requireMcpCapability(capability);
  const projectId = yield* resolveProjectId(invocation);

  const scope: ScheduleAccessScope = {
    environmentId: invocation.environmentId,
    projectIds: [projectId],
    threadIds: [invocation.threadId],
  };
  return { invocation, projectId, scope };
});

const targetForScope = (
  target: RuneSchedulesCreateInput["target"] | RuneSchedulesUpdateInput["target"],
  projectId: ProjectId,
  threadId: ThreadId,
) => {
  if (target === undefined) return undefined;
  return target.type === "prompt"
    ? { ...target, threadId }
    : { ...target, threadId, projectId };
};

export function toMcpScheduleSummary(schedule: RuneSchedule) {
  return {
    id: schedule.id,
    name: schedule.name,
    environmentId: schedule.environmentId,
    ...(schedule.projectId === undefined ? {} : { projectId: schedule.projectId }),
    threadId: schedule.target.threadId,
    targetType: schedule.target.type,
    ...(schedule.target.type === "action" ? { actionId: schedule.target.actionId } : {}),
    displayTimeZone: schedule.displayTimeZone,
    policy: {
      approvalPolicy: schedule.policy.approvalPolicy,
      allowProviderFallback: schedule.policy.allowProviderFallback,
      catchUp: schedule.policy.catchUp,
      ...(schedule.policy.providerInstanceId === undefined
        ? {}
        : { providerInstanceId: schedule.policy.providerInstanceId }),
      ...(schedule.policy.maxRuns === undefined ? {} : { maxRuns: schedule.policy.maxRuns }),
    },
    status: schedule.status,
    version: schedule.version,
    nextRunAt: schedule.nextRunAt,
    ...(schedule.lastRunAt === undefined ? {} : { lastRunAt: schedule.lastRunAt }),
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    createdBy: schedule.createdBy,
  };
}

export function toMcpRunSummary(run: ScheduleRun) {
  return {
    id: run.id,
    scheduleId: run.scheduleId,
    trigger: run.trigger,
    scheduledFor: run.scheduledFor,
    createdAt: run.createdAt,
    ...(run.startedAt === undefined ? {} : { startedAt: run.startedAt }),
    ...(run.completedAt === undefined ? {} : { completedAt: run.completedAt }),
    status: run.status,
    threadId: run.threadId,
  };
}

const toMcpReceiptSummary = (receipt: {
  readonly commandId: ScheduleCommandReceipt["commandId"];
  readonly operation: ScheduleCommandReceipt["operation"];
  readonly scheduleId: ScheduleCommandReceipt["scheduleId"];
  readonly runId?: ScheduleCommandReceipt["runId"];
  readonly recordedAt: ScheduleCommandReceipt["recordedAt"];
}) => ({
  commandId: receipt.commandId,
  operation: receipt.operation,
  scheduleId: receipt.scheduleId,
  ...(receipt.runId === undefined ? {} : { runId: receipt.runId }),
  recordedAt: receipt.recordedAt,
});

const toMcpMutationResult = (result: {
  readonly schedule: RuneSchedule;
  readonly receipt: Parameters<typeof toMcpReceiptSummary>[0];
}) => ({
  schedule: toMcpScheduleSummary(result.schedule),
  receipt: toMcpReceiptSummary(result.receipt),
});

const handlers = {
  rune_schedule_list: (input: RuneSchedulesListInput) =>
    resolveScope("schedules-read").pipe(
      Effect.flatMap(({ scope }) =>
        ScheduleRegistry.pipe(
          Effect.flatMap((registry) =>
            registry.list(scope, {
              ...input,
              threadId: scope.threadIds?.[0],
              limit: input.limit ?? 100,
            } as ScheduleListInput),
          ),
        ),
      ),
      Effect.map((result) => ({
        schedules: result.schedules.map(toMcpScheduleSummary),
        sequence: result.sequence,
      })),
    ),

  rune_schedule_create: (input: RuneSchedulesCreateInput) =>
    resolveScope("schedules-write").pipe(
      Effect.flatMap(({ invocation, projectId, scope }) =>
        ScheduleRegistry.pipe(
          Effect.flatMap((registry) =>
            registry.create(
              scope,
              {
                ...input,
                environmentId: invocation.environmentId,
                projectId,
                target: targetForScope(input.target, projectId, invocation.threadId)!,
              } as ScheduleCreateInput,
              "agent",
            ),
          ),
        ),
      ),
      Effect.map(toMcpMutationResult),
    ),

  rune_schedule_update: (input: RuneSchedulesUpdateInput) =>
    resolveScope("schedules-write").pipe(
      Effect.flatMap(({ projectId, scope, invocation }) =>
        ScheduleRegistry.pipe(
          Effect.flatMap((registry) =>
            registry.update(
              scope,
              {
                ...input,
                ...(input.target === undefined
                  ? {}
                  : { target: targetForScope(input.target, projectId, invocation.threadId) }),
              } as ScheduleUpdateInput,
            ),
          ),
        ),
      ),
      Effect.map(toMcpMutationResult),
    ),

  rune_schedule_pause: (input) =>
    resolveScope("schedules-write").pipe(
      Effect.flatMap(({ scope }) =>
        ScheduleRegistry.pipe(Effect.flatMap((registry) => registry.pause(scope, input))),
      ),
      Effect.map(toMcpMutationResult),
    ),

  rune_schedule_resume: (input) =>
    resolveScope("schedules-write").pipe(
      Effect.flatMap(({ scope }) =>
        ScheduleRegistry.pipe(Effect.flatMap((registry) => registry.resume(scope, input))),
      ),
      Effect.map(toMcpMutationResult),
    ),

  rune_schedule_delete: (input) =>
    resolveScope("schedules-write").pipe(
      Effect.flatMap(({ scope }) =>
        ScheduleRegistry.pipe(Effect.flatMap((registry) => registry.remove(scope, input))),
      ),
      Effect.map(toMcpMutationResult),
    ),

  rune_schedule_run_now: (input) =>
    resolveScope("schedules-write").pipe(
      Effect.flatMap(({ scope }) =>
        ScheduleRegistry.pipe(Effect.flatMap((registry) => registry.runNow(scope, input))),
      ),
      Effect.map((result) => ({
        schedule: toMcpScheduleSummary(result.schedule),
        run: toMcpRunSummary(result.run),
        receipt: toMcpReceiptSummary(result.receipt),
      })),
    ),

  rune_schedule_run_history: (input: RuneSchedulesHistoryInput) =>
    resolveScope("schedules-read").pipe(
      Effect.flatMap(({ scope }) =>
        ScheduleRegistry.pipe(
          Effect.flatMap((registry) =>
            registry.runs(scope, {
              ...input,
              limit: input.limit ?? 100,
            } as ScheduleRunsInput),
          ),
        ),
      ),
      Effect.map((result) => ({ runs: result.runs.map(toMcpRunSummary) })),
    ),
} satisfies Parameters<typeof RuneControlToolkit.toLayer>[0];

export const RuneControlToolkitHandlersLive = RuneControlToolkit.toLayer(handlers);

export const RuneControlToolkitHandlers = handlers;
