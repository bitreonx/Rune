import type { TurnId } from "@rune/contracts";

import type { RunePanelMotionState } from "../../runePanelMotion";

/**
 * Motion windows for the tasks surfaces above the composer. The drawer is the
 * larger sheet, so it gets the full Apple-sheet duration; the tab snaps in a
 * touch quicker so spawn never lags behind the turn.
 */
export const TASKS_DRAWER_MOTION_MS = 280;
export const TASKS_TAB_MOTION_MS = 240;

export type TasksDismissalVerdict = "commit" | "wait" | "drop";

/**
 * Whether the collapsed tasks tab should be on screen. This is the union of
 * every placement's own conditions (shoulder, inline, mobile) — individual
 * render sites still narrow it down to where the tab belongs.
 */
export function resolveTasksTabOpen(options: {
  blockingDrawer: boolean;
  dismissalPending: boolean;
  drawerOpen: boolean;
  hasTasks: boolean;
}): boolean {
  return (
    options.hasTasks &&
    !options.dismissalPending &&
    !options.drawerOpen &&
    !options.blockingDrawer
  );
}

/**
 * Dismissal defers until the exit motion finishes so the X press animates
 * instead of popping. "drop" covers the turn moving on mid-animation: the
 * fresh turn's tasks must not be dismissed by a press aimed at the old one.
 */
export function resolveTasksDismissalCommit(options: {
  activeTurnId: TurnId | null;
  drawerMotionState: RunePanelMotionState;
  drawerOpen: boolean;
  pendingTurnId: TurnId | null;
  tabMotionState: RunePanelMotionState;
}): TasksDismissalVerdict {
  if (options.pendingTurnId === null) return "wait";
  if (options.activeTurnId !== options.pendingTurnId) return "drop";
  if (options.drawerOpen) return "wait";
  if (options.drawerMotionState !== "closed" || options.tabMotionState !== "closed") {
    return "wait";
  }
  return "commit";
}
