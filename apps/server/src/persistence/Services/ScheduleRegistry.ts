import {
  ScheduleAccessScope,
  ScheduleCommandReceipt,
  ScheduleCreateInput,
  ScheduleDeleteInput,
  ScheduleEvent,
  ScheduleExecutionResult,
  ScheduleGetInput,
  ScheduleListInput,
  ScheduleListResult,
  ScheduleMutationResult,
  ScheduleNextDueResult,
  SchedulePauseInput,
  ScheduleRegistryError,
  ScheduleRegistryErrorCode,
  ScheduleResumeInput,
  ScheduleRun,
  ScheduleRunListResult,
  ScheduleRunNowInput,
  ScheduleRunNowResult,
  ScheduleRunSettlementInput,
  ScheduleRunsInput,
  ScheduleMissedOccurrenceDecision,
  ScheduleSubscribeInput,
  ScheduleSubscriptionSnapshot,
  ScheduleUpdateInput,
  RuneSchedule,
  ScheduleDateTime,
  ScheduleId,
  ScheduleRunId,
} from "@rune/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface ScheduleRegistryShape {
  readonly list: (
    scope: ScheduleAccessScope,
    input: ScheduleListInput,
  ) => Effect.Effect<ScheduleListResult, ScheduleRegistryError>;
  readonly get: (
    scope: ScheduleAccessScope,
    input: ScheduleGetInput,
  ) => Effect.Effect<RuneSchedule, ScheduleRegistryError>;
  readonly create: (
    scope: ScheduleAccessScope,
    input: ScheduleCreateInput,
    createdBy: RuneSchedule["createdBy"],
  ) => Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>;
  readonly update: (
    scope: ScheduleAccessScope,
    input: ScheduleUpdateInput,
  ) => Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>;
  readonly pause: (
    scope: ScheduleAccessScope,
    input: SchedulePauseInput,
  ) => Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>;
  readonly resume: (
    scope: ScheduleAccessScope,
    input: ScheduleResumeInput,
  ) => Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>;
  readonly remove: (
    scope: ScheduleAccessScope,
    input: ScheduleDeleteInput,
  ) => Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>;
  readonly runNow: (
    scope: ScheduleAccessScope,
    input: ScheduleRunNowInput,
  ) => Effect.Effect<ScheduleRunNowResult, ScheduleRegistryError>;
  readonly reconcileMissed: (input: {
    readonly scope: ScheduleAccessScope;
    readonly scheduleId: ScheduleId;
    readonly now: ScheduleDateTime;
  }) => Effect.Effect<{
    readonly schedule: RuneSchedule;
    readonly decision: ScheduleMissedOccurrenceDecision;
  }, ScheduleRegistryError>;
  readonly claimDueRun: (input: {
    readonly scope: ScheduleAccessScope;
    readonly scheduleId: ScheduleId;
    readonly scheduledFor: ScheduleDateTime;
    readonly now: ScheduleDateTime;
    readonly leaseOwner: string;
    readonly leaseForSeconds: number;
    /** Expected current pointer; supplied by the runner to close the coalesce race. */
    readonly expectedNextRunAt?: ScheduleDateTime;
  }) => Effect.Effect<ScheduleRun, ScheduleRegistryError>;
  readonly issueDispatch: (input: {
    readonly scope: ScheduleAccessScope;
    readonly runId: ScheduleRunId;
    readonly leaseOwner: string;
    readonly idempotencyKey: string;
    readonly now: ScheduleDateTime;
  }) => Effect.Effect<ScheduleRun, ScheduleRegistryError>;
  /** Extend an owned, still-live execution lease without appending an event. */
  readonly renewRunLease?: (input: {
    readonly scope: ScheduleAccessScope;
    readonly runId: ScheduleRunId;
    readonly leaseOwner: string;
    readonly leaseForSeconds: number;
    readonly now: ScheduleDateTime;
  }) => Effect.Effect<ScheduleRun, ScheduleRegistryError>;
  readonly reclaimExpiredRuns: (input: {
    readonly scope: ScheduleAccessScope;
    readonly now: ScheduleDateTime;
    readonly leaseOwner: string;
    readonly leaseForSeconds: number;
  }) => Effect.Effect<ReadonlyArray<ScheduleRun>, ScheduleRegistryError>;
  readonly settleRun: (
    scope: ScheduleAccessScope,
    input: ScheduleRunSettlementInput,
  ) => Effect.Effect<ScheduleRun, ScheduleRegistryError>;
  readonly runs: (
    scope: ScheduleAccessScope,
    input: ScheduleRunsInput,
  ) => Effect.Effect<ScheduleRunListResult, ScheduleRegistryError>;
  readonly nextDue: (
    scope: ScheduleAccessScope,
    now: ScheduleDateTime,
  ) => Effect.Effect<ScheduleNextDueResult, ScheduleRegistryError>;
  readonly subscription: (
    scope: ScheduleAccessScope,
    input: ScheduleSubscribeInput,
  ) => Effect.Effect<ScheduleSubscriptionSnapshot, ScheduleRegistryError>;
}

export class ScheduleRegistry extends Context.Service<
  ScheduleRegistry,
  ScheduleRegistryShape
>()("rune/persistence/Services/ScheduleRegistry") {}

export type ScheduleRegistryFailureIds = {
  readonly scheduleId?: ScheduleId;
  readonly runId?: ScheduleRunId;
};

export const scheduleRegistryFailure = (
  code: ScheduleRegistryErrorCode,
  message: string,
  ids: ScheduleRegistryFailureIds = {},
) =>
  new ScheduleRegistryError({
    code,
    message,
    ...(ids.scheduleId === undefined ? {} : { scheduleId: ids.scheduleId }),
    ...(ids.runId === undefined ? {} : { runId: ids.runId }),
  });
