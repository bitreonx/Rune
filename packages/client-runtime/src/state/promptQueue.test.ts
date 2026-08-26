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
    expect(state.queue.filter((entry) => entry.status === "claimed")).toHaveLength(2);
  });

  it("supports edit, reorder, delete, and steer without losing identity", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "enqueue", item: item("C", "c") });
    state = reducePromptQueue(state, { type: "edit", itemId: "b", text: "B2", now: "x" });
    state = reducePromptQueue(state, { type: "reorder", itemId: "c", beforeItemId: "b", now: "y" });
    expect(state.queue.map((entry) => entry.text)).toEqual(["C", "B2"]);
    state = reducePromptQueue(state, { type: "promote-steer", itemId: "b", now: "z" });
    expect(state.executionStatus).toBe("interrupting");
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
  });

  it("places a reorder target at the end when its anchor is stale", () => {
    let state = createPromptQueueThreadState(threadId);
    state = reducePromptQueue(state, { type: "enqueue", item: item("B", "b") });
    state = reducePromptQueue(state, { type: "enqueue", item: item("C", "c") });
    state = reducePromptQueue(state, {
      type: "reorder",
      itemId: "b",
      beforeItemId: "deleted",
      now: "y",
    });
    expect(state.queue.map((entry) => entry.text)).toEqual(["C", "B"]);
  });
});
