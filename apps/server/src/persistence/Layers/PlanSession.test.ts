import { ThreadId } from "@rune/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { buildPlanDependencyGraph, createPlanSession } from "@rune/shared/plan";
import { PlanSession } from "../Services/PlanSession.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";
import { PlanSessionLive } from "./PlanSession.ts";

const planSessionLayer = PlanSessionLive.pipe(Layer.provideMerge(SqlitePersistenceMemory));

it.effect("persists complete plan JSON and enforces versioned lifecycle writes", () =>
  Effect.gen(function* () {
    const planSessions = yield* PlanSession;
    const threadId = ThreadId.make("thread-plan-session");
    const initial = {
      ...createPlanSession({
        threadId,
        mode: "guided",
        now: "2026-08-28T00:00:00.000Z",
      }),
      goalId: "goal-1",
      glossary: ["RUNE-native"],
    };

    const created = yield* planSessions.create({ session: initial });
    const loaded = yield* planSessions.get({ threadId });
    assert.deepStrictEqual(loaded, created);

    const specification = {
      goal: "Ship the plan session seam",
      context: "Persistence test",
      requirements: [
        {
          id: "requirement-1" as never,
          statement: "Store the full plan document",
          acceptanceCriteria: ["Round trip all fields"],
        },
      ],
      constraints: [],
      nonGoals: [],
      verificationStrategy: ["focused test"],
      openQuestions: [],
      updatedAt: initial.updatedAt,
    };
    const tasks = [
      {
        id: "task-1" as never,
        title: "Persist the document",
        outcome: "The plan can be loaded after restart",
        order: 0,
        dependencyIds: [],
        requirementIds: ["requirement-1" as never],
        verification: ["focused test"],
        state: "pending" as const,
      },
    ];

    const specified = yield* planSessions.update({
      expectedVersion: 1,
      session: {
        ...created,
        specification,
        tasks,
        dependencyGraph: buildPlanDependencyGraph(tasks),
      },
    });
    assert.strictEqual(specified.version, 2);

    const stale = yield* planSessions
      .update({ expectedVersion: 1, session: specified })
      .pipe(Effect.flip);
    assert.strictEqual(stale.code, "version-conflict");

    const inSpec = yield* planSessions.transition({
      id: specified.id,
      nextStage: "spec",
      expectedVersion: specified.version,
    });
    const inPlan = yield* planSessions.transition({
      id: specified.id,
      nextStage: "plan",
      expectedVersion: inSpec.version,
    });
    const planning = yield* planSessions.transition({
      id: specified.id,
      nextStage: "planning",
      expectedVersion: inPlan.version,
    });
    const paused = yield* planSessions.transition({
      id: specified.id,
      nextStage: "paused",
      expectedVersion: planning.version,
    });
    const resumed = yield* planSessions.resume({
      id: specified.id,
      resumeStage: "planning",
      expectedVersion: paused.version,
    });

    assert.strictEqual(resumed.stage, "planning");
    assert.deepStrictEqual((yield* planSessions.get({ id: resumed.id })).glossary, ["RUNE-native"]);
    assert.strictEqual(resumed.version, 7);
  }).pipe(Effect.provide(planSessionLayer)),
);
