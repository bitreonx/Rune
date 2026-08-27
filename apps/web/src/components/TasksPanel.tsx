import type { OrchestrationThreadActivity } from "@rune/contracts";
import { Activity, CheckCircle2, CircleDashed, Gauge, Sparkles } from "lucide-react";
import { useMemo } from "react";

import {
  type ComposerTaskStep,
  type ComposerTasksProgress,
  TaskEvidence,
  TaskStatusIcon,
  tasksProgressPercent,
} from "./chat/ComposerTasksBadge";

/** The side-panel projection of the same turn plan shown above the composer. */
export function TasksPanel({
  activities,
  progress,
  steps,
}: {
  activities: readonly OrchestrationThreadActivity[];
  progress: ComposerTasksProgress | null;
  steps: readonly ComposerTaskStep[] | null;
}) {
  const currentStep = useMemo(
    () =>
      steps?.find((step) => step.status === "inProgress") ??
      steps?.find((step) => step.status === "pending"),
    [steps],
  );
  const completedCount = progress?.completedSteps ?? 0;
  const totalCount = progress?.totalSteps ?? 0;
  const percent = tasksProgressPercent(completedCount, totalCount);
  const remainingCount = Math.max(0, totalCount - completedCount);

  if (!progress || !steps || progress.totalSteps <= 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium">No active task plan</p>
        <p className="max-w-56 text-xs text-muted-foreground">
          Tasks will appear here when the agent starts a structured plan.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rune-tasks-panel flex h-full min-h-0 flex-col overflow-auto"
      data-rune-tasks-panel="true"
    >
      <section className="rune-tasks-panel-hero" aria-labelledby="rune-tasks-panel-title">
        <div className="rune-tasks-panel-kicker">
          <Sparkles aria-hidden="true" className="size-3" /> TURN PLAN
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="rune-tasks-panel-title" className="rune-tasks-panel-title">
              Work in motion
            </h2>
            <p className="rune-tasks-panel-subtitle" aria-live="polite">
              {completedCount >= totalCount
                ? "Everything is complete"
                : (currentStep?.step ?? progress.step ?? "Preparing the next step")}
            </p>
          </div>
          <div className="rune-tasks-panel-score" aria-label={`${percent}% complete`}>
            <span>{percent}</span>
            <small>%</small>
          </div>
        </div>
        <div
          className="rune-tasks-panel-meter"
          role="progressbar"
          aria-label="Task progress"
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-valuenow={completedCount}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="rune-tasks-panel-stats" aria-label="Task summary">
          <span>
            <CheckCircle2 aria-hidden="true" /> {completedCount} done
          </span>
          <span>
            <CircleDashed aria-hidden="true" /> {remainingCount} remaining
          </span>
          <span>
            <Gauge aria-hidden="true" /> {totalCount} total
          </span>
        </div>
      </section>

      {currentStep ? (
        <section className="rune-tasks-focus" aria-labelledby="rune-tasks-focus-title">
          <div className="rune-tasks-section-label">
            <Activity aria-hidden="true" /> NOW
          </div>
          <div className="rune-tasks-focus-card">
            <TaskStatusIcon status={currentStep.status} />
            <div className="min-w-0 flex-1">
              <h3 id="rune-tasks-focus-title">{currentStep.step}</h3>
              <p>Agent is actively working on this step</p>
            </div>
            <span className="rune-tasks-live-dot" aria-hidden="true" />
          </div>
          {activities.length > 0 ? <TaskEvidence activities={activities} /> : null}
        </section>
      ) : null}

      <section className="rune-tasks-roadmap" aria-labelledby="rune-tasks-roadmap-title">
        <div className="rune-tasks-section-heading">
          <h3 id="rune-tasks-roadmap-title">Roadmap</h3>
          <span>
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="rune-tasks-panel-list" role="list">
          {steps.map((step) => (
            <div
              key={`${step.step}:${step.status}`}
              className="rune-tasks-panel-row"
              data-rune-task-status={step.status}
              role="listitem"
            >
              <TaskStatusIcon status={step.status} />
              <span className="min-w-0 flex-1">{step.step}</span>
              <span className="sr-only">{step.status}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="sr-only" aria-live="polite">
        {completedCount} of {totalCount} tasks complete
      </div>
    </div>
  );
}
