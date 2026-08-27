import { describe, expect, it } from "vitest";

import { formatGoalAwarePrompt, parseComposerGoalCommand } from "./composerGoal";

describe("composer goals", () => {
  it("parses set, status, and clear commands", () => {
    expect(parseComposerGoalCommand("/goal ship the native harness")).toEqual({
      kind: "set",
      goal: "ship the native harness",
    });
    expect(parseComposerGoalCommand("/goal status")).toEqual({ kind: "status" });
    expect(parseComposerGoalCommand("/goal clear")).toEqual({ kind: "clear" });
    expect(parseComposerGoalCommand("/goal")).toEqual({ kind: "empty" });
  });

  it("does not treat ordinary prompts as goal commands", () => {
    expect(parseComposerGoalCommand("please /goal this feature")).toBeNull();
  });

  it("adds an explicit bounded goal context to a model prompt", () => {
    expect(formatGoalAwarePrompt("Keep the API path native", "Fix the failing test")).toBe(
      "[RUNE active goal]\nKeep the API path native\n[/RUNE active goal]\n\nFix the failing test",
    );
  });
});
