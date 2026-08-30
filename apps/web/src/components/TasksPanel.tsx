import type { OrchestrationThreadActivity } from "@rune/contracts";
import {
  Activity,
  Check,
  CheckCircle2,
  CircleDashed,
  FileCode2,
  FlaskConical,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

import {
  type ComposerTaskStep,
  type ComposerTasksProgress,
  TaskStageStrip,
  TaskStatusIcon,
} from "./chat/ComposerTasksBadge";
import { deriveWorkrailModel } from "./chat/taskWorkrail.logic";

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
  const workrail = useMemo(
    () => deriveWorkrailModel(progress, steps, activities),
    [activities, progress, steps],
  );

  if (workrail === null) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center"
        data-rune-workrail-empty="true"
      >
        <p className="text-sm font-medium">No active task plan</p>
        <p className="max-w-56 text-xs text-muted-foreground">
          Tasks will appear here when the agent starts a structured plan.
        </p>
      </div>
    );
  }

  const stateLabel =
    workrail.state === "waiting"
      ? "Waiting for you"
      : workrail.state === "failed"
        ? "Needs attention"
        : workrail.state === "completed"
          ? "Complete"
          : workrail.state === "working"
            ? "Working"
            : "Ready";

  return (
    <div
      className="rune-workrail flex h-full min-h-0 flex-col overflow-auto"
      data-rune-tasks-panel="true"
      data-rune-workrail="true"
      data-rune-workrail-state={workrail.state}
    >
      <header className="rune-workrail-header" aria-labelledby="rune-tasks-panel-title">
        <div className="rune-workrail-kicker">
          <Sparkles aria-hidden="true" className="size-3" /> WORKRAIL
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="rune-tasks-panel-title" className="rune-tasks-panel-title">
              Task activity
            </h2>
            <p className="rune-tasks-panel-subtitle" aria-live="polite">
              {workrail.complete} of {workrail.total} tasks complete
            </p>
          </div>
          <span className="rune-workrail-state" data-rune-workrail-status>
            {stateLabel}
          </span>
        </div>
        <TaskStageStrip steps={steps ?? []} />
      </header>

      <section
        className="rune-workrail-section rune-workrail-activity"
        aria-labelledby="rune-workrail-activity-title"
        data-rune-workrail-section="activity"
      >
        <div className="rune-workrail-section-heading">
          <h3 id="rune-workrail-activity-title">
            <Activity aria-hidden="true" /> Activity
          </h3>
        </div>
        {workrail.activityHistory.length > 0 ? (
          <div className="rune-workrail-history" aria-label="Recent activity">
            {workrail.activityHistory.map((activity) => (
              <div key={activity.id} className="rune-workrail-history-row">
                {activity.status === "done" ? (
                  <Check aria-hidden="true" />
                ) : activity.status === "failed" ? (
                  <XCircle aria-hidden="true" />
                ) : (
                  <span aria-hidden="true" className="rune-workrail-history-dot" />
                )}
                <span>{activity.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div
          key={workrail.currentActivity?.id ?? workrail.activeTaskId ?? "workrail-current"}
          className="rune-workrail-current"
          data-rune-workrail-current="true"
          data-rune-workrail-current-status={workrail.state}
        >
          <span className="rune-workrail-current-marker" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h4 id="rune-tasks-focus-title">{workrail.currentLabel}</h4>
            {workrail.currentTaskContext ? (
              <p data-rune-workrail-task-context>Task · {workrail.currentTaskContext}</p>
            ) : null}
            {workrail.currentActivity?.reasoningSummary ? (
              <p className="rune-workrail-rationale">{workrail.currentActivity.reasoningSummary}</p>
            ) : null}
          </div>
          <span className="rune-workrail-current-status">{stateLabel}</span>
        </div>
      </section>

      {workrail.changes.length > 0 ? (
        <section
          className="rune-workrail-section"
          aria-labelledby="rune-workrail-changes-title"
          data-rune-workrail-section="changes"
        >
          <div className="rune-workrail-section-heading">
            <h3 id="rune-workrail-changes-title">
              <FileCode2 aria-hidden="true" /> Changes
            </h3>
            <span>{workrail.changes.length} files</span>
          </div>
          <div className="rune-workrail-receipts" role="list">
            {workrail.changes.map((change) => (
              <div key={change.id} className="rune-workrail-change" role="listitem">
                <span className="min-w-0 flex-1 truncate" title={change.path}>
                  {change.path}
                </span>
                {change.additions > 0 || change.deletions > 0 ? (
                  <span className="shrink-0 font-mono text-[10px] tabular-nums">
                    <span className="text-success">+{change.additions}</span>{" "}
                    <span className="text-destructive">−{change.deletions}</span>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {workrail.showVerification ? (
        <section
          className="rune-workrail-section"
          aria-labelledby="rune-workrail-verification-title"
          data-rune-workrail-section="verification"
        >
          <div className="rune-workrail-section-heading">
            <h3 id="rune-workrail-verification-title">
              <FlaskConical aria-hidden="true" /> Verification
            </h3>
          </div>
          {workrail.verification.length > 0 ? (
            <div className="rune-workrail-receipts" role="list">
              {workrail.verification.map((entry) => (
                <div
                  key={entry.id}
                  className="rune-workrail-verification"
                  data-rune-workrail-verification-status={entry.status}
                  role="listitem"
                >
                  {entry.status === "done" ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : entry.status === "failed" ? (
                    <XCircle aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true" className="rune-workrail-history-dot" />
                  )}
                  <span className="min-w-0 flex-1">{entry.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rune-workrail-empty-receipt">No verification evidence yet.</p>
          )}
        </section>
      ) : null}

      <section
        className="rune-workrail-section rune-workrail-plan"
        aria-labelledby="rune-workrail-plan-title"
        data-rune-workrail-section="plan"
      >
        <div className="rune-workrail-section-heading">
          <h3 id="rune-workrail-plan-title">Plan</h3>
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
              {step.status === "blocked" ? (
                <span className="rune-workrail-task-attention">Waiting for you</span>
              ) : step.status === "failed" ? (
                <span className="rune-workrail-task-attention">Failed</span>
              ) : null}
              <span className="sr-only">{step.status}</span>
            </div>
          ))}
        </div>
        {workrail.queued.length === 0 &&
        workrail.blocked.length === 0 &&
        workrail.completed.length === 0 ? (
          <p className="rune-workrail-empty-receipt">No remaining plan items.</p>
        ) : null}
      </section>
    </div>
  );
}
