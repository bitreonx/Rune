import { WS_METHODS } from "@rune/contracts";
import * as Effect from "effect/Effect";
import { Atom } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "./runtime.ts";

export function createPocketEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const scheduler = createAtomCommandScheduler();
  const snapshot = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:pockets:snapshot",
    tag: WS_METHODS.pocketsSnapshot,
    staleTimeMs: 15_000,
  });
  return {
    snapshot,
    dispatch: createEnvironmentRpcCommand(runtime, {
      label: "environment-data:pockets:dispatch",
      tag: WS_METHODS.pocketsDispatch,
      scheduler,
      concurrency: { mode: "serial", key: ({ environmentId }) => environmentId },
      onSuccess: ({ environmentId }, registry) =>
        Effect.sync(() => registry.refresh(snapshot({ environmentId, input: {} }))),
    }),
    importLegacy: createEnvironmentRpcCommand(runtime, {
      label: "environment-data:pockets:import-legacy",
      tag: WS_METHODS.pocketsImportLegacy,
      scheduler,
      concurrency: { mode: "singleFlight", key: ({ environmentId }) => environmentId },
      onSuccess: ({ environmentId }, registry) =>
        Effect.sync(() => registry.refresh(snapshot({ environmentId, input: {} }))),
    }),
  };
}
