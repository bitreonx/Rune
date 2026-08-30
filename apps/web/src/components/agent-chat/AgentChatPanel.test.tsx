import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";
import { AgentActivityStory } from "./AgentActivityStory";

function agent(): RuntimeSubagent {
  return {
    id: "agent-story",
    kind: "subagent",
    title: "Verify provider routing",
    role: "reviewer",
    model: "gpt-5.6-luna",
    effort: "max",
    status: "running",
    activationCount: 1,
    usage: null,
    progress: "Verifying",
    lastToolName: "test",
    result: null,
    error: null,
    outputFile: null,
    parentAgentId: "parent",
    agentIndex: 0,
    phaseIndex: null,
    phaseTitle: null,
    attempt: null,
    workflowName: null,
    phases: [],
    runHandles: null,
    agentPath: null,
    chat: { provider: "luna", canRead: true, canSend: true, canInterrupt: true },
    recentActivity: [
      { at: "2026-08-30T01:00:00Z", summary: "Searched provider routes" },
      { at: "2026-08-30T01:01:00Z", summary: "Updated route receipt" },
      { at: "2026-08-30T01:02:00Z", summary: "Verified 18 tests" },
    ],
    firstSeenAt: "2026-08-30T00:59:00Z",
    startedAt: "2026-08-30T00:59:30Z",
    completedAt: null,
    updatedAt: "2026-08-30T01:02:00Z",
    generatedName: "Route reviewer",
    iconColor: "hsl(260, 70%, 60%)",
    iconName: "sparkles",
    agentThreadId: null,
  };
}

describe("AgentActivityStory", () => {
  it("keeps semantic activity primary and technical trace progressive", () => {
    const markup = renderToStaticMarkup(<AgentActivityStory agent={agent()} />);

    expect(markup).toContain('data-rune-agent-activity-story="true"');
    expect(markup).toContain("Activity");
    expect(markup).toContain("Searched provider routes");
    expect(markup).toContain("Updated route receipt");
    expect(markup).toContain("Technical trace · 3 events");
    expect(markup).toContain("<details");
    expect(markup).not.toContain("Live Activity &amp; Tool Executions");
  });
});
