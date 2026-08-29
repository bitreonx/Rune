export interface WorkrailStep {
  readonly durationMs?: number;
  readonly step: string;
  readonly status: "pending" | "inProgress" | "completed" | "blocked" | "failed" | "skipped";
}

export interface WorkrailTaskRow {
  readonly id: string;
  readonly index: number;
  readonly step: WorkrailStep;
}

export interface WorkrailModel {
  readonly total: number;
  readonly complete: number;
  readonly activeTaskId?: string;
  readonly active?: WorkrailTaskRow;
  readonly queued: readonly WorkrailTaskRow[];
  readonly completed: readonly WorkrailTaskRow[];
  readonly blocked: readonly WorkrailTaskRow[];
}

/**
 * Projects the one authoritative step list into the Workrail's focal and
 * grouped regions. The active row is deliberately removed from the roadmap;
 * it has one home, the NOW card.
 */
export function deriveWorkrailModel(
  progress: { readonly completedSteps: number; readonly totalSteps: number } | null,
  steps: readonly WorkrailStep[] | null,
): WorkrailModel | null {
  if (progress === null || steps === null || progress.totalSteps <= 0) return null;

  const activeIndex = steps.findIndex((step) => step.status === "inProgress");
  const fallbackIndex =
    activeIndex >= 0 ? activeIndex : steps.findIndex((step) => step.status === "pending");
  const rows = steps.map((step, index) => ({ id: String(index), index, step }));
  const active = fallbackIndex >= 0 ? rows[fallbackIndex] : undefined;

  return {
    total: progress.totalSteps,
    complete: Math.min(Math.max(progress.completedSteps, 0), progress.totalSteps),
    ...(active === undefined ? {} : { activeTaskId: active.id, active }),
    queued: rows.filter(({ step, index }) => step.status === "pending" && index !== fallbackIndex),
    completed: rows.filter(({ step }) => step.status === "completed" || step.status === "skipped"),
    blocked: rows.filter(({ step }) => step.status === "blocked" || step.status === "failed"),
  };
}
