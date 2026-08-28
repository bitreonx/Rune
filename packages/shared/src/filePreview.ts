export const WORKSPACE_BROWSER_PREVIEW_EXTENSIONS = [".htm", ".html", ".pdf"] as const;

export const WORKSPACE_IMAGE_PREVIEW_EXTENSIONS = [
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
] as const;

export const WORKSPACE_MEDIA_PREVIEW_EXTENSIONS = [
  ".aac",
  ".flac",
  ".m4a",
  ".m4v",
  ".mov",
  ".mp3",
  ".mp4",
  ".oga",
  ".ogg",
  ".ogv",
  ".opus",
  ".wav",
  ".webm",
] as const;

function hasPreviewExtension(path: string, extensions: ReadonlyArray<string>): boolean {
  const pathWithoutQuery = path.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  return extensions.some((extension) => pathWithoutQuery.endsWith(extension));
}

export function isWorkspaceBrowserPreviewPath(path: string): boolean {
  return hasPreviewExtension(path, WORKSPACE_BROWSER_PREVIEW_EXTENSIONS);
}

export function isWorkspaceImagePreviewPath(path: string): boolean {
  return hasPreviewExtension(path, WORKSPACE_IMAGE_PREVIEW_EXTENSIONS);
}

export function isWorkspaceMediaPreviewPath(path: string): boolean {
  return hasPreviewExtension(path, WORKSPACE_MEDIA_PREVIEW_EXTENSIONS);
}

export function isWorkspacePreviewEntryPath(path: string): boolean {
  return (
    isWorkspaceBrowserPreviewPath(path) ||
    isWorkspaceImagePreviewPath(path) ||
    isWorkspaceMediaPreviewPath(path)
  );
}

/**
 * Assets that preview standalone and must be pinned to their exact path in
 * the signed claim. Browser documents (html/pdf) instead get a claim scoped
 * to their directory so sibling stylesheets, scripts, and fonts resolve.
 */
export function isWorkspaceExactPreviewPath(path: string): boolean {
  return isWorkspaceImagePreviewPath(path) || isWorkspaceMediaPreviewPath(path);
}
