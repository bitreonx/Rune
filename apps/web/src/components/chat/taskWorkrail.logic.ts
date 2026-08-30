import type { OrchestrationThreadActivity } from "@rune/contracts";
import {
  deriveAgentActivityJob,
  type AgentActivity,
  type AgentActivityChangeRecord,
  type AgentActivityStatus,
} from "@rune/shared/agentActivity";

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

export type WorkrailState = "ready" | "working" | "waiting" | "failed" | "completed";

export interface WorkrailVerification {
  readonly id: string;
  readonly label: string;
  readonly status: AgentActivityStatus;
  readonly createdAt: string;
}

export interface WorkrailModel {
  readonly total: number;
  readonly complete: number;
  readonly activeTaskId?: string;
  readonly active?: WorkrailTaskRow;
  readonly queued: readonly WorkrailTaskRow[];
  readonly completed: readonly WorkrailTaskRow[];
  readonly blocked: readonly WorkrailTaskRow[];
  readonly currentActivity?: AgentActivity;
  readonly activityHistory: readonly AgentActivity[];
  readonly currentLabel: string;
  readonly currentTaskContext?: string;
  readonly state: WorkrailState;
  readonly waitingForUser: boolean;
  readonly changes: readonly AgentActivityChangeRecord[];
  readonly verification: readonly WorkrailVerification[];
  readonly showVerification: boolean;
}

/** Motion stays measurable and small enough that state remains the main signal. */
export const WORKRAIL_MOTION_MS = {
  activityEnter: 170,
  receiptEnter: 160,
  completionSettle: 200,
} as const;

const GENERIC_ACTIVITY_LABELS = new Set([
  "working",
  "working through the task",
  "exploring the project",
  "researching the repository",
  "implementing the change",
  "running tests",
  "fixing remaining errors",
  "reviewing the result",
]);

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function isGenericLabel(value: string): boolean {
  return GENERIC_ACTIVITY_LABELS.has(normalizeLabel(value));
}

function labelsOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeLabel(left);
  const normalizedRight = normalizeLabel(right);
  return (
    normalizedLeft.length > 0 &&
    normalizedRight.length > 0 &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
}

function isVerificationStep(step: WorkrailStep): boolean {
  return /\b(test|tests|testing|verify|verification|typecheck|type-check|lint|build|check|checks)\b/iu.test(
    step.step,
  );
}

function isVerificationActivity(activity: AgentActivity): boolean {
  return (
    activity.phase === "test" ||
    activity.executionStage === "verify" ||
    activity.receipts.some((receipt) => receipt.kind === "verification")
  );
}

function isWaitingActivity(activity: AgentActivity | undefined): boolean {
  return activity?.status === "waiting";
}

function activityLabel(
  activity: AgentActivity | undefined,
  active: WorkrailTaskRow | undefined,
): string {
  if (!activity || !isGenericLabel(activity.label))
    return activity?.label ?? active?.step.step ?? "Ready";
  if (active && !isGenericLabel(active.step.step)) return active.step.step;
  if (activity.phase === "test") return "Running verification";
  if (activity.phase === "explore" || activity.phase === "research")
    return "Investigating the plan";
  if (activity.phase === "implement") return "Updating the implementation";
  if (activity.phase === "fix") return "Fixing the implementation";
  return "Working";
}

function mergeChangeRecords(
  changes: ReadonlyArray<AgentActivityChangeRecord>,
): ReadonlyArray<AgentActivityChangeRecord> {
  const byPath = new Map<string, AgentActivityChangeRecord>();
  for (const change of changes) {
    const key = `${change.turnId ?? ""}:${change.path}`;
    const previous = byPath.get(key);
    if (previous?.source === "checkpoint" && change.source !== "checkpoint") continue;
    byPath.set(key, change);
  }
  return [...byPath.values()].toSorted((left, right) => left.path.localeCompare(right.path));
}

