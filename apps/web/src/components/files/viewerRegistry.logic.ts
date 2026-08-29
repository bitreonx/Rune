import type { FileDescriptor, FileKind } from "./viewerDescriptor.ts";

export const ALL_KINDS: ReadonlyArray<FileKind> = [
  "image",
  "markdown",
  "browser-preview",
  "svg",
  "json",
  "pdf",
  "audio",
  "video",
  "truncated-text",
  "text",
  "code",
  "binary",
  "unknown",
];

/**
 * Pure kind-to-viewer routing. React components are attached by
 * viewerRegistry.tsx, while tests and non-UI callers can verify the entire
 * dispatch table without loading the browser-only viewer dependencies.
 */
export function selectViewerId(descriptor: FileDescriptor): string {
  switch (descriptor.kind) {
    case "image":
      return "image";
    case "markdown":
      return "markdown";
    case "svg":
      return "svg";
    case "json":
      return "json";
    case "audio":
    case "video":
      return "media";
    case "text":
    case "code":
      return "code";
    case "truncated-text":
      return "truncated-text";
    case "pdf":
      return "pdf";
    case "browser-preview":
      return "browser-preview";
    case "binary":
    case "unknown":
      return "binary-fallback";
  }
}
