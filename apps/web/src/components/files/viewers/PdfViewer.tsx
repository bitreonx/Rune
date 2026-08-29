import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { EnvironmentId, ScopedThreadRef, WorkspaceFileRef } from "@rune/contracts";

import { useAssetUrlState } from "~/assets/assetUrls";

export type PdfViewerProps = {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly fileRef: WorkspaceFileRef;
  readonly relativePath: string;
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
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-pdf-viewer>
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
