import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  PlanSession,
  PlanStage,
  type PlanQuestionId,
  type PlanSession as PlanSessionValue,
} from "./plan.js";

describe("plan contract", () => {
  it("decodes a provider-neutral durable session", () => {
    const session: PlanSessionValue = {
      id: "plan:thread-1" as PlanSessionValue["id"],
      threadId: "thread-1" as PlanSessionValue["threadId"],
      mode: "guided",
      stage: "ask",
      questions: [
        {
          id: "scope" as PlanQuestionId,
          prompt: "What is in scope?",
          order: 0,
          required: true,
          dependencyIds: [],
        },
      ],
      answers: [],
      specification: null,
      tasks: [],
      dependencyGraph: { taskIds: [], edges: [] },
      version: 1,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
    };

    expect(Schema.decodeUnknownSync(PlanSession)(session)).toEqual(session);
    expect(Schema.decodeUnknownSync(PlanStage)("plan")).toBe("plan");
  });

  it("keeps provider identity out of the contract and rejects invalid lifecycle values", () => {
    const decoded = Schema.decodeUnknownSync(PlanSession)({
      id: "plan:thread-1",
      threadId: "thread-1",
      mode: "guided",
      stage: "ask",
      questions: [],
      answers: [],
      specification: null,
      tasks: [],
      dependencyGraph: { taskIds: [], edges: [] },
      version: 1,
      createdAt: "now",
      updatedAt: "now",
      provider: "codex",
    });
    expect(decoded).not.toHaveProperty("provider");
    expect(() => Schema.decodeUnknownSync(PlanSession)({ ...decoded, stage: "build" })).toThrow();
  });
});
