import { RuntimeTaskId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { RuntimeSubagent } from "@t3tools/client-runtime/state/subagentRuntime";
import {
  agentChatErrorMessage,
  canInterruptAgentChat,
  canReadAgentChat,
  canSendAgentChat,
  mergeAgentChatMessages,
  optimisticAgentMessage,
} from "./agentChatLogic";

function agent(overrides: Partial<RuntimeSubagent> = {}): RuntimeSubagent {
  return {
    id: RuntimeTaskId.make("agent-1"),
    kind: "subagent",
    title: "Audit",
    role: "explorer",
    model: null,
    effort: null,
    status: "idle",
    activationCount: 1,
    usage: null,
    progress: null,
    lastToolName: null,
    result: null,
    error: null,
    outputFile: null,
    parentAgentId: null,
    agentIndex: null,
    phaseIndex: null,
    phaseTitle: null,
    attempt: null,
    workflowName: null,
    phases: [],
    runHandles: null,
    agentPath: "/root/audit",
    chat: null,
    recentActivity: [],
    firstSeenAt: "2026-08-25T00:00:00.000Z",
    startedAt: null,
    completedAt: null,
    updatedAt: "2026-08-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("agentChatLogic", () => {
  it("gates actions on the provider capability", () => {
    const activityOnly = agent();
    expect(canReadAgentChat(activityOnly)).toBe(false);
    expect(canSendAgentChat(activityOnly)).toBe(false);
    expect(canInterruptAgentChat(activityOnly)).toBe(false);

    const resumable = agent({
      chat: { provider: "codex", canRead: true, canSend: true, canInterrupt: true },
    });
    expect(canReadAgentChat(resumable)).toBe(true);
    expect(canSendAgentChat(resumable)).toBe(true);
    expect(canInterruptAgentChat(resumable)).toBe(true);
  });

  it("keeps optimistic text until the server confirms it", () => {
    const pending = optimisticAgentMessage("optimistic-1", "Continue the audit");
    expect(mergeAgentChatMessages([], [pending])).toEqual([pending]);
    expect(
      mergeAgentChatMessages(
        [{ ...pending, id: "server-1" }],
        [pending],
      ),
    ).toEqual([{ ...pending, id: "server-1" }]);
  });

  it("normalizes error messages without throwing on unknown failures", () => {
    expect(agentChatErrorMessage(new Error("child unavailable"), "fallback")).toBe(
      "child unavailable",
    );
    expect(agentChatErrorMessage({ message: "provider denied" }, "fallback")).toBe(
      "provider denied",
    );
    expect(agentChatErrorMessage(null, "fallback")).toBe("fallback");
  });
});
