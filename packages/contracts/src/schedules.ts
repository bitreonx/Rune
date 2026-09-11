import * as Schema from "effect/Schema";

import {
  ActionId,
  ActionParameterValue,
} from "./actions.ts";
import {
  CommandId,
  EnvironmentId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

/** Increment when an incompatible schedule wire shape is introduced. */
export const WsScheduleContractVersion = 1 as const;

const SCHEDULE_ID_PATTERN = /^schedule:[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SCHEDULE_RUN_ID_PATTERN = /^schedule-run:[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const SCHEDULE_NAME_MAX_LENGTH = 200;
const SCHEDULE_PROMPT_MAX_LENGTH = 32_000;
const SCHEDULE_PARAMETER_COUNT_MAX = 100;

const makePrefixedId = <Brand extends string>(brand: Brand, pattern: RegExp) =>
  TrimmedNonEmptyString.check(
    Schema.isMaxLength(256),
    Schema.isPattern(pattern),
  ).pipe(Schema.brand(brand));

export const ScheduleId = makePrefixedId("ScheduleId", SCHEDULE_ID_PATTERN);
export type ScheduleId = typeof ScheduleId.Type;

export const ScheduleRunId = makePrefixedId("ScheduleRunId", SCHEDULE_RUN_ID_PATTERN);
export type ScheduleRunId = typeof ScheduleRunId.Type;

const isValidIsoDateTime = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
  Number.isFinite(Date.parse(value));

/** Schedule instants are normalized to UTC by the recurrence helper. */
export const ScheduleDateTime = IsoDateTime.check(
  Schema.makeFilter<typeof IsoDateTime.Type>(isValidIsoDateTime),
);
export type ScheduleDateTime = typeof ScheduleDateTime.Type;

const isValidIanaTimezone = (value: string): boolean => {
  if (value.trim().length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

/** A display hint only; it never changes elapsed-UTC recurrence calculation. */
export const IanaTimezone = TrimmedNonEmptyString
  .check(Schema.makeFilter<typeof TrimmedNonEmptyString.Type>(isValidIanaTimezone))
  .pipe(Schema.brand("IanaTimezone"));
export type IanaTimezone = typeof IanaTimezone.Type;

export const ScheduleTrigger = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("once"),
    runAt: ScheduleDateTime,
  }),
  Schema.Struct({
    type: Schema.Literal("interval"),
    firstRunAt: ScheduleDateTime,
    everySeconds: PositiveInt,
  }),
]);
export type ScheduleTrigger = typeof ScheduleTrigger.Type;

const secretLikeParameterName = /(?:secret|password|passwd|token|api[-_]?key|credential|authorization|private[-_]?key|client[-_]?secret)/iu;

/** Action values accepted by schedules; secret material must use a provider reference. */
export const ScheduleActionParameterValues = Schema.Record(
  Schema.String,
  ActionParameterValue,
).check(
  Schema.makeFilter<Record<string, typeof ActionParameterValue.Type>>(
    (values) =>
      Object.keys(values).length <= SCHEDULE_PARAMETER_COUNT_MAX &&
      Object.keys(values).every((name) => !secretLikeParameterName.test(name)),
  ),
);
export type ScheduleActionParameterValues = typeof ScheduleActionParameterValues.Type;

export const SchedulePromptTarget = Schema.Struct({
  type: Schema.Literal("prompt"),
  threadId: ThreadId,
  prompt: TrimmedNonEmptyString.check(Schema.isMaxLength(SCHEDULE_PROMPT_MAX_LENGTH)),
});
export type SchedulePromptTarget = typeof SchedulePromptTarget.Type;

export const ScheduleActionTarget = Schema.Struct({
  type: Schema.Literal("action"),
  threadId: ThreadId,
  projectId: ProjectId,
  actionId: ActionId,
  parameters: ScheduleActionParameterValues,
});
export type ScheduleActionTarget = typeof ScheduleActionTarget.Type;

export const ScheduleTarget = Schema.Union([SchedulePromptTarget, ScheduleActionTarget]);
export type ScheduleTarget = typeof ScheduleTarget.Type;

export const ScheduleApprovalPolicy = Schema.Literals(["inherit", "never", "always"]);
export type ScheduleApprovalPolicy = typeof ScheduleApprovalPolicy.Type;

export const ScheduleCatchUpPolicy = Schema.Literals(["skip", "coalesce-one"]);
export type ScheduleCatchUpPolicy = typeof ScheduleCatchUpPolicy.Type;

export const SchedulePolicy = Schema.Struct({
  approvalPolicy: ScheduleApprovalPolicy,
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  allowProviderFallback: Schema.Boolean,
  catchUp: ScheduleCatchUpPolicy,
  maxRuns: Schema.optionalKey(PositiveInt),
});
export type SchedulePolicy = typeof SchedulePolicy.Type;

export const ScheduleStatus = Schema.Literals(["active", "paused", "completed", "failed"]);
export type ScheduleStatus = typeof ScheduleStatus.Type;

export const ScheduleCreatedBy = Schema.Literals(["user", "agent"]);
export type ScheduleCreatedBy = typeof ScheduleCreatedBy.Type;

export const RuneSchedule = Schema.Struct({
  id: ScheduleId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(SCHEDULE_NAME_MAX_LENGTH)),
  environmentId: EnvironmentId,
  projectId: Schema.optionalKey(ProjectId),
  trigger: ScheduleTrigger,
  target: ScheduleTarget,
  policy: SchedulePolicy,
  displayTimeZone: IanaTimezone,
  status: ScheduleStatus,
  version: PositiveInt,
  claimedRunCount: NonNegativeInt,
  nextRunAt: Schema.NullOr(ScheduleDateTime),
  lastRunAt: Schema.optionalKey(ScheduleDateTime),
  createdAt: ScheduleDateTime,
  updatedAt: ScheduleDateTime,
  createdBy: ScheduleCreatedBy,
});
export type RuneSchedule = typeof RuneSchedule.Type;

