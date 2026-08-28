import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { PromptQueueCommand, PromptQueueEvent } from "./promptQueue.ts";

describe("prompt queue contracts", () => {
  it("decodes stable queue commands and event records", () => {
    const command = Schema.decodeUnknownSync(PromptQueueCommand)({
      type: "prompt.enqueue",
      commandId: "command-1",
      threadId: "thread-1",
      itemId: "item-1",
      prompt: "run the tests",
    });
    expect(command.type).toBe("prompt.enqueue");
    if (command.type === "prompt.enqueue") expect(command.itemId).toBe("item-1");

    const event = Schema.decodeUnknownSync(PromptQueueEvent)({
      type: "prompt.queued",
      eventId: "event-1",
      sequence: 1,
      commandId: "command-1",
      threadId: "thread-1",
      occurredAt: "2026-08-28T00:00:00.000Z",
      itemId: "item-1",
      prompt: "run the tests",
      position: 0,
    });
    expect(event.sequence).toBe(1);
  });
});
