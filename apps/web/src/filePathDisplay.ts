import { splitPathAndPosition } from "./workspacePath";

function normalizePathSeparators(path: string): string {
  return path.replaceAll("\\", "/");
}

function trimTrailingPathSeparators(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

function stripRelativePrefixes(path: string): string {
  return path.replace(/^\.\/+/, "").replace(/^\/+/, "");
}

export function formatWorkspaceRelativePath(
  pathWithPosition: string,
  workspaceRoot: string | undefined,
): string {
  const position = splitFilePathPosition(pathWithPosition);
  const normalizedPath = stripSlashPrefixedWindowsDrive(normalizePathSeparators(position.path));

  let displayPath = normalizedPath;
  if (workspaceRoot) {
    const normalizedWorkspaceRoot = stripSlashPrefixedWindowsDrive(
      normalizePathSeparators(trimTrailingPathSeparators(workspaceRoot)),
    );
    const workspaceLabel = fileBasename(normalizedWorkspaceRoot);
    const caseInsensitive = isWindowsAbsolutePath(stripSlashPrefixedWindowsDrive(workspaceRoot));
    const pathForCompare = caseInsensitive ? normalizedPath.toLowerCase() : normalizedPath;
    const workspaceForCompare = caseInsensitive
      ? normalizedWorkspaceRoot.toLowerCase()
      : normalizedWorkspaceRoot;
    const workspaceWithSeparator = `${workspaceForCompare}/`;
    const workspaceLabelWithSeparator = `${caseInsensitive ? workspaceLabel.toLowerCase() : workspaceLabel}/`;

    if (pathForCompare === workspaceForCompare) {
      displayPath = workspaceLabel;
    } else if (pathForCompare.startsWith(workspaceWithSeparator)) {
      const relativeSuffix = normalizedPath.slice(normalizedWorkspaceRoot.length + 1);
      displayPath = `${workspaceLabel}/${relativeSuffix}`;
    } else if (!normalizedPath.startsWith("/")) {
      const relativePath = stripRelativePrefixes(normalizedPath);
      displayPath = pathForCompare.startsWith(workspaceLabelWithSeparator)
        ? normalizedPath
        : `${workspaceLabel}/${relativePath}`;
    }
  }

  return formatFilePathPosition({ ...position, path: displayPath });
}

/**
 * Resolves a provider-supplied path to the relative path used by the file
 * explorer. Unlike formatWorkspaceRelativePath, this intentionally omits the
 * workspace label because the result is an interaction value, not display text.
 */
export function resolveWorkspaceRelativePath(
  pathWithPosition: string,
  workspaceRoot: string | undefined,
): string {
  const { path } = splitPathAndPosition(pathWithPosition);
  const normalizedPath = canonicalizeWindowsDrivePath(normalizePathSeparators(path));
  if (!workspaceRoot) return stripRelativePrefixes(normalizedPath);

  const normalizedWorkspaceRoot = canonicalizeWindowsDrivePath(
    normalizePathSeparators(trimTrailingPathSeparators(workspaceRoot)),
  );
  const pathForCompare = normalizedPath.toLowerCase();
  const workspaceForCompare = normalizedWorkspaceRoot.toLowerCase();
  const workspaceLabel = basenameOfPath(normalizedWorkspaceRoot);
  const workspaceLabelPrefix = `${workspaceLabel.toLowerCase()}/`;

  if (pathForCompare.startsWith(`${workspaceForCompare}/`)) {
    return normalizedPath.slice(normalizedWorkspaceRoot.length + 1);
  }
  if (pathForCompare.startsWith(workspaceLabelPrefix)) {
    return normalizedPath.slice(workspaceLabel.length + 1);
  }
  return stripRelativePrefixes(normalizedPath);
}
