import { scopeThreadRef } from "@rune/client-runtime/environment";
import type { ScopedThreadRef } from "@rune/contracts";
import type { EnvironmentThreadShell } from "@rune/client-runtime/state/models";
import {
  detectThreadSoundEvents,
  type ThreadSoundEvent,
  type ThreadSoundEventKind,
} from "@rune/client-runtime/state/sound-events";
import {
  resolveOsNotificationPermission,
  shouldShowOsNotification,
} from "@rune/client-runtime/sound/notification-gate";
import { useEffect, useRef } from "react";

import { useThreadShells } from "../state/entities";
import { playSoundEffect } from "./playback";
import { useSoundPreferencesStore } from "./soundPreferencesStore";

const NOTIFICATION_TITLES: Readonly<Record<ThreadSoundEventKind, string>> = {
  done: "Agent finished",
  "needs-input": "Agent needs your input",
  error: "Agent hit an error",
};

function showOsNotification(
  event: ThreadSoundEvent,
  shell: EnvironmentThreadShell | undefined,
  onOpenThread: (threadRef: ScopedThreadRef) => void,
): void {
  try {
    // Silent: the sound effect is this event's audio; the OS banner must not
    // double it. The tag collapses per-thread so a burst of syncs leaves one
    // banner instead of a stack.
    const notification = new Notification(NOTIFICATION_TITLES[event.kind], {
      body: shell?.title ?? "",
      tag: `${event.environmentId}:${event.threadId}`,
      silent: true,
    });
    notification.addEventListener("click", () => {
      window.focus();
      notification.close();
      onOpenThread(scopeThreadRef(event.environmentId, event.threadId));
    });
  } catch {
    // Some platforms throw on construction; losing the banner is cosmetic.
  }
}

/**
 * Renderer-wide listener that turns thread-list transitions into sounds and
 * (when the user cannot see the app) OS notifications. Renders nothing; it
 * exists to sit inside the atom registry next to the router for the
 * lifetime of the session.
 */
export function SoundEventHost({ onOpenThread }: { readonly onOpenThread: (threadRef: ScopedThreadRef) => void }) {
  const shells = useThreadShells();
  const enabled = useSoundPreferencesStore((state) => state.enabled);
  const notifications = useSoundPreferencesStore((state) => state.notifications);
  const previousShellsRef = useRef<ReadonlyArray<EnvironmentThreadShell> | null>(null);

  useEffect(() => {
    const previousShells = previousShellsRef.current;
    // Recorded before every early return so re-enabling mid-session never
    // replays edges accumulated while muted.
    previousShellsRef.current = shells;
    if (!previousShells || !enabled) return;

    const events = detectThreadSoundEvents(previousShells, shells);
    if (events.length === 0) return;

    // Focus and permission are sampled once per sync; every event in a burst
    // shares the same window state.
    const gateInput = notifications
      ? {
          windowFocused: document.hasFocus(),
          documentHidden: document.visibilityState === "hidden",
          permission: resolveOsNotificationPermission(),
        }
      : null;
    for (const event of events) {
      playSoundEffect(event.kind);
      if (gateInput === null || !shouldShowOsNotification(gateInput)) continue;
      showOsNotification(
        event,
        shells.find(
          (shell) => shell.environmentId === event.environmentId && shell.id === event.threadId,
        ),
        onOpenThread,
      );
    }
  }, [shells, enabled, notifications, onOpenThread]);

  return null;
}
