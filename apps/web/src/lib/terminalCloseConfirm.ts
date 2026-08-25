import { readLocalApi } from "~/localApi";

let pendingConfirmations = 0;

/** Whether a terminal-close confirmation is currently waiting on the user. */
export function isTerminalCloseConfirmPending(): boolean {
  return pendingConfirmations > 0;
}

export function terminalCloseConfirmMessage(labels: readonly [string, ...string[]]): string {
  return labels.length === 1
    ? [
        `Close terminal "${labels[0]}"?`,
        "This stops the running process and clears its history.",
      ].join("\n")
    : [
        `Close ${labels.length} terminals?`,
        `This stops their running processes and clears their histories: ${labels
          .map((label) => `"${label}"`)
          .join(", ")}.`,
      ].join("\n");
}

/**
 * Browser fallback for surfaces without the native dialog bridge: the web app
 * must confirm destructive closes too, not just desktop.
 */
function browserConfirmTerminalClose(message: string): boolean {
  return typeof globalThis.confirm === "function" ? globalThis.confirm(message) : true;
}

/**
 * Confirmation for individual terminal close actions: drawer buttons, panel
 * buttons, the `terminal.close` keybinding, and closing a terminal surface from
 * the tab strip. Auto-exit cleanup and bulk tab closes skip this path and close
 * directly.
 */
export async function confirmTerminalClose(
  labels: readonly [string, ...string[]],
): Promise<boolean> {
  const localApi = readLocalApi();
  if (!localApi) {
    pendingConfirmations += 1;
    try {
      return browserConfirmTerminalClose(terminalCloseConfirmMessage(labels));
    } finally {
      pendingConfirmations -= 1;
    }
  }
  pendingConfirmations += 1;
  try {
    return await localApi.dialogs.confirm(terminalCloseConfirmMessage(labels), {
      variant: "destructive",
    });
  } catch {
    return false;
  } finally {
    pendingConfirmations -= 1;
  }
}