export const ScheduleRunTrigger = Schema.Literals(["scheduled", "manual"]);
export type ScheduleRunTrigger = typeof ScheduleRunTrigger.Type;

export const ScheduleRunStatus = Schema.Literals([
  "claimed",
  "dispatching",
  "running",
  "succeeded",
  "blocked",
  "failed",
  "skipped",
  "dispatch-uncertain",
]);
export type ScheduleRunStatus = typeof ScheduleRunStatus.Type;

export const ScheduleRun = Schema.Struct({
  id: ScheduleRunId,
  scheduleId: ScheduleId,
  trigger: ScheduleRunTrigger,
  scheduledFor: ScheduleDateTime,
  createdAt: ScheduleDateTime,
  startedAt: Schema.optionalKey(ScheduleDateTime),
  completedAt: Schema.optionalKey(ScheduleDateTime),
  status: ScheduleRunStatus,
  leaseOwner: Schema.optionalKey(TrimmedNonEmptyString),
  leaseExpiresAt: Schema.optionalKey(ScheduleDateTime),
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  threadId: ThreadId,
  orchestrationCommandId: Schema.optionalKey(CommandId),
  actionRunId: Schema.optionalKey(TrimmedNonEmptyString),
  providerReceiptId: Schema.optionalKey(TrimmedNonEmptyString),
  receiptSummary: Schema.optionalKey(TrimmedNonEmptyString),
  error: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ScheduleRun = typeof ScheduleRun.Type;

export const ScheduleMutationOperation = Schema.Literals([
  "create",
  "update",
  "pause",
  "resume",
  "delete",
  "run-now",
]);
export type ScheduleMutationOperation = typeof ScheduleMutationOperation.Type;

/** Durable acknowledgement for an idempotent schedule command. */
export const ScheduleCommandReceipt = Schema.Struct({
  commandId: CommandId,
  idempotencyKey: TrimmedNonEmptyString,
  operation: ScheduleMutationOperation,
  scheduleId: ScheduleId,
  runId: Schema.optionalKey(ScheduleRunId),
  environmentId: EnvironmentId,
  threadId: Schema.optionalKey(ThreadId),
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  recordedAt: ScheduleDateTime,
});
export type ScheduleCommandReceipt = typeof ScheduleCommandReceipt.Type;

export const ScheduleMutationResult = Schema.Struct({
  schedule: RuneSchedule,
  receipt: ScheduleCommandReceipt,
});
export type ScheduleMutationResult = typeof ScheduleMutationResult.Type;

export const ScheduleRunNowResult = Schema.Struct({
  schedule: RuneSchedule,
  run: ScheduleRun,
  receipt: ScheduleCommandReceipt,
});
export type ScheduleRunNowResult = typeof ScheduleRunNowResult.Type;

export const ScheduleCreateInput = Schema.Struct({
  idempotencyKey: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(SCHEDULE_NAME_MAX_LENGTH)),
  environmentId: EnvironmentId,
  projectId: Schema.optionalKey(ProjectId),
  trigger: ScheduleTrigger,
  target: ScheduleTarget,
  policy: SchedulePolicy,
  displayTimeZone: IanaTimezone,
});
export type ScheduleCreateInput = typeof ScheduleCreateInput.Type;

export const ScheduleUpdateInput = Schema.Struct({
  scheduleId: ScheduleId,
  idempotencyKey: TrimmedNonEmptyString,
  expectedVersion: Schema.optionalKey(PositiveInt),
  name: Schema.optionalKey(TrimmedNonEmptyString.check(Schema.isMaxLength(SCHEDULE_NAME_MAX_LENGTH))),
  projectId: Schema.optionalKey(ProjectId),
  trigger: Schema.optionalKey(ScheduleTrigger),
  target: Schema.optionalKey(ScheduleTarget),
  policy: Schema.optionalKey(SchedulePolicy),
  displayTimeZone: Schema.optionalKey(IanaTimezone),
});
export type ScheduleUpdateInput = typeof ScheduleUpdateInput.Type;

export const SchedulePauseInput = Schema.Struct({
  scheduleId: ScheduleId,
  idempotencyKey: TrimmedNonEmptyString,
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type SchedulePauseInput = typeof SchedulePauseInput.Type;

export const ScheduleResumeInput = Schema.Struct({
  scheduleId: ScheduleId,
  idempotencyKey: TrimmedNonEmptyString,
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type ScheduleResumeInput = typeof ScheduleResumeInput.Type;

export const ScheduleDeleteInput = Schema.Struct({
  scheduleId: ScheduleId,
  idempotencyKey: TrimmedNonEmptyString,
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type ScheduleDeleteInput = typeof ScheduleDeleteInput.Type;

export const ScheduleRunNowInput = Schema.Struct({
  scheduleId: ScheduleId,
  idempotencyKey: TrimmedNonEmptyString,
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type ScheduleRunNowInput = typeof ScheduleRunNowInput.Type;

export const ScheduleListInput = Schema.Struct({
  projectId: Schema.optionalKey(ProjectId),
  threadId: Schema.optionalKey(ThreadId),
  status: Schema.optionalKey(ScheduleStatus),
  limit: Schema.optionalKey(PositiveInt),
});
export type ScheduleListInput = typeof ScheduleListInput.Type;

export const ScheduleGetInput = Schema.Struct({
  scheduleId: ScheduleId,
});
export type ScheduleGetInput = typeof ScheduleGetInput.Type;

export const ScheduleRunsInput = Schema.Struct({
  scheduleId: Schema.optionalKey(ScheduleId),
  limit: Schema.optionalKey(PositiveInt),
});
export type ScheduleRunsInput = typeof ScheduleRunsInput.Type;

export const ScheduleListResult = Schema.Struct({
  schedules: Schema.Array(RuneSchedule),
  sequence: NonNegativeInt,
});
export type ScheduleListResult = typeof ScheduleListResult.Type;

export const ScheduleRunListResult = Schema.Struct({
  runs: Schema.Array(ScheduleRun),
});
export type ScheduleRunListResult = typeof ScheduleRunListResult.Type;

export const ScheduleNextDueResult = Schema.Struct({
  nextRunAt: Schema.NullOr(ScheduleDateTime),
  scheduleIds: Schema.Array(ScheduleId),
});
export type ScheduleNextDueResult = typeof ScheduleNextDueResult.Type;

export const ScheduleRunSettlementInput = Schema.Struct({
  runId: ScheduleRunId,
  status: Schema.Literals(["succeeded", "blocked", "failed", "skipped", "dispatch-uncertain"]),
  completedAt: ScheduleDateTime,
  receiptSummary: Schema.optionalKey(TrimmedNonEmptyString),
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  threadId: Schema.optionalKey(ThreadId),
  orchestrationCommandId: Schema.optionalKey(CommandId),
  actionRunId: Schema.optionalKey(TrimmedNonEmptyString),
  providerReceiptId: Schema.optionalKey(TrimmedNonEmptyString),
  error: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ScheduleRunSettlementInput = typeof ScheduleRunSettlementInput.Type;

export const ScheduleAccessScope = Schema.Struct({
  environmentId: EnvironmentId,
  projectIds: Schema.optionalKey(Schema.Array(ProjectId)),
  threadIds: Schema.optionalKey(Schema.Array(ThreadId)),
});
export type ScheduleAccessScope = typeof ScheduleAccessScope.Type;

export const ScheduleOccurrenceResult = Schema.Union([
  Schema.Struct({ status: Schema.Literal("next"), at: ScheduleDateTime }),
  Schema.Struct({ status: Schema.Literal("completed") }),
]);
export type ScheduleOccurrenceResult = typeof ScheduleOccurrenceResult.Type;

export const ScheduleMissedOccurrenceDecision = Schema.Union([
  Schema.Struct({ status: Schema.Literal("none"), nextRunAt: ScheduleDateTime }),
  Schema.Struct({ status: Schema.Literal("skip"), nextRunAt: ScheduleDateTime }),
  Schema.Struct({
    status: Schema.Literal("coalesce-one"),
    scheduledFor: ScheduleDateTime,
    nextRunAt: ScheduleDateTime,
  }),
  Schema.Struct({ status: Schema.Literal("completed") }),
]);
export type ScheduleMissedOccurrenceDecision = typeof ScheduleMissedOccurrenceDecision.Type;

export const ScheduleEventKind = Schema.Literals([
  "created",
  "updated",
  "paused",
  "resumed",
  "deleted",
  "run-claimed",
  "dispatch-issued",
  "run-settled",
]);
export type ScheduleEventKind = typeof ScheduleEventKind.Type;

export const ScheduleEvent = Schema.Struct({
  sequence: PositiveInt,
  scheduleId: ScheduleId,
  kind: ScheduleEventKind,
  at: ScheduleDateTime,
  schedule: Schema.optionalKey(RuneSchedule),
  run: Schema.optionalKey(ScheduleRun),
});
export type ScheduleEvent = typeof ScheduleEvent.Type;

export const ScheduleSubscribeInput = Schema.Struct({
  projectId: Schema.optionalKey(ProjectId),
  threadId: Schema.optionalKey(ThreadId),
  afterSequence: Schema.optionalKey(NonNegativeInt),
});
export type ScheduleSubscribeInput = typeof ScheduleSubscribeInput.Type;

export const ScheduleSubscriptionSnapshot = Schema.Struct({
  type: Schema.Literal("snapshot"),
  sequence: NonNegativeInt,
  schedules: Schema.Array(RuneSchedule),
  runs: Schema.Array(ScheduleRun),
});
export type ScheduleSubscriptionSnapshot = typeof ScheduleSubscriptionSnapshot.Type;

export const ScheduleSubscriptionMessage = Schema.Union([
  ScheduleSubscriptionSnapshot,
  ScheduleEvent,
]);
export type ScheduleSubscriptionMessage = typeof ScheduleSubscriptionMessage.Type;

export const ScheduleExecutionResult = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("succeeded"),
    summary: TrimmedNonEmptyString,
    providerInstanceId: Schema.optionalKey(ProviderInstanceId),
    threadId: ThreadId,
    orchestrationCommandId: Schema.optionalKey(CommandId),
    actionRunId: Schema.optionalKey(TrimmedNonEmptyString),
    providerReceiptId: Schema.optionalKey(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    status: Schema.Literal("blocked"),
    reason: TrimmedNonEmptyString,
    threadId: ThreadId,
    actionRunId: Schema.optionalKey(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    status: Schema.Literals(["failed", "dispatch-uncertain"]),
    reason: TrimmedNonEmptyString,
    threadId: ThreadId,
    orchestrationCommandId: Schema.optionalKey(CommandId),
  }),
]);
export type ScheduleExecutionResult = typeof ScheduleExecutionResult.Type;

export const ScheduleRegistryErrorCode = Schema.Literals([
  "invalid-input",
  "not-found",
  "version-conflict",
  "duplicate-run",
  "unsupported-trigger",
  "unsupported-target",
  "authorization-required",
  "provider-unavailable",
  "persistence-failed",
  "execution-failed",
]);
export type ScheduleRegistryErrorCode = typeof ScheduleRegistryErrorCode.Type;

export class ScheduleRegistryError extends Schema.TaggedErrorClass<ScheduleRegistryError>()(
  "ScheduleRegistryError",
  {
    code: ScheduleRegistryErrorCode,
    message: TrimmedNonEmptyString,
    scheduleId: Schema.optionalKey(ScheduleId),
    runId: Schema.optionalKey(ScheduleRunId),
  },
) {}
