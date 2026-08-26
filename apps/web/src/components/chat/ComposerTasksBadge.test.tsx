import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import {
  ComposerTasksBadge,
  ComposerTasksDrawer,
  taskRowMotionStyle,
  tasksProgressPercent,
} from "./ComposerTasksBadge";

const progress = {
  step: "Attach task progress",
  completedSteps: 1,
  totalSteps: 3,
};
const steps = [
  { durationMs: 4_000, step: "Inspect the composer", status: "completed" as const },
  { step: "Attach task progress", status: "inProgress" as const },
  { step: "Verify the result", status: "pending" as const },
];

describe("ComposerTasksBadge", () => {
  it("renders active progress as an attached composer tab", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain('data-composer-tasks-badge="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("chat-composer-shoulder-tab");
    expect(markup).toContain("chat-composer-tasks-tab");
    expect(markup).toContain("rounded-t-xl");
    expect(markup).toContain("border-b-0");
    expect(markup).toContain("left-4");
    expect(markup).toContain("right-4");
    expect(markup).toContain('data-composer-task-current="true"');
    expect(markup).toContain("min-w-0 flex-1 truncate");
    expect(markup).toContain("w-20");
    expect(markup).toContain("Tasks");
    expect(markup).toContain("Attach task progress");
    expect(markup).not.toContain("·");
    expect(markup).toContain("1/3");
    expect(markup).toContain("Current task: Attach task progress");
    expect(markup).toContain("lucide-list-todo");
    expect(markup).toContain('aria-label="Dismiss tasks for this turn"');
    expect(markup).toContain("lucide-x");
    expect(markup).not.toContain("lucide-chevron");
    expect(markup).toContain("bg-success");
    expect(markup).toContain("bg-primary");
    expect(markup).toContain("bg-muted-foreground/25");
  });

  it("leaves room for the stash tab when both shoulders are present", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        hasTrailingShoulder
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain("right-28");
    expect(markup).not.toContain("right-4");
  });

  it("carries its motion state so spawn and exit can animate", () => {
    const opening = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        motionState="opening"
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );
    const closing = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        motionState="closing"
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );
    const idle = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(opening).toContain('data-rune-tasks-tab-state="opening"');
    expect(closing).toContain('data-rune-tasks-tab-state="closing"');
    expect(idle).not.toContain("data-rune-tasks-tab-state");
  });

  it("swaps the current step label through a remount target", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain("rune-task-step-swap");
  });

  it("fills each progress segment from a shared track", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain('data-rune-task-segment="completed"');
    expect(markup).toContain('data-rune-task-segment="inProgress"');
    expect(markup).toContain('data-rune-task-segment="pending"');
    expect(markup).toContain("rune-task-segment-fill");
  });

  it("has a compact inline fallback for occupied composer shoulders", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        onDismiss={() => undefined}
        onToggle={() => undefined}
        placement="inline"
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain("rounded-sm");
    expect(markup).toContain("1/3");
    expect(markup).not.toContain("chat-composer-shoulder-tab");
    expect(markup).not.toContain("rounded-t-xl");
    expect(markup).toContain('data-rune-task-segment="completed"');
  });

  it("does not render an empty task count", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksBadge
        expanded={false}
        onDismiss={() => undefined}
        onToggle={() => undefined}
        progress={{ ...progress, totalSteps: 0 }}
        steps={steps}
      />,
    );

    expect(markup).toBe("");
  });
});

describe("ComposerTasksDrawer", () => {
  it("expands into a read-only attached task list", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksDrawer
        onCollapse={() => undefined}
        onDismiss={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain('data-chat-composer-tasks-drawer="true"');
    expect(markup).not.toContain("data-variant");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('role="list"');
    expect(markup).toContain("Inspect the composer");
    expect(markup).toContain('data-composer-task-duration="true"');
    expect(markup).toContain("4.0s");
    expect(markup).toContain("now");
    expect(markup).toContain("Attach task progress");
    expect(markup).toContain("Verify the result");
    expect(markup).toContain("lucide-list-todo");
    expect(markup).toContain('aria-label="Dismiss tasks for this turn"');
    expect(markup).not.toContain("lucide-chevron");
  });

  it("reports completion through a progress bar", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksDrawer
        onCollapse={() => undefined}
        onDismiss={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="3"');
    expect(markup).toContain('aria-valuenow="1"');
    expect(markup).toContain("rune-tasks-progress-fill");
    expect(markup).toContain("width:33%");
  });

  it("draws status icons instead of text glyphs", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksDrawer
        onCollapse={() => undefined}
        onDismiss={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain('data-rune-task-status="completed"');
    expect(markup).toContain('data-rune-task-status="inProgress"');
    expect(markup).toContain('data-rune-task-status="pending"');
    expect(markup).toContain("rune-task-check");
    expect(markup).toContain("pathLength");
    expect(markup).not.toContain("✓");
    expect(markup).not.toContain("●");
    expect(markup).not.toContain("○");
  });

  it("staggers its rows for the entrance motion", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksDrawer
        onCollapse={() => undefined}
        onDismiss={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain("--stagger-index");
  });

  it("announces each row's status to screen readers", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksDrawer
        onCollapse={() => undefined}
        onDismiss={() => undefined}
        progress={progress}
        steps={steps}
      />,
    );

    expect(markup).toContain("sr-only");
    expect(markup).toContain("Completed");
    expect(markup).toContain("In progress");
    expect(markup).toContain("Pending");
  });

  it("tints the drawer green once every step is done", () => {
    const markup = renderToStaticMarkup(
      <ComposerTasksDrawer
        onCollapse={() => undefined}
        onDismiss={() => undefined}
        progress={{ ...progress, completedSteps: 3 }}
        steps={steps.map((step) => ({ ...step, status: "completed" as const }))}
      />,
    );

    expect(markup).toContain('data-variant="success"');
    expect(markup).toContain('data-rune-tasks-progress="done"');
  });
});

describe("tasks motion helpers", () => {
  it("maps progress to a clamped percentage", () => {
    expect(tasksProgressPercent(0, 3)).toBe(0);
    expect(tasksProgressPercent(1, 3)).toBe(33);
    expect(tasksProgressPercent(3, 3)).toBe(100);
    expect(tasksProgressPercent(5, 3)).toBe(100);
    expect(tasksProgressPercent(0, 0)).toBe(0);
  });

  it("caps the row stagger so long lists stay quick", () => {
    expect(taskRowMotionStyle(0)).toEqual({ "--stagger-index": 0 });
    expect(taskRowMotionStyle(3)).toEqual({ "--stagger-index": 3 });
    expect(taskRowMotionStyle(12)).toEqual({ "--stagger-index": 8 });
    expect(taskRowMotionStyle(-1)).toEqual({ "--stagger-index": 0 });
  });
});
