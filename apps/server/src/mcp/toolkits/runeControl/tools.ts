import {
  ActionId,
  CommandId,
  EnvironmentId,
  IanaTimezone,
  ProjectId,
  ProviderInstanceId,
  ScheduleDateTime,
  ScheduleId,
  ScheduleMutationOperation,
  ScheduleRegistryError,
  ScheduleRunId,
  ScheduleStatus,
  ThreadId,
  TrimmedNonEmptyString,
} from "@rune/contracts";
import * as Schema from "effect/Schema";
import { Tool, Toolkit } from "effect/unstable/ai";

import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as ProjectionThreadRepository from "../../../persistence/Services/ProjectionThreads.ts";
import * as ScheduleRegistry from "../../../persistence/Services/ScheduleRegistry.ts";

const dependencies = [
  McpInvocationContext.McpInvocationContext,
  ProjectionThreadRepository.ProjectionThreadRepository,
  ScheduleRegistry.ScheduleRegistry,
];

const MAX_LIST_ITEMS = 100;
const MAX_IDEMPOTENCY_KEY_LENGTH = 256;
const MAX_PARAMETER_COUNT = 32;
const MAX_PARAMETER_VALUE_LENGTH = 4_096;
const MAX_INTERVAL_SECONDS = 366 * 24 * 60 * 60;
const MAX_SCHEDULE_RUNS = 10_000;
const secretLikeParameterName =
  /(?:secret|password|passwd|token|api[-_]?key|credential|authorization|private[-_]?key|client[-_]?secret)/iu;

const described = <T extends Schema.Top>(schema: T, description: string): T =>
  schema.annotate({ description });

const BoundedIdempotencyKey = described(
  TrimmedNonEmptyString.check(Schema.isMaxLength(MAX_IDEMPOTENCY_KEY_LENGTH)),
  "Client-owned key used to make this schedule mutation idempotent.",
);
const BoundedLimit = described(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIST_ITEMS })),
  "Maximum number of records to return. Defaults to 100.",
);
const BoundedEverySeconds = described(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_INTERVAL_SECONDS })),
  "Interval between runs in seconds, from 1 second through 366 days.",
);
const BoundedMaxRuns = described(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_SCHEDULE_RUNS })),
  "Optional maximum number of scheduled runs, up to 10000.",
);
const BoundedScheduleName = TrimmedNonEmptyString.check(Schema.isMaxLength(200));
const BoundedIanaTimezone = IanaTimezone.check(Schema.isMaxLength(128));
const BoundedParameterName = TrimmedNonEmptyString.check(Schema.isMaxLength(64));
const BoundedParameterValue = Schema.Union([
  Schema.String.check(Schema.isMaxLength(MAX_PARAMETER_VALUE_LENGTH)),
  Schema.Number,
  Schema.Boolean,
]);
const BoundedActionParameters = Schema.Record(
  BoundedParameterName,
  BoundedParameterValue,
).check(
  Schema.isMaxProperties(MAX_PARAMETER_COUNT),
  Schema.makeFilter<Record<string, typeof BoundedParameterValue.Type>>(
    (parameters) =>
      Object.keys(parameters).length <= MAX_PARAMETER_COUNT &&
      Object.keys(parameters).every((name) => !secretLikeParameterName.test(name)),
  ),
);

const BoundedScheduleTrigger = Schema.Union([
  Schema.Struct({
    type: described(Schema.Literal("once"), "Run once at the specified instant."),
    runAt: described(ScheduleDateTime, "UTC instant when the one-time schedule should run."),
  }),
  Schema.Struct({
    type: described(Schema.Literal("interval"), "Run repeatedly at a fixed elapsed interval."),
    firstRunAt: described(ScheduleDateTime, "UTC instant for the first interval run."),
    everySeconds: BoundedEverySeconds,
  }),
]);

const BoundedScheduleTarget = Schema.Union([
  Schema.Struct({
    type: described(Schema.Literal("prompt"), "Dispatch a prompt to a thread."),
    prompt: described(
      TrimmedNonEmptyString.check(Schema.isMaxLength(32_000)),
      "Prompt to dispatch. Do not include credentials or other secret material.",
    ),
  }),
  Schema.Struct({
    type: described(Schema.Literal("action"), "Dispatch a saved project action."),
    actionId: described(ActionId, "Saved action identifier to dispatch."),
    parameters: described(
      BoundedActionParameters,
      "Non-secret action parameters. Secret-like parameter names are rejected.",
    ),
  }),
]);

const BoundedSchedulePolicy = Schema.Struct({
  approvalPolicy: described(
    Schema.Literals(["inherit", "never", "always"]),
    "Approval behavior for the scheduled dispatch.",
  ),
  providerInstanceId: Schema.optionalKey(
    described(ProviderInstanceId, "Optional provider instance to use for dispatch."),
  ),
  allowProviderFallback: described(
    Schema.Boolean,
    "Whether the scheduler may use another provider when this one is unavailable.",
  ),
  catchUp: described(
    Schema.Literals(["skip", "coalesce-one"]),
    "How missed intervals are handled after downtime.",
  ),
  maxRuns: Schema.optionalKey(BoundedMaxRuns),
});

