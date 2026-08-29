import type { WorkspaceFileKind } from "@rune/shared/fileKind";

import { formatBytes } from "./formatBytes.ts";

const KIND_LABELS: Readonly<
  Record<WorkspaceFileKind | "browser-preview" | "truncated-text", string>
> = {
  markdown: "Markdown",
  svg: "SVG",
  image: "Image",
  json: "JSON",
  pdf: "PDF",
  html: "HTML",
  audio: "Audio",
  video: "Video",
  text: "Text",
  code: "Code",
  binary: "Binary",
  unknown: "File",
  "browser-preview": "Browser preview",
  "truncated-text": "Text preview",
};

export function viewerKindLabel(kind: WorkspaceFileKind | "browser-preview" | "truncated-text") {
  return KIND_LABELS[kind];
}

export function viewerMetadataLabel(input: {
  readonly kind: WorkspaceFileKind | "browser-preview" | "truncated-text";
  readonly mime?: string;
  readonly byteLength?: number;
}) {
  const type = viewerKindLabel(input.kind);
  const mime = input.mime?.trim();
  const size = input.byteLength === undefined ? null : formatBytes(input.byteLength);
  return [type, mime && mime !== type ? mime : null, size].filter(Boolean).join(" · ");
}
