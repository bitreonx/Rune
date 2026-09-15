import { videoMimeType } from "./video.ts";

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

const IMAGE_MIME_TYPE_BY_EXTENSION = new Map([
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

/** Classifies a literal filesystem extension without URL decoding or suffix removal. */
export function mediaMimeTypeFromExtension(extension: string): string | null {
  if (!/^\.[a-z0-9]+$/i.test(extension)) return null;
  return (
    IMAGE_MIME_TYPE_BY_EXTENSION.get(extension.toLowerCase()) ??
    videoMimeType({ name: `media${extension}`, mimeType: "" })
  );
}

/** Classifies an authored media path or URL. */
export function mediaMimeType(path: string): string | null {
  const trimmed = path.trim();
  const source = trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1) : trimmed;
  const dataMimeType = /^data:((?:image|video)\/[\w.+-]+)[;,]/i.exec(source)?.[1];
  if (dataMimeType) return dataMimeType.toLowerCase();

  let sourcePath = source.split(/[?#]/, 1)[0] ?? "";
  if (/^(?:https?:|file:|\/\/)/i.test(source)) {
    try {
      sourcePath = new URL(source, "https://media.invalid").pathname;
    } catch {
      return null;
    }
  }
  try {
    sourcePath = decodeURIComponent(sourcePath);
  } catch {
    // A literal percent character is valid in a filename.
  }
  const basename = sourcePath.split(/[\\/]/).at(-1) ?? "";
  const extensionIndex = basename.lastIndexOf(".");
  return extensionIndex < 0 ? null : mediaMimeTypeFromExtension(basename.slice(extensionIndex));
}

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
