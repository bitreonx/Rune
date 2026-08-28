import { RuntimeTaskId, ThreadId, TurnId, type OrchestrationAgentResult } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  MAX_AGENT_THREAD_DEPTH,
  adoptAgentResult,
  agentThreadIdFor,
  assertAgentThreadOwnedBy,
  makeAgentThreadMetadata,
} from "./agentThreads.ts";

const ROOT = ThreadId.make("thread-root");
const TURN = TurnId.make("turn-root");
const AGENT = RuntimeTaskId.make("agent-reviewer");

const result: OrchestrationAgentResult = {
  summary: "Reviewed the provider seam.",
  findings: ["The fallback is now explicit."],
  changedFiles: ["apps/server/src/provider/ProviderService.ts"],
  tasks: ["Run the provider fixture."],
  verification: ["Focused provider tests pass."],
  blockers: [],
};

describe("agent thread metadata", () => {
  it("derives one stable child id and preserves root/depth metadata", () => {
    const childId = agentThreadIdFor(ROOT, AGENT);
    const child = makeAgentThreadMetadata({
      parentThread: { id: ROOT, agent: null },
      agentId: AGENT,
      role: "Reviewer",
      profileId: "luna-high",
      objective: "Review provider routing.",
      spawnedByTurnId: TURN,
      workspaceMode: "isolated",
      providerThreadId: "provider-child-1",
    });

    expect(String(childId)).toBe("agent:thread-root:agent-reviewer");
    expect(child).toMatchObject({
      parentThreadId: ROOT,
      rootThreadId: ROOT,
      spawnedByTurnId: TURN,
      agentId: AGENT,
      agentRole: "Reviewer",
      agentProfileId: "luna-high",
      depth: 1,
      workspaceMode: "isolated",
      providerThreadId: "provider-child-1",
      result: null,
      resultAdoptedAt: null,
    });

    const nested = makeAgentThreadMetadata({
      parentThread: { id: childId, agent: child },
      agentId: RuntimeTaskId.make("agent-nested"),
      objective: "Check the review.",
    });
    expect(nested.parentThreadId).toBe(childId);
    expect(nested.rootThreadId).toBe(ROOT);
    expect(nested.depth).toBe(2);
  });

  it("rejects a child beyond the bounded nesting depth", () => {
    const atLimit = makeAgentThreadMetadata({
      parentThread: {
        id: ROOT,
        agent: {
          parentThreadId: ROOT,
          rootThreadId: ROOT,
          spawnedByTurnId: null,
          agentId: AGENT,
          agentRole: null,
          agentProfileId: null,
          objective: "At the limit",
          depth: MAX_AGENT_THREAD_DEPTH - 1,
          workspaceMode: "shared",
          providerThreadId: null,
          result: null,
          resultAdoptedAt: null,
        },
      },
      agentId: RuntimeTaskId.make("agent-at-limit"),
      objective: "Allowed at the limit.",
    });
    expect(atLimit.depth).toBe(MAX_AGENT_THREAD_DEPTH);
    expect(() =>
      makeAgentThreadMetadata({
        parentThread: { id: ROOT, agent: { ...atLimit } },
        agentId: RuntimeTaskId.make("agent-too-deep"),
        objective: "Must be rejected.",
      }),
    ).toThrow(`exceeds the maximum of ${MAX_AGENT_THREAD_DEPTH}`);
  });

  it("requires parent ownership and keeps result adoption provenance", () => {
    const child = makeAgentThreadMetadata({
      parentThread: { id: ROOT, agent: null },
      agentId: AGENT,
      objective: "Review provider routing.",
    });
    expect(() => assertAgentThreadOwnedBy(ThreadId.make("other-parent"), { agent: child })).toThrow(
      "is not a child",
    );

    const adopted = adoptAgentResult({
      parentThreadId: ROOT,
      childThread: { agent: child },
      result,
      adoptedAt: "2026-08-28T11:00:00.000Z",
    });
    expect(adopted.result).toEqual(result);
    expect(adopted.resultAdoptedAt).toBe("2026-08-28T11:00:00.000Z");
    expect(adopted.parentThreadId).toBe(ROOT);
  });
});
