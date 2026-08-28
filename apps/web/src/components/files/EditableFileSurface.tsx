import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { VirtualizedFile, type SelectedLineRange } from "@pierre/diffs";
import { Editor } from "@pierre/diffs/editor";
import { EditProvider, File, FileOptions, Virtualizer } from "@pierre/diffs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toastManager } from "~/components/ui/toast";
import ChatMarkdown from "~/components/ChatMarkdown";
import { DIFF_SURFACE_THEME_UNSAFE_CSS, resolveDiffThemeName } from "~/lib/diffRendering";
import { isMacPlatform } from "~/lib/utils";
import { ScrollArea } from "~/components/ui/scroll-area";
import { type DraftId, useComposerDraftStore } from "~/composerDraftStore";
import { useComposerHandleContext } from "~/composerHandleContext";
import { buildFileReviewComment } from "~/reviewCommentContext";
import { projectEnvironment } from "~/state/projects";
import { useAtomCommand } from "~/state/use-atom-command";

import {
  type FileCommentAnnotationEntry,
  type FileCommentAnnotationGroup,
  type FileCommentLineAnnotation,
  formatFileCommentRange,
  nextFileCommentId,
  normalizeFileCommentRange,
  remapFileCommentAnnotations,
} from "./fileCommentAnnotations";
import { installFileEditorDismissal } from "./fileEditorDismissal";
import { FileChangesSurface } from "./FileChangesSurface";
import { FileEditorToolbar } from "./FileEditorToolbar";
import { DiffCommentAnnotation } from "../diffs/DiffCommentAnnotation";
import { projectFileEditorCacheKey } from "./fileContentRevision";
import { buildFileSelectionMention } from "./fileSelectionMention";
import { setMarkdownTaskChecked } from "./filePreviewMode";
import { FileSaveCoordinator } from "./fileSaveCoordinator";
import {
  confirmProjectFileQueryData,
  getOptimisticProjectFileQueryData,
  setProjectFileQueryData,
} from "./projectFilesQueryState";

export const FILE_LINK_REVEAL_ATTRIBUTE = "data-file-link-reveal";
export const FILE_LINK_REVEAL_UNSAFE_CSS = `
  ${DIFF_SURFACE_THEME_UNSAFE_CSS}

  diffs-container {
    --diffs-bg: var(--code-background, var(--background)) !important;
    --diffs-light-bg: var(--code-background, var(--background)) !important;
    --diffs-dark-bg: var(--code-background, var(--background)) !important;
    background-color: var(--code-background, var(--background)) !important;
    color: var(--code-foreground, var(--foreground)) !important;
  }

  [${FILE_LINK_REVEAL_ATTRIBUTE}][data-line] {
    background-color: light-dark(
      color-mix(
        in lab,
        var(--diffs-computed-diff-line-bg) 82%,
        var(--diffs-bg-selection-override, var(--diffs-selection-base))
      ),
      color-mix(
        in lab,
        var(--diffs-computed-diff-line-bg) 75%,
        var(--diffs-bg-selection-override, var(--diffs-selection-base))
      )
    ) !important;
  }

  [${FILE_LINK_REVEAL_ATTRIBUTE}][data-column-number] {
    background-color: light-dark(
      color-mix(
        in lab,
        var(--diffs-computed-diff-line-bg) 75%,
        var(--diffs-bg-selection-override, var(--diffs-selection-base))
      ),
      color-mix(
        in lab,
        var(--diffs-computed-diff-line-bg) 60%,
        var(--diffs-bg-selection-override, var(--diffs-selection-base))
      )
    ) !important;
    color: var(--diffs-selection-number-fg) !important;
  }
`;

export const FILE_SAVE_DEBOUNCE_MS = 500;

export interface EditableFileSurfaceProps {
  environmentId: EnvironmentId;
  cwd: string;
  relativePath: string;
  composerDraftTarget: ScopedThreadRef | DraftId;
  contents: string;
  resolvedTheme: "light" | "dark";
  revealRequestId: number;
  wordWrap: boolean;
  onPostRender: FilePostRender;
  onPendingChange: (relativePath: string, pending: boolean) => void;
}

export type FilePostRender = NonNullable<FileOptions<unknown>["onPostRender"]>;

export interface FileSelectionOverride {
  revealRequestId: number;
  range: SelectedLineRange | null;
}

