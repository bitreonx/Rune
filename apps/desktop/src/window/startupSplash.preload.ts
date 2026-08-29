// @effect-diagnostics globalDate:off - This isolated Electron preload does not run inside an Effect runtime.
import { contextBridge, ipcRenderer } from "electron";

import * as IpcChannels from "../ipc/channels.ts";

type StartupAction = "retry-backend" | "open-logs" | "restart" | "quit";
type StartupView = {
  readonly stage: string;
  readonly title: string;
  readonly detail: string;
  readonly actions: readonly StartupAction[];
  readonly errorMessage?: string;
};

contextBridge.exposeInMainWorld("runeSplash", {
  dismiss: () => window.close(),
  action: (action: StartupAction) =>
    ipcRenderer.invoke(IpcChannels.STARTUP_SPLASH_ACTION_CHANNEL, action),
  onState: (listener: (view: StartupView) => void) => {
    const wrappedListener = (_event: Electron.IpcRendererEvent, view: unknown) => {
      if (typeof view !== "object" || view === null) return;
      listener(view as StartupView);
    };
    ipcRenderer.on(IpcChannels.STARTUP_SPLASH_STATE_CHANNEL, wrappedListener);
    return () =>
      ipcRenderer.removeListener(IpcChannels.STARTUP_SPLASH_STATE_CHANNEL, wrappedListener);
  },
});
