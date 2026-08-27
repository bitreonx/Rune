/**
 * File-watcher event mapper. Pure function: takes a raw fs event
 * (kind + absolute path) and a workspace root, and produces a
 * normalized event the client can drop into the project files
 * query.
 *
 * The path is always relative (POSIX, no leading slash) so the
 * client can match it against the entries query without any
 * path-math. Files outside the root are reported with a stable
 * sentinel; the WS layer drops them before the broadcast.
 */
import path from "node:path";

export type RawFsEvent = {
  readonly kind: "add" | "change" | "unlink";
  readonly absolutePath: string;
};

export type WorkspaceFilesChangedEvent = {
  readonly kind: RawFsEvent["kind"];
  readonly relativePath: string;
};

export function mapFsEvent(event: RawFsEvent, root: string): WorkspaceFilesChangedEvent | null {
  const relative = path.relative(root, event.absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    // Outside the root: drop. The WS handler shouldn't see these.
    return null;
  }
  return { kind: event.kind, relativePath: relative.split(path.sep).join("/") };
}
