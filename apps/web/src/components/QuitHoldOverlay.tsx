import { useEffect, useState } from "react";

import { isMacPlatform } from "../lib/utils";
import { useThreadShells } from "../state/entities";
import { Button } from "./ui/button";

// Matches the hold duration in apps/desktop/src/window/QuitHold.ts: the hint
// from a quick tap lingers for as long as a full hold would have taken.
const HIDE_AFTER_RELEASE_MS = 1200;

/**
 * Chrome-style "Hold ⌘Q to Quit" hint. The desktop main process intercepts
 * the quit accelerator and pushes press/release states; a quick tap shows
 * this pill while a full hold quits the app.
 */
export function QuitHoldOverlay() {
  const [visible, setVisible] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const shells = useThreadShells();

  useEffect(() => {
    const subscribe = window.desktopBridge?.onQuitShortcut;
    if (!subscribe) return;
    let hideTimer: number | undefined;
    const unsubscribe = subscribe((state) => {
      window.clearTimeout(hideTimer);
      if (state === "down") {
        setVisible(true);
        return;
      }
      hideTimer = window.setTimeout(() => setVisible(false), HIDE_AFTER_RELEASE_MS);
    });
    return () => {
      window.clearTimeout(hideTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscribe = window.desktopBridge?.onWindowCloseRequest;
    const respond = window.desktopBridge?.respondToWindowClose;
    if (!subscribe || !respond) return;
    return subscribe(() => {
      const hasActiveWork = shells.some(
        (shell) =>
          shell.session?.status === "running" ||
          shell.hasPendingApprovals ||
          shell.hasPendingUserInput ||
          shell.backgroundLiveness === "working",
      );
      if (!hasActiveWork) {
        void respond("close");
        return;
      }
      setClosePromptOpen(true);
    });
  }, [shells]);

  const respondToClose = (decision: "background" | "close" | "cancel") => {
    setClosePromptOpen(false);
    void window.desktopBridge?.respondToWindowClose?.(decision);
  };

  if (!visible && !closePromptOpen) return null;
  const shortcut = isMacPlatform(navigator.platform) ? "⌘Q" : "Ctrl+Q";
  return (
    <>
      {visible ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 top-[22%] z-100 flex justify-center"
        >
          <div className="rounded-full bg-neutral-700/95 px-8 py-4 text-2xl font-bold text-white shadow-xl">
            Hold {shortcut} to Quit
          </div>
        </div>
      ) : null}
      {closePromptOpen ? (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="active-work-close-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
            role="dialog"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              RUNE is still working
            </p>
            <h2 id="active-work-close-title" className="mt-2 text-xl font-semibold">
              Keep your chat running?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A chat or sub-agent is still working. Keep RUNE in the background and reopen it from
              the taskbar, or stop the work and close the app.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => respondToClose("cancel")}>
                Cancel
              </Button>
              <Button variant="destructive-outline" onClick={() => respondToClose("close")}>
                Stop work and close
              </Button>
              <Button onClick={() => respondToClose("background")}>Keep in background</Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
