import {
  ActionProposal,
  ActionProposalCreateInput,
  ActionProposalDecisionInput,
  ActionProposalDecisionResult,
  ActionProposalListInput,
  ActionProposalListResult,
  ActionProposalRecord,
  ActionRegistryCreateInput,
  ActionRegistryError,
  ActionRegistryListInput,
  ActionRegistryListResult,
  ActionRegistryMutationResult,
  ActionRegistryRecord,
  ActionRegistryVersionInput,
  ActionRunHistory,
  ActionRunHistoryListInput,
  ActionRunHistoryListResult,
  type ActionScope,
  type ActionParameterValues,
} from "@rune/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface ActionRegistryServiceShape {
  readonly list: (
    input: ActionRegistryListInput,
  ) => Effect.Effect<ActionRegistryListResult, ActionRegistryError>;
  readonly create: (
    input: ActionRegistryCreateInput,
  ) => Effect.Effect<ActionRegistryMutationResult, ActionRegistryError>;
  readonly version: (
    input: ActionRegistryVersionInput,
  ) => Effect.Effect<ActionRegistryMutationResult, ActionRegistryError>;
  readonly getVersion: (input: {
    readonly actionId: ActionRegistryRecord["action"]["id"];
    readonly version: number;
    readonly scope?: ActionScope;
    readonly workspaceRoot?: string;
    readonly projectId?: string;
  }) => Effect.Effect<ActionRegistryRecord | null, ActionRegistryError>;
  readonly createProposal: (
    input: ActionProposalCreateInput,
  ) => Effect.Effect<{ readonly proposal: ActionProposalRecord }, ActionRegistryError>;
  readonly listProposals: (
    input: ActionProposalListInput,
  ) => Effect.Effect<ActionProposalListResult, ActionRegistryError>;
  readonly approveProposal: (
    input: ActionProposalDecisionInput,
    decidedBy: string,
  ) => Effect.Effect<ActionProposalDecisionResult, ActionRegistryError>;
  readonly rejectProposal: (
    input: ActionProposalDecisionInput,
    decidedBy: string,
  ) => Effect.Effect<ActionProposalDecisionResult, ActionRegistryError>;
  readonly dismissProposal: (
    input: ActionProposalDecisionInput,
    decidedBy: string,
  ) => Effect.Effect<ActionProposalDecisionResult, ActionRegistryError>;
  /** Parameters are redacted against the persisted action before storage. */
  readonly recordRun: (run: ActionRunHistory) => Effect.Effect<void, ActionRegistryError>;
  /** Settles a started run from terminal lifecycle evidence. */
  readonly settleRun: (input: {
    readonly runId: string;
    readonly status: "succeeded" | "failed" | "cancelled";
    readonly completedAt: string;
    readonly receipt?: import("@rune/contracts").ActionRunReceipt;
    /** Capped terminal text used only for output verification evidence. */
    readonly outputText?: string;
  }) => Effect.Effect<void, ActionRegistryError>;
  readonly listRunHistory: (
    input: ActionRunHistoryListInput,
  ) => Effect.Effect<ActionRunHistoryListResult, ActionRegistryError>;
}

export class ActionRegistry extends Context.Service<ActionRegistry, ActionRegistryServiceShape>()(
  "rune/persistence/Services/ActionRegistry",
) {}

export const proposalResult = (
  proposal: ActionProposal,
): { readonly proposal: ActionProposal } => ({ proposal });

export type RedactedActionParameters = ActionParameterValues;
