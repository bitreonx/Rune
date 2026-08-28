import { describe, expect, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import { ActionRunError, ActionRunInput, ActionRunResult, type RuneAction } from "./actions.ts";

const action: RuneAction = {
  id: "action.test",
  name: "Test",
  scope: "project",
  kind: "command",
  source: "discovered",
  intentSignatures: ["test"],
  parameters: [],
  preconditions: [],
  steps: [{ id: "run", name: "Test", kind: "run-command", command: "pnpm test" }],
  outputs: [],
  verification: [{ kind: "command-succeeded" }],
  approvalPolicy: "on-dangerous-step",
  fallbackPolicy: "agent",
  capabilities: [],
  provenance: { source: "project-script", successfulRunIds: [] },
  version: 1,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ActionRunInput", () => {
  it("accepts an action id and project context without a command field", () => {
    const input = Schema.decodeUnknownSync(ActionRunInput)({
      threadId: "thread-1",
      projectId: "project-1",
      actionId: "action.test",
      parameters: { check: true },
    });

    expect(input).toEqual({
      threadId: "thread-1",
      projectId: "project-1",
      actionId: "action.test",
      parameters: { check: true },
    });
  });

  it("rejects an invocation without its canonical project context", () => {
    expect(() =>
      Schema.decodeUnknownSync(ActionRunInput)({
        threadId: "thread-1",
        actionId: "action.test",
      }),
    ).toThrow();
  });
});

describe("ActionRunResult", () => {
  it("decodes the approval-required result without exposing a command", () => {
    const result = Schema.decodeUnknownSync(ActionRunResult)({
      status: "approval-required",
      actionId: action.id,
      actionVersion: action.version,
      parameters: { token: "<credential-ref>" },
    });

    expect(result.status).toBe("approval-required");
    expect(result).not.toHaveProperty("command");
  });

  it("preserves recovery guidance on a blocked action result", () => {
    const result = Schema.decodeUnknownSync(ActionRunResult)({
      status: "blocked",
      actionId: action.id,
      actionVersion: action.version,
      reason: "The saved action is no longer compatible.",
      recovery: {
        strategy: "assisted-repair",
        reason: "Action drift detected. Focused repair is available.",
      },
    });

    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.recovery?.strategy).toBe("assisted-repair");
    }
  });
});

describe("ActionRunError", () => {
  it("keeps invalid input and action lookup failures structured", () => {
    const error = new ActionRunError({
      actionId: action.id,
      code: "action-not-found",
      message: "The action is not registered for this project.",
    });

    expect(Schema.is(ActionRunError)(error)).toBe(true);
    expect(error.code).toBe("action-not-found");
  });
});
