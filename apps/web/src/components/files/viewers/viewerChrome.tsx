import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { TriangleAlertIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAssetUrlState } from "~/assets/assetUrls";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

/**
 * Binary workspace previews load through signed asset URLs scoped to the
 * caller's own cwd (not the thread's project root — that mismatch is what
 * broke nested-workspace images). A `revision` counter busts the HTTP cache
 * after writes so agent-edited assets refresh immediately.
 */
export function useWorkspacePreviewAssetUrl(props: {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly cwd: string;
  readonly relativePath: string;
  readonly revision: number;
}) {
  const assetUrl = useAssetUrlState(props.environmentId, {
    _tag: "workspace-file",
    threadId: props.threadRef.threadId,
    cwd: props.cwd,
    path: props.relativePath.replaceAll("\\", "/"),
  });
  return useMemo(() => {
    if (assetUrl._tag !== "Success") return assetUrl;
    const cacheBust = props.revision > 0 ? `?v=${props.revision}` : "";
    return { ...assetUrl, url: `${assetUrl.url}${cacheBust}` };
  }, [assetUrl, props.revision]);
}

/** Canvas backgrounds for transparent media: checkerboard, light, or dark. */
export type ViewerCanvasBackground = "checker" | "light" | "dark";

const CHECKER_BACKGROUND_STYLE = {
  backgroundImage:
    "linear-gradient(45deg, color-mix(in srgb, currentColor 9%, transparent) 25%, transparent 25%)," +
    "linear-gradient(-45deg, color-mix(in srgb, currentColor 9%, transparent) 25%, transparent 25%)," +
    "linear-gradient(45deg, transparent 75%, color-mix(in srgb, currentColor 9%, transparent) 75%)," +
    "linear-gradient(-45deg, transparent 75%, color-mix(in srgb, currentColor 9%, transparent) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
} as const;

export function canvasBackgroundClassName(background: ViewerCanvasBackground): string {
  return cn(
    "transition-colors duration-150",
    background === "checker" && "text-foreground",
    background === "light" && "bg-neutral-150 dark:bg-neutral-200",
    background === "dark" && "bg-neutral-900",
  );
}

export function canvasBackgroundStyle(
  background: ViewerCanvasBackground,
): React.CSSProperties | undefined {
  return background === "checker" ? CHECKER_BACKGROUND_STYLE : undefined;
}

export function ViewerBackgroundToggle(props: {
  readonly value: ViewerCanvasBackground;
  readonly onChange: (value: ViewerCanvasBackground) => void;
}) {
  const options: ReadonlyArray<{ value: ViewerCanvasBackground; label: string }> = [
    { value: "checker", label: "Transparency checkerboard" },
    { value: "light", label: "Light background" },
    { value: "dark", label: "Dark background" },
  ];
  return (
    <div className="flex items-center rounded-md border border-border/60 p-0.5" role="group">
      {options.map((option) => (
        <Tooltip key={option.value}>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-pressed={props.value === option.value}
                aria-label={option.label}
                onClick={() => props.onChange(option.value)}
                className={cn(
                  "size-4 rounded-sm transition-colors",
                  props.value === option.value
                    ? "ring-1 ring-ring"
                    : "opacity-60 hover:opacity-100",
                  option.value === "checker" &&
                    "bg-[repeating-conic-gradient(color-mix(in_srgb,currentColor_30%,transparent)_0_25%,transparent_0_50%)] bg-[length:6px_6px] text-foreground",
                  option.value === "light" && "bg-neutral-200",
                  option.value === "dark" && "bg-neutral-800",
                )}
              />
            }
          />
          <TooltipPopup>{option.label}</TooltipPopup>
        </Tooltip>
      ))}
    </div>
  );
}

export function ViewerToolbarButton(props: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly pressed?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={props.label}
            aria-pressed={props.pressed}
            disabled={props.disabled}
            onClick={props.onClick}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipPopup>{props.label}</TooltipPopup>
    </Tooltip>
  );
}

