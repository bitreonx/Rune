import { ChevronDown, ChevronRight, PanelRight, XIcon } from "lucide-react";
import { memo, useMemo, useState, type CSSProperties } from "react";

import { formatDuration } from "../../session-logic";
import type { RunePanelMotionState } from "../../runePanelMotion";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import {
  deriveAgentActivityJob,
  type AgentActivityChangeRecord,
} from "@rune/shared/agentActivity";
import type { OrchestrationThreadActivity } from "@rune/contracts";
import type { WorkrailStep } from "./taskWorkrail.logic";

export interface ComposerTasksProgress {
  readonly step: string;
  readonly completedSteps: number;
  readonly totalSteps: number;
}

export type ComposerTaskStep = WorkrailStep;

/** Long lists stagger only their first rows; the tail enters with the pack. */
const TASKS_STAGGER_MAX_ROWS = 8;
const TASK_EVIDENCE_PREVIEW_LIMIT = 8;
const TASK_EVIDENCE_FILES_PREVIEW_LIMIT = 3;
const EMPTY_TASK_ACTIVITIES: readonly OrchestrationThreadActivity[] = [];

const TASK_STATUS_LABEL = {
  completed: "Completed",
  inProgress: "In progress",
  pending: "Pending",
  blocked: "Blocked",
  failed: "Failed",
  skipped: "Skipped",
} as const;

const statusMark: Record<ComposerTaskStep["status"], string> = {
  completed: String.fromCharCode(0x2713),
  inProgress: String.fromCharCode(0x25cf),
  pending: String.fromCharCode(0x25cb),
  blocked: "!",
  failed: String.fromCharCode(0xd7),
  skipped: "-",
};

export function tasksProgressPercent(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
}

export function taskRowMotionStyle(index: number): CSSProperties {
  return {
    "--stagger-index": Math.min(Math.max(index, 0), TASKS_STAGGER_MAX_ROWS),
  } as CSSProperties;
}

/**
 * Status marks remount whenever a step's status flips (keyed by status
 * upstream), which is what plays the one-shot fill/draw animations.
 */
export function TaskStatusIcon({ status }: { status: ComposerTaskStep["status"] }) {
  if (status === "completed") {
    return (
      <span
        aria-hidden
        className="rune-task-check flex w-3.5 shrink-0 justify-center text-success"
        data-rune-task-status="completed"
      >
        <svg
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path d="M5 12.5l4.5 4.5L19 7" pathLength={1} />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex w-3.5 shrink-0 justify-center",
        status === "inProgress" ? "rune-task-dot-active" : "rune-task-dot",
        status === "blocked" && "text-amber-500",
        status === "failed" && "text-destructive",
        status === "skipped" && "text-muted-foreground/50",
      )}
      data-rune-task-status={status}
    >
      <span
        className={cn(
          "flex size-3 items-center justify-center font-mono text-[11px] leading-none",
          status === "inProgress"
            ? "text-primary"
            : status === "pending"
              ? "text-muted-foreground/50"
              : "font-semibold",
        )}
      ></span>
    </span>
  );
}

/** Structural progress shared by the composer, drawer, and Workrail panel. */
export function TaskStageStrip({ steps }: { readonly steps: readonly ComposerTaskStep[] }) {
  return (
    <div className="rune-task-stages" role="list" aria-label="Task stages">
      {steps.map((step, index) => (
        <span
          key={`${index}:${step.step}`}
          className={cn(
            "rune-task-stage",
            step.status === "completed" && "rune-task-stage-completed",
            step.status === "inProgress" && "rune-task-stage-active",
            (step.status === "blocked" || step.status === "failed") && "rune-task-stage-blocked",
            step.status === "skipped" && "rune-task-stage-skipped",
          )}
          role="listitem"
          aria-label={`${step.step}: ${TASK_STATUS_LABEL[step.status]}`}
          title={step.step}
        />
      ))}
    </div>
  );
}

