import type { EnvironmentId, ServerConfig, ServerSelfUpdateCapability } from "@rune/contracts";
import type { ServerUpdateState } from "@rune/client-runtime/state/server";
import { compareSemverVersions, parseSemver } from "@rune/shared/semver";
import * as Schema from "effect/Schema";

import { APP_BASE_NAME, APP_VERSION } from "./branding";
import { getLocalStorageItem, setLocalStorageItem } from "./hooks/useLocalStorage";

export interface VersionMismatch {
  readonly clientVersion: string;
  readonly serverVersion: string;
  readonly hint: string;
}

export const VERSION_MISMATCH_DISMISSALS_STORAGE_KEY = "rune:version-mismatch-dismissals:v1";

const VersionMismatchDismissalsSchema = Schema.Struct({
  keys: Schema.Array(Schema.String),
});

const SERVER_UPDATE_FAILURE_DISMISSALS_STORAGE_KEY = "rune:server-update-failure-dismissals:v1";

const ServerUpdateFailureDismissalsSchema = Schema.Struct({
  keys: Schema.Array(Schema.String),
});

type ServerUpdateFailureDismissals = typeof ServerUpdateFailureDismissalsSchema.Type;

type VersionMismatchDismissals = typeof VersionMismatchDismissalsSchema.Type;

