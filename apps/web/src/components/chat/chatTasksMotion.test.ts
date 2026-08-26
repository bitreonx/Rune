import type { TurnId } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  resolveTasksDismissalCommit,
  resolveTasksTabOpen,
} from "./chatTasksMotion";

const turnA = "0123456789abcdef" as TurnId;
const turnB = "fedcba9876543210" as TurnId;

describe("resolveTasksTabOpen", () => {
  const base = {
    blockingDrawer: false,
    dismissalPending: false,
    drawerOpen: false,
    hasTasks: true,
  };

  it("shows the tab while tasks are live and the composer top is free", () => {
    expect(resolveTasksTabOpen(base)).toBe(true);
  });

  it("hides while the drawer is open", () => {
    expect(resolveTasksTabOpen({ ...base, drawerOpen: true })).toBe(false);
  });

  it("hides while a blocking drawer owns the composer top", () => {
    expect(resolveTasksTabOpen({ ...base, blockingDrawer: true })).toBe(false);
  });

  it("hides while a dismissal is animating out", () => {
    expect(resolveTasksTabOpen({ ...base, dismissalPending: true })).toBe(false);
  });

  it("hides when there is nothing to show", () => {
    expect(resolveTasksTabOpen({ ...base, hasTasks: false })).toBe(false);
  });
});

describe("resolveTasksDismissalCommit", () => {
  const base = {
    activeTurnId: turnA,
    drawerMotionState: "closed" as const,
    drawerOpen: false,
    pendingTurnId: turnA as TurnId | null,
    tabMotionState: "closed" as const,
  };

  it("commits once both surfaces finished their exit motion", () => {
    expect(resolveTasksDismissalCommit(base)).toBe("commit");
  });

  it("waits while either surface is still animating out", () => {
    expect(
      resolveTasksDismissalCommit({ ...base, drawerMotionState: "closing" }),
    ).toBe("wait");
    expect(resolveTasksDismissalCommit({ ...base, tabMotionState: "closing" })).toBe(
      "wait",
    );
  });

  it("waits while the drawer is still open", () => {
    expect(resolveTasksDismissalCommit({ ...base, drawerOpen: true })).toBe("wait");
  });

  it("drops a stale dismissal once the turn moved on", () => {
    expect(resolveTasksDismissalCommit({ ...base, activeTurnId: turnB })).toBe("drop");
  });

  it("waits without a pending dismissal", () => {
    expect(resolveTasksDismissalCommit({ ...base, pendingTurnId: null })).toBe("wait");
  });
});
