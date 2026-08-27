/**
 * Coerce an explorer-emitted relative path into POSIX form. The file tree
 * hands us POSIX paths today, but if a future server change starts returning
 * native separators (common on Windows where the tree walk is libuv-based),
 * the WorkspaceFileRef built downstream would carry backslashes and the
 * asset service would reject it. Normalising at the explorer boundary
 * keeps the rest of the pipeline POSIX-only.
 */
export function toPosixRelativePath(path: string): string {
  return path.replaceAll("\\", "/");
}
