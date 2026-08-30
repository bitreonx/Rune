import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";

import * as Electron from "electron";

import { DEFAULT_CLIENT_SETTINGS } from "@rune/contracts";

import * as DesktopAssets from "../app/DesktopAssets.ts";
import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as DesktopStartupState from "../app/DesktopStartupState.ts";
import { makeComponentLogger } from "../app/DesktopObservability.ts";
import * as ElectronMenu from "../electron/ElectronMenu.ts";
import { getDesktopUrl } from "../electron/ElectronProtocol.ts";
import * as ElectronShell from "../electron/ElectronShell.ts";
import * as ElectronTheme from "../electron/ElectronTheme.ts";
import * as ElectronWindow from "../electron/ElectronWindow.ts";
import {
  MENU_ACTION_CHANNEL,
  QUIT_SHORTCUT_CHANNEL,
  STARTUP_SPLASH_STATE_CHANNEL,
  WINDOW_CLOSE_REQUEST_CHANNEL,
  WINDOW_FULLSCREEN_STATE_CHANNEL,
} from "../ipc/channels.ts";
import * as PreviewManager from "../preview/Manager.ts";
import * as DesktopAppSettings from "../settings/DesktopAppSettings.ts";
import * as DesktopClientSettings from "../settings/DesktopClientSettings.ts";
import * as ElectronApp from "../electron/ElectronApp.ts";
import { makeQuitHoldHandler } from "./QuitHold.ts";

const TITLEBAR_HEIGHT = 40;
const TITLEBAR_COLOR = "#01000000"; // #00000000 does not work correctly on Linux
const TITLEBAR_LIGHT_SYMBOL_COLOR = "#1f2937";
const TITLEBAR_DARK_SYMBOL_COLOR = "#f8fafc";
const MAIN_WINDOW_BOUNDS_PERSIST_DEBOUNCE_MS = 500;
const DEVELOPMENT_LOAD_RETRY_DELAYS_MS = [100, 250, 500, 1_000, 2_000] as const;
// Renderer crash (usually V8 OOM on long sessions) recovery: reload after a
// short delay, at most MAX_ATTEMPTS times per rolling WINDOW so a renderer
// that dies on boot cannot reload-loop forever.
const RENDERER_RECOVERY_RELOAD_DELAY_MS = 500;
const RENDERER_RECOVERY_MAX_ATTEMPTS = 3;
const RENDERER_RECOVERY_WINDOW_MS = 60_000;
const DEVELOPMENT_RETRYABLE_LOAD_ERROR_CODES = new Set([
  -2, // ERR_FAILED
  -7, // ERR_TIMED_OUT
  -9, // ERR_UNEXPECTED (custom protocol handler rejected)
  -102, // ERR_CONNECTION_REFUSED
  -105, // ERR_NAME_NOT_RESOLVED
  -106, // ERR_INTERNET_DISCONNECTED
  -118, // ERR_CONNECTION_TIMED_OUT
]);

type WindowTitleBarOptions = Pick<
  Electron.BrowserWindowConstructorOptions,
  "titleBarOverlay" | "titleBarStyle" | "trafficLightPosition"
>;

type DesktopWindowRuntimeServices =
  | DesktopEnvironment.DesktopEnvironment
  | DesktopAssets.DesktopAssets
  | DesktopAppSettings.DesktopAppSettings
  | DesktopClientSettings.DesktopClientSettings
  | ElectronApp.ElectronApp
  | ElectronMenu.ElectronMenu
  | ElectronShell.ElectronShell
  | ElectronTheme.ElectronTheme
  | ElectronWindow.ElectronWindow
  | PreviewManager.PreviewManager;

export type DesktopWindowError =
  | ElectronWindow.ElectronWindowCreateError
  | PreviewManager.PreviewManagerError;

export type MainWindowZoomDirection = "in" | "out" | "reset";

export class DesktopWindow extends Context.Service<
  DesktopWindow,
  {
    readonly createMain: Effect.Effect<Electron.BrowserWindow, DesktopWindowError>;
    readonly ensureMain: Effect.Effect<Electron.BrowserWindow, DesktopWindowError>;
    readonly revealOrCreateMain: Effect.Effect<Electron.BrowserWindow, DesktopWindowError>;
    readonly activate: Effect.Effect<void, DesktopWindowError>;
    readonly createMainIfBackendReady: Effect.Effect<void, DesktopWindowError>;
    // Show a lightweight RUNE startup window immediately, before the backend
    // that serves the renderer is ready. It is dismissed automatically once
    // the real main window reveals.
    readonly showStartupSplash: Effect.Effect<void>;
    // Marks the primary backend as ready so `createMainIfBackendReady` and the
    // macOS "activate without windows" path may open the real main window. The
    // renderer now always loads the local client URL (getDesktopUrl) and connects
    // to the backend through the connection layer, so the reported httpBaseUrl is
    // no longer used to point the window at the backend — it is kept only for the
    // readiness log and to preserve the callback contract the backend pool drives.
    readonly handleBackendReady: (httpBaseUrl: URL) => Effect.Effect<void, DesktopWindowError>;
    // Called when the backend transitions back to "not ready" (clean stop,
    // restart, crash). Clears the latch that lets `activate` auto-create a
    // window so a "macOS dock click" while the backend is down doesn't
    // produce a stranded window pointing at nothing.
    readonly handleBackendNotReady: Effect.Effect<void>;
    readonly transitionStartup: (
      event: DesktopStartupState.DesktopStartupEvent,
    ) => Effect.Effect<void>;
    readonly flushMainWindowBounds: Effect.Effect<void>;
    readonly dispatchMenuAction: (action: string) => Effect.Effect<void, DesktopWindowError>;
    // Zooms the main window's own webContents. The Electron `zoomIn`/`zoomOut`
    // menu roles act on whichever webContents has keyboard focus, so with an
    // embedded preview WebContentsView (or DevTools) focused they zoom the
    // guest page instead of the app UI. The menu routes here to always target
    // the main window.
    readonly zoomMain: (direction: MainWindowZoomDirection) => Effect.Effect<void>;
    readonly syncAppearance: Effect.Effect<void>;
    readonly hideMain?: Effect.Effect<void>;
    readonly confirmMainClose?: Effect.Effect<void, DesktopWindowError>;
  }
>()("@rune/desktop/window/DesktopWindow") {}

const { logInfo: logWindowInfo, logWarning: logWindowWarning } =
  makeComponentLogger("desktop-window");

function getIconOption(
  iconPaths: DesktopAssets.DesktopIconPaths,
  platform: NodeJS.Platform,
): { icon: string } | Record<string, never> {
  if (platform === "darwin") return {}; // macOS uses .icns from app bundle
  const ext = platform === "win32" ? "ico" : "png";
  return Option.match(iconPaths[ext], {
    onNone: () => ({}),
    onSome: (icon) => ({ icon }),
  });
}