export function useFileSaveCoordinator({
  environmentId,
  cwd,
  relativePath,
  onPendingChange,
}: Pick<
  EditableFileSurfaceProps,
  "environmentId" | "cwd" | "relativePath" | "onPendingChange"
>): {
  coordinator: FileSaveCoordinator;
  isPending: boolean;
} {
  const writeFile = useAtomCommand(projectEnvironment.writeFile);
  const [isPending, setIsPending] = useState(false);
  const coordinator = useMemo(
    () =>
      new FileSaveCoordinator({
        debounceMs: FILE_SAVE_DEBOUNCE_MS,
        onPendingChange: (pending) => {
          setIsPending(pending);
          onPendingChange(relativePath, pending);
        },
        persist: (nextContents) =>
          writeFile({
            environmentId,
            input: { cwd, relativePath, contents: nextContents },
          }),
        onConfirmed: (confirmedContents) => {
          confirmProjectFileQueryData(environmentId, cwd, relativePath, confirmedContents);
        },
      }),
    [cwd, environmentId, onPendingChange, relativePath, writeFile],
  );

  useEffect(() => () => coordinator.dispose(), [coordinator]);
  return { coordinator, isPending };
}

export function EditableFileSurface({
  environmentId,
  cwd,
  relativePath,
  composerDraftTarget,
  contents,
  resolvedTheme,
  revealRequestId,
  wordWrap,
  onPostRender,
  onPendingChange,
}: EditableFileSurfaceProps) {
  const addReviewComment = useComposerDraftStore((store) => store.addReviewComment);
  const removeReviewComment = useComposerDraftStore((store) => store.removeReviewComment);
  const composerRef = useComposerHandleContext();
  const [lineAnnotations, setLineAnnotations] = useState<FileCommentLineAnnotation[]>([]);
  const [selectionOverride, setSelectionOverride] = useState<FileSelectionOverride | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [changesOpen, setChangesOpen] = useState(false);
  const selectedRange =
    selectionOverride?.revealRequestId === revealRequestId ? selectionOverride.range : null;
  const setSelectedRange = useCallback(
    (range: SelectedLineRange | null) => {
      setSelectionOverride({ revealRequestId, range });
    },
    [revealRequestId],
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const selectionFrameRef = useRef<number | null>(null);
  const fileContainerRef = useRef<HTMLElement | null>(null);
  const { coordinator: saveCoordinator, isPending } = useFileSaveCoordinator({
    environmentId,
    cwd,
    relativePath,
    onPendingChange,
  });
  const editor = useMemo(() => {
    const instance = new Editor<FileCommentAnnotationGroup>({
      persistState: true,
      persistStateStorage: "inMemory",
      // Undo/redo also land here, so history-state tracking rides along.
      onChange: (file, nextLineAnnotations) => {
        setHistoryState({ canUndo: instance.canUndo, canRedo: instance.canRedo });
        setProjectFileQueryData(environmentId, cwd, relativePath, file.contents);
        saveCoordinator.change(file.contents);
        if (nextLineAnnotations) {
          const remapped = remapFileCommentAnnotations(
            nextLineAnnotations as FileCommentLineAnnotation[],
          );
          setLineAnnotations(remapped);
          for (const annotation of remapped) {
            for (const entry of annotation.metadata.entries) {
              if (entry.kind !== "comment") continue;
              addReviewComment(
                composerDraftTarget,
                buildFileReviewComment({
                  id: entry.id,
                  filePath: relativePath,
                  startLine: entry.startLine,
                  endLine: entry.endLine,
                  text: entry.text,
                  contents: file.contents,
                }),
              );
            }
          }
        }
      },
      enabledSelectionAction: true,
      renderSelectionAction: (context) => {
        const wrap = document.createElement("div");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Add to chat";
        // Inline styles rather than Tailwind classes: this renders inside
        // the editor's shadow DOM, which global stylesheets cannot reach.
        button.style.cssText = [
          "font-family: var(--font-sans)",
          "font-size: 11px",
          "line-height: 1",
          "padding: 5px 9px",
          "border-radius: 7px",
          "border: 1px solid color-mix(in srgb, currentColor 16%, transparent)",
          "background: var(--background, white)",
          "color: var(--foreground, black)",
          "box-shadow: 0 1px 4px rgb(0 0 0 / 0.12)",
          "cursor: pointer",
          "white-space: nowrap",
        ].join(";");
        button.addEventListener("click", () => {
          context.close();
          const composer = composerRef?.current;
          if (!composer) {
            toastManager.add({
              type: "error",
              title: "Unable to add to chat",
              description: "Open a chat for this project and try again.",
            });
            return;
          }
          const firstLine = Math.min(context.selection.start.line, context.selection.end.line);
          const lastLine = Math.max(context.selection.start.line, context.selection.end.line);
          const mention = `${buildFileSelectionMention(relativePath, firstLine, lastLine)} `;
          if (!composer.insertTextAtEnd(mention, { ensureLeadingBoundary: true })) {
            toastManager.add({
              type: "error",
              title: "Unable to add to chat",
              description: "The chat isn't ready to accept input right now.",
            });
          }
        });
        wrap.appendChild(button);
        return wrap;
      },
    });
    return instance;
  }, [
    addReviewComment,
    composerDraftTarget,
    composerRef,
    cwd,
    environmentId,
    relativePath,
    saveCoordinator,
  ]);

  useEffect(
    () => () => {
      editor.cleanUp();
    },
    [editor],
  );

  // Restored documents keep their history; onChange alone would show stale
  // undo/redo availability right after a file switch.
  useEffect(() => {
    setHistoryState({ canUndo: editor.canUndo, canRedo: editor.canRedo });
  }, [editor, relativePath]);

  const handleUndo = useCallback(() => {
    editor.undo();
    setHistoryState({ canUndo: editor.canUndo, canRedo: editor.canRedo });
  }, [editor]);

  const handleRedo = useCallback(() => {
    editor.redo();
    setHistoryState({ canUndo: editor.canUndo, canRedo: editor.canRedo });
  }, [editor]);

  // The search panel has no public opener; the editor resolves its own
  // Cmd/Ctrl+F keydown, so hand it a synthetic one on its content element.
  const handleFind = useCallback(() => {
    const contentElement = fileContainerRef.current?.shadowRoot?.querySelector<HTMLElement>(
      "[data-code] [data-content]",
    );
    if (!contentElement) return;
    editor.focus();
    contentElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "f",
        code: "KeyF",
        bubbles: true,
        cancelable: true,
        ...(isMacPlatform(navigator.platform) ? { metaKey: true } : { ctrlKey: true }),
      }),
    );
  }, [editor]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      saveCoordinator.flush();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCoordinator]);

  const removeAnnotationEntry = useCallback(
    (entryId: string) => {
      setSelectedRange(null);
      removeReviewComment(composerDraftTarget, entryId);
      setLineAnnotations((current) => {
        return current.flatMap((annotation) => {
          const entries = annotation.metadata.entries.filter((entry) => entry.id !== entryId);
          return entries.length > 0 ? [{ ...annotation, metadata: { entries } }] : [];
        });
      });
    },
    [composerDraftTarget, removeReviewComment, setSelectedRange],
  );

  const submitAnnotationEntry = useCallback(
    (entryId: string, text: string) => {
      setSelectedRange(null);
      const entry = lineAnnotations
        .flatMap((annotation) => annotation.metadata.entries)
        .find((candidate) => candidate.id === entryId);
      if (entry) {
        addReviewComment(
          composerDraftTarget,
          buildFileReviewComment({
            id: entry.id,
            filePath: relativePath,
            startLine: entry.startLine,
            endLine: entry.endLine,
            text,
            contents,
          }),
        );
      }
      setLineAnnotations((current) =>
        current.map((annotation) => ({
          ...annotation,
          metadata: {
            entries: annotation.metadata.entries.map((annotationEntry) =>
              annotationEntry.id === entryId
                ? { ...annotationEntry, kind: "comment", text }
                : annotationEntry,
            ),
          },
        })),
      );
    },
    [
      addReviewComment,
      composerDraftTarget,
      contents,
      lineAnnotations,
      relativePath,
      setSelectedRange,
    ],
  );

  const beginComment = useCallback((range: SelectedLineRange) => {
    const { startLine, endLine } = normalizeFileCommentRange(range);
    const draftEntry: FileCommentAnnotationEntry = {
      id: nextFileCommentId(),
      kind: "draft",
      startLine,
      endLine,
      text: "",
    };
    setLineAnnotations((current) => {
      const withoutDraft = current.flatMap((annotation) => {
        const entries = annotation.metadata.entries.filter((entry) => entry.kind !== "draft");
        return entries.length > 0 ? [{ ...annotation, metadata: { entries } }] : [];
      });
      const existingIndex = withoutDraft.findIndex(
        (annotation) => annotation.lineNumber === endLine,
      );
      if (existingIndex < 0) {
        return [
          ...withoutDraft,
          {
            lineNumber: endLine,
            metadata: { entries: [draftEntry] },
          },
        ];
      }
      return withoutDraft.map((annotation, index) =>
        index === existingIndex
          ? {
              ...annotation,
              metadata: { entries: [...annotation.metadata.entries, draftEntry] },
            }
          : annotation,
      );
    });
  }, []);
  const hasOpenCommentForm = lineAnnotations.some((annotation) =>
    annotation.metadata.entries.some((entry) => entry.kind === "draft"),
  );
  useEffect(() => {
    const root = surfaceRef.current;
    if (!root) return;
    return installFileEditorDismissal({
      root,
      editor,
      isBlocked: () => hasOpenCommentForm,
      onDismiss: () => setSelectedRange(null),
    });
  }, [editor, hasOpenCommentForm, setSelectedRange]);
  const handleLineSelectionEnd = useCallback(
    (range: SelectedLineRange | null) => {
      setSelectedRange(range);
      if (range) {
        beginComment(range);
      }
    },
    [beginComment, setSelectedRange],
  );

  const handlePostRender = useCallback<FilePostRender>(
    (fileContainer, instance, phase) => {
      onPostRender(fileContainer, instance, phase);

      if (phase === "unmount") {
        if (fileContainerRef.current === fileContainer) fileContainerRef.current = null;
      } else {
        fileContainerRef.current = fileContainer;
      }

      if (selectionFrameRef.current !== null) {
        cancelAnimationFrame(selectionFrameRef.current);
        selectionFrameRef.current = null;
      }
      if (phase === "unmount") return;

      selectionFrameRef.current = requestAnimationFrame(() => {
        selectionFrameRef.current = null;
        if (!fileContainer.isConnected) return;
        instance.setSelectedLines(selectedRange, { notify: false });
      });
    },
    [onPostRender, selectedRange],
  );

  return (
    <EditProvider editor={editor}>
      <div ref={surfaceRef} className="flex min-h-0 flex-1 flex-col">
        <FileEditorToolbar
          pending={isPending}
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          changesOpen={changesOpen}
          onSave={() => saveCoordinator.flush()}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFind={handleFind}
          onToggleChanges={setChangesOpen}
        />
        {changesOpen ? (
          <FileChangesSurface
            environmentId={environmentId}
            cwd={cwd}
            relativePath={relativePath}
            currentContents={contents}
            resolvedTheme={resolvedTheme}
          />
        ) : (
          <Virtualizer
            className="file-preview-virtualizer min-h-0 flex-1 overflow-auto"
            config={{
              overscrollSize: 600,
              intersectionObserverMargin: 1200,
            }}
          >
            <File<FileCommentAnnotationGroup>
              file={{
                name: relativePath,
                contents,
                cacheKey: projectFileEditorCacheKey(
                  environmentId,
                  cwd,
                  relativePath,
                  contents,
                  editor.getFile(),
                ),
              }}
              options={{
                disableFileHeader: true,
                enableGutterUtility: !hasOpenCommentForm,
                enableLineSelection: !hasOpenCommentForm,
                onGutterUtilityClick: setSelectedRange,
                onLineSelectionChange: setSelectedRange,
                onLineSelectionEnd: handleLineSelectionEnd,
                overflow: wordWrap ? "wrap" : "scroll",
                theme: resolveDiffThemeName(resolvedTheme),
                themeType: resolvedTheme,
                unsafeCSS: FILE_LINK_REVEAL_UNSAFE_CSS,
                onPostRender: handlePostRender,
              }}
              selectedLines={selectedRange}
              lineAnnotations={lineAnnotations}
              renderAnnotation={(annotation) => (
                <div className="py-1">
                  {annotation.metadata.entries.map((entry) => (
                    <DiffCommentAnnotation
                      key={entry.id}
                      kind={entry.kind}
                      rangeLabel={formatFileCommentRange(entry.startLine, entry.endLine)}
                      text={entry.text}
                      onCancel={() => removeAnnotationEntry(entry.id)}
                      onComment={(text) => submitAnnotationEntry(entry.id, text)}
                      onDelete={() => removeAnnotationEntry(entry.id)}
                    />
                  ))}
                </div>
              )}
              className="min-h-full"
              contentEditable
            />
          </Virtualizer>
        )}
      </div>
    </EditProvider>
  );
}

export function RenderedMarkdownSurface({
  environmentId,
  cwd,
  relativePath,
  contents,
  threadRef,
  onPendingChange,
}: Omit<
  EditableFileSurfaceProps,
  "resolvedTheme" | "composerDraftTarget" | "revealRequestId" | "wordWrap" | "onPostRender"
> & {
  threadRef: ScopedThreadRef;
}) {
  const { coordinator: saveCoordinator } = useFileSaveCoordinator({
    environmentId,
    cwd,
    relativePath,
    onPendingChange,
  });

  return (
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
  );
}
