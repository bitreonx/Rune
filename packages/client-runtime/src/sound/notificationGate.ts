export type OsNotificationPermission = NotificationPermission | "unsupported";

export interface OsNotificationGateInput {
  /** Whether the app window currently holds keyboard focus. */
  readonly windowFocused: boolean;
  /**
   * Whether the document is hidden (minimized or on a background tab).
   * Absent means not hidden — callers without visibility reporting still
   * get the focus check.
   */
  readonly documentHidden?: boolean;
  readonly permission: OsNotificationPermission;
}

/** Reads the current browser notification permission, or "unsupported" where the API is absent. */
export function resolveOsNotificationPermission(): OsNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

/**
 * Asks the browser for notification permission. Must run inside a real user
 * gesture (a settings button click) so the prompt is allowed to appear.
 * Resolves back to the current permission when prompting is unavailable.
 */
export async function requestOsNotificationPermission(): Promise<OsNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await window.Notification.requestPermission();
  } catch {
    // Some engines throw instead of resolving "denied"; the stored permission
    // is still the truthful answer.
    return window.Notification.permission;
  }
}

/**
 * An OS banner is the "you're away" channel: it fires only when the user
 * cannot see the app (unfocused or hidden) and only when the platform has
 * granted notification permission. Sounds carry the focused case alone.
 */
export function shouldShowOsNotification(input: OsNotificationGateInput): boolean {
  if (input.windowFocused && !input.documentHidden) return false;
  return input.permission === "granted";
}
