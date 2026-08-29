import { isWorkspaceImagePreviewPath } from "@rune/shared/filePreview";

import { isMarkdownPreviewFile } from "./filePreviewMode.ts";

/**
 * Discriminated kinds the {@link UniversalViewerShell} can dispatch to a
 * registered viewer. Adding a new viewer is a one-line change to the
 * `FileKind` union plus an entry in `viewerRegistry` — the shell never has
 * to learn the new name.
 */
export type FileKind =
  | "image"
  | "markdown"
  | "browser-preview"
  | "svg"
  | "json"
  | "pdf"
  | "audio"
  | "video"
  | "truncated-text"
  | "text"
  | "code"
  | "binary"
  | "unknown";

/**
 * The single object the shell hands to a viewer. The viewer never
 * re-derives these flags — they're computed once per open file by
 * {@link describeFile}, a pure function the test suite exercises in
 * isolation.
 */
export type FileDescriptor = {
  readonly kind: FileKind;
  readonly relativePath: string;
  readonly isImage: boolean;
  readonly isMarkdown: boolean;
  readonly isBrowserPreview: boolean;
  readonly isEditable: boolean;
};

// Lightweight extension tables. The full viewer is responsible for any
// language-specific behaviour; these checks are the floor.

const TEXT_LIKE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".php",
  ".lua",
  ".sql",
  ".env",
]);

const JSON_LIKE_EXTENSIONS = new Set([".json", ".jsonc", ".json5"]);

const SVG_EXTENSION = ".svg";
const PDF_EXTENSION = ".pdf";
const AUDIO_EXTENSION = /\.(?:mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
const VIDEO_EXTENSION = /\.(?:mp4|m4v|webm|mov|ogv)$/i;

const isTextLike = (relativePath: string): boolean => {
  const lower = relativePath.toLowerCase();
  for (const ext of JSON_LIKE_EXTENSIONS) {
    if (lower.endsWith(ext)) return false;
  }
  for (const ext of TEXT_LIKE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  // Files without an extension (Dockerfile, Makefile) or dotfiles (.gitignore,
  // .env) are text. A dotfile basename starts with `.` but has no inner dot.
  const basename = lower.split("/").pop() ?? lower;
  if (basename.length === 0) return false;
  if (!basename.includes(".")) return true;
  if (basename.startsWith(".")) {
    // .gitignore, .env, .eslintrc — everything after the leading dot is the
    // "name" with no real extension. Treat as text.
    return !basename.slice(1).includes(".");
  }
  return false;
};

const isJsonLike = (relativePath: string): boolean => {
  const lower = relativePath.toLowerCase();
  for (const ext of JSON_LIKE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
};

const isSvg = (relativePath: string): boolean => relativePath.toLowerCase().endsWith(SVG_EXTENSION);

const isPdf = (relativePath: string): boolean => relativePath.toLowerCase().endsWith(PDF_EXTENSION);

const isBrowserPreview = (relativePath: string): boolean =>
  /\.(?:html?|pdf)$/i.test(relativePath.split(/[?#]/, 1)[0] ?? "");

/**
 * Pure descriptor factory. The shell calls this once per open file; the
 * result is what gets handed to the registry. Order matters: more
 * specific kinds are tested first.
 */
export function describeFile(input: {
  readonly relativePath: string;
  readonly truncated: boolean;
  readonly isPreviewSupportedInRuntime: boolean;
}): FileDescriptor {
  const { relativePath, truncated, isPreviewSupportedInRuntime } = input;
  const isImage = isWorkspaceImagePreviewPath(relativePath);
  const isMarkdown = isMarkdownPreviewFile(relativePath);

  if (truncated) {
    return {
      kind: "truncated-text",
      relativePath,
      isImage,
      isMarkdown,
      isBrowserPreview: false,
      isEditable: false,
    };
  }
  // SVG gets its own kind even though it is also an "image" — the viewer
  // is text-aware and can toggle between rendered and source. We test SVG
  // before the generic image check so it wins the dispatch.
  if (isSvg(relativePath)) {
    return {
      kind: "svg",
      relativePath,
      isImage: true,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: true,
    };
  }
  if (isImage) {
    return {
      kind: "image",
      relativePath,
      isImage: true,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    };
  }
  if (isMarkdown) {
    return {
      kind: "markdown",
      relativePath,
      isImage: false,
      isMarkdown: true,
      isBrowserPreview: false,
      isEditable: true,
    };
  }
  if (AUDIO_EXTENSION.test(relativePath)) {
    return {
      kind: "audio",
      relativePath,
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    };
  }
  if (VIDEO_EXTENSION.test(relativePath)) {
    return {
      kind: "video",
      relativePath,
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    };
  }
  if (isPreviewSupportedInRuntime && isBrowserPreview(relativePath)) {
    return {
      kind: isPdf(relativePath) ? "pdf" : "browser-preview",
      relativePath,
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: true,
      isEditable: false,
    };
  }
  if (isJsonLike(relativePath)) {
    return {
      kind: "json",
      relativePath,
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: true,
    };
  }
  if (isTextLike(relativePath)) {
    return {
      kind: "text",
      relativePath,
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: true,
    };
  }
  return {
    kind: "unknown",
    relativePath,
    isImage: false,
    isMarkdown: false,
    isBrowserPreview: false,
    isEditable: false,
  };
}
