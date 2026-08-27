/**
 * Path formatters for the file explorer's right-click context menu.
 * The two helpers produce:
 *  - formatAbsolutePath: the platform-correct absolute path the user
 *    can paste into a shell (forward slashes on POSIX, backslashes
 *    on Windows)
 *  - formatRelativePath: the always-POSIX relative path the user can
 *    paste into a chat mention or a URL
 *
 * The two are deliberately different surfaces — the relative path
 * is always POSIX, the absolute path is the native separator.
 */

import { sep } from "node:path";

export function formatAbsolutePath(
  cwd: string,
  relativePath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  if (relativePath === "") return cwd;
  const trimmedCwd = cwd.replace(/[\\/]+$/, "");
  const isWindows = platform === "win32";
  const joiner = isWindows ? "\\" : "/";
  return `${trimmedCwd}${joiner}${relativePath.split("/").join(joiner)}`;
}

export function formatRelativePath(relativePath: string): string {
  return relativePath;
}

void sep;