function normalizeVersion(version: string | null | undefined): string | null {
  const trimmed = version?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/** Core `major.minor.patch`, dropping any prerelease or build suffix. */
function versionCore(version: string): string {
  return version.replace(/[-+].*$/, "");
}

/**
 * The skew a user can act on: the connected server runs an older RUNE server than
 * this client, so the server is the side that needs updating.
 *
 * Versions compare as semver on their core `major.minor.patch` only. Nightlies
 * are `<core>-nightly.<date>.<run>` builds of the release they precede, so a
 * stable client on a nightly server (or the reverse, at the same core) shares a
 * wire contract and is not skew. A server *ahead* of the client is not skew
 * either: the client is the stale side, and every consumer of this result tells
 * the user to update their server. Versions that do not parse as semver fall
 * back to plain string inequality.
 */
export function resolveVersionMismatch(
  serverVersion: string | null | undefined,
): VersionMismatch | null {
  const normalizedClientVersion = normalizeVersion(APP_VERSION);
  const normalizedServerVersion = normalizeVersion(serverVersion);
  if (!normalizedClientVersion || !normalizedServerVersion) {
    return null;
  }

  const clientCore = versionCore(normalizedClientVersion);
  const serverCore = versionCore(normalizedServerVersion);
  const serverIsBehind =
    parseSemver(clientCore) && parseSemver(serverCore)
      ? compareSemverVersions(serverCore, clientCore) < 0
      : normalizedServerVersion !== normalizedClientVersion;
  if (!serverIsBehind) {
    return null;
  }

  return {
    clientVersion: normalizedClientVersion,
    serverVersion: normalizedServerVersion,
    hint: `Version mismatch. Try syncing the client and server to the same ${APP_BASE_NAME} version.`,
  };
}

export function resolveServerConfigVersionMismatch(
  serverConfig: Pick<ServerConfig, "environment"> | null | undefined,
): VersionMismatch | null {
  return resolveVersionMismatch(serverConfig?.environment.serverVersion);
}

/** The update path the connected server offers, or null when it only
    supports a manual relaunch (older servers, dev checkouts, Windows). */
export function resolveServerSelfUpdateCapability(
  serverConfig: Pick<ServerConfig, "environment"> | null | undefined,
): ServerSelfUpdateCapability | null {
  return serverConfig?.environment.capabilities.serverSelfUpdate ?? null;
}

/** True when the desktop app supervising this server can be told to update
    itself over RPC. Older desktop servers only get the manual instruction. */
export function supportsDesktopAppUpdate(
  serverConfig: Pick<ServerConfig, "environment"> | null | undefined,
): boolean {
  return serverConfig?.environment.capabilities.desktopAppUpdate === true;
}

/** True when the connected server can recover opted-in running turns after
    its self-update restart. */
export function supportsServerUpdateThreadContinuation(
  serverConfig: Pick<ServerConfig, "environment"> | null | undefined,
): boolean {
  return serverConfig?.environment.capabilities.serverUpdateThreadContinuation === true;
}

/** The command to hand users whose server cannot update itself. */
export function manualServerUpdateCommand(targetVersion: string): string {
  return `npx rune@${targetVersion}`;
}

/** One sentence telling the user how to resolve version skew for a server,
    matched to the update path it offers. */
export function serverUpdateGuidance(
  capability: ServerSelfUpdateCapability | null,
  serverLabel: string,
): string {
  switch (capability) {
    case "boot-service":
    case "respawn":
      return `Update the ${serverLabel} so they stay in sync.`;
    case "desktop-managed":
      return `Update the desktop app that runs the ${serverLabel}.`;
    default:
      return `Relaunch the ${serverLabel} with the copied command to sync them.`;
  }
}

export function buildVersionMismatchDismissalKey(
  environmentId: EnvironmentId,
  mismatch: Pick<VersionMismatch, "clientVersion" | "serverVersion">,
): string {
  return `${environmentId}:${mismatch.clientVersion}:${mismatch.serverVersion}`;
}

function readVersionMismatchDismissals(): VersionMismatchDismissals {
  try {
    return (
      getLocalStorageItem(
        VERSION_MISMATCH_DISMISSALS_STORAGE_KEY,
        VersionMismatchDismissalsSchema,
      ) ?? { keys: [] }
    );
  } catch (error) {
    console.error("Could not read version-mismatch dismissals.", error);
    return { keys: [] };
  }
}

function writeVersionMismatchDismissals(document: VersionMismatchDismissals): void {
  try {
    setLocalStorageItem(
      VERSION_MISMATCH_DISMISSALS_STORAGE_KEY,
      document,
      VersionMismatchDismissalsSchema,
    );
  } catch (error) {
    console.error("Could not persist version-mismatch dismissals.", error);
  }
}

export function isVersionMismatchDismissed(dismissalKey: string | null | undefined): boolean {
  if (!dismissalKey) {
    return false;
  }
  return readVersionMismatchDismissals().keys.includes(dismissalKey);
}

export function dismissVersionMismatch(dismissalKey: string | null | undefined): void {
  if (!dismissalKey) {
    return;
  }
  const document = readVersionMismatchDismissals();
  if (document.keys.includes(dismissalKey)) {
    return;
  }
  writeVersionMismatchDismissals({
    keys: [...document.keys, dismissalKey],
  });
}

function serverUpdateFailureDismissalKey(
  state: Extract<ServerUpdateState, { readonly status: "failed" }>,
): string {
  return JSON.stringify([state.fromVersion, state.targetVersion, state.message]);
}

function readServerUpdateFailureDismissals(): ServerUpdateFailureDismissals {
  try {
    return (
      getLocalStorageItem(
        SERVER_UPDATE_FAILURE_DISMISSALS_STORAGE_KEY,
        ServerUpdateFailureDismissalsSchema,
      ) ?? { keys: [] }
    );
  } catch (error) {
    console.error("Could not read server-update failure dismissals.", error);
    return { keys: [] };
  }
}

function writeServerUpdateFailureDismissals(document: ServerUpdateFailureDismissals): void {
  try {
    setLocalStorageItem(
      SERVER_UPDATE_FAILURE_DISMISSALS_STORAGE_KEY,
      document,
      ServerUpdateFailureDismissalsSchema,
    );
  } catch (error) {
    console.error("Could not persist server-update failure dismissals.", error);
  }
}

export function isServerUpdateFailureDismissed(state: ServerUpdateState): boolean {
  return (
    state.status === "failed" &&
    readServerUpdateFailureDismissals().keys.includes(serverUpdateFailureDismissalKey(state))
  );
}

export function dismissServerUpdateFailure(state: ServerUpdateState): void {
  if (state.status !== "failed") return;
  const key = serverUpdateFailureDismissalKey(state);
  const document = readServerUpdateFailureDismissals();
  if (document.keys.includes(key)) return;
  writeServerUpdateFailureDismissals({ keys: [...document.keys, key] });
}
