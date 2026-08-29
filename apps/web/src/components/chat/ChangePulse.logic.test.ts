import { describe, expect, it } from "vite-plus/test";
import type { AgentActivity } from "@rune/shared/agentActivity";

import { deriveChangePulseModel } from "./ChangePulse.logic";

const job = (overrides: Partial<AgentActivity> = {}): AgentActivity => ({
  id: "job-1",
  phase: "implement",
  label: "Implementing the change",
  status: "working",
  createdAt: "2026-08-29T00:00:00.000Z",
  operations: [],
  phaseSource: "typed",
  statusSource: "typed",
  receipts: [],
  changes: [
    {
      id: "change-1",
      path: "src/providerRouting.ts",
      kind: "modified",
      additions: 48,
      deletions: 12,
      source: "activity",
      turnId: "turn-1" as never,
    },
    {
      id: "change-2",
      path: "src/providerRouting.test.ts",
      kind: "modified",
      additions: 16,
      deletions: 4,
      source: "activity",
      turnId: "turn-1" as never,
    },
  ],
  ...overrides,
});

describe("deriveChangePulseModel", () => {
  it("summarizes live changes without exposing raw operations", () => {
    expect(deriveChangePulseModel(job())).toEqual({
      fileCount: 2,
      additions: 64,
      deletions: 16,
      phaseLabel: "editing",
      stateLabel: "editing",
    });
  });

  it("folds completed verification receipts into the compact state", () => {
    expect(
      deriveChangePulseModel(
        job({
          status: "done",
          receipts: [
            {
              id: "verification-1",
              kind: "verification",
              label: "Provider routing tests",
              status: "done",
              createdAt: "2026-08-29T00:00:01.000Z",
              turnId: "turn-1" as never,
            },
          ],
        }),
      ),
    ).toMatchObject({
      phaseLabel: "edited",
      stateLabel: "complete",
      verificationLabel: "✓ 1 verified",
    });
  });

  it("does not render a pulse for activities without changes", () => {
    expect(deriveChangePulseModel(job({ changes: [] }))).toBeNull();
  });
});
