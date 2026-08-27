import { RuntimeTaskId, ThreadId, TurnId } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import { normalizeProviderAgentChatSnapshot } from "./agentChat.ts";

describe("normalizeProviderAgentChatSnapshot", () => {
  it("keeps user and assistant text while omitting tool and reasoning items", () => {
    const result = normalizeProviderAgentChatSnapshot(RuntimeTaskId.make("child-1"), {
      threadId: ThreadId.make("child-1"),
      turns: [
        {
          id: TurnId.make("turn-1"),
          items: [
            {
              id: "user-1",
              type: "userMessage",
              content: [{ type: "text", text: "Review the auth flow" }],
            },
            { id: "command-1", type: "commandExecution", command: "rg auth" },
            { id: "reasoning-1", type: "reasoning", content: ["private"] },
            { id: "assistant-1", type: "agentMessage", text: "I found one issue." },
          ],
        },
      ],
    });

    expect(result).toEqual({
      agentId: "child-1",
      messages: [
        {
          id: "user-1",
          role: "user",
          text: "Review the auth flow",
          turnId: "turn-1",
          streaming: false,
        },
        {
          id: "assistant-1",
          role: "assistant",
          text: "I found one issue.",
          turnId: "turn-1",
          streaming: false,
        },
      ],
    });
  });

  it("returns an empty transcript for an empty child thread", () => {
    expect(
      normalizeProviderAgentChatSnapshot(RuntimeTaskId.make("child-empty"), {
        threadId: ThreadId.make("child-empty"),
        turns: [],
      }),
    ).toEqual({ agentId: "child-empty", messages: [] });
  });

  it("marks the active child turn's assistant output as streaming", () => {
    const result = normalizeProviderAgentChatSnapshot(RuntimeTaskId.make("child-live"), {
      threadId: ThreadId.make("child-live"),
      activeTurnId: TurnId.make("turn-live"),
      turns: [
        {
          id: TurnId.make("turn-live"),
          items: [
            {
              id: "user-live",
              type: "userMessage",
              content: [{ type: "text", text: "Keep going" }],
            },
            { id: "assistant-live", type: "agentMessage", text: "I am still working" },
          ],
        },
      ],
    });

    expect(result.activeTurnId).toBe("turn-live");
    expect(result.messages[1]?.streaming).toBe(true);
    expect(result.messages[0]?.streaming).toBe(false);
  });
});