const ScheduleIdInput = described(ScheduleId, "Exact schedule identifier returned by RUNE.");
const ExpectedVersion = described(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  "Optional optimistic-concurrency version from the latest schedule result.",
);

export const RuneSchedulesListInput = Schema.Struct({
  status: Schema.optionalKey(
    described(ScheduleStatus, "Optional schedule status filter."),
  ),
  limit: Schema.optionalKey(BoundedLimit),
}).annotate({
  description: "List schedules visible to the authenticated environment, project, and thread.",
});

export const RuneSchedulesCreateInput = Schema.Struct({
  idempotencyKey: BoundedIdempotencyKey,
  name: described(
    BoundedScheduleName,
    "Human-readable schedule name.",
  ),
  trigger: described(BoundedScheduleTrigger, "When this schedule should dispatch."),
  target: described(BoundedScheduleTarget, "Prompt or saved action to dispatch."),
  policy: described(BoundedSchedulePolicy, "Approval, provider fallback, and catch-up policy."),
  displayTimeZone: described(BoundedIanaTimezone, "IANA timezone used only for display."),
}).annotate({
  description: "Create an environment-local schedule bound to this authenticated thread.",
});
export type RuneSchedulesCreateInput = typeof RuneSchedulesCreateInput.Type;

export const RuneSchedulesUpdateInput = Schema.Struct({
  scheduleId: ScheduleIdInput,
  idempotencyKey: BoundedIdempotencyKey,
  expectedVersion: Schema.optionalKey(ExpectedVersion),
  name: Schema.optionalKey(
    described(BoundedScheduleName, "Replacement schedule name."),
  ),
  trigger: Schema.optionalKey(described(BoundedScheduleTrigger, "Replacement run timing.")),
  target: Schema.optionalKey(described(BoundedScheduleTarget, "Replacement dispatch target.")),
  policy: Schema.optionalKey(described(BoundedSchedulePolicy, "Replacement execution policy.")),
  displayTimeZone: Schema.optionalKey(
    described(BoundedIanaTimezone, "Replacement IANA display timezone."),
  ),
}).annotate({
  description: "Update a schedule that is inside the authenticated environment, project, and thread scope.",
});
export type RuneSchedulesUpdateInput = typeof RuneSchedulesUpdateInput.Type;

const RuneSchedulesMutationInput = Schema.Struct({
  scheduleId: ScheduleIdInput,
  idempotencyKey: BoundedIdempotencyKey,
  expectedVersion: Schema.optionalKey(ExpectedVersion),
});

export const RuneSchedulesHistoryInput = Schema.Struct({
  scheduleId: Schema.optionalKey(ScheduleIdInput),
  limit: Schema.optionalKey(BoundedLimit),
}).annotate({
  description: "List bounded run history for schedules visible to this credential.",
});
export type RuneSchedulesListInput = typeof RuneSchedulesListInput.Type;
export type RuneSchedulesHistoryInput = typeof RuneSchedulesHistoryInput.Type;

const RuneScheduleSummary = Schema.Struct({
  id: ScheduleId,
  name: BoundedScheduleName,
  environmentId: EnvironmentId,
  projectId: Schema.optionalKey(ProjectId),
  threadId: ThreadId,
  targetType: Schema.Literals(["prompt", "action"]),
  actionId: Schema.optionalKey(ActionId),
  displayTimeZone: BoundedIanaTimezone,
  policy: BoundedSchedulePolicy,
  status: ScheduleStatus,
  version: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  nextRunAt: Schema.NullOr(ScheduleDateTime),
  lastRunAt: Schema.optionalKey(ScheduleDateTime),
  createdAt: ScheduleDateTime,
  updatedAt: ScheduleDateTime,
  createdBy: Schema.Literals(["user", "agent"]),
});

const RuneScheduleReceipt = Schema.Struct({
  commandId: CommandId,
  operation: ScheduleMutationOperation,
  scheduleId: ScheduleId,
  runId: Schema.optionalKey(ScheduleRunId),
  recordedAt: ScheduleDateTime,
});

export const RuneSchedulesListResult = Schema.Struct({
  schedules: Schema.Array(RuneScheduleSummary).check(Schema.isMaxLength(MAX_LIST_ITEMS)),
  sequence: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});

export const RuneSchedulesMutationResult = Schema.Struct({
  schedule: RuneScheduleSummary,
  receipt: RuneScheduleReceipt,
});

