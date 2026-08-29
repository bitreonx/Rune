import { Clipboard, ExternalLink, FileQuestion, FolderOpen } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "~/components/ui/button";

import { formatBytes } from "./formatBytes.ts";

export type BinaryViewerProps = {
  readonly contents: string;
  readonly byteLength?: number;
  readonly mimeType?: string;
  readonly modifiedAt?: string;
  readonly relativePath: string;
  readonly sha256?: string;
  readonly onRevealInFiles?: () => void;
  readonly onRevealInExplorer?: () => void;
  readonly onCopyPath?: () => void;
};

/**
 * Graceful fallback for files Rune can't preview: zip, tar, exe, etc.
 * Shows deterministic metadata and safe reveal affordances. Executables are
 * never opened or run by this surface.
 */
export function BinaryViewer({
  contents,
  byteLength,
  mimeType,
  modifiedAt,
  relativePath,
  sha256,
  onRevealInFiles,
  onRevealInExplorer,
  onCopyPath,
}: BinaryViewerProps): ReactElement {
  const sizeLabel = byteLength === undefined ? null : formatBytes(byteLength ?? contents.length);
  const typeLabel = mimeType?.trim() || "Binary file";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-auto px-6 py-8 text-center text-xs leading-relaxed text-muted-foreground"
      data-binary-viewer
    >
      <FileQuestion className="size-8 text-muted-foreground/60" />
      <div>
        <div className="font-medium text-foreground" data-binary-name>
          {relativePath}
        </div>
        <div className="mt-1" data-binary-hint>
          Rune doesn&apos;t have a viewer for this file. It is safe to reveal or copy its path.
        </div>
      </div>
      <dl
        className="grid w-full max-w-md grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-[11px]"
        data-binary-metadata
      >
        <dt className="text-muted-foreground">Type</dt>
        <dd className="min-w-0 truncate text-foreground" title={typeLabel}>
          {typeLabel}
        </dd>
        <dt className="text-muted-foreground">Size</dt>
        <dd className="text-foreground" data-binary-size>
          {sizeLabel ?? "Unknown"}
        </dd>
        {modifiedAt ? (
          <>
            <dt className="text-muted-foreground">Modified</dt>
            <dd className="truncate text-foreground" title={modifiedAt}>
              <time dateTime={modifiedAt}>{modifiedAt}</time>
            </dd>
          </>
        ) : null}
        {sha256 ? (
          <>
            <dt className="text-muted-foreground">SHA-256</dt>
            <dd className="break-all font-mono text-foreground">{sha256}</dd>
          </>
        ) : null}
      </dl>
      {onRevealInFiles || onRevealInExplorer || onCopyPath ? (
        <div className="flex flex-wrap items-center justify-center gap-2" data-binary-actions>
          {onRevealInFiles ? (
            <Button variant="outline" size="compact" onClick={onRevealInFiles}>
              <FolderOpen className="size-3.5" />
              Reveal in RUNE Files
            </Button>
          ) : null}
          {onRevealInExplorer ? (
            <Button variant="outline" size="compact" onClick={onRevealInExplorer}>
              <ExternalLink className="size-3.5" />
              Reveal in system Explorer
            </Button>
          ) : null}
          {onCopyPath ? (
            <Button variant="ghost-muted" size="compact" onClick={onCopyPath}>
              <Clipboard className="size-3.5" />
              Copy path
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
