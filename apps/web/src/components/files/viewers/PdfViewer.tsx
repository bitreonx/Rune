import { ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { EnvironmentId, ScopedThreadRef, WorkspaceFileRef } from "@rune/contracts";

import { useAssetUrlState } from "~/assets/assetUrls";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

export type PdfViewerProps = {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly fileRef: WorkspaceFileRef;
  readonly relativePath: string;
  readonly openExternallyHref?: string;
};

/**
 * In-panel PDF viewer. Renders the file via an <iframe> against the
 * asset URL. Falls back to a "PDF preview not available" surface if
 * the browser can't render PDFs in iframes (e.g. headless tests) —
 * the "open externally" button is always present so the user has an
 * escape hatch.
 */
export function PdfViewer({
  environmentId,
  threadRef,
  fileRef,
  relativePath,
  openExternallyHref,
}: PdfViewerProps): ReactElement {
  const assetUrl = useAssetUrlState(environmentId, {
    _tag: "workspace-file",
    threadId: threadRef.threadId,
    ref: fileRef,
  });
  const [iframeFailed, setIframeFailed] = useState(false);
  useEffect(() => {
    setIframeFailed(false);
  }, [fileRef.relativePath]);

  if (assetUrl._tag === "Failure") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-xs leading-relaxed text-destructive">
        <div>Couldn’t preview {relativePath}.</div>
        {openExternallyHref !== undefined ? (
          <a
            href={openExternallyHref}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1 text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-3" />
            Open externally
          </a>
        ) : null}
      </div>
    );
  }

  if (assetUrl._tag !== "Success") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  }

  if (iframeFailed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-xs leading-relaxed text-muted-foreground">
        <div>PDF preview not available in this browser.</div>
        {openExternallyHref !== undefined ? (
          <a
            href={openExternallyHref}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1 text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-3" />
            Open externally
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-pdf-viewer>
      <div
        className="flex h-9 min-h-9 shrink-0 items-center gap-2 border-b border-border/60 bg-background/60 px-2"
        data-pdf-viewer-toolbar
      >
        <span className="text-[11px] text-muted-foreground" data-pdf-name>
          {relativePath}
        </span>
        {openExternallyHref !== undefined ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={openExternallyHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Open PDF externally"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              }
            />
            <TooltipPopup>Open externally</TooltipPopup>
          </Tooltip>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 bg-muted/30" data-pdf-stage>
        <iframe
          title={relativePath}
          src={assetUrl.url}
          className="h-full w-full"
          onError={() => setIframeFailed(true)}
        />
      </div>
    </div>
  );
}