const RuneScheduleRunSummary = Schema.Struct({
  id: ScheduleRunId,
  scheduleId: ScheduleId,
  trigger: Schema.Literals(["scheduled", "manual"]),
  scheduledFor: ScheduleDateTime,
  createdAt: ScheduleDateTime,
  startedAt: Schema.optionalKey(ScheduleDateTime),
  completedAt: Schema.optionalKey(ScheduleDateTime),
  status: Schema.Literals([
    "claimed",
    "dispatching",
    "running",
    "succeeded",
    "blocked",
    "failed",
    "skipped",
    "dispatch-uncertain",
  ]),
  threadId: ThreadId,
});

export const RuneSchedulesHistoryResult = Schema.Struct({
  runs: Schema.Array(RuneScheduleRunSummary).check(Schema.isMaxLength(MAX_LIST_ITEMS)),
});

export const RuneSchedulesRunNowResult = Schema.Struct({
  schedule: RuneScheduleSummary,
  run: RuneScheduleRunSummary,
  receipt: RuneScheduleReceipt,
});

export const RuneControlError = Schema.Union([
  McpInvocationContext.McpCapabilityUnavailableError,
  ScheduleRegistryError,
]);

const readTool = <T extends Tool.Any>(tool: T): T =>
  tool
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.Idempotent, true) as T;

const writeTool = <T extends Tool.Any>(tool: T): T =>
  tool
    .annotate(Tool.Readonly, false)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.Idempotent, true) as T;

export const RuneSchedulesListTool = readTool(
  Tool.make("rune_schedule_list", {
    description:
      "List concise, secret-free schedule summaries visible to the authenticated RUNE environment, project, and thread.",
    parameters: RuneSchedulesListInput,
    success: RuneSchedulesListResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "List RUNE schedules"),
);

export const RuneSchedulesCreateTool = writeTool(
  Tool.make("rune_schedule_create", {
    description:
      "Create an idempotent schedule for the authenticated RUNE thread. Environment, project, and target thread scope are checked server-side.",
    parameters: RuneSchedulesCreateInput,
    success: RuneSchedulesMutationResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "Create RUNE schedule"),
);

export const RuneSchedulesUpdateTool = writeTool(
  Tool.make("rune_schedule_update", {
    description:
      "Update an existing schedule within the authenticated RUNE environment, project, and thread scope using an optional expected version.",
    parameters: RuneSchedulesUpdateInput,
    success: RuneSchedulesMutationResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "Update RUNE schedule"),
);

export const RuneSchedulesPauseTool = writeTool(
  Tool.make("rune_schedule_pause", {
    description:
      "Pause a schedule within the authenticated RUNE scope. The mutation is idempotent when its client key is reused.",
    parameters: RuneSchedulesMutationInput,
    success: RuneSchedulesMutationResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "Pause RUNE schedule"),
);

export const RuneSchedulesResumeTool = writeTool(
  Tool.make("rune_schedule_resume", {
    description:
      "Resume a paused schedule within the authenticated RUNE scope. The mutation is idempotent when its client key is reused.",
    parameters: RuneSchedulesMutationInput,
    success: RuneSchedulesMutationResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "Resume RUNE schedule"),
);

export const RuneSchedulesDeleteTool = writeTool(
  Tool.make("rune_schedule_delete", {
    description:
      "Delete a schedule within the authenticated RUNE scope. This is a destructive, idempotent schedule mutation.",
    parameters: RuneSchedulesMutationInput,
    success: RuneSchedulesMutationResult,
    failure: RuneControlError,
    dependencies,
  })
    .annotate(Tool.Title, "Delete RUNE schedule")
    .annotate(Tool.Destructive, true),
);

export const RuneSchedulesRunNowTool = writeTool(
  Tool.make("rune_schedule_run_now", {
    description:
      "Queue one immediate run for a schedule within the authenticated RUNE scope and return its concise run receipt.",
    parameters: RuneSchedulesMutationInput,
    success: RuneSchedulesRunNowResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "Run RUNE schedule now"),
);

export const RuneSchedulesHistoryTool = readTool(
  Tool.make("rune_schedule_run_history", {
    description:
      "List bounded, secret-free run history for schedules visible to the authenticated RUNE scope.",
    parameters: RuneSchedulesHistoryInput,
    success: RuneSchedulesHistoryResult,
    failure: RuneControlError,
    dependencies,
  }).annotate(Tool.Title, "Show RUNE schedule history"),
);

// The wire names follow the native RUNE schedule tools so an agent can use
// the same lifecycle vocabulary across provider-native and MCP sessions.

export const RuneControlToolkit = Toolkit.make(
  RuneSchedulesListTool,
  RuneSchedulesCreateTool,
  RuneSchedulesUpdateTool,
  RuneSchedulesPauseTool,
  RuneSchedulesResumeTool,
  RuneSchedulesDeleteTool,
  RuneSchedulesRunNowTool,
  RuneSchedulesHistoryTool,
);
