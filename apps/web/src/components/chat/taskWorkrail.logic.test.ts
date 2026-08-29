import { describe, expect, it } from "vite-plus/test";

import { deriveWorkrailModel, type WorkrailStep } from "./taskWorkrail.logic";

const steps: readonly WorkrailStep[] = [
  { step: "Inspect workspace", status: "completed" },
  { step: "Edit the shell", status: "inProgress" },
  { step: "Run verification", status: "pending" },
  { step: "Connect account", status: "blocked" },
];

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
});
