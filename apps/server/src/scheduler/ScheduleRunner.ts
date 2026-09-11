import {
  ScheduleAccessScope,
  ScheduleDateTime,
  ScheduleExecutionResult,
  ScheduleRegistryError,
  ScheduleRun,
  RuneSchedule,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Context from "effect/Context";

import { ScheduleRegistry, type ScheduleRegistryShape } from "../persistence/Services/ScheduleRegistry.ts";
import { ScheduleClock, type ScheduleClockShape } from "./ScheduleClock.ts";

export interface ScheduleExecutionBridgeShape {
  readonly execute: (input: {
    readonly schedule: RuneSchedule;
    readonly run: ScheduleRun;
  }) => Effect.Effect<ScheduleExecutionResult, ScheduleRegistryError>;
}

export interface ScheduleRunnerShape {
  readonly run: Effect.Effect<void, ScheduleRegistryError>;
}

export class ScheduleRunner extends Context.Service<ScheduleRunner, ScheduleRunnerShape>()(
  "rune/scheduler/ScheduleRunner",
) {}

export interface ScheduleRunnerConfig {
  readonly scope: ScheduleAccessScope;
  readonly leaseOwner: string;
  readonly leaseForSeconds: number;
  readonly registry: ScheduleRegistryShape;
  readonly clock: ScheduleClockShape;
  readonly bridge: ScheduleExecutionBridgeShape;
  readonly idleSleepSeconds?: number;
}

const settlementFor = (run: ScheduleRun, result: ScheduleExecutionResult, at: ScheduleDateTime) => {
  switch (result.status) {
    case "succeeded":
      return {
        runId: run.id,
        status: "succeeded" as const,
        completedAt: at,
        receiptSummary: result.summary,
        threadId: result.threadId,
        ...(result.providerInstanceId === undefined ? {} : { providerInstanceId: result.providerInstanceId }),
        ...(result.orchestrationCommandId === undefined ? {} : { orchestrationCommandId: result.orchestrationCommandId }),
        ...(result.actionRunId === undefined ? {} : { actionRunId: result.actionRunId }),
        ...(result.providerReceiptId === undefined ? {} : { providerReceiptId: result.providerReceiptId }),
      };
    case "blocked":
      return {
        runId: run.id,
        status: "blocked" as const,
        completedAt: at,
        error: result.reason,
        threadId: result.threadId,
        ...(result.actionRunId === undefined ? {} : { actionRunId: result.actionRunId }),
      };
    case "failed":
      return {
        runId: run.id,
        status: "failed" as const,
        completedAt: at,
        error: result.reason,
        threadId: result.threadId,
        ...(result.orchestrationCommandId === undefined ? {} : { orchestrationCommandId: result.orchestrationCommandId }),
      };
    case "dispatch-uncertain":
      return {
        runId: run.id,
        status: "dispatch-uncertain" as const,
        completedAt: at,
        error: result.reason,
        threadId: result.threadId,
        ...(result.orchestrationCommandId === undefined ? {} : { orchestrationCommandId: result.orchestrationCommandId }),
      };
  }
};

export const makeScheduleRunner = (config: ScheduleRunnerConfig): ScheduleRunnerShape => {
  const idleSeconds = config.idleSleepSeconds ?? 30;
  const idleUntil = (now: ScheduleDateTime) => new Date(Date.parse(now) + idleSeconds * 1_000).toISOString() as ScheduleDateTime;

  const executeClaimed = (schedule: RuneSchedule, run: ScheduleRun) =>
    Effect.gen(function* () {
      const dispatchedAt = yield* config.clock.now;
      const dispatching = yield* config.registry.issueDispatch({
        scope: config.scope,
        runId: run.id,
        leaseOwner: config.leaseOwner,
        idempotencyKey: run.id,
        now: dispatchedAt,
      });
      if (dispatching.status !== "dispatching") return;
      const execution = yield* config.bridge.execute({ schedule, run: dispatching }).pipe(
        Effect.catchAll((error) =>
          Effect.succeed(
            error.code === "provider-unavailable" || error.code === "authorization-required"
              ? {
                  status: "blocked" as const,
                  reason: error.message,
                  threadId: run.threadId,
                }
              : {
                  status: "dispatch-uncertain" as const,
                  reason: error.message,
                  threadId: run.threadId,
                },
          ),
        ),
      );
      const completedAt = yield* config.clock.now;
      yield* config.registry.settleRun(config.scope, settlementFor(dispatching, execution, completedAt));
    });

  const processDue = (scheduleId: RuneSchedule["id"]) =>
    Effect.gen(function* () {
      const initial = yield* config.registry.get(config.scope, { scheduleId });
      const initialNow = yield* config.clock.now;
      if (
        initial.nextRunAt === null ||
        initial.status !== "active" ||
        Date.parse(initial.nextRunAt) > Date.parse(initialNow)
      ) return;

      const reconciled = yield* config.registry.reconcileMissed({
        scope: config.scope,
        scheduleId,
        now: initialNow,
      });
      if (reconciled.decision.status !== "coalesce-one") return;

      const run = yield* config.registry.claimDueRun({
        scope: config.scope,
        scheduleId,
        scheduledFor: reconciled.decision.scheduledFor,
        now: yield* config.clock.now,
        leaseOwner: config.leaseOwner,
        leaseForSeconds: config.leaseForSeconds,
        expectedNextRunAt: initial.nextRunAt,
      });
      const current = yield* config.registry.get(config.scope, { scheduleId });
      yield* executeClaimed(current, run);
    });

  const tick = Effect.gen(function* () {
    const now = yield* config.clock.now;
    const reclaimed = yield* config.registry.reclaimExpiredRuns({
      scope: config.scope,
      now,
      leaseOwner: config.leaseOwner,
      leaseForSeconds: config.leaseForSeconds,
    });
    for (const run of reclaimed) {
      if (run.status !== "claimed") continue;
      yield* config.registry.get(config.scope, { scheduleId: run.scheduleId }).pipe(
        Effect.flatMap((schedule) => executeClaimed(schedule, run)),
      );
    }
    const next = yield* config.registry.nextDue(config.scope, now);
    if (next.nextRunAt === null) {
      yield* config.clock.sleepUntil(idleUntil(now));
      return;
    }
    if (Date.parse(next.nextRunAt) > Date.parse(now)) {
      yield* config.clock.sleepUntil(next.nextRunAt);
      return;
    }
    for (const scheduleId of next.scheduleIds) {
      yield* processDue(scheduleId).pipe(
        Effect.catchAll((error) =>
          Effect.logWarning("scheduled run failed before settlement", {
            scheduleId,
            error: error.message,
          }),
        ),
      );
    }
  });

  return {
    run: Effect.forever(
      tick.pipe(
        Effect.catchAll((error) =>
          Effect.logWarning("scheduler tick failed", { error: error.message }).pipe(
            Effect.zipRight(
              config.clock.now.pipe(
                Effect.flatMap((now) => config.clock.sleepUntil(idleUntil(now))),
              ),
            ),
          ),
        ),
      ),
    ),
  };
};

/**
 * Task 3B supplies the bridge and the authenticated environment scope. Keeping
 * composition at that boundary prevents an unconfigured worker from being
 * accidentally started by a generic server layer.
 */
export const scheduleRunnerFromServices = (config: Omit<ScheduleRunnerConfig, "registry" | "clock">) =>
  Effect.gen(function* () {
    const registry = yield* ScheduleRegistry;
    const clock = yield* ScheduleClock;
    return makeScheduleRunner({ ...config, registry, clock });
  });
