import type { OrchestrationThreadActivity } from "@rune/contracts";
import type { AgentActivityChangeRecord } from "@rune/shared/agentActivity";
import { Activity, CheckCircle2, CircleDashed, Gauge, Sparkles } from "lucide-react";
import { useMemo } from "react";

import {
  type ComposerTaskStep,
  type ComposerTasksProgress,
  TaskEvidence,
  TaskStageStrip,
  TaskStatusIcon,
} from "./chat/ComposerTasksBadge";
import { deriveWorkrailModel } from "./chat/taskWorkrail.logic";

/** The side-panel projection of the same turn plan shown above the composer. */
export function TasksPanel({
  activities,
  onOpenChange,
  progress,
  steps,
}: {
  activities: readonly OrchestrationThreadActivity[];
  readonly onOpenChange?: (change: AgentActivityChangeRecord) => void;
  progress: ComposerTasksProgress | null;
  steps: readonly ComposerTaskStep[] | null;
}) {
  const workrail = useMemo(() => deriveWorkrailModel(progress, steps), [progress, steps]);

  if (workrail === null) {
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
              {workrail.complete >= workrail.total ? "Everything is complete" : "One shared plan"}
            </p>
          </div>
          <div
            className="rune-tasks-panel-score"
            aria-label={`${workrail.complete} of ${workrail.total} tasks complete`}
          >
            {workrail.complete}/{workrail.total}
          </div>
        </div>
        <TaskStageStrip steps={steps ?? []} />
        <div className="rune-tasks-panel-stats" aria-label="Task summary">
          <span>
            <CheckCircle2 aria-hidden="true" /> {workrail.complete} done
          </span>
          <span>
            <CircleDashed aria-hidden="true" /> {workrail.queued.length} queued
          </span>
          <span>
            <Gauge aria-hidden="true" /> {workrail.total} total
          </span>
        </div>
      </section>

      {workrail.active ? (
        <section className="rune-tasks-focus" aria-labelledby="rune-tasks-focus-title">
          <div className="rune-tasks-section-label">
            <Activity aria-hidden="true" /> NOW
          </div>
          <div className="rune-tasks-focus-card">
            <TaskStatusIcon status={workrail.active.step.status} />
            <div className="min-w-0 flex-1">
              <h3 id="rune-tasks-focus-title">{workrail.active.step.step}</h3>
              <p>Agent is actively working on this step</p>
            </div>
            <span className="rune-tasks-live-dot" aria-hidden="true" />
          </div>
        </section>
      ) : null}

      {activities.length > 0 ? (
        <section
          className="rune-tasks-focus rune-tasks-evidence-section"
          aria-labelledby="rune-tasks-evidence-title"
        >
          <div className="rune-tasks-section-label">
            <Activity aria-hidden="true" /> RECEIPTS
          </div>
          <h3 id="rune-tasks-evidence-title" className="sr-only">
            Task evidence
          </h3>
          <TaskEvidence activities={activities} onOpenChange={onOpenChange} />
        </section>
      ) : null}

      <section className="rune-tasks-roadmap" aria-labelledby="rune-tasks-roadmap-title">
        <div className="rune-tasks-section-heading">
          <h3 id="rune-tasks-roadmap-title">Roadmap</h3>
          <span>
            {workrail.complete}/{workrail.total}
          </span>
        </div>
        <div className="rune-tasks-panel-list" role="list">
          {[...workrail.queued, ...workrail.blocked, ...workrail.completed].map(({ id, step }) => (
            <div
              key={id}
              className="rune-tasks-panel-row"
              data-rune-task-status={step.status}
              role="listitem"
            >
              <TaskStatusIcon status={step.status} />
              <span className="min-w-0 flex-1">{step.step}</span>
              {step.status === "blocked" || step.status === "failed" ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-300">
                  Waiting for you
                </span>
              ) : null}
              <span className="sr-only">{step.status}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="sr-only" aria-live="polite">
        {workrail.complete} of {workrail.total} tasks complete
      </div>
    </div>
  );
}
