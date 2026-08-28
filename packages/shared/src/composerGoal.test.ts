import { describe, expect, it } from "@effect/vitest";

import {
  formatGoalAwarePrompt,
  MAX_COMPOSER_GOAL_CHARS,
  parseComposerGoalCommand,
} from "./composerGoal.ts";

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

  it("caps goal state and prompt context", () => {
    const goal = "x".repeat(MAX_COMPOSER_GOAL_CHARS + 20);
    expect(parseComposerGoalCommand(`/goal ${goal}`)).toEqual({
      kind: "set",
      goal: "x".repeat(MAX_COMPOSER_GOAL_CHARS),
    });
    expect(formatGoalAwarePrompt(goal, "Continue")).toContain(
      "x".repeat(MAX_COMPOSER_GOAL_CHARS),
    );
    expect(formatGoalAwarePrompt(goal, "Continue")).not.toContain(
      "x".repeat(MAX_COMPOSER_GOAL_CHARS + 1),
    );
  });
});
