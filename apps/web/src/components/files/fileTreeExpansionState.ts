const STORAGE_PREFIX = "rune:file-tree-expanded:v1:";

function storageKey(environmentId: string, cwd: string): string {
  return `${STORAGE_PREFIX}${environmentId}:${cwd}`;
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
}

/**
 * File expansion is view state, but it belongs to the workspace rather than
 * to a mounted React instance. Keeping this tiny persistence seam separate
 * also means a remount or a thread switch cannot accidentally carry folders
 * from another workspace into the current tree.
 */
export function readFileTreeExpandedDirectories(
  environmentId: string,
  cwd: string,
): ReadonlySet<string> {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(environmentId, cwd));
    if (raw === null || raw === undefined) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .filter((path): path is string => typeof path === "string" && path.length > 0)
        .map(normalizePath),
    );
  } catch {
    return new Set();
  }
}

export function writeFileTreeExpandedDirectories(
  environmentId: string,
  cwd: string,
  paths: ReadonlyArray<string>,
): void {
  try {
    globalThis.localStorage?.setItem(
      storageKey(environmentId, cwd),
      JSON.stringify([...new Set(paths.map(normalizePath).filter(Boolean))].toSorted()),
    );
  } catch {
    // Workspace browsing must remain usable when storage is unavailable or full.
  }
}
