import type {
  ActionProposalDecisionInput,
  ActionProposalDecisionResult,
  ActionProposalListInput,
  ActionProposalListResult,
  ActionRegistryListInput,
  ActionRegistryListResult,
  ActionRunInput,
  ActionRunResult,
  EnvironmentId,
} from "@rune/contracts";
import { WS_METHODS } from "@rune/contracts";
import * as Effect from "effect/Effect";
import { Atom, AtomRegistry } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "./runtime.ts";

/**
 * Client access to the server-owned Action Registry.
 *
 * Project scripts remain a compatibility source, but registered actions are
 * the canonical surface for deterministic workflows. Keeping this in the
 * shared runtime gives web and mobile the same cache, RPC contract, and
 * serial execution boundary.
 */
export function createActionsEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const scheduler = createAtomCommandScheduler();
  const list = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:actions:list",
    tag: WS_METHODS.actionsList,
    staleTimeMs: 5_000,
    idleTtlMs: 60_000,
  });
  const run = createEnvironmentRpcCommand(runtime, {
    label: "environment-command:actions:run",
    tag: WS_METHODS.actionsRun,
    scheduler,
    concurrency: {
      mode: "serial" as const,
      key: ({ environmentId, input }: { environmentId: string; input: ActionRunInput }) =>
        JSON.stringify([environmentId, input.threadId, input.actionId]),
    },
  });

  const proposals = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "environment-data:actions:list-proposals",
    tag: WS_METHODS.actionsListProposals,
    staleTimeMs: 5_000,
    idleTtlMs: 60_000,
  });
  const proposalConcurrency = {
    mode: "serial" as const,
    key: ({
      environmentId,
      input,
    }: {
      environmentId: string;
      input: ActionProposalDecisionInput;
    }) => JSON.stringify([environmentId, input.proposalId]),
  };
  const refreshActionViews = (
    target: { readonly environmentId: EnvironmentId; readonly input: ActionProposalDecisionInput },
    registry: AtomRegistry.AtomRegistry,
  ) =>
    Effect.sync(() => {
      registry.refresh(proposals({ environmentId: target.environmentId, input: {} }));
    });

  const decideProposal = (
    tag:
      | typeof WS_METHODS.actionsApproveProposal
      | typeof WS_METHODS.actionsRejectProposal
      | typeof WS_METHODS.actionsDismissProposal,
    label: string,
  ) =>
    createEnvironmentRpcCommand(runtime, {
      label,
      tag,
      scheduler,
      concurrency: proposalConcurrency,
      onSuccess: refreshActionViews,
    });

  return {
    list,
    run,
    proposals,
    approveProposal: decideProposal(
      WS_METHODS.actionsApproveProposal,
      "environment-command:actions:approve-proposal",
    ),
    rejectProposal: decideProposal(
      WS_METHODS.actionsRejectProposal,
      "environment-command:actions:reject-proposal",
    ),
    dismissProposal: decideProposal(
      WS_METHODS.actionsDismissProposal,
      "environment-command:actions:dismiss-proposal",
    ),
  };
}

export type ActionsListResult = ActionRegistryListResult;
export type ActionsListInput = ActionRegistryListInput;
export type ActionsRunResult = ActionRunResult;
export type ActionsProposalListInput = ActionProposalListInput;
export type ActionsProposalListResult = ActionProposalListResult;
export type ActionsProposalDecisionResult = ActionProposalDecisionResult;
