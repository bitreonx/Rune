import { expect, it } from "@effect/vitest";
import { CheckpointRef, ThreadId, TurnId } from "@rune/contracts";

import { aggregateChatDiff } from "./chatDiffAggregate.ts";

const threadId = ThreadId.make("thread-1");
const now = "2026-01-01T00:00:00.000Z";
const turnId = (id: string) => TurnId.make(id);
const checkpointRef = (turn: number) =>
  CheckpointRef.make(`refs/rune/checkpoints/dGhyZWFkLTE=/turn/${turn}`);

it("returns empty aggregates when no ready checkpoints exist", () => {
  const result = aggregateChatDiff([], threadId, now);
  expect(result.chatDiff.files).toEqual([]);
  expect(result.chatDiff.throughTurnCount).toBe(0);
  expect(result.fileOwnership).toEqual([]);
});

it("skips non-ready checkpoints and sums duplicate paths", () => {
  const result = aggregateChatDiff(
    [
      {
        turnId: turnId("turn-1"),
        checkpointTurnCount: 1,
        checkpointRef: checkpointRef(1),
        status: "ready",
        files: [{ path: "x.ts", kind: "modified", additions: 1, deletions: 0 }],
        assistantMessageId: null,
        completedAt: now,
      },
      {
        turnId: turnId("turn-2"),
        checkpointTurnCount: 2,
        checkpointRef: checkpointRef(2),
        status: "ready",
        files: [
          { path: "x.ts", kind: "modified", additions: 3, deletions: 1 },
          { path: "a.ts", kind: "added", additions: 5, deletions: 0 },
        ],
        assistantMessageId: null,
        completedAt: now,
      },
      {
        turnId: turnId("turn-3"),
        checkpointTurnCount: 3,
        checkpointRef: checkpointRef(3),
        status: "missing",
        files: [{ path: "ignored.ts", kind: "modified", additions: 9, deletions: 9 }],
        assistantMessageId: null,
        completedAt: now,
      },
    ],
    threadId,
    now,
  );

  expect(result.chatDiff).toEqual({
    files: [
      { path: "a.ts", kind: "added", additions: 5, deletions: 0 },
      { path: "x.ts", kind: "modified", additions: 4, deletions: 1 },
    ],
    computedAt: now,
    throughTurnCount: 2,
  });
  expect(result.fileOwnership).toEqual([
    { path: "a.ts", owners: [{ threadId, throughTurnCount: 2, additions: 5, deletions: 0 }] },
    { path: "x.ts", owners: [{ threadId, throughTurnCount: 2, additions: 4, deletions: 1 }] },
  ]);
});
