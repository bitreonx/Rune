import { describe, expect, it } from "vite-plus/test";
import { deriveAgentActivityJob } from "./agentActivity.js";

const activity = (
  id: string,
  kind: string,
  summary: string,
  payload: unknown = {},
  tone: "info" | "tool" | "error" = "tool",
) => ({
  id: id as never,
  tone,
  kind,
  summary,
  payload,
  turnId: "turn-1" as never,
  sequence: Number(id.slice(1)),
  createdAt: `2026-08-26T00:00:0${id.slice(1)}.000Z`,
});

describe("deriveAgentActivityJob", () => {
  it("groups repeated repository research operations into one activity", () => {
    const result = deriveAgentActivityJob([
      activity("a1", "tool.completed", "WebFetch", { toolName: "WebFetch" }),
      activity("a2", "tool.completed", "WebFetch", { toolName: "WebFetch" }),
      activity("a3", "tool.completed", "WebFetch", { toolName: "WebFetch" }),
    ]);

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({
      label: "Researching the repository",
      status: "done",
    });
    expect(result.activities[0]?.operations).toHaveLength(3);
  });

  it("extracts nested edit paths for Cursor-style file presentation", () => {
    const result = deriveAgentActivityJob([
      activity("a1", "tool.completed", "Edit", {
        itemType: "file_change",
        data: { path: "src/auth/provider.ts" },
      }),
    ]);

    expect(result.activities[0]).toMatchObject({
      label: "Implementing the change",
      operations: [{ filePath: "src/auth/provider.ts" }],
    });
  });

  it("keeps approvals visible as waiting activities", () => {
    const result = deriveAgentActivityJob([
      activity("a1", "approval.requested", "Permission required", {}, "info"),
    ]);
    expect(result.activities[0]).toMatchObject({
      label: "Waiting for your approval",
      status: "waiting",
    });
  });

  it("preserves failures instead of collapsing them into successful work", () => {
    const result = deriveAgentActivityJob([
      activity("a1", "tool.completed", "ReadFile", { message: "Permission denied" }, "error"),
    ]);
    expect(result.activities[0]?.status).toBe("failed");
    expect(result.activities[0]?.failureSummary).toBe("Permission denied");
    expect(result.activities[0]?.operations[0]?.rawTrace.summary).toBe("ReadFile");
  });

  it("groups repeated failures into one visible fix activity while retaining each trace", () => {
    const result = deriveAgentActivityJob([
      activity("a1", "tool.completed", "ReadFile failed", {}, "error"),
      activity("a2", "tool.completed", "Grep failed", {}, "error"),
      activity("a3", "tool.completed", "Patch failed", {}, "error"),
    ]);

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({
      label: "Fixing remaining errors",
      status: "failed",
    });
    expect(result.activities[0]?.operations).toHaveLength(3);
  });
});
