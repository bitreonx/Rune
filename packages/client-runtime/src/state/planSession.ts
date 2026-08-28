import { WS_METHODS } from "@rune/contracts";
import { Atom } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "./runtime.ts";

/** Provider-neutral plan lifecycle state shared by every RUNE client. */
export function createPlanSessionEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const scheduler = createAtomCommandScheduler();
  const snapshot = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:plan-session:get",
    tag: WS_METHODS.planSessionGet,
    staleTimeMs: 2_000,
    idleTtlMs: 60_000,
  });
  const lifecycleConcurrency = {
    mode: "serial" as const,
    key: ({
      environmentId,
      input,
    }: {
      environmentId: string;
      input: { id?: string; session?: { id: string } };
    }) => JSON.stringify([environmentId, input.id ?? input.session?.id ?? "unknown"]),
  };

  return {
    get: snapshot,
    create: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:plan-session:create",
      tag: WS_METHODS.planSessionCreate,
      scheduler,
      concurrency: lifecycleConcurrency,
    }),
    update: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:plan-session:update",
      tag: WS_METHODS.planSessionUpdate,
      scheduler,
      concurrency: lifecycleConcurrency,
    }),
    transition: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:plan-session:transition",
      tag: WS_METHODS.planSessionTransition,
      scheduler,
      concurrency: lifecycleConcurrency,
    }),
    resume: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:plan-session:resume",
      tag: WS_METHODS.planSessionResume,
      scheduler,
      concurrency: lifecycleConcurrency,
    }),
    schedule: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:plan-session:schedule",
      tag: WS_METHODS.planSessionSchedule,
      scheduler,
      concurrency: lifecycleConcurrency,
    }),
    review: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:plan-session:review",
      tag: WS_METHODS.planSessionReview,
      scheduler,
      concurrency: lifecycleConcurrency,
    }),
  };
}
