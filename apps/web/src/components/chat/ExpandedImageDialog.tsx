import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Button } from "../ui/button";
import type { ExpandedImagePreview } from "./ExpandedImagePreview";

interface ExpandedImageDialogProps {
  preview: ExpandedImagePreview;
  onClose: () => void;
}

export const ExpandedImageDialog = memo(function ExpandedImageDialog({
  preview,
  onClose,
}: ExpandedImageDialogProps) {
  const [imageOffset, setImageOffset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const index = (preview.index + imageOffset + preview.images.length) % preview.images.length;

  const navigateImage = useCallback((direction: -1 | 1) => {
    setImageOffset((current) => current + direction);
    setZoom(1);
  }, []);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (preview.images.length <= 1) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        navigateImage(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        navigateImage(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigateImage, onClose, preview.images.length]);

  const item = preview.images[index];
  if (!item) return null;
  const kind = item.kind ?? "image";
  const canZoom = kind === "image";
  const downloadUrl = item.downloadUrl ?? item.src;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-3 py-4 [-webkit-app-region:no-drag] sm:px-6 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${kind} preview`}
      onTouchStart={(event) => {
        touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartXRef.current;
        const endX = event.changedTouches[0]?.clientX;
        touchStartXRef.current = null;
        if (startX === null || endX === undefined || preview.images.length <= 1) return;
        const delta = endX - startX;
        if (Math.abs(delta) < 48) return;
        navigateImage(delta > 0 ? -1 : 1);
      }}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-zoom-out"
        aria-label="Close preview"
        onClick={onClose}
      />
      {preview.images.length > 1 ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 text-white/90 hover:bg-white/10 hover:text-white sm:left-6"
          aria-label="Previous preview"
          onClick={() => navigateImage(-1)}
        >
          <ChevronLeftIcon className="size-5" />
        </Button>
      ) : null}
      <div className="relative isolate z-10 max-h-[92vh] max-w-[92vw]">
        <Button
          ref={closeButtonRef}
          type="button"
          size="icon-xs"
          variant="ghost"
          className="absolute right-2 top-2 z-20 text-white/90 hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close preview"
        >
          <XIcon />
        </Button>
        <div
          key={`${item.src}:${index}`}
          className="rune-preview-media-enter flex max-h-[86vh] max-w-[92vw] flex-col items-center gap-3 rounded-xl border border-white/10 bg-black/35 p-2 shadow-2xl backdrop-blur-sm sm:p-3"
          style={{ transitionDuration: "var(--rune-motion-standard)" }}
        >
          <div className="flex max-h-[78vh] max-w-[88vw] items-center justify-center overflow-auto rounded-lg bg-black/30">
            {kind === "video" ? (
              <video
                className="max-h-[78vh] max-w-[88vw]"
                controls
                playsInline
                preload="metadata"
                src={item.src}
              />
            ) : kind === "audio" ? (
              <div className="flex min-h-36 min-w-[min(34rem,80vw)] items-center justify-center p-8">
                <audio controls preload="metadata" src={item.src} />
              </div>
            ) : kind === "document" ? (
              <iframe
                className="h-[78vh] w-[min(58rem,88vw)] rounded-md bg-white"
                src={item.src}
                title={item.name}
                sandbox="allow-same-origin"
              />
            ) : (
              <img
                src={item.src}
                alt={item.name}
                className="max-h-[78vh] max-w-[88vw] select-none object-contain transition-[transform] ease-out"
                style={{
                  transform: `scale(${zoom})`,
                  transitionDuration: "var(--rune-motion-fast)",
                }}
                draggable={false}
                onDoubleClick={() => setZoom((value) => (value === 1 ? 2 : 1))}
              />
            )}
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 px-1 text-white/80">
            <p className="min-w-0 flex-1 truncate text-xs" aria-label={item.name}>
              {item.name}
              {preview.images.length > 1 ? ` · ${index + 1}/${preview.images.length}` : ""}
            </p>
            {canZoom ? (
              <div className="flex shrink-0 items-center gap-0.5" aria-label="Image zoom controls">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
                  aria-label="Zoom out"
                >
                  <MinusIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
                  aria-label="Zoom in"
                >
                  <PlusIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setZoom(1)}
                  aria-label="Reset zoom"
                >
                  <RotateCcwIcon />
                </Button>
              </div>
            ) : null}
            <a
              href={downloadUrl}
              download={item.name}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
              aria-label={`Download ${item.name}`}
            >
              <DownloadIcon className="size-4" />
            </a>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => window.open(item.src, "_blank", "noopener,noreferrer")}
              aria-label="Open in new tab"
            >
              <Maximize2Icon />
            </Button>
          </div>
        </div>
      </div>
      {preview.images.length > 1 ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 text-white/90 hover:bg-white/10 hover:text-white sm:right-6"
          aria-label="Next preview"
          onClick={() => navigateImage(1)}
        >
          <ChevronRightIcon className="size-5" />
        </Button>
      ) : null}
    </div>
  );
});
