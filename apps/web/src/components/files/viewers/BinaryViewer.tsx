import { FileQuestion, FolderOpen } from "lucide-react";
import type { ReactElement } from "react";

import { formatBytes } from "./formatBytes.ts";

export type BinaryViewerProps = {
  readonly contents: string;
  readonly byteLength?: number;
  readonly relativePath: string;
};

/**
 * Graceful fallback for files Rune can't preview: zip, tar, exe, etc.
 * Shows the filename, size, and an "open externally" affordance. The
 * toolbar's existing OpenInPicker (in FilePreviewPanel) gives the user
 * the actual editor picker; this is a static hint.
 */
export function BinaryViewer({
  contents,
  byteLength,
  relativePath,
}: BinaryViewerProps): ReactElement {
  const sizeLabel =
    byteLength === undefined && contents.length === 0
      ? "Size unavailable"
      : formatBytes(byteLength ?? contents.length);
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-xs leading-relaxed text-muted-foreground"
      data-binary-viewer
    >
      <FileQuestion className="size-8 text-muted-foreground/60" />
      <div>
        <div className="font-medium text-foreground" data-binary-name>
          {relativePath}
        </div>
        <div className="mt-1" data-binary-hint>
          Rune doesn&apos;t have a viewer for this file.
          {sizeLabel === "Size unavailable"
            ? " The file size is unavailable."
            : ` ${sizeLabel} of binary data.`}
        </div>
      </div>
      {sizeLabel !== "Size unavailable" ? (
        <div
          className="mt-1 inline-flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1 text-[11px] text-foreground/80"
          data-binary-size
        >
          <FolderOpen className="size-3" />
          {sizeLabel}
        </div>
      ) : null}
    </div>
  );
}
