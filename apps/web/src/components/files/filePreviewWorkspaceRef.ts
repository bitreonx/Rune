import {
  workspaceFileRefFrom,
  type WorkspaceFileRef,
  WorkspaceFileRefPath,
} from "@rune/contracts";
import * as Schema from "effect/Schema";

/**
 * Build a canonical WorkspaceFileRef from the data the file preview panel has
 * at hand. The `cwd` argument is the active workspace root the panel is bound
 * to; the panel never invents filesystem URLs from relative paths — the server
 * resolves the ref against its own canonical root and returns a signed asset
 * URL.
 *
 * Returns null when no workspace root is available. Throws when the relative
 * path is invalid (the schema encodes the rules; surfacing them here keeps
 * callers from silently opening a bad path).
 */
export function buildWorkspaceFileRef(input: {
  readonly environmentId: string;
  readonly cwd: string | undefined;
  readonly projectWorkspaceRoot: string | undefined;
  readonly projectId: string | undefined;
  readonly relativePath: string;
}): WorkspaceFileRef | null {
  const workspaceRoot = input.cwd ?? input.projectWorkspaceRoot;
  const workspaceId = input.projectId ?? input.environmentId;
  if (!workspaceRoot || !workspaceId) return null;
  // The ref must pass WorkspaceFileRefPath validation. We decode eagerly so
  // bad input fails the call site rather than producing a broken asset URL.
  Schema.decodeUnknownSync(WorkspaceFileRefPath)(input.relativePath);
  return workspaceFileRefFrom({
    workspaceId,
    workspaceRoot,
    relativePath: input.relativePath,
  });
}
