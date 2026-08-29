import type { AgentActivity } from "@rune/shared/agentActivity";

export interface ChangePulseModel {
  readonly fileCount: number;
  readonly additions: number;
  readonly deletions: number;
  readonly phaseLabel: string;
  readonly stateLabel: string;
  readonly verificationLabel?: string;
}

/** Derive compact, deterministic change language from one semantic activity. */
export function deriveChangePulseModel(job: AgentActivity): ChangePulseModel | null {
  if (job.changes.length === 0) return null;
  const additions = job.changes.reduce((total, change) => total + change.additions, 0);
  const deletions = job.changes.reduce((total, change) => total + change.deletions, 0);
  const verificationReceipts = job.receipts.filter(
    (receipt) => receipt.kind === "verification" && receipt.status === "done",
  );
  const phaseLabel =
    job.status === "working"
      ? job.phase === "implement" || job.phase === "fix"
        ? "editing"
        : "working"
      : job.phase === "implement" || job.phase === "fix"
        ? "edited"
        : job.phase;
  const stateLabel =
    job.status === "failed"
      ? "failed"
      : job.status === "waiting"
        ? "waiting"
        : job.status === "paused"
          ? "paused"
          : job.status === "done"
            ? "complete"
            : "editing";
  return {
    fileCount: job.changes.length,
    additions,
    deletions,
    phaseLabel,
    stateLabel,
    ...(verificationReceipts.length > 0
      ? { verificationLabel: `✓ ${verificationReceipts.length} verified` }
      : {}),
  };
}
