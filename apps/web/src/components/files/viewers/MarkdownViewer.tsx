import { Columns2, Code2, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";

import ChatMarkdown from "~/components/ChatMarkdown";
import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { ScrollArea } from "~/components/ui/scroll-area";

import { setMarkdownTaskChecked } from "../filePreviewMode.ts";
import {
  getOptimisticProjectFileQueryData,
  setProjectFileQueryData,
} from "../projectFilesQueryState.ts";
import { FileSaveCoordinator } from "../fileSaveCoordinator.ts";

export type MarkdownViewerProps = {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly relativePath: string;
  readonly contents: string;
  readonly threadRef: ScopedThreadRef;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
};

type Mode = "rendered" | "source" | "split";

const MODE_CYCLE: ReadonlyArray<Mode> = ["rendered", "source", "split"];

function nextMode(current: Mode): Mode {
  const index = MODE_CYCLE.indexOf(current);
  return MODE_CYCLE[(index + 1) % MODE_CYCLE.length];
}

/**
 * Markdown viewer with three modes: rendered, source, split. The
 * mode is local to the viewer; the toolbar in FilePreviewPanel
 * remains the only place that flips the rendered-vs-source default.
 *
 * The split mode renders the rendered surface and a source
 * (read-only) pre tag side by side, separated by a draggable
 * divider that snaps at 40/60.
 */
export function MarkdownViewer({
  environmentId,
  cwd,
  relativePath,
  contents,
  threadRef,
  onPendingChange,
}: MarkdownViewerProps): ReactElement {
  const [mode, setMode] = useState<Mode>("rendered");
  const [splitRatio, setSplitRatio] = useState(0.5);

  // The viewer's local coordinator is only used when the user
  // toggles a task list checkbox in the rendered surface. The
  // editor's coordinator (in FilePreviewPanel) owns the editable
  // source path; we don't fight it.
  const saveCoordinator = useMemo(
    () =>
      new FileSaveCoordinator({
        debounceMs: 500,
        onPendingChange: () => {},
        persist: () => Promise.resolve(),
        onConfirmed: () => {},
      }),
    [],
  );
  useEffect(() => () => saveCoordinator.dispose(), [saveCoordinator]);
  void onPendingChange;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-9 min-h-9 shrink-0 items-center gap-1 border-b border-border/60 bg-background/60 px-2"
        data-markdown-viewer-toolbar
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={mode === "rendered"}
                onPressedChange={(pressed) => {
                  if (pressed) setMode("rendered");
                  else if (mode === "rendered") setMode("source");
                }}
                aria-label="Rendered"
                variant="ghost"
                size="sm"
              >
                <Eye className="size-3.5" />
              </Toggle>
            }
          />
          <TooltipPopup>Rendered</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={mode === "source"}
                onPressedChange={(pressed) => {
                  if (pressed) setMode("source");
                  else if (mode === "source") setMode("split");
                }}
                aria-label="Source"
                variant="ghost"
                size="sm"
              >
                <Code2 className="size-3.5" />
              </Toggle>
            }
          />
          <TooltipPopup>Source</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={mode === "split"}
                onPressedChange={(pressed) => {
                  if (pressed) setMode("split");
                  else if (mode === "split") setMode("rendered");
                }}
                aria-label="Split"
                variant="ghost"
                size="sm"
              >
                <Columns2 className="size-3.5" />
              </Toggle>
            }
          />
          <TooltipPopup>Split</TooltipPopup>
        </Tooltip>
        <button
          type="button"
          onClick={() => setMode(nextMode(mode))}
          className="ml-1 hidden text-[11px] text-muted-foreground hover:text-foreground"
          data-markdown-mode-cycle
        >
          next: {nextMode(mode)}
        </button>
      </div>
      <div className="flex min-h-0 flex-1" data-markdown-stage data-markdown-mode={mode}>
        {mode === "rendered" ? (
          <ScrollArea className="min-h-0 flex-1">
            <ChatMarkdown
              text={contents}
              cwd={cwd}
              threadRef={threadRef}
              className="mx-auto max-w-4xl px-6 py-5"
              onTaskListChange={({ markerOffset, checked }) => {
                const currentContents =
                  getOptimisticProjectFileQueryData(environmentId, cwd, relativePath)?.contents ??
                  contents;
                const nextContents = setMarkdownTaskChecked(currentContents, markerOffset, checked);
                if (nextContents === currentContents) return;
                setProjectFileQueryData(environmentId, cwd, relativePath, nextContents);
                saveCoordinator.change(nextContents);
              }}
            />
          </ScrollArea>
        ) : null}
        {mode === "source" ? (
          <ScrollArea className="min-h-0 flex-1">
            <pre
              className="mx-auto max-w-4xl px-6 py-5 font-mono text-[11px] leading-relaxed text-foreground"
              data-markdown-source
            >
              {contents}
            </pre>
          </ScrollArea>
        ) : null}
        {mode === "split" ? (
          <SplitMarkdown
            contents={contents}
            cwd={cwd}
            threadRef={threadRef}
            relativePath={relativePath}
            environmentId={environmentId}
            splitRatio={splitRatio}
            onSplitRatioChange={setSplitRatio}
            onTaskToggle={(markerOffset, checked) => {
              const currentContents =
                getOptimisticProjectFileQueryData(environmentId, cwd, relativePath)?.contents ??
                contents;
              const nextContents = setMarkdownTaskChecked(currentContents, markerOffset, checked);
              if (nextContents === currentContents) return;
              setProjectFileQueryData(environmentId, cwd, relativePath, nextContents);
              saveCoordinator.change(nextContents);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function SplitMarkdown({
  contents,
  cwd,
  threadRef,
  relativePath,
  environmentId,
  splitRatio,
  onSplitRatioChange,
  onTaskToggle,
}: {
  readonly contents: string;
  readonly cwd: string;
  readonly threadRef: ScopedThreadRef;
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly splitRatio: number;
  readonly onSplitRatioChange: (next: number) => void;
  readonly onTaskToggle: (markerOffset: number, checked: boolean) => void;
}): ReactElement {
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startRatio = splitRatio;
    const target = event.currentTarget;
    const parent = target.parentElement;
    if (!parent) return;
    target.setPointerCapture(event.pointerId);
    const handleMove = (moveEvent: PointerEvent) => {
      const parentWidth = parent.getBoundingClientRect().width;
      if (parentWidth === 0) return;
      const deltaRatio = (moveEvent.clientX - startX) / parentWidth;
      onSplitRatioChange(Math.max(0.2, Math.min(0.8, startRatio + deltaRatio)));
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
    <div className="flex min-h-0 flex-1" data-markdown-split>
      <ScrollArea
        className="min-h-0"
        style={{ flex: `0 0 ${(splitRatio * 100).toFixed(2)}%` }}
        data-markdown-split-rendered
      >
        <ChatMarkdown
          text={contents}
          cwd={cwd}
          threadRef={threadRef}
          className="mx-auto max-w-3xl px-5 py-4"
          onTaskListChange={({ markerOffset, checked }) => onTaskToggle(markerOffset, checked)}
        />
      </ScrollArea>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(splitRatio * 100)}
        aria-valuemin={20}
        aria-valuemax={80}
        onPointerDown={handlePointerDown}
        className="w-1 shrink-0 cursor-col-resize bg-border/40 hover:bg-border"
        data-markdown-split-handle
      />
      <ScrollArea
        className="min-h-0 flex-1 border-l border-border/40"
        data-markdown-split-source
      >
        <pre
          className="mx-auto max-w-3xl px-5 py-4 font-mono text-[11px] leading-relaxed text-foreground"
          data-markdown-source
        >
          {contents}
        </pre>
      </ScrollArea>
      <span className="sr-only">
        {relativePath} split at {Math.round(splitRatio * 100)}% ({environmentId})
      </span>
    </div>
  );
}
