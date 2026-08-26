import { ListTodoIcon, XIcon } from "lucide-react";
import { memo, type CSSProperties } from "react";

import { formatDuration } from "../../session-logic";
import type { RunePanelMotionState } from "../../runePanelMotion";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";

export interface ComposerTasksProgress {
  readonly step: string;
  readonly completedSteps: number;
  readonly totalSteps: number;
}

export interface ComposerTaskStep {
  readonly durationMs?: number;
  readonly step: string;
  readonly status: "pending" | "inProgress" | "completed";
}

/** Long lists stagger only their first rows; the tail enters with the pack. */
const TASKS_STAGGER_MAX_ROWS = 8;

const TASK_STATUS_LABEL = {
  completed: "Completed",
  inProgress: "In progress",
  pending: "Pending",
} as const;

export function tasksProgressPercent(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
}

export function taskRowMotionStyle(index: number): CSSProperties {
  return { "--stagger-index": Math.min(Math.max(index, 0), TASKS_STAGGER_MAX_ROWS) } as CSSProperties;
}

function keyedTaskSteps(steps: readonly ComposerTaskStep[]) {
  const occurrences = new Map<string, number>();
  return steps.map((step, index) => {
    const occurrence = occurrences.get(step.step) ?? 0;
    occurrences.set(step.step, occurrence + 1);
    return { index, key: `${step.step}:${occurrence}`, step };
  });
}

/**
 * Status marks remount whenever a step's status flips (keyed by status
 * upstream), which is what plays the one-shot fill/draw animations.
 */
function TaskStatusIcon({ status }: { status: ComposerTaskStep["status"] }) {
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
      )}
      data-rune-task-status={status}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "inProgress"
            ? "bg-primary ring-2 ring-primary/20"
            : "border border-muted-foreground/40",
        )}
      />
    </span>
  );
}

function TaskSegments({
  className,
  steps,
}: {
  readonly className?: string;
  readonly steps: readonly ComposerTaskStep[];
}) {
  if (steps.length <= 1) return null;

  return (
    <span aria-hidden className={cn("flex w-10 shrink-0 items-center gap-0.5", className)}>
      {keyedTaskSteps(steps).map(({ key, step }) => (
        <span
          key={key}
          className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-muted-foreground/25"
          data-rune-task-segment={step.status}
        >
          {step.status !== "pending" ? (
            <span
              key={step.status}
              className={cn(
                "rune-task-segment-fill absolute inset-0 origin-left rounded-full",
                step.status === "completed" ? "bg-success" : "bg-primary",
              )}
            />
          ) : null}
        </span>
      ))}
    </span>
  );
}

export const ComposerTasksBadge = memo(function ComposerTasksBadge({
  expanded,
  hasTrailingShoulder = false,
  motionState,
  onDismiss,
  onToggle,
  placement = "tab",
  progress,
  steps,
}: {
  readonly expanded: boolean;
  readonly hasTrailingShoulder?: boolean;
  readonly motionState?: RunePanelMotionState;
  readonly onDismiss: () => void;
  readonly onToggle: () => void;
  readonly placement?: "inline" | "tab";
  readonly progress: ComposerTasksProgress;
  readonly steps: readonly ComposerTaskStep[];
}) {
  if (progress.totalSteps <= 0) return null;

  const allDone = progress.completedSteps >= progress.totalSteps;
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
          <ListTodoIcon aria-hidden className="size-3 shrink-0" />
          <span>Tasks</span>
          <TaskSegments steps={steps} />
          <span
            className={cn(
              "font-medium tabular-nums",
              allDone ? "text-success" : "text-muted-foreground",
            )}
          >
            {progress.completedSteps}/{progress.totalSteps}
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
        <ListTodoIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="shrink-0">Tasks</span>
        <span
          key={progress.step}
          className="rune-task-step-swap min-w-0 flex-1 truncate text-left font-medium text-foreground/80"
          data-composer-task-current="true"
        >
          {progress.step}
        </span>
        <span
          className={cn(
            "shrink-0 font-medium tabular-nums",
            allDone ? "text-success" : "text-muted-foreground",
          )}
        >
          {progress.completedSteps}/{progress.totalSteps}
        </span>
        <TaskSegments className="w-20" steps={steps} />
      </button>
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
  progress,
  steps,
}: {
  readonly onDismiss: () => void;
  readonly onCollapse: () => void;
  readonly progress: ComposerTasksProgress;
  readonly steps: readonly ComposerTaskStep[];
}) {
  const allDone = progress.completedSteps >= progress.totalSteps;

  return (
    <div
      className="chat-composer-top-drawer"
      data-chat-composer-tasks-drawer="true"
      data-variant={allDone ? "success" : undefined}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 sm:px-4">
        <button
          type="button"
          aria-expanded="true"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch text-left text-xs text-muted-foreground hover:text-foreground"
          onClick={onCollapse}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ListTodoIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="font-medium text-foreground">Tasks</span>
          <span className={cn("tabular-nums", allDone && "text-success")}>
            {progress.completedSteps}/{progress.totalSteps}
          </span>
        </button>
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
        <span
          className="rune-tasks-progress-fill"
          style={{ width: `${tasksProgressPercent(progress.completedSteps, progress.totalSteps)}%` }}
        />
      </div>
      <div className="space-y-1 px-3 pb-4 pt-2 sm:px-4" role="list">
        {keyedTaskSteps(steps).map(({ index, key, step }) => (
          <div
            key={key}
            className="rune-task-row flex items-center gap-2 text-xs leading-5"
            role="listitem"
            style={taskRowMotionStyle(index)}
          >
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
        ))}
      </div>
    </div>
  );
});
