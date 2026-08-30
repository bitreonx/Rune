import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

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
});