function getInitialWindowBackgroundColor(shouldUseDarkColors: boolean): string {
  return shouldUseDarkColors ? "#0a0a0a" : "#ffffff";
}

type DisplayBounds = Pick<Electron.Rectangle, "x" | "y" | "width" | "height">;

function windowFitsWithinDisplay(
  windowBounds: DesktopAppSettings.DesktopWindowBounds,
  displayBounds: DisplayBounds,
): boolean {
  return (
    windowBounds.x >= displayBounds.x &&
    windowBounds.y >= displayBounds.y &&
    windowBounds.x + windowBounds.width <= displayBounds.x + displayBounds.width &&
    windowBounds.y + windowBounds.height <= displayBounds.y + displayBounds.height
  );
}

function windowBoundsEqual(
  left: DesktopAppSettings.DesktopWindowBounds,
  right: DesktopAppSettings.DesktopWindowBounds,
): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function resolveInitialMainWindowBounds(
  persistedBounds: DesktopAppSettings.DesktopWindowBounds | null,
  displays: readonly DisplayBounds[],
): DesktopAppSettings.DesktopWindowBounds | typeof DesktopAppSettings.DEFAULT_MAIN_WINDOW_SIZE {
  if (
    persistedBounds !== null &&
    displays.some((display) => windowFitsWithinDisplay(persistedBounds, display))
  ) {
    return persistedBounds;
  }
  return DesktopAppSettings.DEFAULT_MAIN_WINDOW_SIZE;
}

