/**
 * Pure planning for the desktop side of scheduled-work wakeups.
 *
 * The host scheduler must launch RUNE with only an installation identifier and
 * a one-time nonce. This module deliberately returns structured executable /
 * argv data and never creates a shell command string. OS registration and
 * nonce persistence belong to a later platform adapter.
 */

export const DESKTOP_SCHEDULE_WAKE_ARGUMENT = "--rune-scheduler-wake";

const MAX_INSTALLATION_ID_LENGTH = 64;
const MAX_WAKE_NONCE_LENGTH = 128;
const MIN_WAKE_NONCE_LENGTH = 16;
const SAFE_INSTALLATION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SAFE_WAKE_NONCE = /^[A-Za-z0-9_-]{16,128}$/;

export interface DesktopWakeRequest {
  readonly installationId: string;
  readonly nonce: string;
}

export interface DesktopWakeLaunchPlan {
  readonly executablePath: string;
  readonly argv: readonly string[];
}

export type DesktopWakeParseError =
  | "duplicate-argument"
  | "equals-form-not-supported"
  | "missing-installation-id"
  | "missing-nonce"
  | "invalid-installation-id"
  | "invalid-nonce";

export type DesktopWakeParseResult =
  | { readonly tag: "none" }
  | { readonly tag: "invalid"; readonly reason: DesktopWakeParseError }
  | { readonly tag: "request"; readonly request: DesktopWakeRequest };

export type DesktopWakeDispatch =
  | { readonly tag: "ignore"; readonly reason: "no-request" | DesktopWakeParseError }
  | { readonly tag: "start-when-available"; readonly request: DesktopWakeRequest }
  | { readonly tag: "forward-to-existing-instance"; readonly request: DesktopWakeRequest };

export type DesktopWakeSource = "cold-start" | "second-instance";

const containsControlCharacter = (value: string): boolean =>
  [...value].some((character) => character.charCodeAt(0) < 0x20 || character.charCodeAt(0) === 0x7f);

function isValidInstallationId(value: string | undefined): value is string {
  return (
    value !== undefined &&
    value.length <= MAX_INSTALLATION_ID_LENGTH &&
    SAFE_INSTALLATION_ID.test(value) &&
    !containsControlCharacter(value)
  );
}

function isValidWakeNonce(value: string | undefined): value is string {
  return (
    value !== undefined &&
    value.length >= MIN_WAKE_NONCE_LENGTH &&
    value.length <= MAX_WAKE_NONCE_LENGTH &&
    SAFE_WAKE_NONCE.test(value) &&
    !containsControlCharacter(value)
  );
}

function isWakeArgument(value: string): boolean {
  return value === DESKTOP_SCHEDULE_WAKE_ARGUMENT;
}

function isEqualsWakeArgument(value: string): boolean {
  return value.startsWith(`${DESKTOP_SCHEDULE_WAKE_ARGUMENT}=`);
}

/**
 * Decode only the structured wake argument emitted by
 * `buildDesktopWakeLaunchPlan`.
 *
 * An equals-form is rejected rather than parsed so a future OS adapter cannot
 * accidentally introduce delimiter/escaping ambiguity into a task command.
 */
export function parseDesktopWakeRequest(argv: readonly string[]): DesktopWakeParseResult {
  const wakeIndexes: number[] = [];
  let equalsForm = false;

  for (const [index, argument] of argv.entries()) {
    if (isWakeArgument(argument)) {
      wakeIndexes.push(index);
    } else if (isEqualsWakeArgument(argument)) {
      equalsForm = true;
    }
  }

  if (wakeIndexes.length > 1) {
    return { tag: "invalid", reason: "duplicate-argument" };
  }
  if (equalsForm) {
    return { tag: "invalid", reason: "equals-form-not-supported" };
  }

  const wakeIndex = wakeIndexes[0];
  if (wakeIndex === undefined) {
    return { tag: "none" };
  }

  const installationId = argv[wakeIndex + 1];
  if (installationId === undefined) {
    return { tag: "invalid", reason: "missing-installation-id" };
  }
  if (!isValidInstallationId(installationId)) {
    return { tag: "invalid", reason: "invalid-installation-id" };
  }

  const nonce = argv[wakeIndex + 2];
  if (nonce === undefined) {
    return { tag: "invalid", reason: "missing-nonce" };
  }
  if (!isValidWakeNonce(nonce)) {
    return { tag: "invalid", reason: "invalid-nonce" };
  }

  return { tag: "request", request: { installationId, nonce } };
}

/**
 * Turn a cold-start command line into a start request, or a warm
 * `second-instance` command line into a request for the already-running
 * primary instance. Electron's single-instance lock is the authority that
 * makes the latter safe; this function only describes the route.
 */
export function planDesktopWakeDispatch(input: {
  readonly source: DesktopWakeSource;
  readonly argv: readonly string[];
}): DesktopWakeDispatch {
  const parsed = parseDesktopWakeRequest(input.argv);
  if (parsed.tag === "none") {
    return { tag: "ignore", reason: "no-request" };
  }
  if (parsed.tag === "invalid") {
    return { tag: "ignore", reason: parsed.reason };
  }

  return input.source === "second-instance"
    ? { tag: "forward-to-existing-instance", request: parsed.request }
    : { tag: "start-when-available", request: parsed.request };
}

function isValidLaunchValue(value: string): boolean {
  return value.length > 0 && !containsControlCharacter(value);
}

/**
 * Build the exact executable / argv pair an OS adapter should register.
 * `null` means the input is not safe to hand to a native scheduler.
 */
export function buildDesktopWakeLaunchPlan(input: {
  readonly executablePath: string;
  readonly baseArgv?: readonly string[];
  readonly request: DesktopWakeRequest;
}): DesktopWakeLaunchPlan | null {
  if (
    !isValidLaunchValue(input.executablePath) ||
    !isValidInstallationId(input.request.installationId) ||
    !isValidWakeNonce(input.request.nonce) ||
    input.baseArgv?.some((argument) => !isValidLaunchValue(argument))
  ) {
    return null;
  }

  return {
    executablePath: input.executablePath,
    argv: [
      ...(input.baseArgv ?? []),
      DESKTOP_SCHEDULE_WAKE_ARGUMENT,
      input.request.installationId,
      input.request.nonce,
    ],
  };
}