/** Small zoom control cluster shared by the image and SVG viewers. */
export function ViewerZoomControls(props: {
  readonly zoom: number | null;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onActualSize: () => void;
  readonly onFit: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Zoom controls">
      <ViewerToolbarButton label="Zoom out" onClick={props.onZoomOut} disabled={props.zoom === null}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 11h6" />
        </svg>
      </ViewerToolbarButton>
      <span className="min-w-10 text-center text-[11px] tabular-nums text-muted-foreground">
        {props.zoom === null ? "Fit" : `${Math.round(props.zoom * 100)}%`}
      </span>
      <ViewerToolbarButton label="Zoom in" onClick={props.onZoomIn} disabled={props.zoom === null}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 11h6" />
          <path d="M11 8v6" />
        </svg>
      </ViewerToolbarButton>
      <ViewerToolbarButton label="Actual size" onClick={props.onActualSize}>
        <span className="text-[10px] font-medium">1:1</span>
      </ViewerToolbarButton>
      <ViewerToolbarButton label="Fit to window" onClick={props.onFit}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8V5a2 2 0 0 1 2-2h3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v3" />
          <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
          <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
        </svg>
      </ViewerToolbarButton>
    </div>
  );
}

/** A failed preview with an explanation and ways out — never a bare apology. */
export function ViewerLoadError(props: {
  readonly title: string;
  readonly message: string | null;
  readonly onRetry?: () => void;
  readonly onReveal?: () => void;
  readonly onOpenAsInfo?: () => void;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center p-6"
      data-viewer-error
      role="alert"
    >
      <div className="max-w-md text-center">
        <TriangleAlertIcon className="mx-auto mb-3 size-6 text-destructive/80" aria-hidden />
        <p className="text-sm font-medium text-foreground">{props.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {props.message ?? "The file exists, but its contents could not be displayed."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {props.onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={props.onRetry}>
              Retry
            </Button>
          ) : null}
          {props.onOpenAsInfo ? (
            <Button type="button" variant="outline" size="sm" onClick={props.onOpenAsInfo}>
              Open as file info
            </Button>
          ) : null}
          {props.onReveal ? (
            <Button type="button" variant="outline" size="sm" onClick={props.onReveal}>
              Reveal file
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Pan/zoom surface shared by image and SVG previews. Fit mode centers and
 * scales down only — small assets are never stretched blurry. Once the user
 * zooms or pans, explicit zoom mode drives crisp `image-rendering: pixelated`
 * scaling and drag panning.
 */
export function usePanZoomViewport(props: {
  readonly contentWidth: number | null;
  readonly contentHeight: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      setContainerSize({ w: container.clientWidth, h: container.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const fitScale = useMemo(() => {
    if (!containerSize || !props.contentWidth || !props.contentHeight) return null;
    return Math.min(1, containerSize.w / props.contentWidth, containerSize.h / props.contentHeight);
  }, [containerSize, props.contentHeight, props.contentWidth]);

  const reset = useCallback(() => {
    setZoom(null);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomAt = useCallback((nextZoom: number, anchor?: { x: number; y: number }) => {
    setZoom((current) => {
      const clamped = Math.min(32, Math.max(0.05, nextZoom));
      if (anchor && current !== null && current > 0) {
        const ratio = clamped / current;
        setOffset((offset) => ({
          x: offset.x * ratio,
          y: offset.y * ratio,
        }));
      }
      return clamped;
    });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((current) => {
      const base = current ?? fitScale ?? 1;
      return Math.min(32, base * 1.25);
    });
  }, [fitScale]);

  const zoomOut = useCallback(() => {
    setZoom((current) => {
      const base = current ?? fitScale ?? 1;
      return Math.max(0.05, base / 1.25);
    });
  }, [fitScale]);

  const actualSize = useCallback(() => setZoom(1), []);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const base = zoom ?? fitScale ?? 1;
      zoomAt(base * (event.deltaY < 0 ? 1.1 : 0.9));
    },
    [fitScale, zoom, zoomAt],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        baseX: offset.x,
        baseY: offset.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [offset.x, offset.y],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    setOffset({
      x: drag.baseX + (event.clientX - drag.startX),
      y: drag.baseY + (event.clientY - drag.startY),
    });
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const effectiveZoom = zoom ?? fitScale ?? 1;
  const isFit = zoom === null;

  return {
    containerRef,
    containerSize,
    zoom,
    isFit,
    effectiveZoom,
    offset,
    reset,
    zoomIn,
    zoomOut,
    zoomAt,
    actualSize,
    handlers: {
      onWheel: handleWheel,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
