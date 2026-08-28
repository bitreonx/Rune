import { describe, expect, it } from "vite-plus/test";
import {
  createPromptQueueItem,
  createPromptQueueThreadState,
  nextPromptQueueItem,
  reducePromptQueue,
} from "./promptQueue.ts";

const threadId = "thread-1" as never;
const turnId = "turn-1" as never;
const item = (text: string, id: string) => ({
  ...createPromptQueueItem(threadId, text, "2026-08-26T00:00:00.000Z"),
  id,
});

describe("prompt queue state machine", () => {
  it("preserves FIFO and claims each item once", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "enqueue", item: item("C", "c") });
    expect(nextPromptQueueItem(state)?.text).toBe("B");
    state = reducePromptQueue(state, {
      type: "claim-next",
      turnId,
      now: "2026-08-26T00:01:00.000Z",
    });
    expect(nextPromptQueueItem(state)?.text).toBe("C");
    state = reducePromptQueue(state, {
      type: "claim-next",
      turnId: "turn-2" as never,
      now: "2026-08-26T00:02:00.000Z",
    });
    expect(state.queue.filter((entry) => entry.status === "claimed")).toHaveLength(1);
    expect(nextPromptQueueItem(state)?.text).toBe("C");
  });

  it("supports edit, reorder, delete, and steer without losing identity", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "enqueue", item: item("C", "c") });
    state = reducePromptQueue(state, { type: "edit", itemId: "b", text: "B2", now: "x" });
    state = reducePromptQueue(state, { type: "reorder", itemId: "c", beforeItemId: "b", now: "y" });
    expect(state.queue.map((entry) => entry.text)).toEqual(["C", "B2"]);
    state = reducePromptQueue(state, { type: "promote-steer", itemId: "b", now: "z" });
    expect(state.executionStatus).toBe("queued");
    expect(state.queue.find((entry) => entry.id === "b")?.status).toBe("steering");
    state = reducePromptQueue(state, { type: "remove", itemId: "c", now: "q" });
    expect(state.queue.find((entry) => entry.id === "c")?.status).toBe("cancelled");
  });

  it("does not execute a settled item twice", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "claim-next", turnId, now: "x" });
    state = reducePromptQueue(state, {
      type: "settle",
      itemId: "b",
      status: "completed",
      now: "y",
    });
    const unchanged = reducePromptQueue(state, {
      type: "settle",
      itemId: "b",
      status: "completed",
      now: "z",
    });
    expect(unchanged.queue.find((entry) => entry.id === "b")?.status).toBe("completed");
    expect(unchanged.activeTurnId).toBeNull();
    expect(unchanged.executionStatus).toBe("idle");
  });

  it("guards pause and continue as distinct turn transitions", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "claim-next", turnId, now: "a" });
    state = reducePromptQueue(state, { type: "pause-requested", turnId, now: "b" });
    expect(state.executionStatus).toBe("pausing");
    state = reducePromptQueue(state, { type: "pause-confirmed", turnId, now: "c" });
    expect(state.executionStatus).toBe("paused");
    expect(
      reducePromptQueue(state, { type: "continue-confirmed", turnId, now: "stale" }),
    ).toBe(state);
    state = reducePromptQueue(state, { type: "continue-requested", turnId, now: "d" });
    state = reducePromptQueue(state, { type: "continue-confirmed", turnId, now: "e" });
    expect(state.executionStatus).toBe("running");
  });

  it("keeps stop/abandon separate and preserves queued work", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "enqueue", item: item("C", "c") });
    state = reducePromptQueue(state, { type: "claim-next", turnId, now: "a" });
    state = reducePromptQueue(state, { type: "stop-requested", turnId, now: "b" });
    expect(state.executionStatus).toBe("stopping");
    state = reducePromptQueue(state, { type: "abandon", turnId, now: "c" });
    expect(state.executionStatus).toBe("abandoned");
    expect(nextPromptQueueItem(state)?.text).toBe("C");
  });

  it("ignores stale edits, deletes, reorders, and cross-thread enqueues", () => {
    let state = createPromptQueueThreadState(threadId);
    const foreign = { ...item("foreign", "foreign"), threadId: "thread-2" as never };
    expect(reducePromptQueue(state, { type: "enqueue", item: foreign })).toBe(state);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    const revision = state.revision;
    expect(reducePromptQueue(state, { type: "edit", itemId: "missing", text: "x", now: "a" })).toBe(
      state,
    );
    expect(reducePromptQueue(state, { type: "remove", itemId: "missing", now: "b" })).toBe(state);
    expect(
      reducePromptQueue(state, { type: "reorder", itemId: "b", beforeItemId: "missing", now: "c" }),
    ).toBe(state);
    expect(state.revision).toBe(revision);
  });

  it("ignores a reorder when its anchor is stale", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "enqueue", item: item("C", "c") });
    state = reducePromptQueue(state, {
      type: "reorder",
      itemId: "b",
      beforeItemId: "deleted",
      now: "y",
    });
    expect(state.queue.map((entry) => entry.text)).toEqual(["B", "C"]);
  });
});
