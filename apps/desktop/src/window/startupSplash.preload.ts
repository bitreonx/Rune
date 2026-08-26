// @effect-diagnostics globalDate:off - This isolated Electron preload does not run inside an Effect runtime.
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("runeSplash", {
  dismiss: () => window.close(),
});
