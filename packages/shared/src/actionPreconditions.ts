import type { ActionPreconditionKind, RuneAction } from "@rune/contracts";

export interface ActionPreconditionFacts {
  readonly repositoryAvailable?: boolean;
  readonly worktreeClean?: boolean;
  readonly worktreeAcknowledged?: boolean;
  readonly requiredToolchainAvailable?: boolean;
  readonly compatiblePlatform?: boolean;
}

export interface ActionPreconditionResult {
  readonly id: string;
  readonly kind: ActionPreconditionKind;
  readonly blocking: boolean;
  readonly satisfied: boolean;
  readonly reason: string;
}

export interface ActionPreconditionEvaluation {
  readonly results: ReadonlyArray<ActionPreconditionResult>;
  readonly blockingFailures: ReadonlyArray<ActionPreconditionResult>;
}

const factForKind = (
  kind: ActionPreconditionKind,
  facts: ActionPreconditionFacts,
): boolean | undefined => {
  switch (kind) {
    case "repository-available":
      return facts.repositoryAvailable;
    case "clean-or-acknowledged-worktree":
      return facts.worktreeClean === true || facts.worktreeAcknowledged === true;
    case "required-toolchain-available":
      return facts.requiredToolchainAvailable;
    case "compatible-platform":
      return facts.compatiblePlatform;
  }
};

/**
 * Evaluates the declared safety boundary without inspecting the filesystem or
 * running commands. The server supplies facts from its capability services;
 * keeping this part pure makes the same policy usable by web, mobile, and
 * plan previews.
 */
export function evaluateActionPreconditions(
  action: Pick<RuneAction, "preconditions">,
  facts: ActionPreconditionFacts,
): ActionPreconditionEvaluation {
  const results = action.preconditions.map((precondition) => {
    const fact = factForKind(precondition.kind, facts);
    const satisfied = fact === true;
    return {
      id: precondition.id,
      kind: precondition.kind,
      blocking: precondition.blocking,
      satisfied,
      reason: satisfied
        ? precondition.description
        : fact === undefined
          ? `Could not verify: ${precondition.description}`
          : precondition.description,
    } satisfies ActionPreconditionResult;
  });
  return {
    results,
    blockingFailures: results.filter((result) => result.blocking && !result.satisfied),
  };
}