// A self-contained startup splash, shown while Electron and the selected
// backend cold-boot. Inlined as a data URL so it needs no bundled asset or
// renderer backend; its tiny script only renders state and recovery actions.
function buildStartupSplashDataUrl(shouldUseDarkColors: boolean): string {
  const theme = shouldUseDarkColors ? "dark" : "light";

  // Keep this launch surface self-contained and cheap: the real RUNE mark is
  // inline, and every animation is limited to opacity or transforms.
  const startupMarkPath =
    "M628 156L997 370V858L927 905L858 952L627 1108L541 1050L438 983L258 858L259 373Z M629 156L259 373H749L913 537L749 709L927 905L997 858V370Z M259 373L439 491L438 983L258 858Z M758 511H541V1050L627 1108L858 952L544 736Z";
  const startupHtml = `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><meta name="color-scheme" content="dark light"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>
    :root{color-scheme:dark;--canvas:#0b0d11;--surface:#151922;--surface-back:#202532;--ink:#f7f8fb;--muted:#a5adbb;--line:rgba(255,255,255,.16);--line-quiet:rgba(255,255,255,.08);--accent:#9b7cff;--accent-soft:rgba(155,124,255,.16)}html.light{color-scheme:light;--canvas:#e9edf2;--surface:#f8fafc;--surface-back:#d4dae3;--ink:#121722;--muted:#596273;--line:rgba(18,23,34,.2);--line-quiet:rgba(18,23,34,.1);--accent:#6541d8;--accent-soft:rgba(101,65,216,.12)}*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:var(--canvas);color:var(--ink);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;-webkit-user-select:none;user-select:none;-webkit-app-region:drag}.splash{position:relative;width:calc(100% - 24px);height:calc(100% - 24px);display:flex;flex-direction:column;justify-content:space-between;padding:22px 24px 20px;isolation:isolate;background:var(--surface);border:1px solid var(--line);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));box-shadow:8px 8px 0 var(--surface-back)}.splash::before{content:"";position:absolute;inset:10px;z-index:-1;border:1px solid var(--line-quiet);clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));pointer-events:none}.splash::after{content:"";position:absolute;left:24px;right:24px;bottom:10px;height:1px;background:var(--accent);opacity:.45;transform-origin:left;animation:rail-in 1.6s cubic-bezier(.22,1,.36,1) both}.close{position:absolute;z-index:3;top:12px;right:12px;width:26px;height:26px;border:1px solid var(--line);padding:0;background:transparent;color:var(--muted);font:400 14px/23px system-ui,sans-serif;text-align:center;cursor:pointer;-webkit-app-region:no-drag;clip-path:polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px));transition:color 140ms ease,background-color 140ms ease}.close:hover{background:var(--accent-soft);color:var(--ink)}.close:active{transform:translateY(1px)}.close:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.brand-line{display:flex;align-items:center;gap:9px;font-size:10px;font-weight:700;letter-spacing:.18em;color:var(--muted)}.brand-line::before{content:"";width:18px;height:1px;background:var(--accent);animation:rail-in 900ms cubic-bezier(.22,1,.36,1) both}.backdrop-mark{position:absolute;right:-50px;bottom:-52px;z-index:-1;width:190px;height:190px;color:var(--accent);opacity:.07;transform:rotate(8deg);animation:backdrop-drift 12s ease-in-out infinite}.brand-stage{display:flex;align-items:center;justify-content:center;min-height:150px}.mark{width:94px;height:94px;color:var(--ink);animation:mark-arrive 1.1s cubic-bezier(.22,1,.36,1) both}.mark path{fill:currentColor}.wordmark{margin-top:-1px;font-size:17px;line-height:1;font-weight:750;letter-spacing:.32em}.tagline{margin-top:8px;font-size:11px;line-height:1.2;color:var(--muted);letter-spacing:.02em}.status{display:flex;align-items:center;gap:9px;font-size:11px;line-height:1.2;color:var(--muted)}.status-dot{width:6px;height:6px;background:var(--accent);animation:status-dot 1.6s ease-in-out infinite}.status-text{animation:status-in 700ms ease-out both}@keyframes mark-arrive{0%{opacity:0;transform:translateY(8px) scale(.86)}65%{opacity:1;transform:translateY(-2px) scale(1.02)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes status-in{0%{opacity:0;transform:translateX(-5px)}100%{opacity:1;transform:translateX(0)}}@keyframes status-dot{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}@keyframes rail-in{0%{opacity:0;transform:scaleX(0)}100%{opacity:.45;transform:scaleX(1)}}@keyframes backdrop-drift{0%,100%{transform:translate3d(0,0,0) rotate(8deg)}50%{transform:translate3d(-8px,-6px,0) rotate(5deg)}}@media(prefers-reduced-motion:reduce){.splash::after,.brand-line::before,.mark,.status-text,.status-dot,.backdrop-mark{animation:none}.status-dot{opacity:1}}
  </style></head><body><main class="splash"><button class="close" type="button" aria-label="Close splash" onclick="window.runeSplash.dismiss()">&#x2715;</button><div class="brand-line">RUNE / DESKTOP</div><svg class="backdrop-mark" viewBox="0 0 1254 1254" aria-hidden="true"><path d="${startupMarkPath}" fill="currentColor" fill-rule="evenodd"/></svg><div class="brand-stage"><svg class="mark" viewBox="0 0 1254 1254" role="img" aria-label="RUNE"><path d="${startupMarkPath}" fill="currentColor" fill-rule="evenodd"/></svg></div><div><div class="wordmark">RUNE</div><div class="tagline">Preparing your workspace</div></div><div class="status"><span class="status-dot" aria-hidden="true"></span><span class="status-text">Starting RUNE…</span></div></main></body></html>`;
  const startupScript = `<script>
    (() => {
      const tagline = document.querySelector('.tagline');
      const status = document.querySelector('.status-text');
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px;-webkit-app-region:no-drag';
      const labels = {'retry-backend':'Retry backend','open-logs':'Open logs','restart':'Restart RUNE','quit':'Quit'};
      const render = (view) => {
        if (!view || typeof view.title !== 'string') return;
        if (status) status.textContent = view.title;
        if (tagline) tagline.textContent = view.errorMessage ? view.detail + ' — ' + view.errorMessage : view.detail;
        actions.replaceChildren();
        for (const action of Array.isArray(view.actions) ? view.actions : []) {
          if (!Object.prototype.hasOwnProperty.call(labels, action)) continue;
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = labels[action];
          button.style.cssText = 'border:1px solid var(--line);padding:5px 8px;background:var(--accent-soft);color:var(--ink);font:600 10px system-ui,sans-serif;cursor:pointer;-webkit-app-region:no-drag';
          button.addEventListener('click', () => {
            button.disabled = true;
            void window.runeSplash.action(action).catch(() => { button.disabled = false; });
          });
          actions.append(button);
        }
      };
      document.querySelector('.splash')?.append(actions);
      window.runeSplash.onState(render);
    })();
  </script>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(startupHtml.replace("</body>", startupScript + "</body>"))}`;

  // Keep launch feedback static and lightweight. The main window is opened
  // independently of backend readiness, so this surface must never depend on
  // an animated logo or a renderer animation completing.
  const html = `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>
    :root{color-scheme:dark}html.light{color-scheme:light}*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:#16181d;color:rgba(255,255,255,.9);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;-webkit-user-select:none;user-select:none;-webkit-app-region:drag}.panel{position:relative;width:calc(100% - 24px);height:calc(100% - 24px);display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(34,37,44,.88);box-shadow:0 18px 42px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.close{position:absolute;z-index:10;top:10px;right:10px;width:28px;height:28px;border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:0;background:rgba(255,255,255,.06);color:rgba(255,255,255,.72);font:400 14px/26px system-ui,sans-serif;text-align:center;cursor:pointer;-webkit-app-region:no-drag}.close:hover{background:rgba(255,255,255,.12);color:#fff}.close:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:2px}.mark{display:flex;align-items:center;justify-content:center;width:58px;height:58px;border:1px solid rgba(255,255,255,.24);border-radius:16px;color:#fff;font-size:20px;font-weight:700;letter-spacing:.08em}.wordmark{margin-top:18px;font-size:13px;line-height:1;font-weight:650;letter-spacing:.22em}.status{margin-top:12px;font-size:12px;line-height:1.2;color:rgba(255,255,255,.64)}.light body{background:#e7e9ed;color:rgba(20,22,26,.9)}.light .panel{border-color:rgba(20,22,26,.14);background:rgba(255,255,255,.82);box-shadow:0 18px 42px rgba(20,22,26,.14),inset 0 1px rgba(255,255,255,.8)}.light .close{border-color:rgba(20,22,26,.12);background:rgba(20,22,26,.05);color:rgba(20,22,26,.68)}.light .close:hover{background:rgba(20,22,26,.1);color:#14161a}.light .mark{border-color:rgba(20,22,26,.2);color:#14161a}.light .status{color:rgba(20,22,26,.58)}
  </style></head><body><main class="panel"><button class="close" type="button" aria-label="Close splash" onclick="window.runeSplash.dismiss()">&#x2715;</button><div class="mark" aria-hidden="true">R</div><div class="wordmark">RUNE</div><div class="status">Starting RUNE…</div></main></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  /*
  // Optimized animated loader - faster & GPU-accelerated
  const animatedLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="RUNE loading" style="width:100%;height:100%"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF"/><stop offset="50%" stop-color="#E8E5FF"/><stop offset="100%" stop-color="#C4B5FD"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="6"/></filter><clipPath id="a"><polygon points="0,0 470,0 512,250 0,260"/></clipPath><clipPath id="b"><polygon points="430,0 1024,0 1024,355 712,360 580,268"/></clipPath><clipPath id="c"><polygon points="405,190 782,180 664,492 330,542"/></clipPath><clipPath id="d"><polygon points="0,250 366,500 468,620 0,1024"/></clipPath><clipPath id="e"><polygon points="318,495 706,495 760,614 484,728 282,618"/></clipPath><clipPath id="f2"><polygon points="520,500 1024,340 1024,1024 640,1024 540,700"/></clipPath></defs><g filter="url(#f)"><g clip-path="url(#a)"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="url(#g)"><animateTransform attributeName="transform" type="translate" keyTimes="0;0.2;0.5;0.8;1" values="0 0;0 0;-70 -55;0 0;0 0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></g><g clip-path="url(#b)"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="url(#g)"><animateTransform attributeName="transform" type="translate" keyTimes="0;0.2;0.5;0.8;1" values="0 0;0 0;75 -70;0 0;0 0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></g><g clip-path="url(#c)"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="url(#g)"><animateTransform attributeName="transform" type="translate" keyTimes="0;0.2;0.5;0.8;1" values="0 0;0 0;28 -22;0 0;0 0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></g><g clip-path="url(#d)"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="url(#g)"><animateTransform attributeName="transform" type="translate" keyTimes="0;0.2;0.5;0.8;1" values="0 0;0 0;-60 72;0 0;0 0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></g><g clip-path="url(#e)"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="url(#g)"><animateTransform attributeName="transform" type="translate" keyTimes="0;0.2;0.5;0.8;1" values="0 0;0 0;0 32;0 0;0 0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></g><g clip-path="url(#f2)"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="url(#g)"><animateTransform attributeName="transform" type="translate" keyTimes="0;0.2;0.5;0.8;1" values="0 0;0 0;72 78;0 0;0 0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></g></g><g opacity="0.2"><path d="M 56.83 89.38 L 56.83 223.71 L 657.60 226.22 L 56.00 755.23 L 56.00 934.62 L 448.17 618.39 L 731.03 897.91 L 968.00 898.74 L 834.50 758.57 L 595.86 533.28 L 544.12 531.61 L 925.45 199.52 L 925.45 89.38 Z" fill="#A78BFA"><animate attributeName="opacity" values="0.15;0.25;0.15" keyTimes="0;0.5;1" dur="1.8s" repeatCount="indefinite"/></path></g></svg>`;

  const legacyHtml = `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>
    :root{color-scheme:dark}html.light{color-scheme:light}*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:radial-gradient(circle at 20% 12%,rgba(139,92,246,.2),transparent 50%),#020204;color:rgba(255,255,255,.86);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;-webkit-user-select:none;user-select:none;-webkit-app-region:drag;will-change:transform}.panel{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:translateZ(0);-webkit-transform:translateZ(0)}.close{position:absolute;z-index:10;top:10px;right:10px;width:32px;height:32px;border:0;border-radius:50%;padding:0;background:rgba(0,0,0,.3);color:rgba(255,255,255,.6);font:400 14px/32px system-ui,sans-serif;text-align:center;cursor:pointer;-webkit-app-region:no-drag;transition:all 120ms ease;will-change:transform,background-color}.close:hover{color:rgba(255,255,255,1);background:rgba(0,0,0,.5);transform:scale(1.05)}.close:active{transform:scale(0.95)}.close:focus-visible{outline:2px solid rgba(167,139,250,.8);outline-offset:2px}.mark-wrap{width:120px;height:120px;position:relative;transform:translateZ(0);-webkit-transform:translateZ(0)}.mark-wrap svg{width:100%;height:100%;will-change:transform}.wordmark{margin-top:28px;font-size:12px;line-height:1;font-weight:600;letter-spacing:.3em;color:rgba(255,255,255,.85)}.status{margin-top:14px;font-size:13px;line-height:1.2;color:rgba(255,255,255,.7);animation:status-pulse 1.8s ease-in-out infinite}.light body{background:radial-gradient(circle at 20% 12%,rgba(139,92,246,.16),transparent 50%),#f5f5f7;color:rgba(0,0,0,.82)}.light .close{background:rgba(255,255,255,.5);color:rgba(0,0,0,.6)}.light .close:hover{color:rgba(0,0,0,1);background:rgba(255,255,255,.8)}.light .wordmark{color:rgba(0,0,0,.7)}.light .status{color:rgba(0,0,0,.6)}@keyframes status-pulse{0%,100%{opacity:.6}50%{opacity:1}}@media(prefers-reduced-motion:reduce){.status{animation:none;opacity:1}}
  </style></head><body><main class="panel"><button class="close" type="button" aria-label="Close splash" onclick="window.runeSplash.dismiss()">&#x2715;</button><div class="mark-wrap">${animatedLogoSvg}</div><div class="wordmark">RUNE</div><div class="status">Starting RUNE…</div></main></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(legacyHtml)}`;
  */
}

