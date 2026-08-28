import { describe, expect, it } from "vite-plus/test";

import {
  answerPlanQuestion,
  buildPlanDependencyGraph,
  createPlanSession,
  getReadyPlanTasks,
  getPlanQuestionFrontier,
  planSessionIdForThread,
  transitionPlanSession,
  validatePlanCompleteness,
  validatePlanDependencyGraph,
} from "./plan.js";

const question = (id: string, order: number, dependencyIds: string[] = []) => ({
  id: id as never,
  prompt: `Answer ${id}`,
  order,
  required: true,
  dependencyIds: dependencyIds as never[],
});

const task = (
  id: string,
  order: number,
  dependencyIds: string[] = [],
  requirementIds: string[] = [],
) => ({
  id: id as never,
  title: id,
  outcome: `${id} outcome`,
  order,
  dependencyIds: dependencyIds as never[],
  requirementIds: requirementIds as never[],
  verification: ["focused test"],
  state: "pending" as const,
});

describe("plan core", () => {
  it("derives the same session id for the same thread", () => {
    expect(planSessionIdForThread("thread-1")).toBe(planSessionIdForThread("thread-1"));
    expect(planSessionIdForThread("thread-1")).not.toBe(planSessionIdForThread("thread-2"));
  });

  it("exposes only the deterministic decision frontier", () => {
    const session = createPlanSession({
      threadId: "thread-1" as never,
      mode: "guided",
      now: "2026-08-28T00:00:00.000Z",
      questions: [question("later", 1, ["first"]), question("first", 0)],
    });
    expect(getPlanQuestionFrontier(session).map((item) => item.id)).toEqual(["first"]);
    const answered = answerPlanQuestion({
      session,
      questionId: "first" as never,
      value: "yes",
      answeredAt: session.updatedAt,
    });
    expect(answered.ok).toBe(true);
    if (answered.ok)
      expect(getPlanQuestionFrontier(answered.session).map((item) => item.id)).toEqual(["later"]);
  });

  it("builds a stable graph and rejects cycles", () => {
    const tasks = [task("second", 1, ["first"]), task("first", 0)];
    expect(buildPlanDependencyGraph(tasks)).toEqual({
      taskIds: ["first", "second"],
      edges: [{ taskId: "second", dependsOn: "first" }],
    });
    expect(validatePlanDependencyGraph(tasks).valid).toBe(true);
    expect(
      validatePlanDependencyGraph([
        task("first", 0, ["second"]),
        task("second", 1, ["first"]),
      ]).issues.some((item) => item.code === "cycle"),
    ).toBe(true);
  });

  it("validates decision cycles and unlocks only completed task dependencies", () => {
    const session = createPlanSession({
      threadId: "thread-1" as never,
      mode: "guided",
      now: "now",
      questions: [question("first", 0, ["second"]), question("second", 1, ["first"])],
    });
    expect(transitionPlanSession(session, "spec").ok).toBe(false);
    const tasks = [task("later", 1, ["first"]), task("first", 0)];
    expect(getReadyPlanTasks(tasks as never[]).map((item) => item.id)).toEqual(["first"]);
    expect(
      getReadyPlanTasks([
        task("later", 1, ["first"]),
        { ...task("first", 0), state: "completed" },
      ] as never[]).map((item) => item.id),
    ).toEqual(["later"]);
  });

  it("enforces ASK -> SPEC -> PLAN prerequisites", () => {
    let session = createPlanSession({
      threadId: "thread-1" as never,
      mode: "quick",
      now: "now",
      questions: [question("scope", 0)],
    });
    expect(transitionPlanSession(session, "spec").ok).toBe(false);
    const answered = answerPlanQuestion({
      session,
      questionId: "scope" as never,
      value: "small",
      answeredAt: "now",
    });
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    const toSpec = transitionPlanSession(answered.session, "spec");
    expect(toSpec.ok).toBe(true);
    if (!toSpec.ok) return;
    session = toSpec.session;
    expect(transitionPlanSession(session, "plan").ok).toBe(false);
    session = {
      ...session,
      specification: {
        goal: "ship",
        context: "",
        requirements: [],
        constraints: [],
        nonGoals: [],
        verificationStrategy: ["test"],
        openQuestions: [],
        updatedAt: "now",
      },
    };
    expect(transitionPlanSession(session, "plan").ok).toBe(true);
  });

  it("reports incomplete plans instead of claiming readiness", () => {
    const session = createPlanSession({
      threadId: "thread-1" as never,
      mode: "guided",
      now: "now",
    });
    const result = validatePlanCompleteness({ ...session, stage: "plan" });
    expect(result.valid).toBe(false);
    expect(result.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining(["missing-specification", "missing-tasks"]),
    );
  });

  it("accepts a complete plan only when requirements and the stored graph agree", () => {
    const base = createPlanSession({ threadId: "thread-1" as never, mode: "guided", now: "now" });
    const tasks = [task("implement", 0, [], ["requirement"])] as never[];
    const complete = {
      ...base,
      stage: "plan" as const,
      specification: {
        goal: "ship",
        context: "",
        requirements: [
          {
            id: "requirement" as never,
            statement: "It works",
            acceptanceCriteria: ["focused test"],
          },
        ],
        constraints: [],
        nonGoals: [],
        verificationStrategy: ["focused test"],
        openQuestions: [],
        updatedAt: "now",
      },
      tasks,
      dependencyGraph: buildPlanDependencyGraph(tasks as never[]),
    };
    expect(validatePlanCompleteness(complete).valid).toBe(true);
    expect(
      validatePlanCompleteness({
        ...complete,
        dependencyGraph: { taskIds: [], edges: [] },
      }).issues.map((item) => item.code),
    ).toContain("stale-dependency-graph");
  });
});
