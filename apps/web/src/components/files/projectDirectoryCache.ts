import type { ProjectEntry } from "@rune/contracts";

export function normalizeDirectoryPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

export function parentDirectoryPath(path: string): string {
  const normalized = normalizeDirectoryPath(path);
  const separator = normalized.lastIndexOf("/");
  return separator < 0 ? "" : normalized.slice(0, separator);
}

export function directoryEntryPath(entry: ProjectEntry): string {
  return entry.kind === "directory" ? `${entry.path}/` : entry.path;
}

/**
 * A watcher event changes the containing directory. If a loaded directory
 * itself changed, invalidate that directory too; file-content changes only
 * invalidate its parent listing. This keeps filesystem updates proportional
 * to the visible cache rather than to the repository size.
 */
export function directoriesToInvalidate(
  paths: ReadonlyArray<string>,
  loadedDirectories: ReadonlySet<string>,
): ReadonlyArray<string> {
  const invalidated = new Set<string>();
  for (const path of paths) {
    const normalized = normalizeDirectoryPath(path);
    if (normalized.length === 0) {
      invalidated.add("");
      continue;
    }
    invalidated.add(parentDirectoryPath(normalized));
    if (loadedDirectories.has(normalized)) invalidated.add(normalized);
  }
  return [...invalidated].sort((left, right) => left.localeCompare(right));
}

export function flattenDirectorySnapshots(
  snapshots: ReadonlyMap<string, ReadonlyArray<ProjectEntry>>,
): ReadonlyArray<ProjectEntry> {
  const entries = new Map<string, ProjectEntry["kind"]>();
  for (const snapshot of snapshots.values()) {
    for (const entry of snapshot) entries.set(entry.path, entry.kind);
  }
  return [...entries.entries()]
    .map(([path, kind]) => ({ path, kind }) satisfies ProjectEntry)
    .sort((left, right) => left.path.localeCompare(right.path));
}