export function isSameOriginRendererNavigation(input: {
  readonly applicationUrl: string;
  readonly navigationUrl: string;
}): boolean {
  try {
    return new URL(input.applicationUrl).origin === new URL(input.navigationUrl).origin;
  } catch {
    return false;
  }
}

export function isRetryableDevelopmentRendererLoadFailure(input: {
  readonly applicationUrl: string;
  readonly errorCode: number;
  readonly isMainFrame: boolean;
  readonly validatedUrl: string;
}): boolean {
  return (
    input.isMainFrame &&
    DEVELOPMENT_RETRYABLE_LOAD_ERROR_CODES.has(input.errorCode) &&
    isSameOriginRendererNavigation({
      applicationUrl: input.applicationUrl,
      navigationUrl: input.validatedUrl,
    })
  );
}

function getWindowTitleBarOptions(
  shouldUseDarkColors: boolean,
  platform: NodeJS.Platform,
): WindowTitleBarOptions {
  if (platform === "darwin") {
    return {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 16, y: 18 },
    };
  }

  return {
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: TITLEBAR_COLOR,
      height: TITLEBAR_HEIGHT,
      symbolColor: shouldUseDarkColors ? TITLEBAR_DARK_SYMBOL_COLOR : TITLEBAR_LIGHT_SYMBOL_COLOR,
    },
  };
}

function syncWindowAppearance(
  window: Electron.BrowserWindow,
  shouldUseDarkColors: boolean,
  platform: NodeJS.Platform,
): Effect.Effect<void> {
  return Effect.sync(() => {
    if (window.isDestroyed()) {
      return;
    }

    window.setBackgroundColor(getInitialWindowBackgroundColor(shouldUseDarkColors));
    const { titleBarOverlay } = getWindowTitleBarOptions(shouldUseDarkColors, platform);
    if (typeof titleBarOverlay === "object") {
      window.setTitleBarOverlay(titleBarOverlay);
    }
  });
}

type RevealSubscription = (listener: () => void) => void;

function bindFirstRevealTrigger(
  subscribers: readonly RevealSubscription[],
  reveal: () => void,
): void {
  let revealed = false;
  const fire = () => {
    if (revealed) return;
    revealed = true;
    reveal();
  };
  for (const subscribe of subscribers) {
    subscribe(fire);
  }
}

