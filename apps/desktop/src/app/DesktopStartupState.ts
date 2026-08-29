export const STARTUP_NORMAL_COLD_START_BUDGET_MS = 8_000;
export const STARTUP_FAILURE_BUDGET_MS = 30_000;

export type DesktopStartupStage =
  | "electron-starting"
  | "backend-starting"
  | "backend-slow"
  | "backend-ready"
  | "window-loading"
  | "ready"
  | "startup-failed";

export type DesktopStartupAction = "retry-backend" | "open-logs" | "restart" | "quit";

export interface DesktopStartupState {
  readonly stage: DesktopStartupStage;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly attempt: number;
  readonly errorMessage?: string;
}

export type DesktopStartupEvent =
  | { readonly type: "electron-ready"; readonly at: number }
  | { readonly type: "backend-starting"; readonly at: number }
  | { readonly type: "backend-ready"; readonly at: number }
  | { readonly type: "window-loading"; readonly at: number }
  | { readonly type: "ready"; readonly at: number }
  | { readonly type: "watchdog"; readonly at: number }
  | { readonly type: "failed"; readonly at: number; readonly message: string }
  | { readonly type: "retry"; readonly at: number };

export interface DesktopStartupView {
  readonly stage: DesktopStartupStage;
  readonly title: string;
  readonly detail: string;
  readonly actions: readonly DesktopStartupAction[];
  readonly errorMessage?: string;
}

export const createInitialDesktopStartupState = (at: number): DesktopStartupState => ({
  stage: "electron-starting",
  startedAt: at,
  updatedAt: at,
  attempt: 0,
});

const withStage = (
  state: DesktopStartupState,
  stage: DesktopStartupStage,
  at: number,
  extra: Pick<DesktopStartupState, "attempt" | "errorMessage"> = {},
): DesktopStartupState => ({
  stage,
  startedAt: state.startedAt,
  updatedAt: at,
  attempt: extra.attempt ?? state.attempt,
  ...(extra.errorMessage === undefined ? {} : { errorMessage: extra.errorMessage }),
});

export const transitionDesktopStartupState = (
  state: DesktopStartupState,
  event: DesktopStartupEvent,
): DesktopStartupState => {
  switch (event.type) {
    case "electron-ready":
      return state.stage === "electron-starting"
        ? withStage(state, "backend-starting", event.at, { attempt: Math.max(1, state.attempt) })
        : state;
    case "backend-starting":
      return state.stage === "ready"
        ? state
        : withStage(state, "backend-starting", event.at, { attempt: state.attempt + 1 });
    case "backend-ready":
      return state.stage === "ready" ? state : withStage(state, "backend-ready", event.at);
    case "window-loading":
      return state.stage === "ready" ? state : withStage(state, "window-loading", event.at);
    case "ready":
      return withStage(state, "ready", event.at);
    case "watchdog":
      if (state.stage === "ready" || state.stage === "startup-failed") return state;
      if (
        state.stage === "electron-starting" ||
        state.stage === "backend-starting" ||
        state.stage === "backend-slow"
      ) {
        const elapsed = event.at - state.startedAt;
        if (elapsed >= STARTUP_FAILURE_BUDGET_MS) {
          return withStage(state, "startup-failed", event.at, {
            errorMessage: "The local backend did not become ready within the startup window.",
          });
        }
        if (elapsed >= STARTUP_NORMAL_COLD_START_BUDGET_MS) {
          return withStage(state, "backend-slow", event.at);
        }
      }
      return state;
    case "failed":
      return withStage(state, "startup-failed", event.at, { errorMessage: event.message });
    case "retry":
      return {
        stage: "backend-starting",
        startedAt: event.at,
        updatedAt: event.at,
        attempt: state.attempt + 1,
      };
  }
};

export const desktopStartupView = (state: DesktopStartupState): DesktopStartupView => {
  switch (state.stage) {
    case "electron-starting":
      return {
        stage: state.stage,
        title: "Starting RUNE",
        detail: "Preparing the desktop workspace",
        actions: [],
      };
    case "backend-starting":
      return {
        stage: state.stage,
        title: "Starting local backend",
        detail: "Connecting the workspace services",
        actions: [],
      };
    case "backend-slow":
      return {
        stage: state.stage,
        title: "Still starting",
        detail:
          "The backend is taking longer than usual. You can keep waiting or inspect the logs.",
        actions: ["open-logs", "quit"],
      };
    case "backend-ready":
      return {
        stage: state.stage,
        title: "Backend ready",
        detail: "Loading your workspace",
        actions: [],
      };
    case "window-loading":
      return {
        stage: state.stage,
        title: "Opening workspace",
        detail: "Finishing the first renderer load",
        actions: [],
      };
    case "ready":
      return {
        stage: state.stage,
        title: "Ready",
        detail: "Workspace loaded",
        actions: [],
      };
    case "startup-failed":
      return {
        stage: state.stage,
        title: "RUNE could not start",
        detail: "The desktop workspace is still available to recover.",
        actions: ["retry-backend", "open-logs", "restart", "quit"],
        ...(state.errorMessage === undefined ? {} : { errorMessage: state.errorMessage }),
      };
  }
};
