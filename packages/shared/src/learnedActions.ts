import type {
  ActionCapability,
  ActionProposal,
  ActionRunHistory,
  RuneAction,
} from "@rune/contracts";

const NEVER_AUTO_LEARN_CAPABILITIES: ReadonlySet<ActionCapability> = new Set([
  "git-push",
  "deploy",
  "delete",
  "production-migration",
  "secret-reference",
]);

/** Sensitive workflows require an explicit save request; repetition alone is not consent. */
export function isSensitiveActionForAutoLearning(
  action: Pick<RuneAction, "capabilities">,
): boolean {
  return action.capabilities.some((capability) => NEVER_AUTO_LEARN_CAPABILITIES.has(capability));
}

export interface LearnedActionAnalysis {
  readonly eligible: boolean;
  readonly successfulRunIds: readonly string[];
  readonly completedRunCount: number;
  readonly successRate: number;
  readonly confidence: number;
  readonly reason: string;
}

function stableRunOrder(left: ActionRunHistory, right: ActionRunHistory): number {
  return left.recordedAt.localeCompare(right.recordedAt) || left.runId.localeCompare(right.runId);
}

/**
 * Finds repeatable evidence without looking at assistant prose. A run only
 * contributes positive evidence after the runtime has settled it as
 * succeeded; started, failed, blocked, and cancelled runs never become a
 * learned recipe by accident.
 */
export function analyzeLearnedActionRuns(input: {
  readonly actionId: RuneAction["id"];
  readonly runs: readonly ActionRunHistory[];
  readonly minimumSuccessfulRuns?: number;
  readonly minimumSuccessRate?: number;
}): LearnedActionAnalysis {
  const minimumSuccessfulRuns = Math.max(2, Math.floor(input.minimumSuccessfulRuns ?? 3));
  const minimumSuccessRate = Math.min(1, Math.max(0, input.minimumSuccessRate ?? 0.8));
  const relevant = input.runs
    .filter((run) => run.actionId === input.actionId)
    .toSorted(stableRunOrder);
  const successfulRunIds = relevant
    .filter((run) => run.status === "succeeded")
    .map((run) => run.runId);
  const completedRunCount = relevant.filter(
    (run) =>
      run.status === "succeeded" ||
      run.status === "failed" ||
      run.status === "cancelled" ||
      run.status === "blocked",
  ).length;
  const successRate = completedRunCount === 0 ? 0 : successfulRunIds.length / completedRunCount;
  const repetitionConfidence = Math.min(1, successfulRunIds.length / (minimumSuccessfulRuns + 2));
  const rateConfidence =
    minimumSuccessRate === 0 ? 1 : Math.min(1, successRate / minimumSuccessRate);
  const confidence = Number((repetitionConfidence * 0.6 + rateConfidence * 0.4).toFixed(3));
  const eligible =
    successfulRunIds.length >= minimumSuccessfulRuns &&
    completedRunCount > 0 &&
    successRate >= minimumSuccessRate;

  return {
    eligible,
    successfulRunIds,
    completedRunCount,
    successRate,
    confidence,
    reason: eligible
      ? `This workflow succeeded ${successfulRunIds.length} times with a ${(successRate * 100).toFixed(0)}% completion success rate.`
      : `Need ${minimumSuccessfulRuns} successful runs at a ${(minimumSuccessRate * 100).toFixed(0)}% success rate before proposing an Action.`,
  };
}

/**
 * Compiles only structured action data and successful run ids into the
 * approval-gated proposal contract. The caller must still send this through
 * ActionRegistry.createProposal; no persistent action is created here.
 */
export function buildLearnedActionProposal(input: {
  readonly proposalId: string;
  readonly action: RuneAction;
  readonly analysis: LearnedActionAnalysis;
  readonly createdAt: string;
}): ActionProposal {
  if (!input.analysis.eligible || input.analysis.successfulRunIds.length === 0) {
    throw new Error("A learned Action proposal requires verified successful run evidence.");
  }

  return {
    proposalId: input.proposalId,
    action: {
      ...input.action,
      source: "learned",
      provenance: {
        ...input.action.provenance,
        source: "learned",
        successfulRunIds: [...input.analysis.successfulRunIds],
      },
    },
    reason: input.analysis.reason,
    successfulRunIds: [...input.analysis.successfulRunIds],
    status: "proposed",
    createdAt: input.createdAt,
  };
}
