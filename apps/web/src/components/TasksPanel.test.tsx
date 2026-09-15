import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { TasksPanel } from "./TasksPanel";

describe("TasksPanel", () => {
  it("labels blocked roadmap work as waiting for the user", () => {
    const markup = renderToStaticMarkup(
      <TasksPanel
        activities={[]}
        progress={{ step: "Verify route", completedSteps: 1, totalSteps: 3 }}
        steps={[
          { step: "Inspect", status: "completed" },
          { step: "Verify route", status: "inProgress" },
          { step: "Reconnect account", status: "blocked" },
        ]}
      />,
    );

    expect(markup).toContain("Work in motion");
    expect(markup).toContain("Waiting for you");
    expect(markup).not.toContain(">Needs you<");
  });

  it("keeps task receipts visible after the active step has completed", () => {
    const markup = renderToStaticMarkup(
      <TasksPanel
        activities={[
          {
            id: "completed-receipt",
            tone: "info",
            kind: "turn.diff.updated",
            summary: "Updated settings",
            payload: {
              itemFileChanges: [{ path: "apps/web/src/settings.ts", additions: 4, deletions: 1 }],
            },
            turnId: null,
            sequence: 1,
            createdAt: "2026-08-30T00:00:00.000Z",
          },
        ]}
        onOpenChange={vi.fn()}
        progress={{ step: "Done", completedSteps: 2, totalSteps: 2 }}
        steps={[{ step: "Done", status: "completed" }]}
      />,
    );

    expect(markup).toContain("Task evidence");
    expect(markup).toContain("1 file · +4 −1");
    expect(markup).toContain("apps/web/src/settings.ts");
  });

  it("keeps receipts visible after the structured plan is torn down", () => {
    const markup = renderToStaticMarkup(
      <TasksPanel
        activities={[
          {
            id: "post-plan-receipt",
            tone: "info",
            kind: "turn.diff.updated",
            summary: "Updated settings",
            payload: {
              itemFileChanges: [{ path: "apps/web/src/settings.ts", additions: 4, deletions: 1 }],
            },
            turnId: null,
            sequence: 1,
            createdAt: "2026-08-30T00:00:00.000Z",
          },
        ]}
        progress={null}
        steps={null}
      />,
    );

    expect(markup).toContain('data-rune-tasks-panel="true"');
    expect(markup).toContain("Task evidence");
    expect(markup).toContain("apps/web/src/settings.ts");
    expect(markup).not.toContain("No active task plan");
  });
});
