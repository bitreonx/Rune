import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { HandoffCapsule } from "./handoff.ts";

describe("HandoffCapsule", () => {
  it("decodes compact continuation state with workspace-relative changed files", () => {
    const capsule = {
      missionId: "mission-17",
      objective: "Make the provider route observable",
      acceptance: ["A receipt is visible in diagnostics"],
      completedTaskIds: ["route-plan"],
      currentTaskId: "runtime-proof",
      verifiedFacts: [
        {
          id: "test-17",
          kind: "test",
          summary: "Route planner focused tests pass",
          source: "apps/server/src/provider/HarnessModelRoutePlanner.test.ts",
        },
      ],
      failedHypotheses: ["The renderer can infer the selected account from the model name"],
      changedFiles: [
        {
          workspaceId: "workspace-1",
          workspaceRoot: "D:/Apps/Rune",
          relativePath: "apps/server/src/provider/HarnessModelRoutePlanner.ts",
        },
      ],
      verification: [
        {
          id: "verify-17",
          command: "vp test run apps/server/src/provider/HarnessModelRoutePlanner.test.ts",
          status: "passed",
          summary: "8 tests passed",
          durationMs: 1200,
          at: "2026-08-29T18:00:00.000Z",
        },
      ],
      nextAction: "Capture one real configured runtime receipt",
    };

    expect(Schema.decodeUnknownSync(HandoffCapsule)(capsule)).toEqual(capsule);
  });

  it("rejects absolute changed-file paths", () => {
    expect(() =>
      Schema.decodeUnknownSync(HandoffCapsule)({
        missionId: "mission-17",
        objective: "Continue",
        acceptance: [],
        completedTaskIds: [],
        verifiedFacts: [],
        failedHypotheses: [],
        changedFiles: [
          {
            workspaceId: "workspace-1",
            workspaceRoot: "D:/Apps/Rune",
            relativePath: "D:/Users/secret/transcript.jsonl",
          },
        ],
        verification: [],
      }),
    ).toThrow();
  });

  it("strips unknown transcript fields instead of carrying them across a handoff", () => {
    const decoded = Schema.decodeUnknownSync(HandoffCapsule)({
      missionId: "mission-17",
      objective: "Continue",
      acceptance: [],
      completedTaskIds: [],
      verifiedFacts: [],
      failedHypotheses: [],
      changedFiles: [],
      verification: [],
      transcript: "raw messages are not handoff state",
    });

    expect("transcript" in decoded).toBe(false);
  });
});
