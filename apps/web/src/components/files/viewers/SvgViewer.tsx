import { Code2, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

import { sanitizeSvg } from "./svgSanitizer.ts";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;

export type SvgViewerProps = {
  readonly contents: string;
  readonly resolvedTheme: "light" | "dark";
};

type Mode = "rendered" | "source";

/**
 * The SVG viewer renders the file two ways: the sanitized SVG inline,
 * or the original text source. The zoom state is local to the viewer;
 * the toolbar lives at the top so a user can flip modes without
 * hunting through context menus.
 */
export function SvgViewer({ contents, resolvedTheme: _resolvedTheme }: SvgViewerProps): ReactElement {
  const [mode, setMode] = useState<Mode>("rendered");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const sanitized = useMemo(() => sanitizeSvg(contents), [contents]);

  const totalDropped =
    sanitized.droppedScripts +
    sanitized.droppedEventHandlers +
    sanitized.droppedJavascriptUrls +
    sanitized.droppedDataUrls +
    sanitized.droppedForeignObjects;

  // Clamp the zoom on every change so the toolbar can't push past the
  // bounds. Reset pan when zoom drops to fit.
  useEffect(() => {
    setZoom((current) => clampZoom(current, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handleZoomIn = () => setZoom((z) => clampZoom(z * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  const handleZoomOut = () => setZoom((z) => clampZoom(z / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => clampZoom(z * direction, MIN_ZOOM, MAX_ZOOM));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = pan;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const handleMove = (moveEvent: PointerEvent) => {
      setPan({
        x: startPan.x + (moveEvent.clientX - startX),
        y: startPan.y + (moveEvent.clientY - startY),
      });
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
        data-svg-viewer-toolbar
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={mode === "rendered"}
                onPressedChange={(pressed) => setMode(pressed ? "rendered" : "source")}
                aria-label={mode === "rendered" ? "Show SVG source" : "Show rendered SVG"}
                variant="ghost"
                size="sm"
              >
                {mode === "rendered" ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
              </Toggle>
            }
          />
          <TooltipPopup>{mode === "rendered" ? "Show SVG source" : "Show rendered SVG"}</TooltipPopup>
        </Tooltip>
        {mode === "rendered" ? (
          <>
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
              <TooltipPopup>Reset zoom</TooltipPopup>
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
          </>
        ) : null}
        {totalDropped > 0 ? (
          <span
            className="ml-1 rounded bg-warning-surface px-1.5 py-0.5 text-[10px] text-warning-foreground"
            data-svg-sanitized-banner
          >
            Removed {totalDropped} unsafe {totalDropped === 1 ? "element" : "elements"}
          </span>
        ) : null}
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        onWheel={handleWheel}
        data-svg-viewer-stage
        data-svg-mode={mode}
      >
        {mode === "rendered" ? (
          <div
            className="flex h-full w-full items-center justify-center"
            onPointerDown={handlePointerDown}
            data-svg-canvas
            style={{ cursor: zoom > 1 ? "grab" : "default" }}
          >
            <div
              data-svg-frame
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
              // The SVG came from the local workspace, but we still
              // sanitize it (script, javascript:, on*) before injection.
              dangerouslySetInnerHTML={{ __html: sanitized.sanitized }}
            />
          </div>
        ) : (
          <pre
            className="h-full w-full overflow-auto p-3 font-mono text-[11px] leading-relaxed text-foreground"
            data-svg-source
          >
            {contents}
          </pre>
        )}
      </div>
    </div>
  );
}

function clampZoom(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
