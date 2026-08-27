import { LoaderCircle, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { EnvironmentId, ScopedThreadRef, WorkspaceFileRef } from "@rune/contracts";

import { useAssetUrlState } from "~/assets/assetUrls";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

import {
  MAX_ZOOM,
  MIN_ZOOM,
  type Pan,
  clampZoom,
  nextPan,
  resetPan,
  stepZoom,
} from "./imageZoom.ts";

export type ImageViewerProps = {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly fileRef: WorkspaceFileRef;
  readonly relativePath: string;
};

/**
 * Image viewer. Renders the file via the asset URL (which keeps the
 * client off the absolute-path math) and adds:
 *  - zoom in / out / 1:1 toolbar buttons
 *  - pan via drag
 *  - Ctrl/Cmd+wheel zoom
 *  - a centered loading spinner while the asset URL is fetched
 *  - a destructive error surface if the URL fails or the image
 *    can't be decoded
 */
export function ImageViewer({
  environmentId,
  threadRef,
  fileRef,
  relativePath,
}: ImageViewerProps): ReactElement {
  const assetUrl = useAssetUrlState(environmentId, {
    _tag: "workspace-file",
    threadId: threadRef.threadId,
    ref: fileRef,
  });
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNaturalSize(null);
    setFailedUrl(null);
  }, [fileRef.relativePath]);

  if (assetUrl._tag === "Failure" || (assetUrl._tag === "Success" && failedUrl === assetUrl.url)) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-destructive">
        Couldn’t preview {relativePath}. The file exists, but its image data could not be decoded.
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

  const handleZoomIn = () => setZoom((z) => stepZoom(z, 1));
  const handleZoomOut = () => setZoom((z) => stepZoom(z, -1));
  const handleReset = () => {
    setZoom(1);
    setPan(resetPan());
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((z) => stepZoom(z, event.deltaY > 0 ? -1 : 1));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = pan;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const handleMove = (moveEvent: PointerEvent) => {
      setPan(nextPan({ x: startX, y: startY }, { x: moveEvent.clientX, y: moveEvent.clientY }, startPan));
    };
    const handleUp = () => {
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerup", handleUp);
      target.removeEventListener("pointercancel", handleUp);
    };
    target.addEventListener("pointermove", handleMove);
    target.addEventListener("pointerup", handleUp);
    target.addEventListener("pointercancel", handleUp);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-9 min-h-9 shrink-0 items-center gap-1 border-b border-border/60 bg-background/60 px-2"
        data-image-viewer-toolbar
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Zoom out"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ZoomOut className="size-3.5" />
              </button>
            }
          />
          <TooltipPopup>Zoom out</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset zoom"
                className="inline-flex h-7 items-center justify-center rounded-md px-1.5 text-[11px] tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {Math.round(zoom * 100)}%
              </button>
            }
          />
          <TooltipPopup>Reset to 1:1</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Zoom in"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ZoomIn className="size-3.5" />
              </button>
            }
          />
          <TooltipPopup>Zoom in</TooltipPopup>
        </Tooltip>
        {naturalSize !== null ? (
          <span
            className="ml-1 inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
            data-image-dimensions
          >
            <Maximize2 className="size-3" />
            {naturalSize.width.toLocaleString()}×{naturalSize.height.toLocaleString()}
          </span>
        ) : null}
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        onWheel={handleWheel}
        data-image-stage
      >
        <div
          className="flex h-full w-full items-center justify-center"
          onPointerDown={handlePointerDown}
          data-image-canvas
          style={{ cursor: zoom > 1 ? "grab" : "default" }}
        >
          <div
            data-image-frame
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${clampZoom(zoom)})`,
              transformOrigin: "center",
            }}
          >
            <img
              className="max-h-full max-w-full object-contain"
              src={assetUrl.url}
              alt={relativePath}
              onError={() => setFailedUrl(assetUrl.url)}
              onLoad={(event) => {
                const img = event.currentTarget;
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

void MIN_ZOOM;
void MAX_ZOOM;
