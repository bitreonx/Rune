import type { ReactElement } from "react";

export type TruncatedTextViewerProps = {
  readonly contents: string;
  readonly relativePath: string;
  readonly byteLength?: number;
  readonly resolvedTheme: "light" | "dark";
};

/**
 * Read-only viewer for files larger than the size cap. The shell
 * hands the first 1 MB of content here; the viewer shows it as a
 * monospace pre tag with a "preview limited" banner.
 */
export function TruncatedTextViewer({
  contents,
  relativePath,
  byteLength,
  resolvedTheme: _resolvedTheme,
}: TruncatedTextViewerProps): ReactElement {
  const totalLabel = byteLength !== undefined ? byteLength.toLocaleString() : "?";
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-truncated-text-viewer>
      <div
        className="flex h-9 min-h-9 shrink-0 items-center gap-2 border-b border-warning/30 bg-warning-surface px-2 text-[11px] text-warning-foreground"
        data-truncated-banner
      >
        Preview limited to the first 1 MB of a {totalLabel} byte file.
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3" data-truncated-stage>
        <pre
          className="font-mono text-[11px] leading-relaxed text-foreground"
          data-truncated-source
        >
          {contents}
        </pre>
      </div>
    </div>
  );
}
