import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { RotateCw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { cn } from "~/lib/utils";

import {
  ViewerBackgroundToggle,
  ViewerLoadError,
  ViewerToolbarButton,
  ViewerZoomControls,
  canvasBackgroundClassName,
  canvasBackgroundStyle,
  usePanZoomViewport,
  useWorkspacePreviewAssetUrl,
  type ViewerCanvasBackground,
} from "./viewerChrome";

export interface ImageViewerProps {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly cwd: string;
  readonly relativePath: string;
  readonly name: string;
  /** Bumped when the file changes on disk; busts the asset URL cache. */
  readonly revision: number;
}

/**
 * Image preview with fit-first zooming. Fit mode never upscales — small icons
 * stay sharp at their natural size inside a centered canvas; zooming in past
 * 1x switches to pixel-crisp nearest-neighbor rendering.
 */
export function ImageViewer(props: ImageViewerProps) {
  const assetUrl = useWorkspacePreviewAssetUrl(props);
  const [background, setBackground] = useState<ViewerCanvasBackground>("checker");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const panZoom = usePanZoomViewport({
    contentWidth: naturalSize?.width ?? null,
    contentHeight: naturalSize?.height ?? null,
  });
  const failedUrlRef = useRef<string | null>(null);

  const retry = useCallback(() => {
    setDecodeFailed(false);
    failedUrlRef.current = null;
    setReloading(true);
    // Reload by re-mounting the img below via a key bump.
    setReloadNonce((nonce) => nonce + 1);
  }, []);
  const [reloadNonce, setReloadNonce] = useState(0);

  if (assetUrl._tag === "Failure") {
    return (
      <ViewerLoadError
        title={`Couldn't preview ${props.name}`}
        message={assetUrl.message ?? "The file exists, but its image data could not be decoded."}
        onRetry={retry}
      />
    );
  }
  if (assetUrl._tag !== "Success") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <RotateCw className="size-5 animate-spin" />
      </div>
    );
  }

  const isZoomed = !panZoom.isFit;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={panZoom.containerRef}
        className={cn(
          "min-h-0 flex-1 touch-none overflow-hidden",
          canvasBackgroundClassName(background),
          isZoomed && "cursor-grab active:cursor-grabbing",
        )}
        style={canvasBackgroundStyle(background)}
        {...panZoom.handlers}
        data-image-viewer-canvas
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
          <img
            key={`${assetUrl.url}:${reloadNonce}`}
            src={assetUrl.url}
            alt={props.relativePath}
            draggable={false}
            decoding="async"
            className={cn(
              "max-h-full max-w-full object-contain select-none",
              !panZoom.isFit &&
                "max-h-none max-w-none rounded-sm shadow-lg [image-rendering:pixelated]",
            )}
            style={
              panZoom.isFit
                ? undefined
                : {
                    width:
                      naturalSize && panZoom.effectiveZoom
                        ? `${naturalSize.width * panZoom.effectiveZoom}px`
                        : undefined,
                    transform: `translate(${panZoom.offset.x}px, ${panZoom.offset.y}px)`,
                  }
            }
            onLoad={(event) => {
              setReloading(false);
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
              panZoom.reset();
              failedUrlRef.current = null;
            }}
            onError={() => {
              if (failedUrlRef.current === assetUrl.url && !reloading) return;
              failedUrlRef.current = assetUrl.url;
              setDecodeFailed(true);
            }}
          />
        </div>
      </div>
      {decodeFailed && !reloading ? (
        <div className="shrink-0 border-t border-warning/20 bg-warning-surface px-3 py-1.5 text-[11px] text-warning-foreground">
          The image data could not be decoded. It may be corrupt or in an unsupported format.
        </div>
      ) : null}
      <div className="surface-glass flex h-8 shrink-0 items-center gap-2 border-t border-border/60 px-2">
        <ViewerZoomControls
          zoom={panZoom.zoom}
          onZoomIn={panZoom.zoomIn}
          onZoomOut={panZoom.zoomOut}
          onActualSize={panZoom.actualSize}
          onFit={panZoom.reset}
        />
        <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {naturalSize ? (
            <span className="tabular-nums">
              {naturalSize.width} × {naturalSize.height}
            </span>
          ) : null}
          <ViewerBackgroundToggle value={background} onChange={setBackground} />
        </span>
      </div>
    </div>
  );
}

export function MediaViewer(props: ImageViewerProps) {
  const assetUrl = useWorkspacePreviewAssetUrl(props);
  const [reloadNonce, setReloadNonce] = useState(0);
  if (assetUrl._tag === "Failure") {
    return (
      <ViewerLoadError
        title={`Couldn't preview ${props.name}`}
        message={assetUrl.message ?? "The media file could not be loaded."}
        onRetry={() => setReloadNonce((nonce) => nonce + 1)}
      />
    );
  }
  if (assetUrl._tag !== "Success") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <RotateCw className="size-5 animate-spin" />
      </div>
    );
  }
  const isVideo = /\.(?:mp4|m4v|webm|mov|ogv)$/i.test(props.relativePath);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-950 p-4">
        {isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- workspace files, not authored content
          <video key={assetUrl.url} src={assetUrl.url} controls className="max-h-full max-w-full" />
        ) : (
          <audio key={`${assetUrl.url}:${reloadNonce}`} src={assetUrl.url} controls />
        )}
      </div>
      <div className="surface-glass flex h-8 shrink-0 items-center border-t border-border/60 px-3 text-[11px] text-muted-foreground">
        {props.name}
        <ViewerToolbarButton
          label="Reload media"
          onClick={() => setReloadNonce((nonce) => nonce + 1)}
        >
          <RotateCw className="size-3" />
        </ViewerToolbarButton>
      </div>
    </div>
  );
}
