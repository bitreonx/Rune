import { type PromptQueueSnapshotInput, WS_METHODS } from "@rune/contracts";
import { Atom } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import { createEnvironmentRpcCommand, createEnvironmentRpcQueryAtomFamily } from "./runtime.ts";

/** Server-owned execution-controller state exposed through the environment runtime. */
export function createExecutionControllerEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  return {
    snapshot: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:execution-controller:snapshot",
      tag: WS_METHODS.executionControllerSnapshot,
      staleTimeMs: 1_000,
      idleTtlMs: 60_000,
    }),
    dispatch: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:execution-controller:dispatch",
      tag: WS_METHODS.executionControllerDispatch,
    }),
  };
}

export type ExecutionControllerSnapshotInput = PromptQueueSnapshotInput;
