import { WS_METHODS } from "@rune/contracts";
import * as Effect from "effect/Effect";
import { Atom } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "./runtime.ts";

/**
 * Server-owned historical file mutation records. The ledger is deliberately
 * exposed as a small environment API so web, desktop, and mobile can render
 * the same conflict/replay truth without keeping a second local authority.
 */
export function createMutationLedgerEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const scheduler = createAtomCommandScheduler();
  const snapshot = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:chat-mutations:list",
    tag: WS_METHODS.chatMutationList,
    staleTimeMs: 5_000,
    idleTtlMs: 60_000,
  });
  const mutationConcurrency = {
    mode: "serial" as const,
    key: ({ environmentId, input }: { environmentId: string; input: { operationId: string } }) =>
      JSON.stringify([environmentId, input.operationId]),
  };

  return {
    list: snapshot,
    append: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:chat-mutations:append",
      tag: WS_METHODS.chatMutationAppend,
      scheduler,
      concurrency: mutationConcurrency,
      onSuccess: ({ environmentId, input }, registry) =>
        Effect.sync(() =>
          registry.refresh(snapshot({ environmentId, input: { chatId: input.chatId } })),
        ),
    }),
    settle: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:chat-mutations:settle",
      tag: WS_METHODS.chatMutationSettle,
      scheduler,
      concurrency: mutationConcurrency,
    }),
  };
}
