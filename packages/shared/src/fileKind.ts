import type { EnvironmentId } from "@rune/contracts";

/**
 * One classification for every workspace file, shared by the server (asset
 * serving, search filters) and every client surface (viewer selection, tree
 * icons). The kind is derived from the path alone so both sides agree on a
 * file's identity before any bytes move.
 */
export type WorkspaceFileKind =
  | "markdown"
  | "svg"
  | "image"
  | "json"
  | "pdf"
  | "html"
  | "audio"
  | "video"
  | "text"
  | "code"
  | "binary"
  | "unknown";

const KIND_BY_EXTENSION: Readonly<Record<string, WorkspaceFileKind>> = (() => {
  const entries: Array<readonly [readonly string[], WorkspaceFileKind]> = [
    [["md", "markdown", "mdx"], "markdown"],
    [["svg"], "svg"],
    [["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif"], "image"],
    [["json", "jsonc"], "json"],
    [["pdf"], "pdf"],
    [["html", "htm"], "html"],
    [["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus"], "audio"],
    [["mp4", "m4v", "webm", "mov", "ogv"], "video"],
    [
      [
        "txt",
        "log",
        "csv",
        "env",
        "gitignore",
        "gitattributes",
        "editorconfig",
        "npmrc",
        "nvmrc",
        "lock",
      ],
      "text",
    ],
    [
      [
        "ts",
        "tsx",
        "js",
        "jsx",
        "mjs",
        "cjs",
        "mts",
        "cts",
        "css",
        "scss",
        "sass",
        "less",
        "styl",
        "py",
        "pyi",
        "rb",
        "rs",
        "go",
        "java",
        "kt",
        "kts",
        "swift",
        "c",
        "h",
        "cpp",
        "cc",
        "cxx",
        "hpp",
        "hh",
        "cs",
        "php",
        "sh",
        "bash",
        "zsh",
        "fish",
        "ps1",
        "psm1",
        "bat",
        "cmd",
        "sql",
        "graphql",
        "gql",
        "prisma",
        "yml",
        "yaml",
        "toml",
        "ini",
        "conf",
        "cfg",
        "astro",
        "vue",
        "svelte",
        "dart",
        "lua",
        "pl",
        "r",
        "scala",
        "groovy",
        "gradle",
        "cmake",
        "mk",
        "dockerfile",
        "containerfile",
        "hcl",
        "tf",
        "proto",
        "zig",
        "ex",
        "exs",
        "erl",
        "hs",
        "ml",
        "clj",
        "lisp",
        "fs",
        "elm",
        "gd",
        "godot",
      ],
      "code",
    ],
    [
      [
        "exe",
        "dll",
        "so",
        "dylib",
        "a",
        "o",
        "obj",
        "bin",
        "dat",
        "wasm",
        "class",
        "jar",
        "war",
        "apk",
        "dmg",
        "pkg",
        "deb",
        "rpm",
        "msi",
        "app",
        "iso",
        "img",
        "zip",
        "tar",
        "gz",
        "tgz",
        "bz2",
        "xz",
        "7z",
        "rar",
        "zst",
        "woff",
        "woff2",
        "ttf",
        "otf",
        "eot",
        "db",
        "sqlite",
        "sqlite3",
        "mdb",
        "psd",
        "ai",
        "eps",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "odt",
        "ods",
      ],
      "binary",
    ],
  ];
  const kinds: Record<string, WorkspaceFileKind> = {};
  for (const [extensions, kind] of entries) {
    for (const extension of extensions) {
      kinds[extension] = kind;
    }
  }
  return kinds;
})();

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  svg: "image/svg+xml",
  md: "text/markdown",
  markdown: "text/markdown",
  mdx: "text/markdown",
  json: "application/json",
  jsonc: "application/json",
  pdf: "application/pdf",
  html: "text/html",
  htm: "text/html",
  txt: "text/plain",
  csv: "text/csv",
  log: "text/plain",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  opus: "audio/opus",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  wasm: "application/wasm",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  "7z": "application/x-7z-compressed",
};

/** Lowercase extension without the leading dot; "" for dotfiles like `.gitignore`. */
export function workspaceFileExtension(path: string): string {
  const fileName = path.replaceAll("\\", "/").split("/").pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function workspaceFileBaseName(path: string): string {
  return path.replaceAll("\\", "/").split("/").pop() ?? path;
}

export function classifyWorkspaceFile(path: string): WorkspaceFileKind {
  const extension = workspaceFileExtension(path);
  if (extension !== "") return KIND_BY_EXTENSION[extension] ?? "unknown";
  // Extensionless entries that still deserve a kind of their own.
  const fileName = workspaceFileBaseName(path).toLowerCase();
  if (fileName === "dockerfile" || fileName === "containerfile") return "code";
  if (fileName === "license" || fileName === "notice" || fileName === "authors") return "text";
  return "unknown";
}

/** A best-effort MIME label for display; unknown extensions report their raw extension. */
export function workspaceFileMimeType(path: string): string {
  return MIME_BY_EXTENSION[workspaceFileExtension(path)] ?? "";
}

export function isWorkspaceTextFileKind(kind: WorkspaceFileKind): boolean {
  return (
    kind === "text" ||
    kind === "code" ||
    kind === "markdown" ||
    kind === "json" ||
    kind === "html" ||
    kind === "svg" ||
    // Unknowns are worth a text read: they decode as UTF-8 more often than not.
    kind === "unknown"
  );
}

/**
 * The canonical workspace file identity. Every surface that names a file —
 * explorer, viewers, editor, asset URLs, diffs, mentions — should carry this
 * triple rather than a bare path, so `apps/web/src/a.png` and an absolute
 * `D:\apps\web\src\a.png` can never drift into meaning two different files.
 */
export interface WorkspaceFileRef {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly relativePath: string;
}

export function workspaceFileRefKey(ref: WorkspaceFileRef): string {
  return `${ref.environmentId}\n${ref.cwd}\n${ref.relativePath.replaceAll("\\", "/")}`;
}

/**
 * A file descriptor enriches the identity with everything derived from the
 * path, so viewers never re-derive classification from raw strings.
 */
export interface WorkspaceFileDescriptor {
  readonly ref: WorkspaceFileRef;
  readonly name: string;
  readonly extension: string;
  readonly kind: WorkspaceFileKind;
  readonly mime: string;
}

export function describeWorkspaceFile(ref: WorkspaceFileRef): WorkspaceFileDescriptor {
  const normalizedPath = ref.relativePath.replaceAll("\\", "/");
  return {
    ref: { ...ref, relativePath: normalizedPath },
    name: workspaceFileBaseName(normalizedPath),
    extension: workspaceFileExtension(normalizedPath),
    kind: classifyWorkspaceFile(normalizedPath),
    mime: workspaceFileMimeType(normalizedPath),
  };
}