function collectVerification(
  job: ReturnType<typeof deriveAgentActivityJob>,
): ReadonlyArray<WorkrailVerification> {
  const entries: WorkrailVerification[] = [];
  const seen = new Set<string>();
  for (const activity of job.activities) {
    const receipts = activity.receipts.filter((receipt) => receipt.kind === "verification");
    if (receipts.length > 0) {
      for (const receipt of receipts) {
        if (seen.has(receipt.id)) continue;
        seen.add(receipt.id);
        entries.push({
          id: receipt.id,
          label: receipt.label,
          status: receipt.status,
          createdAt: receipt.createdAt,
        });
      }
      continue;
    }
    if (isVerificationActivity(activity)) {
      entries.push({
        id: activity.id,
        label: activity.label,
        status: activity.status,
        createdAt: activity.createdAt,
      });
    }
  }
  return entries;
}

/**
 * Projects the one authoritative step list into the Workrail's focal and
 * grouped regions. The active row is deliberately removed from the roadmap;
 * it has one home, the NOW card.
 */
export function deriveWorkrailModel(
  progress: { readonly completedSteps: number; readonly totalSteps: number } | null,
  steps: readonly WorkrailStep[] | null,
  activities: readonly OrchestrationThreadActivity[] = [],
): WorkrailModel | null {
  if (progress === null || steps === null || progress.totalSteps <= 0) return null;

  const activeIndex = steps.findIndex((step) => step.status === "inProgress");
  const blockedIndex = steps.findIndex((step) => step.status === "blocked");
  const failedIndex = steps.findIndex((step) => step.status === "failed");
  const pendingIndex = steps.findIndex((step) => step.status === "pending");
  const fallbackIndex =
    activeIndex >= 0
      ? activeIndex
      : blockedIndex >= 0
        ? blockedIndex
        : failedIndex >= 0
          ? failedIndex
          : pendingIndex;
  const rows = steps.map((step, index) => ({ id: String(index), index, step }));
  const active = fallbackIndex >= 0 ? rows[fallbackIndex] : undefined;
  const activityJob = deriveAgentActivityJob(activities);
  const currentActivity = activityJob.activities.at(-1);
  const waitingForUser =
    active?.step.status === "blocked" || isWaitingActivity(currentActivity) === true;
  const currentLabel = waitingForUser
    ? "Waiting for you"
    : active?.step.status === "failed" || currentActivity?.status === "failed"
      ? "Failed"
      : currentActivity?.status === "done" && currentActivity.label
        ? activityLabel(currentActivity, active)
        : activityLabel(currentActivity, active);
  const currentTaskContext =
    active && !labelsOverlap(currentLabel, active.step.step) ? active.step.step : undefined;
  const state: WorkrailState = waitingForUser
    ? "waiting"
    : active?.step.status === "failed" || currentActivity?.status === "failed"
      ? "failed"
      : currentActivity?.status === "working" || active?.step.status === "inProgress"
        ? "working"
        : progress.completedSteps >= progress.totalSteps
          ? "completed"
          : "ready";
  const changes = mergeChangeRecords(
    activityJob.activities.flatMap((activity) => activity.changes),
  );
  const verification = collectVerification(activityJob);

  return {
    total: progress.totalSteps,
    complete: Math.min(Math.max(progress.completedSteps, 0), progress.totalSteps),
    ...(active === undefined ? {} : { activeTaskId: active.id, active }),
    queued: rows.filter(({ step, index }) => step.status === "pending" && index !== fallbackIndex),
    completed: rows.filter(
      ({ step, index }) =>
        (step.status === "completed" || step.status === "skipped") && index !== fallbackIndex,
    ),
    blocked: rows.filter(
      ({ step, index }) =>
        (step.status === "blocked" || step.status === "failed") && index !== fallbackIndex,
    ),
    ...(currentActivity ? { currentActivity } : {}),
    activityHistory: currentActivity
      ? activityJob.activities.filter((activity) => activity.id !== currentActivity.id).slice(-4)
      : activityJob.activities.slice(-4),
    currentLabel,
    ...(currentTaskContext ? { currentTaskContext } : {}),
    state,
    waitingForUser,
    changes,
    verification,
    showVerification: verification.length > 0 || steps.some(isVerificationStep),
  };
}