export function TaskEvidence({
  activities,
  onOpenChange,
}: {
  activities: readonly OrchestrationThreadActivity[];
  readonly onOpenChange?: (change: AgentActivityChangeRecord) => void;
}) {
  const [showEarlierReceipts, setShowEarlierReceipts] = useState(false);
  const [expandedChangeGroups, setExpandedChangeGroups] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const evidenceActivities = useMemo(() => {
    const job = deriveAgentActivityJob(activities);
    return job.activities;
  }, [activities]);
  if (evidenceActivities.length === 0) return null;
  const hiddenReceiptCount = Math.max(0, evidenceActivities.length - TASK_EVIDENCE_PREVIEW_LIMIT);
  const visibleEvidenceActivities = showEarlierReceipts
    ? evidenceActivities
    : evidenceActivities.slice(-TASK_EVIDENCE_PREVIEW_LIMIT);
  return (
    <div className="rune-task-evidence" data-rune-task-evidence="true">
      {hiddenReceiptCount > 0 ? (
        <button
          type="button"
          className="rune-task-evidence-more cursor-pointer text-left underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-expanded={showEarlierReceipts}
          onClick={() => setShowEarlierReceipts((expanded) => !expanded)}
        >
          {showEarlierReceipts
            ? "Show recent receipts"
            : `Show ${hiddenReceiptCount} earlier ${hiddenReceiptCount === 1 ? "receipt" : "receipts"}`}
        </button>
      ) : null}
      {visibleEvidenceActivities.map((activity) => {
        const changesExpanded = expandedChangeGroups.has(activity.id);
        const allChanges = activity.changes;
        const changes = changesExpanded
          ? allChanges
          : allChanges.slice(-TASK_EVIDENCE_FILES_PREVIEW_LIMIT);
        const files = [
          ...new Set(activity.operations.map((operation) => operation.filePath).filter(Boolean)),
        ];
        const additions = activity.changes.reduce((total, change) => total + change.additions, 0);
        const deletions = activity.changes.reduce((total, change) => total + change.deletions, 0);
        const verificationReceipts = activity.receipts.filter(
          (receipt) => receipt.kind === "verification" && receipt.status === "done",
        );
        const allFiles = allChanges.length > 0 ? allChanges : files;
        const visibleFiles =
          allChanges.length > 0
            ? changes
            : changesExpanded
              ? files
              : files.slice(-TASK_EVIDENCE_FILES_PREVIEW_LIMIT);
        const hiddenFileCount = Math.max(0, allFiles.length - visibleFiles.length);
        return (
          <div key={activity.id} className="rune-task-evidence-item">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="rune-task-evidence-label">
                {activity.reasoningSummary ?? activity.label}
              </span>
              {activity.changes.length > 0 ? (
                <span className="rune-task-evidence-stats">
                  {activity.changes.length} {activity.changes.length === 1 ? "file" : "files"} · +
                  {additions} −{deletions}
                </span>
              ) : null}
              {verificationReceipts.map((receipt) => (
                <span key={receipt.id} className="rune-task-evidence-verification">
                  ✓ {receipt.label}
                </span>
              ))}
            </div>
            {hiddenFileCount > 0 ||
            (changesExpanded && allChanges.length > TASK_EVIDENCE_FILES_PREVIEW_LIMIT) ? (
              <button
                type="button"
                className="rune-task-evidence-file rune-task-evidence-more cursor-pointer text-left underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-expanded={changesExpanded}
                onClick={() =>
                  setExpandedChangeGroups((current) => {
                    const next = new Set(current);
                    if (next.has(activity.id)) next.delete(activity.id);
                    else next.add(activity.id);
                    return next;
                  })
                }
              >
                {changesExpanded
                  ? `Show fewer ${allChanges.length > 0 ? "changes" : "files"}`
                  : `Show ${hiddenFileCount} more ${
                      hiddenFileCount === 1
                        ? allChanges.length > 0
                          ? "change"
                          : "file"
                        : allChanges.length > 0
                          ? "changes"
                          : "files"
                    }`}
              </button>
            ) : null}
            {visibleFiles.map((item) => {
              const file = typeof item === "string" ? item : item.path;
              return onOpenChange && typeof item !== "string" ? (
                <button
                  key={file}
                  type="button"
                  className="rune-task-evidence-file cursor-pointer text-left underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title={`Open change receipt for ${file}`}
                  onClick={() => onOpenChange(item)}
                >
                  {file}
                </button>
              ) : (
                <span key={file} className="rune-task-evidence-file">
                  {file}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export const ComposerTasksBadge = memo(function ComposerTasksBadge({
  expanded,
  hasTrailingShoulder = false,
  motionState,
  onDismiss,
  onOpenSidePanel,
  onToggle,
  placement = "tab",
  progress,
}: {
  readonly expanded: boolean;
  readonly hasTrailingShoulder?: boolean;
  readonly motionState?: RunePanelMotionState;
  readonly onDismiss: () => void;
  readonly onOpenSidePanel?: () => void;
  readonly onToggle: () => void;
  readonly placement?: "inline" | "tab";
  readonly progress: ComposerTasksProgress;
  readonly steps: readonly ComposerTaskStep[];
}) {
  if (progress.totalSteps <= 0) return null;

  const allDone = progress.completedSteps >= progress.totalSteps;
  const stateLabel = allDone ? "Complete" : progress.step ? `- ${progress.step}` : "- Working";
  const label = `Tasks: ${progress.completedSteps} of ${progress.totalSteps} complete. Current task: ${progress.step}`;
  if (placement === "inline") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-0.5"
        data-composer-tasks-badge="true"
        data-rune-tasks-tab-state={motionState}
      >
        <Button
          size="micro"
          variant="ghost-muted"
          aria-expanded={expanded}
          aria-label={label}
          className="shrink-0 gap-1 px-1.5"
          onClick={onToggle}
          onPointerDown={(event) => event.preventDefault()}
        >
          <span
            aria-hidden
            className={cn("rune-task-badge-mark", allDone ? "text-success" : "text-primary")}
            data-rune-task-badge-state={allDone ? "completed" : "active"}
          />
          <span>Tasks</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              allDone ? "text-success" : "text-muted-foreground",
            )}
          >
            {progress.completedSteps}/{progress.totalSteps} {stateLabel}
          </span>
        </Button>
        <Button
          size="icon-micro"
          variant="ghost-muted"
          aria-label="Dismiss tasks for this turn"
          className="shrink-0"
          onClick={onDismiss}
          onPointerDown={(event) => event.preventDefault()}
        >
          <XIcon aria-hidden className="size-2.5" />
        </Button>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "chat-composer-shoulder-tab chat-composer-tasks-tab absolute -top-7 left-4 z-0 flex h-8 items-center gap-1 rounded-t-xl border border-b-0 px-2 pb-1 text-xs leading-none text-muted-foreground",
        hasTrailingShoulder ? "right-28" : "right-4",
        allDone && "text-foreground",
      )}
      data-composer-tasks-badge="true"
      data-rune-tasks-tab-state={motionState}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={label}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch text-muted-foreground hover:text-foreground"
        onClick={onToggle}
        onPointerDown={(event) => event.preventDefault()}
      >
        <span
          aria-hidden
          className={cn("rune-task-badge-mark", allDone ? "text-success" : "text-primary")}
          data-rune-task-badge-state={allDone ? "completed" : "active"}
        />
        <span className="shrink-0">Tasks</span>
        <span
          key={progress.step}
          className="rune-task-step-swap min-w-0 flex-1 truncate text-left font-medium text-foreground/80"
          data-composer-task-current="true"
        >
          {allDone ? "Complete" : progress.step || "Working"}
        </span>
        <span
          className={cn(
            "shrink-0 font-medium tabular-nums",
            allDone ? "text-success" : "text-muted-foreground",
          )}
        >
          {progress.completedSteps}/{progress.totalSteps}
        </span>
      </button>
      {onOpenSidePanel ? (
        <Button
          size="icon-micro"
          variant="ghost-muted"
          aria-label="Open tasks in side panel"
          className="shrink-0"
          onClick={onOpenSidePanel}
          onPointerDown={(event) => event.preventDefault()}
        >
          <PanelRight aria-hidden className="size-3" />
        </Button>
      ) : null}
      <Button
        size="icon-micro"
        variant="ghost-muted"
        aria-label="Dismiss tasks for this turn"
        className="shrink-0"
        onClick={onDismiss}
        onPointerDown={(event) => event.preventDefault()}
      >
        <XIcon aria-hidden className="size-3" />
      </Button>
    </div>
  );
});

export const ComposerTasksDrawer = memo(function ComposerTasksDrawer({
  onDismiss,
  onCollapse,
  onOpenSidePanel,
  progress,
  steps,
  activities = EMPTY_TASK_ACTIVITIES,
}: {
  readonly onDismiss: () => void;
  readonly onCollapse: () => void;
  readonly onOpenSidePanel?: () => void;
  readonly activities?: readonly OrchestrationThreadActivity[];
  readonly progress: ComposerTasksProgress;
  readonly steps: readonly ComposerTaskStep[];
}) {
  const allDone = progress.completedSteps >= progress.totalSteps;
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === "inProgress" || step.status === "pending"),
  );
  const recentCompleted = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.status === "completed")
    .slice(-4);
  const olderCompletedCount = Math.max(
    0,
    steps.filter((step) => step.status === "completed").length - recentCompleted.length,
  );
  const visibleSteps = historyExpanded
    ? steps.map((step, index) => ({ step, index }))
    : allDone
      ? []
      : steps
          .map((step, index) => ({ step, index }))
          .filter(({ step, index }) =>
            step.status === "completed"
              ? recentCompleted.some((item) => item.index === index)
              : step.status === "pending"
                ? index <= currentIndex + 4
                : true,
          );

  return (
    <div
      className="chat-composer-top-drawer"
      data-chat-composer-tasks-drawer="true"
      data-variant={allDone ? "success" : undefined}
    >
      <div className="rune-tasks-header flex items-center gap-1 px-3 py-2 sm:px-4">
        <button
          type="button"
          aria-expanded="true"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch text-left text-xs text-muted-foreground hover:text-foreground"
          onClick={onCollapse}
          onPointerDown={(event) => event.preventDefault()}
        >
          <span
            aria-hidden
            className={cn("rune-task-badge-mark", allDone ? "text-success" : "text-primary")}
            data-rune-task-badge-state={allDone ? "completed" : "active"}
          />
          <span className="font-medium text-foreground">Tasks</span>
          <span className={cn("tabular-nums", allDone && "text-success")}>
            {progress.completedSteps}/{progress.totalSteps}
          </span>
        </button>
        {onOpenSidePanel ? (
          <Button
            size="icon-micro"
            variant="ghost-muted"
            aria-label="Open tasks in side panel"
            onClick={onOpenSidePanel}
          >
            <PanelRight className="size-3" />
          </Button>
        ) : null}
        <Button
          size="icon-micro"
          variant="ghost-muted"
          aria-label="Dismiss tasks for this turn"
          className="shrink-0"
          onClick={onDismiss}
          onPointerDown={(event) => event.preventDefault()}
        >
          <XIcon aria-hidden className="size-3" />
        </Button>
      </div>
      <div
        aria-label="Task progress"
        aria-valuemax={progress.totalSteps}
        aria-valuemin={0}
        aria-valuenow={progress.completedSteps}
        className="rune-tasks-progress mx-3 sm:mx-4"
        data-rune-tasks-progress={allDone ? "done" : "running"}
        role="progressbar"
      >
        <TaskStageStrip steps={steps} />
      </div>
      <div className="space-y-1 px-3 pb-4 pt-2 sm:px-4" role="list">
        {visibleSteps.map(({ index, step }) => {
          const key = `${step.step}:${index}`;
          return (
            <div
              key={key}
              className={cn(
                "rune-task-row text-xs leading-5",
                step.status === "inProgress" && "rune-task-row-active",
                step.status === "failed" && "rune-task-row-failed",
              )}
              role="listitem"
              style={taskRowMotionStyle(index)}
            >
              <div className="flex items-center gap-2">
                <TaskStatusIcon key={`${key}:${step.status}`} status={step.status} />
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    step.status === "completed"
                      ? "text-muted-foreground/55"
                      : step.status === "inProgress"
                        ? "text-foreground/90"
                        : "text-muted-foreground/70",
                  )}
                >
                  {step.step}
                </span>
                <span className="sr-only">{TASK_STATUS_LABEL[step.status]}</span>
                <span
                  className="ml-auto w-10 shrink-0 text-right text-[10px] text-muted-foreground/45 tabular-nums"
                  data-composer-task-duration="true"
                >
                  {step.durationMs !== undefined
                    ? formatDuration(step.durationMs)
                    : step.status === "inProgress"
                      ? "now"
                      : null}
                </span>
              </div>
              {step.status === "inProgress" && activities.length > 0 ? (
                <TaskEvidence activities={activities} />
              ) : null}
            </div>
          );
        })}
        {olderCompletedCount > 0 && !allDone && !historyExpanded ? (
          <button
            type="button"
            className="rune-task-history-toggle"
            onClick={() => setHistoryExpanded(true)}
          >
            <ChevronRight className="size-3" />{" "}
            <span>
              {statusMark.completed} {olderCompletedCount} earlier tasks
            </span>
          </button>
        ) : null}
        {allDone ? (
          <button
            type="button"
            className="rune-task-history-toggle"
            onClick={() => setHistoryExpanded((value) => !value)}
          >
            {historyExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}{" "}
            <span>
              {statusMark.completed} Tasks complete - {progress.completedSteps}/
              {progress.totalSteps}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
});
