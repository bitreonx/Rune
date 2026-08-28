import { CommandId, EventId, MessageId, ThreadId, TurnId } from "@rune/contracts/baseSchemas";
import {
  PromptQueueClaimId,
  PromptQueueItemId,
  type PromptQueueCommand,
  type PromptQueueEvent,
} from "@rune/contracts/promptQueue";
import { describe, expect, it } from "vite-plus/test";

import {
  decidePromptQueueCommand,
  emptyPromptQueueState,
  promptQueueSnapshot,
  reducePromptQueueState,
  type PromptQueueState,
} from "./PromptQueueState.ts";

const threadId = ThreadId.make("thread-t04");
const at = "2026-08-28T00:00:00.000Z";

function command(command: Record<string, unknown>, id: string): PromptQueueCommand {
  return { ...command, commandId: CommandId.make(id), threadId } as PromptQueueCommand;
}

function decide(state: PromptQueueState, next: PromptQueueCommand, sequence: number) {
  const result = decidePromptQueueCommand(state, next, {
    eventId: EventId.make(`event-${sequence}`),
    claimId: PromptQueueClaimId.make(`claim-${sequence}`),
    occurredAt: `2026-08-28T00:00:0${sequence}.000Z`,
  });
  expect(result._tag).toBe("event");
  if (result._tag !== "event") throw new Error("expected event");
  return reducePromptQueueState(state, { ...result.event, sequence } as PromptQueueEvent);
}

describe("PromptQueueState", () => {
  it("keeps one stable item through claim, materialize, and settle", () => {
    const itemId = PromptQueueItemId.make("item-a");
    let state = emptyPromptQueueState(threadId, at);
    state = decide(state, command({ type: "prompt.enqueue", itemId, prompt: "A" }, "cmd-a"), 1);
    state = decide(state, command({ type: "prompt.claim" }, "cmd-claim"), 2);
    const claimed = state.items[itemId];
    expect(claimed?.status).toBe("claimed");
    expect(claimed?.claimId).toBe("claim-2");

    state = decide(
      state,
      command(
        {
          type: "prompt.materialize",
          itemId,
          claimId: PromptQueueClaimId.make("claim-2"),
          messageId: MessageId.make("message-a"),
          turnId: TurnId.make("turn-a"),
        },
        "cmd-materialize",
      ),
      3,
    );
    state = decide(
      state,
      command(
        {
          type: "prompt.settle",
          itemId,
          claimId: PromptQueueClaimId.make("claim-2"),
          outcome: "completed",
        },
        "cmd-settle",
      ),
      4,
    );

    expect(state.items[itemId]).toMatchObject({
      id: itemId,
      status: "settled",
      messageId: "message-a",
      turnId: "turn-a",
      settlement: "completed",
    });
    expect(state.activePromptId).toBeNull();
    expect(state.executionState).toBe("idle");
    expect(promptQueueSnapshot(state).items).toHaveLength(1);
  });

  it("reorders, edits, deletes, retries, and promotes by stable ID", () => {
    let state = emptyPromptQueueState(threadId, at);
    const ids = ["item-a", "item-b", "item-c"].map((id) => PromptQueueItemId.make(id));
    ids.forEach((itemId, index) => {
      state = decide(
        state,
        command({ type: "prompt.enqueue", itemId, prompt: itemId }, `cmd-${index}`),
        index + 1,
      );
    });
    state = decide(
      state,
      command({ type: "prompt.reorder", itemIds: [ids[2]!, ids[0]!, ids[1]!] }, "cmd-reorder"),
      4,
    );
    state = decide(
      state,
      command({ type: "prompt.edit", itemId: ids[1]!, prompt: "edited" }, "cmd-edit"),
      5,
    );
    state = decide(state, command({ type: "prompt.delete", itemId: ids[0]! }, "cmd-delete"), 6);
    expect(promptQueueSnapshot(state).items.map((item) => item.id)).toEqual([
      ids[2],
      ids[0],
      ids[1],
    ]);
    expect(state.items[ids[1]!]!.prompt).toBe("edited");
    expect(state.items[ids[0]!]!.status).toBe("cancelled");

    state = decide(state, command({ type: "prompt.claim" }, "cmd-claim"), 7);
    state = decide(
      state,
      command(
        {
          type: "prompt.materialize",
          itemId: ids[2]!,
          claimId: PromptQueueClaimId.make("claim-7"),
          messageId: MessageId.make("message-c"),
          turnId: TurnId.make("turn-c"),
        },
        "cmd-materialize",
      ),
      8,
    );
    state = decide(
      state,
      command(
        {
          type: "prompt.settle",
          itemId: ids[2]!,
          claimId: PromptQueueClaimId.make("claim-7"),
          outcome: "failed",
          error: "provider unavailable",
        },
        "cmd-fail",
      ),
      9,
    );
    expect(state.executionState).toBe("failed");
    state = decide(state, command({ type: "prompt.retry", itemId: ids[2]! }, "cmd-retry"), 10);
    expect(state.items[ids[2]!]!.status).toBe("queued");
    expect(state.items[ids[2]!]!.attempt).toBe(1);
    state = decide(
      state,
      command({ type: "prompt.promoteToSteer", itemId: ids[2]! }, "cmd-steer"),
      11,
    );
    expect(state.items[ids[2]!]!.status).toBe("promoted");
  });

  it("uses explicit pause, continue, and stop transitions", () => {
    let state = emptyPromptQueueState(threadId, at);
    state = { ...state, executionState: "running" };
    state = decide(state, command({ type: "execution.pause" }, "pause"), 1);
    expect(state.executionState).toBe("paused");
    state = decide(state, command({ type: "execution.continue" }, "continue"), 2);
    expect(state.executionState).toBe("running");
    state = decide(state, command({ type: "execution.stop" }, "stop"), 3);
    expect(state.executionState).toBe("stopped");
  });
});
