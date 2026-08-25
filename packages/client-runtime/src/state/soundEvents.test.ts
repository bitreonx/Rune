import {
  EnvironmentId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  TurnId,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { EnvironmentThreadShell } from "./models.ts";
import { detectThreadSoundEvents } from "./soundEvents.ts";

const ENV = EnvironmentId.make("env-1");

function makeShell(
  overrides: Partial<{
    id: string;
    turnState: "running" | "interrupted" | "completed" | "error" | null;
    completedAt: string | null;
    sessionStatus: "idle" | "starting" | "running" | "ready" | "interrupted" | "stopped" | "error";
    sessionUpdatedAt: string;
    hasPendingApprovals: boolean;
    hasPendingUserInput: boolean;
  }> = {},
): EnvironmentThreadShell {
  const threadId = ThreadId.make(overrides.id ?? "thread-1");
  return {
    id: threadId,
    projectId: ProjectId.make("project-1"),
    title: "Fix auth bug",
    modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.4" },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    latestTurn:
      overrides.turnState === undefined || overrides.turnState === null
        ? null
        : {
            turnId: TurnId.make("turn-1"),
            state: overrides.turnState,
            requestedAt: "2026-08-25T00:00:00.000Z",
            startedAt: "2026-08-25T00:00:01.000Z",
            completedAt: overrides.completedAt ?? null,
            assistantMessageId: null,
          },
    createdAt: "2026-08-25T00:00:00.000Z",
    updatedAt: "2026-08-25T00:05:00.000Z",
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    session:
      overrides.sessionStatus === undefined
        ? null
        : {
            threadId,
            status: overrides.sessionStatus,
            providerName: "Codex",
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: overrides.sessionUpdatedAt ?? "2026-08-25T00:04:00.000Z",
          },
    latestUserMessageAt: null,
    hasPendingApprovals: overrides.hasPendingApprovals ?? false,
    hasPendingUserInput: overrides.hasPendingUserInput ?? false,
    hasActionableProposedPlan: false,
    environmentId: ENV,
  };
}

describe("detectThreadSoundEvents", () => {
  it("fires nothing on first observation so connecting never plays a sound storm", () => {
    const bootstrap = [
      makeShell({ turnState: "completed", completedAt: "2026-08-25T00:03:00.000Z" }),
      makeShell({ id: "thread-2", sessionStatus: "error" }),
      makeShell({ id: "thread-3", hasPendingUserInput: true }),
    ];
    expect(detectThreadSoundEvents([], bootstrap)).toEqual([]);
  });

  it("fires done when a running turn completes", () => {
    const prev = [makeShell({ turnState: "running" })];
    const next = [
      makeShell({ turnState: "completed", completedAt: "2026-08-25T00:03:00.000Z" }),
    ];
    expect(detectThreadSoundEvents(prev, next)).toEqual([
      { kind: "done", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("stays silent when unchanged state re-syncs", () => {
    const shells = [
      makeShell({ turnState: "completed", completedAt: "2026-08-25T00:03:00.000Z" }),
    ];
    expect(detectThreadSoundEvents(shells, shells)).toEqual([]);
    expect(detectThreadSoundEvents(shells, [makeShell({
      turnState: "completed",
      completedAt: "2026-08-25T00:03:00.000Z",
    })])).toEqual([]);
  });

  it("fires done again when a newer turn completes", () => {
    const prev = [
      makeShell({ turnState: "completed", completedAt: "2026-08-25T00:03:00.000Z" }),
    ];
    const next = [
      makeShell({ turnState: "completed", completedAt: "2026-08-25T00:10:00.000Z" }),
    ];
    expect(detectThreadSoundEvents(prev, next)).toEqual([
      { kind: "done", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("fires needs-input when a user-input request appears", () => {
    const prev = [makeShell({ turnState: "running" })];
    const next = [makeShell({ turnState: "running", hasPendingUserInput: true })];
    expect(detectThreadSoundEvents(prev, next)).toEqual([
      { kind: "needs-input", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("fires needs-input when an approval request appears", () => {
    const prev = [makeShell({ turnState: "running" })];
    const next = [makeShell({ turnState: "running", hasPendingApprovals: true })];
    expect(detectThreadSoundEvents(prev, next)).toEqual([
      { kind: "needs-input", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("does not repeat needs-input while the request stays open", () => {
    const prev = [makeShell({ turnState: "running", hasPendingUserInput: true })];
    const next = [makeShell({ turnState: "running", hasPendingUserInput: true })];
    expect(detectThreadSoundEvents(prev, next)).toEqual([]);
  });

  it("fires error when the session fails", () => {
    const prev = [makeShell({ turnState: "running", sessionStatus: "running" })];
    const next = [
      makeShell({ turnState: "running", sessionStatus: "error", sessionUpdatedAt: "2026-08-25T00:06:00.000Z" }),
    ];
    expect(detectThreadSoundEvents(prev, next)).toEqual([
      { kind: "error", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("fires error when the turn fails even if the session survives", () => {
    const prev = [makeShell({ turnState: "running" })];
    const next = [
      makeShell({ turnState: "error", completedAt: "2026-08-25T00:06:00.000Z" }),
    ];
    expect(detectThreadSoundEvents(prev, next)).toEqual([
      { kind: "error", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("collapses simultaneous edges to one signal: error over needs-input over done", () => {
    // Turn completes while a user-input request lands: needs-input wins.
    const prevA = [makeShell({ turnState: "running" })];
    const nextA = [
      makeShell({
        turnState: "completed",
        completedAt: "2026-08-25T00:03:00.000Z",
        hasPendingUserInput: true,
      }),
    ];
    expect(detectThreadSoundEvents(prevA, nextA)).toEqual([
      { kind: "needs-input", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);

    // Session errors while an approval request also lands: error wins.
    const prevB = [makeShell({ turnState: "running", sessionStatus: "running" })];
    const nextB = [
      makeShell({
        turnState: "running",
        sessionStatus: "error",
        hasPendingApprovals: true,
      }),
    ];
    expect(detectThreadSoundEvents(prevB, nextB)).toEqual([
      { kind: "error", environmentId: ENV, threadId: ThreadId.make("thread-1") },
    ]);
  });

  it("ignores threads that appear or disappear between observations", () => {
    const prev = [makeShell({ turnState: "running" })];
    const next = [
      makeShell({ turnState: "running" }),
      makeShell({ id: "thread-new", turnState: "completed", completedAt: "2026-08-25T00:03:00.000Z" }),
    ];
    expect(detectThreadSoundEvents(prev, next)).toEqual([]);
    expect(detectThreadSoundEvents(next, prev)).toEqual([]);
  });

  it("tracks threads independently across environments", () => {
    const otherEnv = EnvironmentId.make("env-2");
    const prev = [makeShell({ turnState: "running" })];
    const next = [
      makeShell({ turnState: "completed", completedAt: "2026-08-25T00:03:00.000Z" }),
      {
        ...makeShell({ id: "thread-2", turnState: "running" }),
        environmentId: otherEnv,
      },
    ];
    const events = detectThreadSoundEvents(prev, next);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      kind: "done",
      environmentId: ENV,
      threadId: ThreadId.make("thread-1"),
    });
  });
});