export const make = Effect.gen(function* () {
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const assets = yield* DesktopAssets.DesktopAssets;
  const electronMenu = yield* ElectronMenu.ElectronMenu;
  const electronShell = yield* ElectronShell.ElectronShell;
  const electronTheme = yield* ElectronTheme.ElectronTheme;
  const electronWindow = yield* ElectronWindow.ElectronWindow;
  const previewManager = yield* PreviewManager.PreviewManager;
  const desktopSettings = yield* DesktopAppSettings.DesktopAppSettings;
  const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
  const electronApp = yield* ElectronApp.ElectronApp;
  // Window-side latch for the primary backend's readiness. Set by
  // handleBackendReady (driven by the pool's onReady callback), cleared
  // by handleBackendNotReady (driven by onShutdown). Only consumed by
  // createMainIfBackendReady, which gates the post-readiness window
  // open in development and the macOS "activate without windows" path.
  const backendReadyRef = yield* Ref.make(false);
  const startupStateRef = yield* Ref.make(
    DesktopStartupState.createInitialDesktopStartupState(yield* Clock.currentTimeMillis),
  );
  // The transient "Connecting to WSL" splash window, tracked separately so it
  // is never mistaken for the real main window.
  const splashWindowRef = yield* Ref.make<Option.Option<Electron.BrowserWindow>>(Option.none());
  const context = yield* Effect.context<DesktopWindowRuntimeServices>();
  const runFork = Effect.runForkWith(context);
  const runPromise = Effect.runPromiseWith(context);
  let flushMainWindowBounds: Effect.Effect<void> = Effect.void;
  let allowMainClose = false;
  let backgroundTray: Electron.Tray | null = null;

  const publishStartupState = Effect.gen(function* () {
    const splash = yield* Ref.get(splashWindowRef);
    if (Option.isNone(splash) || splash.value.isDestroyed()) return;
    const state = yield* Ref.get(startupStateRef);
    splash.value.webContents.send(
      STARTUP_SPLASH_STATE_CHANNEL,
      DesktopStartupState.desktopStartupView(state),
    );
  });

  const transitionStartup = Effect.fn("desktop.window.transitionStartup")(function* (
    event: DesktopStartupState.DesktopStartupEvent,
  ) {
    const changed = yield* Ref.modify(startupStateRef, (current) => {
      const updated = DesktopStartupState.transitionDesktopStartupState(current, event);
      return [updated !== current, updated] as const;
    });
    if (changed) yield* publishStartupState;
  });

  yield* Effect.forkScoped(
    Effect.gen(function* () {
      while (true) {
        yield* Effect.sleep(1_000);
        const current = yield* Ref.get(startupStateRef);
        if (current.stage === "ready") return;
        const next = DesktopStartupState.transitionDesktopStartupState(current, {
          type: "watchdog",
          at: yield* Clock.currentTimeMillis,
        });
        if (next === current) continue;
        yield* Ref.set(startupStateRef, next);
        yield* publishStartupState;
      }
    }).pipe(Effect.withSpan("desktop.window.startupWatchdog")),
  );

  const dismissConnectingSplash = Effect.gen(function* () {
    const splash = yield* Ref.getAndSet(splashWindowRef, Option.none());
    if (Option.isSome(splash) && !splash.value.isDestroyed()) {
      splash.value.close();
    }
  });

  // currentMainOrFirst / focusedMainOrFirst fall back to "any first window",
  // which during WSL-only boot is the connecting splash. The splash is never
  // registered via setMain, so it must be treated as "no real main window" --
  // otherwise ensureMain/activate/dispatchMenuAction latch onto it and never
  // open (or retry) the real main. That is the failure the pool's swallowed
  // post-readiness window-open error would otherwise strand the user in:
  // splash up, backend ready, no main, and activation only re-reveals splash.
  const withoutSplash = (window: Option.Option<Electron.BrowserWindow>) =>
    Ref.get(splashWindowRef).pipe(
      Effect.map((splash) =>
        Option.isSome(splash) && Option.isSome(window) && window.value === splash.value
          ? Option.none<Electron.BrowserWindow>()
          : window,
      ),
    );

  const currentMainWindow = electronWindow.currentMainOrFirst.pipe(Effect.flatMap(withoutSplash));
  const focusedMainWindow = electronWindow.focusedMainOrFirst.pipe(Effect.flatMap(withoutSplash));

  const createWindow = Effect.fn("desktop.window.createWindow")(function* (): Effect.fn.Return<
    Electron.BrowserWindow,
    DesktopWindowError
  > {
    yield* transitionStartup({
      type: "window-loading",
      at: yield* Clock.currentTimeMillis,
    });
    yield* previewManager.getBrowserSession();
    const applicationUrl = getDesktopUrl(environment.isDevelopment);
    const iconPaths = yield* assets.iconPaths;
    const iconOption = getIconOption(iconPaths, environment.platform);
    const shouldUseDarkColors = yield* electronTheme.shouldUseDarkColors;
    const persistedSettings = yield* desktopSettings.get;
    const persistedBounds = persistedSettings.mainWindowBounds;
    const displayBoundsResult = yield* Effect.sync(() => {
      try {
        return {
          _tag: "Success" as const,
          bounds: Electron.screen.getAllDisplays().map((display) => display.bounds),
        };
      } catch (cause) {
        return { _tag: "Failure" as const, cause };
      }
    });
    const displayBounds =
      displayBoundsResult._tag === "Success"
        ? displayBoundsResult.bounds
        : yield* logWindowWarning("failed to read connected displays; using defaults", {
            cause: displayBoundsResult.cause,
          }).pipe(Effect.as<readonly Electron.Rectangle[]>([]));
    const initialBounds = resolveInitialMainWindowBounds(persistedBounds, displayBounds);
    const restoredPersistedBounds = persistedBounds !== null && initialBounds === persistedBounds;
    if (persistedBounds !== null && initialBounds === DesktopAppSettings.DEFAULT_MAIN_WINDOW_SIZE) {
      yield* logWindowWarning("saved main window bounds could not be restored; using defaults");
    }
    const window = yield* electronWindow.create({
      ...initialBounds,
      minWidth: 840,
      minHeight: 620,
      // Do not expose an unpainted black Chromium surface. The window is
      // created only after the backend readiness callback and is revealed by
      // the first successful renderer load below.
      show: false,
      autoHideMenuBar: true,
      ...(environment.platform === "darwin" ? { disableAutoHideCursor: true } : {}),
      backgroundColor: getInitialWindowBackgroundColor(shouldUseDarkColors),
      ...iconOption,
      title: environment.displayName,
      ...getWindowTitleBarOptions(shouldUseDarkColors, environment.platform),
      webPreferences: {
        preload: environment.preloadPath,
        // The window boots hidden (show: false until ready-to-show), and
        // Chromium throttles hidden renderers: timers coalesce and rAF stops,
        // which stalls first paint. Boot unthrottled; the first-reveal trigger
        // re-enables throttling so a hidden or minimized window goes back to
        // being cheap after it has been shown once.
        backgroundThrottling: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: true,
      },
    });

    if (environment.platform === "darwin") {
      window.setAutoHideCursor(false);
    }
    let boundsPersistFiber: Fiber.Fiber<void, never> | undefined;
    let pendingBoundsPersistFiber: Fiber.Fiber<void, never> | undefined;
    let boundsPersistenceEnabled = persistedBounds === null || restoredPersistedBounds;
    const readPersistableBounds = (): DesktopAppSettings.DesktopWindowBounds | null => {
      if (window.isDestroyed()) {
        return null;
      }
      const bounds =
        window.isFullScreen() || window.isMaximized() || window.isMinimized()
          ? window.getNormalBounds()
          : window.getBounds();
      return DesktopAppSettings.normalizeMainWindowBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      });
    };
    const fallbackWindowBounds = boundsPersistenceEnabled ? null : readPersistableBounds();
    const fallbackWindowMaximized = persistedSettings.mainWindowMaximized;
    const persistCurrentBounds = (): Fiber.Fiber<void, never> | undefined => {
      if (!boundsPersistenceEnabled) {
        return pendingBoundsPersistFiber;
      }
      const bounds = readPersistableBounds();
      if (bounds === null) {
        return pendingBoundsPersistFiber;
      }
      pendingBoundsPersistFiber = runFork(
        desktopSettings.setMainWindowBounds(bounds, window.isMaximized()).pipe(
          Effect.asVoid,
          Effect.catch((error) =>
            logWindowWarning("failed to persist main window bounds", {
              message: error.message,
            }),
          ),
        ),
      );
      return pendingBoundsPersistFiber;
    };
    const scheduleBoundsPersist = () => {
      if (!boundsPersistenceEnabled) {
        const currentBounds = readPersistableBounds();
        if (
          currentBounds === null ||
          (fallbackWindowBounds !== null &&
            windowBoundsEqual(currentBounds, fallbackWindowBounds) &&
            window.isMaximized() === fallbackWindowMaximized)
        ) {
          return;
        }
      }
      boundsPersistenceEnabled = true;
      if (boundsPersistFiber !== undefined) {
        const fiber = boundsPersistFiber;
        boundsPersistFiber = undefined;
        runFork(Fiber.interrupt(fiber));
      }
      boundsPersistFiber = runFork(
        Effect.sleep(MAIN_WINDOW_BOUNDS_PERSIST_DEBOUNCE_MS).pipe(
          Effect.andThen(
            Effect.sync(() => {
              boundsPersistFiber = undefined;
              void persistCurrentBounds();
            }),
          ),
        ),
      );
    };
    const clearBoundsPersist = () => {
      if (boundsPersistFiber === undefined) {
        return;
      }
      const fiber = boundsPersistFiber;
      boundsPersistFiber = undefined;
      runFork(Fiber.interrupt(fiber));
    };
    const flushBoundsPersist = Effect.sync(() => {
      clearBoundsPersist();
      return persistCurrentBounds();
    }).pipe(
      Effect.flatMap((fiber) =>
        fiber === undefined ? Effect.void : Fiber.join(fiber).pipe(Effect.asVoid),
      ),
    );
    flushMainWindowBounds = flushBoundsPersist;

    yield* previewManager.setMainWindow(window);
    window.on("close", (event) => {
      if (!window.isDestroyed()) {
        if (allowMainClose) {
          allowMainClose = false;
          return;
        }
        event.preventDefault();
        window.webContents.send(WINDOW_CLOSE_REQUEST_CHANNEL);
      }
    });
    window.webContents.on("will-attach-webview", (event, webPreferences, params) => {
      if (
        typeof params.partition !== "string" ||
        !previewManager.isBrowserPartition(params.partition)
      ) {
        event.preventDefault();
        return;
      }
      webPreferences.sandbox = true;
      webPreferences.nodeIntegration = false;
      webPreferences.nodeIntegrationInSubFrames = false;
      webPreferences.contextIsolation = false;
    });

    window.webContents.on("context-menu", (event, params) => {
      event.preventDefault();

      const menuTemplate: Electron.MenuItemConstructorOptions[] = [];

      if (params.misspelledWord) {
        for (const suggestion of params.dictionarySuggestions.slice(0, 5)) {
          menuTemplate.push({
            label: suggestion,
            click: () => window.webContents.replaceMisspelling(suggestion),
          });
        }
        if (params.dictionarySuggestions.length === 0) {
          menuTemplate.push({ label: "No suggestions", enabled: false });
        }
        menuTemplate.push({ type: "separator" });
      }

      if (Option.isSome(ElectronShell.parseSafeExternalUrl(params.linkURL))) {
        menuTemplate.push(
          {
            label: "Copy Link",
            click: () => {
              void runPromise(electronShell.copyText(params.linkURL));
            },
          },
          { type: "separator" },
        );
      }

      if (params.mediaType === "image") {
        menuTemplate.push({
          label: "Copy Image",
          click: () => window.webContents.copyImageAt(params.x, params.y),
        });
        menuTemplate.push({ type: "separator" });
      }

      menuTemplate.push(
        { role: "cut", enabled: params.editFlags.canCut },
        { role: "copy", enabled: params.editFlags.canCopy },
        { role: "paste", enabled: params.editFlags.canPaste },
        { role: "selectAll", enabled: params.editFlags.canSelectAll },
      );

      void runPromise(electronMenu.popupTemplate({ window, template: menuTemplate }));
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
      if (Option.isSome(ElectronShell.parseSafeExternalUrl(url))) {
        void runPromise(electronShell.openExternal(url));
      }
      return { action: "deny" };
    });
    window.webContents.on("will-navigate", (event, url) => {
      if (
        isSameOriginRendererNavigation({
          applicationUrl,
          navigationUrl: url,
        })
      ) {
        return;
      }

      event.preventDefault();
      if (Option.isSome(ElectronShell.parseSafeExternalUrl(url))) {
        void runPromise(electronShell.openExternal(url));
      }
    });

    // Electron's windowMenu close role owns CmdOrCtrl+W. Holding the
    // close-terminal shortcut can outlive the terminal that handled its first
    // press, so reject repeats before they reach the native window accelerator.
    // Deliberate presses still flow through the renderer or native menu.
    // Chrome-style hold-to-quit: intercept the quit accelerator before the
    // native menu sees it and only quit after the shortcut is held. The
    // renderer shows the "Hold to Quit" hint via QUIT_SHORTCUT_CHANNEL.
    const quitHoldHandler = makeQuitHoldHandler({
      platform: environment.platform,
      isEnabled: () =>
        runPromise(
          Effect.map(
            clientSettings.get,
            Option.match({
              onNone: () => DEFAULT_CLIENT_SETTINGS.confirmQuit,
              onSome: (settings) => settings.confirmQuit,
            }),
          ),
        ),
      notify: (state) => {
        if (!window.isDestroyed()) {
          window.webContents.send(QUIT_SHORTCUT_CHANNEL, state);
        }
      },
      quit: () => {
        void runPromise(electronApp.quit);
      },
    });
    window.webContents.on("before-input-event", (event, input) => {
      quitHoldHandler(event, input);
      if (input.type !== "keyDown" || !input.isAutoRepeat) return;
      const modifier = environment.platform === "darwin" ? input.meta : input.control;
      if (modifier && !input.alt && !input.shift && input.key.toLowerCase() === "w") {
        event.preventDefault();
      }
    });

    window.on("page-title-updated", (event) => {
      event.preventDefault();
      window.setTitle(environment.displayName);
    });
    window.on("resize", scheduleBoundsPersist);
    window.on("move", scheduleBoundsPersist);
    window.on("maximize", scheduleBoundsPersist);
    window.on("unmaximize", scheduleBoundsPersist);
    window.on("close", () => {
      runFork(flushBoundsPersist);
    });

    if (environment.platform === "darwin") {
      window.on("enter-full-screen", () => {
        window.webContents.send(WINDOW_FULLSCREEN_STATE_CHANNEL, true);
      });
      window.on("leave-full-screen", () => {
        window.webContents.send(WINDOW_FULLSCREEN_STATE_CHANNEL, false);
      });
    }

    let developmentLoadRetryIndex = 0;
    let developmentLoadRetryFiber: Fiber.Fiber<void, never> | undefined;
    let rendererRecoveryTimestamps: number[] = [];
    const clearDevelopmentLoadRetry = () => {
      if (developmentLoadRetryFiber === undefined) {
        return;
      }
      const retryFiber = developmentLoadRetryFiber;
      developmentLoadRetryFiber = undefined;
      runFork(Fiber.interrupt(retryFiber));
    };
    const loadApplication = () => {
      if (window.isDestroyed()) {
        return;
      }
      void window.loadURL(applicationUrl).catch(() => undefined);
    };
    const scheduleDevelopmentLoadRetry = () => {
      if (developmentLoadRetryFiber !== undefined || window.isDestroyed()) {
        return undefined;
      }

      const retryIndex = Math.min(
        developmentLoadRetryIndex,
        DEVELOPMENT_LOAD_RETRY_DELAYS_MS.length - 1,
      );
      const retryInMs = DEVELOPMENT_LOAD_RETRY_DELAYS_MS[retryIndex] ?? 2_000;
      developmentLoadRetryIndex += 1;
      developmentLoadRetryFiber = runFork(
        Effect.sleep(retryInMs).pipe(
          Effect.andThen(
            Effect.sync(() => {
              developmentLoadRetryFiber = undefined;
              if (!window.isDestroyed()) {
                loadApplication();
              }
            }),
          ),
        ),
      );
      return retryInMs;
    };

    window.webContents.on("did-finish-load", () => {
      if (
        environment.isDevelopment &&
        !isSameOriginRendererNavigation({
          applicationUrl,
          navigationUrl: window.webContents.getURL(),
        })
      ) {
        return;
      }
      clearDevelopmentLoadRetry();
      developmentLoadRetryIndex = 0;
      window.setTitle(environment.displayName);
    });
    window.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) {
          return;
        }
        const retryInMs = isRetryableDevelopmentRendererLoadFailure({
          applicationUrl,
          errorCode,
          isMainFrame,
          validatedUrl: validatedURL,
        })
          ? scheduleDevelopmentLoadRetry()
          : undefined;
        void runPromise(
          logWindowWarning("main window failed to load", {
            errorCode,
            errorDescription,
            url: validatedURL,
            ...(retryInMs === undefined ? {} : { retryInMs }),
          }),
        );
      },
    );
    window.webContents.on("render-process-gone", (_event, details) => {
      const recoverable =
        details.reason === "crashed" ||
        details.reason === "oom" ||
        details.reason === "abnormal-exit";
      // Long sessions can OOM the renderer (V8 heap exhaustion from
      // accumulated thread state). Without a reload the user is left staring
      // at a dead white window while agents keep running invisibly, so
      // recover by reloading — the renderer rehydrates from the backend,
      // which is unaffected. Recovery attempts are bounded so a renderer
      // that dies immediately on boot cannot reload-loop forever.
      runFork(
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          rendererRecoveryTimestamps = rendererRecoveryTimestamps.filter(
            (timestamp) => now - timestamp < RENDERER_RECOVERY_WINDOW_MS,
          );
          const shouldRecover =
            recoverable &&
            !window.isDestroyed() &&
            rendererRecoveryTimestamps.length < RENDERER_RECOVERY_MAX_ATTEMPTS;
          yield* logWindowWarning("main window render process gone", {
            reason: details.reason,
            exitCode: details.exitCode,
            recovering: shouldRecover,
          });
          if (!shouldRecover) {
            return;
          }
          rendererRecoveryTimestamps.push(now);
          yield* Effect.sleep(RENDERER_RECOVERY_RELOAD_DELAY_MS);
          if (!window.isDestroyed()) {
            loadApplication();
          }
        }),
      );
    });

    const revealSubscribers: RevealSubscription[] = [(fire) => window.once("ready-to-show", fire)];
    // Windows may finish the main-frame load without emitting ready-to-show.
    revealSubscribers.push((fire) => window.webContents.once("did-finish-load", fire));
    bindFirstRevealTrigger(revealSubscribers, () => {
      // Boot is done; hand the window back to normal hidden-window throttling
      // (see the backgroundThrottling comment on the create options above).
      if (!window.isDestroyed()) {
        window.webContents.setBackgroundThrottling(true);
      }
      // Reveal the real window, then close the connecting splash (if any) so the
      // two don't overlap and there's no blank gap between them.
      if (persistedSettings.mainWindowMaximized) {
        window.maximize();
      }
      void runPromise(
        Effect.gen(function* () {
          yield* electronWindow.reveal(window);
          yield* dismissConnectingSplash;
          yield* transitionStartup({ type: "ready", at: yield* Clock.currentTimeMillis });
          if (process.env.RUNE_DESKTOP_SMOKE_TEST === "1") {
            process.stdout.write("RUNE_DESKTOP_SMOKE_MAIN_VISIBLE\n");
          }
        }),
      );
    });

    loadApplication();
    if (environment.isDevelopment) {
      window.webContents.openDevTools({ mode: "detach" });
    }

    window.on("closed", () => {
      clearDevelopmentLoadRetry();
      clearBoundsPersist();
      void runPromise(electronWindow.clearMain(Option.some(window)));
    });

    return window;
  });

  const createMain = Effect.gen(function* () {
    const window = yield* createWindow();
    yield* electronWindow.setMain(window);
    yield* logWindowInfo("main window created");
    return window;
  }).pipe(Effect.withSpan("desktop.window.createMain"));

  const ensureMain = Effect.gen(function* () {
    const existingWindow = yield* currentMainWindow;
    if (Option.isSome(existingWindow)) {
      return existingWindow.value;
    }
    return yield* createMain;
  }).pipe(Effect.withSpan("desktop.window.ensureMain"));

  const revealOrCreateMain = Effect.gen(function* () {
    const window = yield* ensureMain;
    yield* electronWindow.reveal(window);
    return window;
  }).pipe(Effect.withSpan("desktop.window.revealOrCreateMain"));

  const createMainIfBackendReady = Effect.gen(function* () {
    const existingWindow = yield* currentMainWindow;
    if (Option.isSome(existingWindow)) return;
    if (!(yield* Ref.get(backendReadyRef))) return;
    yield* createMain;
  }).pipe(Effect.withSpan("desktop.window.createMainIfBackendReady"));

  const showStartupSplash = Effect.gen(function* () {
    // Only when nothing is shown yet: no real window, no existing splash.
    const existingSplash = yield* Ref.get(splashWindowRef);
    if (Option.isSome(existingSplash)) return;
    const existingWindow = yield* electronWindow.currentMainOrFirst;
    if (Option.isSome(existingWindow)) return;

    const shouldUseDarkColors = yield* electronTheme.shouldUseDarkColors;
    const iconPaths = yield* assets.iconPaths;
    const splash = yield* electronWindow.create({
      width: 360,
      height: 280,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      frame: false,
      center: true,
      show: false,
      skipTaskbar: false,
      transparent: false,
      backgroundColor: getInitialWindowBackgroundColor(shouldUseDarkColors),
      ...getIconOption(iconPaths, environment.platform),
      title: environment.displayName,
      webPreferences: {
        preload: environment.path.join(environment.dirname, "startupSplash.preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    yield* Ref.set(splashWindowRef, Option.some(splash));
    splash.show();
    splash.once("closed", () => {
      void runPromise(Ref.set(splashWindowRef, Option.none()));
    });
    splash.once("ready-to-show", () => {
      if (!splash.isDestroyed()) {
        splash.show();
        void runPromise(publishStartupState);
      }
    });
    splash.webContents.on("did-finish-load", () => {
      void runPromise(publishStartupState);
    });
    void splash.loadURL(buildStartupSplashDataUrl(shouldUseDarkColors));
    yield* logWindowInfo("startup splash shown");
  }).pipe(
    // The splash is best-effort UX — never let it fail startup.
    Effect.catch((error) =>
      logWindowWarning("failed to show startup splash", { message: error.message }),
    ),
    Effect.withSpan("desktop.window.showStartupSplash"),
  );

  return DesktopWindow.of({
    createMain,
    ensureMain,
    revealOrCreateMain,
    activate: Effect.gen(function* () {
      const existingWindow = yield* currentMainWindow;
      if (Option.isSome(existingWindow)) {
        yield* electronWindow.reveal(existingWindow.value);
        return;
      }
      if (yield* Ref.get(backendReadyRef)) {
        yield* createMainIfBackendReady;
      } else {
        yield* showStartupSplash;
      }
    }).pipe(Effect.withSpan("desktop.window.activate")),
    createMainIfBackendReady,
    showStartupSplash,
    transitionStartup,
    handleBackendReady: Effect.fn("desktop.window.handleBackendReady")(function* (httpBaseUrl) {
      yield* Ref.set(backendReadyRef, true);
      yield* logWindowInfo("backend ready", { source: "http", url: httpBaseUrl.href });
      if (process.env.RUNE_DESKTOP_SMOKE_TEST === "1") {
        process.stdout.write("RUNE_DESKTOP_SMOKE_BACKEND_READY\n");
      }
      yield* transitionStartup({ type: "backend-ready", at: yield* Clock.currentTimeMillis });
      yield* createMainIfBackendReady.pipe(
        Effect.tapError((error) =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((at) =>
              transitionStartup({
                type: "failed",
                at,
                message: error.message,
              }),
            ),
          ),
        ),
      );
    }),
    handleBackendNotReady: Effect.gen(function* () {
      yield* Ref.set(backendReadyRef, false);
      yield* transitionStartup({ type: "backend-starting", at: yield* Clock.currentTimeMillis });
    }).pipe(Effect.withSpan("desktop.window.handleBackendNotReady")),
    flushMainWindowBounds: Effect.suspend(() => flushMainWindowBounds).pipe(
      Effect.withSpan("desktop.window.flushMainWindowBounds"),
    ),
    dispatchMenuAction: Effect.fn("desktop.window.dispatchMenuAction")(function* (action) {
      yield* Effect.annotateCurrentSpan({ action });
      const existingWindow = yield* focusedMainWindow;
      if (Option.isNone(existingWindow) && !(yield* Ref.get(backendReadyRef))) {
        return;
      }
      const targetWindow = Option.isSome(existingWindow) ? existingWindow.value : yield* ensureMain;

      const send = () => {
        if (targetWindow.isDestroyed()) return;
        targetWindow.webContents.send(MENU_ACTION_CHANNEL, action);
        void runPromise(electronWindow.reveal(targetWindow));
      };

      if (targetWindow.webContents.isLoadingMainFrame()) {
        targetWindow.webContents.once("did-finish-load", send);
        return;
      }

      send();
    }),
    zoomMain: Effect.fn("desktop.window.zoomMain")(function* (direction) {
      yield* Effect.annotateCurrentSpan({ direction });
      const window = yield* focusedMainWindow;
      if (Option.isNone(window) || window.value.isDestroyed()) {
        return;
      }
      const webContents = window.value.webContents;
      // Same step size as the Electron zoomIn/zoomOut menu roles.
      webContents.setZoomLevel(
        direction === "reset" ? 0 : webContents.getZoomLevel() + (direction === "in" ? 0.5 : -0.5),
      );
      // Chromium pushes the new level down to embedded guests, which would zoom
      // the previewed page along with the app UI. The preview browser keeps its
      // own zoom, so put each guest back where the preview left it.
      yield* previewManager.reapplyZoom();
    }),
    syncAppearance: Effect.gen(function* () {
      const shouldUseDarkColors = yield* electronTheme.shouldUseDarkColors;
      yield* electronWindow.syncAllAppearance((window) =>
        syncWindowAppearance(window, shouldUseDarkColors, environment.platform),
      );
    }).pipe(Effect.withSpan("desktop.window.syncAppearance")),
    hideMain: Effect.gen(function* () {
      const main = yield* currentMainWindow;
      if (Option.isNone(main) || main.value.isDestroyed()) return;
      if (backgroundTray === null) {
        const iconPaths = yield* assets.iconPaths;
        const iconPath = Option.match(
          environment.platform === "win32" ? iconPaths.ico : iconPaths.png,
          { onNone: () => null, onSome: (path) => path },
        );
        if (iconPath !== null) {
          backgroundTray = new Electron.Tray(iconPath);
          backgroundTray.setToolTip(`${environment.displayName} is running in the background`);
          backgroundTray.setContextMenu(
            Electron.Menu.buildFromTemplate([
              {
                label: `Open ${environment.displayName}`,
                click: () => {
                  if (main.value.isDestroyed()) return;
                  main.value.show();
                  main.value.focus();
                },
              },
            ]),
          );
          backgroundTray.on("click", () => {
            if (main.value.isDestroyed()) return;
            main.value.show();
            main.value.focus();
          });
        }
      }
      main.value.hide();
    }),
    confirmMainClose: Effect.gen(function* () {
      const main = yield* currentMainWindow;
      if (Option.isNone(main) || main.value.isDestroyed()) return;
      allowMainClose = true;
      backgroundTray?.destroy();
      backgroundTray = null;
      main.value.close();
    }),
  });
});

export const layer = Layer.effect(DesktopWindow, make);
