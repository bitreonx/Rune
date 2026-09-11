import type {
  EnvironmentId,
  RuneSchedule,
  ScheduleCreateInput,
  ScheduleDeleteInput,
  ScheduleGetInput,
  ScheduleListInput,
  ScheduleListResult,
  ScheduleMutationResult,
  SchedulePauseInput,
  ScheduleRunListResult,
  ScheduleRunNowInput,
  ScheduleRunNowResult,
  ScheduleRunsInput,
  ScheduleId,
  ScheduleSubscribeInput,
  ScheduleSubscriptionMessage,
  ScheduleResumeInput,
  ScheduleUpdateInput,
} from "@rune/contracts";
import { WS_METHODS } from "@rune/contracts";
import * as Effect from "effect/Effect";
import { Atom, AtomRegistry } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
  createEnvironmentRpcSubscriptionAtomFamily,
} from "./runtime.ts";

const SCHEDULE_QUERY_IDLE_TTL_MS = 60_000;
const SCHEDULE_LIST_STALE_TIME_MS = 3_000;
const SCHEDULE_RUNS_STALE_TIME_MS = 2_000;

type ScheduleRefreshTarget = {
  readonly environmentId: EnvironmentId;
  readonly input: { readonly scheduleId?: ScheduleId };
};

/**
 * Client access to the server-owned scheduler. Commands use one serial lane
 * per environment and schedule so rapid controls cannot reorder lifecycle
 * transitions or accidentally run the same schedule twice.
 */
export function createSchedulesEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const scheduler = createAtomCommandScheduler();
  const list = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:schedules:list",
    tag: WS_METHODS.schedulesList,
    staleTimeMs: SCHEDULE_LIST_STALE_TIME_MS,
    idleTtlMs: SCHEDULE_QUERY_IDLE_TTL_MS,
    refreshIntervalMs: 15_000,
  });
  const get = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:schedules:get",
    tag: WS_METHODS.schedulesGet,
    staleTimeMs: SCHEDULE_LIST_STALE_TIME_MS,
    idleTtlMs: SCHEDULE_QUERY_IDLE_TTL_MS,
  });
  const runs = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:schedules:runs",
    tag: WS_METHODS.schedulesRuns,
    staleTimeMs: SCHEDULE_RUNS_STALE_TIME_MS,
    idleTtlMs: SCHEDULE_QUERY_IDLE_TTL_MS,
  });
  const subscription = createEnvironmentRpcSubscriptionAtomFamily(runtime, {
    label: "environment-stream:schedules:subscribe",
    tag: WS_METHODS.schedulesSubscribe,
    idleTtlMs: SCHEDULE_QUERY_IDLE_TTL_MS,
  });

  const lifecycleConcurrency = {
    mode: "serial" as const,
    key: ({ environmentId, input }: { environmentId: string; input: { scheduleId: string } }) =>
      JSON.stringify([environmentId, input.scheduleId]),
  };
  const createConcurrency = {
    mode: "serial" as const,
    key: ({ environmentId, input }: { environmentId: string; input: { idempotencyKey: string } }) =>
      JSON.stringify([environmentId, input.idempotencyKey]),
  };

  const refreshScheduleViews = (
    target: ScheduleRefreshTarget,
    registry: AtomRegistry.AtomRegistry,
  ) =>
    Effect.sync(() => {
      registry.refresh(list({ environmentId: target.environmentId, input: {} }));
      if (target.input.scheduleId !== undefined) {
        registry.refresh(
          runs({ environmentId: target.environmentId, input: { scheduleId: target.input.scheduleId } }),
        );
      }
    });

  const create = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:schedules:create",
    tag: WS_METHODS.schedulesCreate,
    scheduler,
    concurrency: createConcurrency,
    onSuccess: refreshScheduleViews,
  });
  const update = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:schedules:update",
    tag: WS_METHODS.schedulesUpdate,
    scheduler,
    concurrency: lifecycleConcurrency,
    onSuccess: refreshScheduleViews,
  });
  const pause = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:schedules:pause",
    tag: WS_METHODS.schedulesPause,
    scheduler,
    concurrency: lifecycleConcurrency,
    onSuccess: refreshScheduleViews,
  });
  const resume = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:schedules:resume",
    tag: WS_METHODS.schedulesResume,
    scheduler,
    concurrency: lifecycleConcurrency,
    onSuccess: refreshScheduleViews,
  });
  const remove = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:schedules:delete",
    tag: WS_METHODS.schedulesDelete,
    scheduler,
    concurrency: lifecycleConcurrency,
    onSuccess: refreshScheduleViews,
  });
  const runNow = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:schedules:run-now",
    tag: WS_METHODS.schedulesRunNow,
    scheduler,
    concurrency: lifecycleConcurrency,
    onSuccess: refreshScheduleViews,
  });

  return { list, get, runs, subscription, create, update, pause, resume, remove, runNow };
}

export type SchedulesEnvironmentAtoms = ReturnType<typeof createSchedulesEnvironmentAtoms>;
export type SchedulesListResult = ScheduleListResult;
export type SchedulesListInput = ScheduleListInput;
export type SchedulesGetInput = ScheduleGetInput;
export type SchedulesRunsInput = ScheduleRunsInput;
export type SchedulesSubscribeInput = ScheduleSubscribeInput;
export type SchedulesSubscriptionMessage = ScheduleSubscriptionMessage;
export type SchedulesMutationResult = ScheduleMutationResult;
export type SchedulesRunNowResult = ScheduleRunNowResult;
export type SchedulesSchedule = RuneSchedule;
export type SchedulesRunListResult = ScheduleRunListResult;
export type SchedulesCreateInput = ScheduleCreateInput;
export type SchedulesUpdateInput = ScheduleUpdateInput;
export type SchedulesPauseInput = SchedulePauseInput;
export type SchedulesResumeInput = ScheduleResumeInput;
export type SchedulesDeleteInput = ScheduleDeleteInput;
export type SchedulesRunNowInput = ScheduleRunNowInput;
