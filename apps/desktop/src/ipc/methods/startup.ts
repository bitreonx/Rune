import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import * as DesktopBackendPool from "../../backend/DesktopBackendPool.ts";
import * as DesktopEnvironment from "../../app/DesktopEnvironment.ts";
import * as DesktopLifecycle from "../../app/DesktopLifecycle.ts";
import * as DesktopWindow from "../../window/DesktopWindow.ts";
import * as ElectronApp from "../../electron/ElectronApp.ts";
import * as ElectronShell from "../../electron/ElectronShell.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

const StartupSplashAction = Schema.Literals(["retry-backend", "open-logs", "restart", "quit"]);

export const handleStartupSplashAction = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.STARTUP_SPLASH_ACTION_CHANNEL,
  payload: StartupSplashAction,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.startupSplash.action")(function* (action) {
    if (action === "retry-backend") {
      const window = yield* DesktopWindow.DesktopWindow;
      const pool = yield* DesktopBackendPool.DesktopBackendPool;
      const primary = yield* pool.primary;
      yield* window.transitionStartup({
        type: "retry",
        at: yield* Clock.currentTimeMillis,
      });
      yield* primary.start;
      return;
    }

    if (action === "open-logs") {
      const environment = yield* DesktopEnvironment.DesktopEnvironment;
      const shell = yield* ElectronShell.ElectronShell;
      yield* shell.openPath(environment.logDir);
      return;
    }

    if (action === "restart") {
      const lifecycle = yield* DesktopLifecycle.DesktopLifecycle;
      yield* lifecycle.relaunch("startup recovery");
      return;
    }

    const electronApp = yield* ElectronApp.ElectronApp;
    yield* electronApp.quit;
  }),
});
