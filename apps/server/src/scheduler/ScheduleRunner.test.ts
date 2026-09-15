import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import {
  EnvironmentId,
  ScheduleId,
  ScheduleRunId,
  ThreadId,
} from "@rune/contracts";

import { makeScheduleRunner, type ScheduleExecutionBridgeShape } from "./ScheduleRunner.ts";
import type { ScheduleClockShape } from "./ScheduleClock.ts";
import {
  scheduleRegistryFailure,
  type ScheduleRegistryShape,
} from "../persistence/Services/ScheduleRegistry.ts";

const scheduleId = ScheduleId.make("schedule:test");
const environmentId = EnvironmentId.make("environment:test");
const threadId = ThreadId.make("thread:test");
const schedule = {
  id: scheduleId,
  name: "Test",
  environmentId,
  trigger: { type: "once" as const, runAt: "2026-01-01T00:00:00.000Z" },
  target: { type: "prompt" as const, threadId, prompt: "Run" },
  policy: { approvalPolicy: "inherit" as const, allowProviderFallback: false, catchUp: "skip" as const },
  displayTimeZone: "UTC",
  status: "active" as const,
  version: 1,
  claimedRunCount: 0,
  nextRunAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2025-12-01T00:00:00.000Z",
  updatedAt: "2025-12-01T00:00:00.000Z",
  createdBy: "user" as const,
};

const run = {
  id: ScheduleRunId.make("schedule-run:test"),
  scheduleId: schedule.id,
  trigger: "scheduled" as const,
  scheduledFor: schedule.nextRunAt,
  createdAt: schedule.createdAt,
  status: "claimed" as const,
  leaseOwner: "runner:test",
  leaseExpiresAt: "2026-01-01T00:01:00.000Z",
  threadId,
};

it("claims, dispatches, and settles one due run", () => {
  const calls: string[] = [];
  const settledStatuses: string[] = [];
  const registry: ScheduleRegistryShape = {
    get: () => Effect.succeed(schedule),
    nextDue: () => Effect.succeed({ nextRunAt: schedule.nextRunAt, scheduleIds: [schedule.id] }),
    reclaimExpiredRuns: () => Effect.succeed([]),
    pendingManualRuns: () => Effect.succeed([]),
    reconcileMissed: () => Effect.succeed({
      schedule,
      decision: { status: "coalesce-one" as const, scheduledFor: schedule.nextRunAt, nextRunAt: schedule.nextRunAt },
    }),
    claimDueRun: () => { calls.push("claim"); return Effect.succeed(run); },
    issueDispatch: () => { calls.push("dispatch"); return Effect.succeed({ ...run, status: "dispatching" as const }); },
    settleRun: (_, input) => { calls.push("settle"); settledStatuses.push(input.status); return Effect.succeed({ ...run, status: "succeeded" as const }); },
    list: () => Effect.succeed({ schedules: [], sequence: 0 }),
    runs: () => Effect.succeed({ runs: [] }),
    subscription: () => Effect.succeed({ type: "snapshot" as const, sequence: 0, schedules: [], runs: [] }),
    create: () => Effect.die("unused"), update: () => Effect.die("unused"), pause: () => Effect.die("unused"), resume: () => Effect.die("unused"), remove: () => Effect.die("unused"), runNow: () => Effect.die("unused"),
  };
  const clock: ScheduleClockShape = {
    now: Effect.succeed("2026-01-01T00:00:00.000Z"),
    sleepUntil: () => Effect.interrupt,
  };
  const bridge: ScheduleExecutionBridgeShape = {
    execute: () => { calls.push("execute"); return Effect.succeed({ status: "succeeded" as const, summary: "ok", threadId }); },
  };
  const fiber = Effect.runSync(Effect.fork(makeScheduleRunner({ registry, clock, bridge, scope: { environmentId }, leaseOwner: "runner:test", leaseForSeconds: 60 }).run));
  Effect.runSync(Effect.interruptFiber(fiber));
  expect(calls).toEqual(["claim", "dispatch", "execute", "settle"]);
  expect(settledStatuses).toEqual(["succeeded"]);
});

it("settles dispatch-uncertain when the lease heartbeat cannot renew", () => {
  const calls: string[] = [];
  const settledStatuses: string[] = [];
  const registry: ScheduleRegistryShape = {
    get: () => Effect.succeed(schedule),
    nextDue: () => Effect.succeed({ nextRunAt: schedule.nextRunAt, scheduleIds: [schedule.id] }),
    reclaimExpiredRuns: () => Effect.succeed([]),
    pendingManualRuns: () => Effect.succeed([]),
    reconcileMissed: () =>
      Effect.succeed({
        schedule,
        decision: {
          status: "coalesce-one" as const,
          scheduledFor: schedule.nextRunAt,
          nextRunAt: schedule.nextRunAt,
        },
      }),
    claimDueRun: () => Effect.succeed(run),
    issueDispatch: () => Effect.succeed({ ...run, status: "dispatching" as const }),
    renewRunLease: () => {
      calls.push("renew");
      return Effect.fail(
        scheduleRegistryFailure("persistence-failed", "lease store unavailable", {
          runId: run.id,
        }),
      );
    },
    settleRun: (_, input) => {
      calls.push("settle");
      settledStatuses.push(input.status);
      return Effect.succeed({ ...run, status: input.status });
    },
    list: () => Effect.succeed({ schedules: [], sequence: 0 }),
    runs: () => Effect.succeed({ runs: [] }),
    subscription: () =>
      Effect.succeed({ type: "snapshot" as const, sequence: 0, schedules: [], runs: [] }),
    create: () => Effect.die("unused"),
    update: () => Effect.die("unused"),
    pause: () => Effect.die("unused"),
    resume: () => Effect.die("unused"),
    remove: () => Effect.die("unused"),
    runNow: () => Effect.die("unused"),
  };
  const clock: ScheduleClockShape = {
    now: Effect.succeed("2026-01-01T00:00:00.000Z"),
    sleepUntil: () => Effect.succeed(undefined),
  };
  const bridge: ScheduleExecutionBridgeShape = {
    execute: () => {
      calls.push("execute");
      return Effect.never;
    },
  };
  const fiber = Effect.runSync(
    Effect.fork(
      makeScheduleRunner({
        registry,
        clock,
        bridge,
        scope: { environmentId },
        leaseOwner: "runner:test",
        leaseForSeconds: 60,
      }).run,
    ),
  );
  Effect.runSync(Effect.interruptFiber(fiber));

  expect(calls).toEqual(["execute", "renew", "settle"]);
  expect(settledStatuses).toEqual(["dispatch-uncertain"]);
});
