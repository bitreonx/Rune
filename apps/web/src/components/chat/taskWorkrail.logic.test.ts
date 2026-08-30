import { describe, expect, it } from "vite-plus/test";

import type { OrchestrationThreadActivity } from "@rune/contracts";

import { deriveWorkrailModel, type WorkrailStep } from "./taskWorkrail.logic";

const steps: readonly WorkrailStep[] = [
  { step: "Inspect workspace", status: "completed" },
  { step: "Edit the shell", status: "inProgress" },
  { step: "Run verification", status: "pending" },
  { step: "Connect account", status: "blocked" },
];

const activity = (
  id: string,
  kind: string,
  summary: string,
  payload: unknown = {},
  tone: OrchestrationThreadActivity["tone"] = "tool",
): OrchestrationThreadActivity =>
  ({
    id: id as never,
    tone,
    kind,
    summary,
    payload,
    turnId: "turn-1" as never,
    sequence: Number(id.slice(1)),
    createdAt: `2026-08-30T00:00:0${id.slice(1)}.000Z`,
  }) as OrchestrationThreadActivity;

describe("deriveWorkrailModel", () => {
  it("keeps the active task in NOW and removes it from the roadmap", () => {
    const model = deriveWorkrailModel({ completedSteps: 1, totalSteps: 4 }, steps);

    expect(model?.complete).toBe(1);
    expect(model?.active?.step.step).toBe("Edit the shell");
    expect(model?.activeTaskId).toBe("1");
    expect(model?.queued.map((row) => row.step.step)).toEqual(["Run verification"]);
    expect(model?.completed.map((row) => row.step.step)).toEqual(["Inspect workspace"]);
    expect(model?.blocked.map((row) => row.step.step)).toEqual(["Connect account"]);
    expect(model?.queued.some((row) => row.step.step === model?.active?.step.step)).toBe(false);
  });

  it("chooses the first pending task when the runtime has no in-progress row", () => {
    const model = deriveWorkrailModel({ completedSteps: 1, totalSteps: 3 }, [
      steps[0]!,
      steps[2]!,
      { step: "Finish", status: "pending" },
    ]);

    expect(model?.active?.step.step).toBe("Run verification");
    expect(model?.queued).toHaveLength(1);
  });

  it("does not create a fake workrail for an empty plan", () => {
    expect(deriveWorkrailModel({ completedSteps: 0, totalSteps: 0 }, [])).toBeNull();
    expect(deriveWorkrailModel(null, steps)).toBeNull();
  });

  it("projects semantic activity, real changes, and verification evidence into one story", () => {
    const model = deriveWorkrailModel({ completedSteps: 1, totalSteps: 4 }, steps, [
      activity("a1", "tool.completed", "Read the shell", {
        phase: "explore",
        path: "src/shell.ts",
      }),
      activity("a2", "turn.diff.updated", "Updated the shell", {
        phase: "implement",
        changes: [{ path: "src/shell.ts", additions: 4, deletions: 1 }],
      }),
      activity(
        "a3",
        "verification.completed",
        "Focused tests passed",
        {
          phase: "test",
          status: "completed",
        },
        "info",
      ),
    ]);

    expect(model?.currentActivity?.label).toBe("Focused tests passed");
    expect(model?.currentLabel).toBe("Focused tests passed");
    expect(model?.changes).toMatchObject([{ path: "src/shell.ts", additions: 4, deletions: 1 }]);
    expect(model?.verification).toMatchObject([{ label: "Focused tests passed", status: "done" }]);
    expect(model?.showVerification).toBe(true);
  });

  it("updates one change receipt when the same file is edited again", () => {
    const model = deriveWorkrailModel(
      { completedSteps: 1, totalSteps: 2 },
      [steps[0]!, { step: "Finish", status: "inProgress" }],
      [
        activity("a1", "turn.diff.updated", "First patch", {
          phase: "implement",
          changes: [{ path: "src/shell.ts", additions: 2, deletions: 0 }],
        }),
        activity("a2", "turn.diff.updated", "Second patch", {
          phase: "implement",
          changes: [{ path: "src/shell.ts", additions: 7, deletions: 3 }],
        }),
      ],
    );

    expect(model?.changes).toHaveLength(1);
    expect(model?.changes[0]).toMatchObject({ additions: 7, deletions: 3 });
  });

  it("promotes a blocked task to the focal state and calls it Waiting for you", () => {
    const model = deriveWorkrailModel({ completedSteps: 0, totalSteps: 2 }, [
      { step: "Connect account", status: "blocked" },
      { step: "Run verification", status: "pending" },
    ]);

    expect(model?.active?.step.step).toBe("Connect account");
    expect(model?.currentLabel).toBe("Waiting for you");
    expect(model?.state).toBe("waiting");
    expect(model?.waitingForUser).toBe(true);
    expect(model?.blocked).toHaveLength(0);
    expect(model?.queued.map((row) => row.step.step)).toEqual(["Run verification"]);
  });

  it("uses a waiting activity as the user-facing blocker even without a blocked plan row", () => {
    const model = deriveWorkrailModel(
      { completedSteps: 1, totalSteps: 2 },
      [steps[0]!, { step: "Connect account", status: "inProgress" }],
      [activity("a1", "approval.requested", "Permission required", {}, "approval")],
    );

    expect(model?.currentLabel).toBe("Waiting for you");
    expect(model?.state).toBe("waiting");
    expect(model?.waitingForUser).toBe(true);
  });
});
