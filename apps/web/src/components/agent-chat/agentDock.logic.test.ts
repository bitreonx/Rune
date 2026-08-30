import { describe, expect, it } from "vite-plus/test";

import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";
import {
  buildAgentPassport,
  deriveAgentActivityStory,
  deriveAgentDockRows,
  deriveAgentTrail,
  resolveAgentDockStatus,
} from "./agentDock.logic";

function agent(overrides: Partial<RuntimeSubagent> = {}): RuntimeSubagent {
  return {
    id: "agent-1",
    kind: "subagent",
    title: "Review the workspace",
    role: "reviewer",
    model: "claude-sonnet-5",
    effort: "high",
    status: "running",
    activationCount: 1,
    usage: { totalTokens: 1200, inputTokens: 800, toolUses: 3 },
    progress: "Inspecting changed files",
    lastToolName: "read_file",
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
    agentPath: "D:/repo/.rune/agents/reviewer",
    chat: { provider: "claude", canRead: true, canSend: true, canInterrupt: false },
    recentActivity: [
      { at: "2026-08-29T10:00:00.000Z", summary: "Searched the route registry" },
      { at: "2026-08-29T10:01:00.000Z", summary: "Changed apps/web/src/routes.tsx" },
      { at: "2026-08-29T10:02:00.000Z", summary: "Ran typecheck and tests" },
    ],
    firstSeenAt: "2026-08-29T09:59:00.000Z",
    startedAt: "2026-08-29T09:59:30.000Z",
    completedAt: null,
    updatedAt: "2026-08-29T10:02:00.000Z",
    generatedName: "Reviewer",
    iconColor: "hsl(210, 75%, 55%)",
    iconName: "sparkles",
    agentThreadId: null,
    ...overrides,
  };
}

describe("agentDock.logic", () => {
  it("maps legacy runtime states to explicit dock lifecycle states", () => {
    expect(resolveAgentDockStatus(agent({ status: "pending", startedAt: null }))).toBe("queued");
    expect(resolveAgentDockStatus(agent({ status: "pending" }))).toBe("starting");
    expect(
      resolveAgentDockStatus(agent({ status: "waiting", progress: "Needs your approval" })),
    ).toBe("waiting_for_user");
    expect(resolveAgentDockStatus(agent({ status: "waiting", progress: "Waiting for tool" }))).toBe(
      "waiting_for_tool",
    );
    expect(resolveAgentDockStatus(agent({ status: "interrupted" }))).toBe("lost");
  });

  it("prioritizes needs-you rows while retaining stable first-seen ordering", () => {
    const rows = deriveAgentDockRows([
      agent({
        id: "done",
        status: "completed",
        generatedName: "Done",
        firstSeenAt: "2026-08-29T09:00:00Z",
      }),
      agent({
        id: "waiting",
        status: "waiting",
        progress: "Please confirm",
        generatedName: "Reviewer",
      }),
      agent({ id: "working", generatedName: "Frontend", firstSeenAt: "2026-08-29T09:58:00Z" }),
    ]);
    expect(rows.map((row) => row.agent.id)).toEqual(["waiting", "working", "done"]);
    expect(rows[0]?.secondary).toContain("Please confirm");
  });

  it("builds passport fields and a deterministic five-part trail without an LLM", () => {
    const current = agent({
      result: "Five findings recorded",
      completedAt: "2026-08-29T10:03:00Z",
      status: "completed",
    });
    const passport = buildAgentPassport(current);
    expect(passport.find((field) => field.label === "Harness")?.value).toBe("Claude");
    expect(passport.find((field) => field.label === "Inherited context size")?.value).toContain(
      "800",
    );

    const trail = deriveAgentTrail(current);
    expect(Object.keys(trail)).toEqual([
      "Research",
      "Decision",
      "Changes",
      "Verification",
      "Result",
    ]);
    expect(trail.Research[0]?.text).toContain("Searched");
    expect(trail.Changes[0]?.text).toContain("Changed");
    expect(trail.Verification[0]?.text).toContain("typecheck");
    expect(trail.Result[0]?.text).toBe("Five findings recorded");
  });

  it("keeps the primary activity story chronological across semantic sections", () => {
    const current = agent({
      result: "Finished",
      recentActivity: [
        { at: "2026-08-29T10:03:00Z", summary: "Ran tests" },
        { at: "2026-08-29T10:01:00Z", summary: "Searched the route registry" },
        { at: "2026-08-29T10:02:00Z", summary: "Changed the provider route" },
      ],
      completedAt: "2026-08-29T10:04:00Z",
      status: "completed",
    });

    expect(deriveAgentActivityStory(current).map((entry) => entry.text)).toEqual([
      "Searched the route registry",
      "Changed the provider route",
      "Ran tests",
      "Finished",
    ]);
  });

  it("preserves durable source order for equal and missing timestamps", () => {
    const current = agent({
      recentActivity: [
        { at: "2026-08-29T10:00:00Z", summary: "Changed the first file" },
        { at: "2026-08-29T10:00:00Z", summary: "Searched the second file" },
        { at: null, summary: "Decided the verification path" },
      ],
      status: "running",
      result: null,
      completedAt: null,
    });

    expect(deriveAgentActivityStory(current).map((entry) => entry.text)).toEqual([
      "Changed the first file",
      "Searched the second file",
      "Decided the verification path",
    ]);
  });

  it("keeps the complete durable sequence when missing timestamps are interleaved", () => {
    const current = agent({
      recentActivity: [
        { at: "2026-08-29T10:03:00Z", summary: "Third runtime event" },
        { at: null, summary: "Unknown-time runtime event" },
        { at: "2026-08-29T10:01:00Z", summary: "First runtime event" },
      ],
      status: "running",
      result: null,
      completedAt: null,
    });

    expect(deriveAgentActivityStory(current).map((entry) => entry.text)).toEqual([
      "Third runtime event",
      "Unknown-time runtime event",
      "First runtime event",
    ]);
  });
});
