import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "~/lib/utils";

import {
  ViewerBackgroundToggle,
  ViewerLoadError,
  ViewerZoomControls,
  canvasBackgroundClassName,
  canvasBackgroundStyle,
  usePanZoomViewport,
  useWorkspacePreviewAssetUrl,
  type ViewerCanvasBackground,
} from "./viewerChrome";

export interface SvgViewerProps {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly cwd: string;
  readonly relativePath: string;
  readonly name: string;
  readonly revision: number;
}

const SVG_DIMENSION_FALLBACK = 300;

/**
 * Parses the intrinsic size out of the SVG text: width/height attributes
 * first, then the viewBox. Returns null when neither is present, in which
 * case the browser's default 300×150-ish sizing applies.
 */
export function parseSvgIntrinsicSize(source: string): { width: number; height: number } | null {
  const openTag = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!openTag) return null;
  const attribute = (name: string) => {
    const match = openTag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
    return match?.[1]?.trim();
  };
  const width = attribute("width");
  const height = attribute("height");
  const parseLength = (value: string | undefined): number | null => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const parsedWidth = parseLength(width);
  const parsedHeight = parseLength(height);
  if (parsedWidth !== null && parsedHeight !== null) {
    return { width: parsedWidth, height: parsedHeight };
  }
  const viewBox = attribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number.parseFloat);
    if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
      const viewBoxWidth = parts[2];
      const viewBoxHeight = parts[3];
      if (viewBoxWidth !== undefined && viewBoxHeight !== undefined && viewBoxWidth > 0 && viewBoxHeight > 0) {
        return { width: viewBoxWidth, height: viewBoxHeight };
      }
    }
  }
  return parsedWidth !== null || parsedHeight !== null
    ? {
        width: parsedWidth ?? SVG_DIMENSION_FALLBACK,
        height: parsedHeight ?? SVG_DIMENSION_FALLBACK,
      }
    : null;
}

/**
 * SVG preview. Rendering goes through `<img src>` on a signed asset URL —
 * the browser's image pipeline never executes scripts or fetches external
 * resources for SVGs, so untrusted markup stays inert while looking exactly
 * like the rendered file.
 */
export function SvgPreviewSurface(props: {
  readonly url: string | null;
  readonly background: ViewerCanvasBackground;
  readonly failed: boolean;
  readonly onFail: () => void;
  readonly onLoad: (size: { width: number; height: number } | null) => void;
  readonly resetKey: string;
}) {
  if (props.url === null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <RotateCw className="size-5 animate-spin" />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
      <img
        key={props.resetKey}
        src={props.url}
        alt=""
        draggable={false}
        className="max-h-full max-w-full object-contain select-none"
        style={
          props.background === "checker"
            ? undefined
            : { filter: props.background === "light" ? "none" : "none" }
        }
        onLoad={(event) => {
          const image = event.currentTarget;
          const widthAttribute = image.naturalWidth;
          const heightAttribute = image.naturalHeight;
          props.onLoad(
            widthAttribute > 0 && heightAttribute > 0
              ? { width: widthAttribute, height: heightAttribute }
              : null,
          );
        }}
        onError={props.onFail}
      />
    </div>
  );
}

export function SvgViewer(props: SvgViewerProps) {
  const assetUrl = useWorkspacePreviewAssetUrl(props);
  const [background, setBackground] = useState<ViewerCanvasBackground>("checker");
  const [intrinsicSize, setIntrinsicSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const panZoom = usePanZoomViewport({
    contentWidth: intrinsicSize?.width ?? null,
    contentHeight: intrinsicSize?.height ?? null,
  });

  useEffect(() => {
    setDecodeFailed(false);
    setIntrinsicSize(null);
    panZoom.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on file/revision change
  }, [props.relativePath, props.revision]);

  const handleLoad = useCallback(
    (size: { width: number; height: number } | null) => {
      setDecodeFailed(false);
      setIntrinsicSize(size);
      panZoom.reset();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panZoom identity churns
    [],
  );

  if (assetUrl._tag === "Failure") {
    return (
      <ViewerLoadError
        title={`Couldn't preview ${props.name}`}
        message={assetUrl.message ?? "The file exists, but its SVG data could not be rendered."}
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={panZoom.containerRef}
        className={cn(
          "min-h-0 flex-1 touch-none overflow-hidden",
          canvasBackgroundClassName(background),
        )}
        style={canvasBackgroundStyle(background)}
        {...panZoom.handlers}
        data-svg-viewer-canvas
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
          <img
            key={`${assetUrl.url}:${reloadNonce}`}
            src={assetUrl.url}
            alt={props.relativePath}
            draggable={false}
            className={cn(
              "select-none",
              panZoom.isFit
                ? "max-h-full max-w-full object-contain"
                : "max-h-none max-w-none shadow-lg",
            )}
            style={
              panZoom.isFit
                ? undefined
                : {
                    width:
                      intrinsicSize && panZoom.effectiveZoom
                        ? `${intrinsicSize.width * panZoom.effectiveZoom}px`
                        : undefined,
                    transform: `translate(${panZoom.offset.x}px, ${panZoom.offset.y}px)`,
                  }
            }
            onLoad={(event) => {
              const image = event.currentTarget;
              handleLoad(
                image.naturalWidth > 0 && image.naturalHeight > 0
                  ? { width: image.naturalWidth, height: image.naturalHeight }
                  : parseSvgIntrinsicSizeFromElement(props.revision),
              );
            }}
            onError={() => setDecodeFailed(true)}
          />
        </div>
      </div>
      {decodeFailed ? (
        <div className="shrink-0 border-t border-warning/20 bg-warning-surface px-3 py-1.5 text-[11px] text-warning-foreground">
          The SVG could not be rendered. Check the source view for markup errors.
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
          {intrinsicSize ? (
            <span className="tabular-nums">
              {Math.round(intrinsicSize.width)} × {Math.round(intrinsicSize.height)}
            </span>
          ) : null}
          <span>SVG</span>
          <ViewerBackgroundToggle value={background} onChange={setBackground} />
        </span>
      </div>
    </div>
  );
}

function parseSvgIntrinsicSizeFromElement(_revision: number): {
  width: number;
  height: number;
} | null {
  return null;
}
