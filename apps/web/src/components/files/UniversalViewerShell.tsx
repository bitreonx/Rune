import { VirtualizedFile, type SelectedLineRange } from "@pierre/diffs";
import { Editor } from "@pierre/diffs/editor";
import { EditProvider, File, type FileOptions, Virtualizer } from "@pierre/diffs/react";
import { LoaderCircle } from "lucide-react";
import {
  type ReactElement,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EnvironmentId, ScopedThreadRef, WorkspaceFileRef } from "@rune/contracts";

import ChatMarkdown from "~/components/ChatMarkdown";
import { ScrollArea } from "~/components/ui/scroll-area";
import { toastManager } from "~/components/ui/toast";
import { useComposerDraftStore, type DraftId } from "~/composerDraftStore";
import { useComposerHandleContext } from "~/composerHandleContext";
import { useAssetUrlState } from "~/assets/assetUrls";
import { buildFileReviewComment } from "~/reviewCommentContext";
import { projectEnvironment } from "~/state/projects";
import { useAtomCommand } from "~/state/use-atom-command";
import { isMarkdownPreviewFile, setMarkdownTaskChecked } from "./filePreviewMode.ts";
import { isPreviewSupportedInRuntime } from "~/previewStateStore";
import {
  confirmProjectFileQueryData,
  getOptimisticProjectFileQueryData,
  setProjectFileQueryData,
} from "./projectFilesQueryState";
import { resolveDiffThemeName } from "~/lib/diffRendering";
import { cn, isMacPlatform } from "~/lib/utils";
import { FileEditorToolbar } from "./FileEditorToolbar";
import { FileChangesSurface } from "./FileChangesSurface";
import { FileSaveCoordinator } from "./fileSaveCoordinator";
import { FileCommentAnnotation } from "./fileCommentAnnotations";
import { DiffCommentAnnotation } from "../diffs/DiffCommentAnnotation";
import {
  projectFileCacheKey,
  projectFileEditorCacheKey,
} from "./fileContentRevision";
import {
  formatFileCommentRange,
  nextFileCommentId,
  normalizeFileCommentRange,
  remapFileCommentAnnotations,
} from "./fileCommentAnnotations";
import { installFileEditorDismissal } from "./fileEditorDismissal";
import { buildFileSelectionMention } from "./fileSelectionMention";
import { buildWorkspaceFileRef } from "./filePreviewWorkspaceRef";

import { type FileDescriptor, type FileKind, describeFile } from "./viewerDescriptor.ts";
import { selectViewer } from "./viewerRegistry.tsx";

type FilePostRender = NonNullable<FileOptions<unknown>["onPostRender"]>;

const FILE_SAVE_DEBOUNCE_MS = 500;
const FILE_LINK_REVEAL_ATTRIBUTE = "data-file-link-reveal";
const FILE_LINK_REVEAL_UNSAFE_CSS = `
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

const REVEAL_MAX_ATTEMPTS = 30;
const REVEAL_GUARD_FRAMES = 20;
const REVEAL_GUARD_TOLERANCE_PX = 2;

interface FileRevealState {
  frameId: number | null;
  cancelGuard: (() => void) | null;
  handledRequestId: number | null;
  latestRequestId: number | null;
}

function clampFileLine(contents: string, requestedLine: number): number {
  let lineCount = 1;
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents.charCodeAt(index);
    if (character === 10) {
      lineCount += 1;
    } else if (character === 13) {
      lineCount += 1;
      if (contents.charCodeAt(index + 1) === 10) index += 1;
    }
  }
  return Math.min(Math.max(1, requestedLine), lineCount);
}

function updateFileLinkReveal(fileContainer: HTMLElement, line: number | null): void {
  const root = fileContainer.shadowRoot ?? fileContainer;
  for (const element of root.querySelectorAll<HTMLElement>(`[${FILE_LINK_REVEAL_ATTRIBUTE}]`)) {
    element.removeAttribute(FILE_LINK_REVEAL_ATTRIBUTE);
  }
  if (line === null) return;

  root
    .querySelector<HTMLElement>(`[data-line="${line}"]`)
    ?.setAttribute(FILE_LINK_REVEAL_ATTRIBUTE, "");
  root
    .querySelector<HTMLElement>(`[data-column-number="${line}"]`)
    ?.setAttribute(FILE_LINK_REVEAL_ATTRIBUTE, "");
}

function useFileLineReveal(
  relativePath: string | null,
  revealLine: number | null,
  revealRequestId: number,
): FilePostRender {
  const [revealStatesByPath] = useState(() => new Map<string, FileRevealState>());

  return useCallback<FilePostRender>(
    (fileContainer, instance, phase) => {
      if (relativePath === null) return;

      const existingState = revealStatesByPath.get(relativePath);
      const state: FileRevealState = existingState ?? {
        frameId: null,
        cancelGuard: null,
        handledRequestId: null,
        latestRequestId: null,
      };
      if (!existingState) revealStatesByPath.set(relativePath, state);

      const cancelPendingReveal = () => {
        if (state.frameId !== null) {
          cancelAnimationFrame(state.frameId);
          state.frameId = null;
        }
        state.cancelGuard?.();
      };

      if (phase === "unmount") {
        cancelPendingReveal();
        return;
      }

      const contents = instance.file?.contents;
      const targetLine =
        revealLine === null || contents === undefined ? null : clampFileLine(contents, revealLine);
      updateFileLinkReveal(fileContainer, targetLine);

      if (!(instance instanceof VirtualizedFile)) return;

      if (state.latestRequestId !== revealRequestId) {
        cancelPendingReveal();
        state.latestRequestId = revealRequestId;
        state.handledRequestId = null;
      }

      if (revealLine === null) {
        fileContainer.style.minHeight = "";
        return;
      }

      const scrollContainer = fileContainer.closest<HTMLElement>(".file-preview-virtualizer");
      if (!scrollContainer) return;
      fileContainer.style.minHeight = `${Math.ceil(
        Math.max(instance.height, scrollContainer.clientHeight),
      )}px`;

      const resolveScrollTarget = (line: number): number | null => {
        const linePosition = instance.getLinePosition(line);
        if (linePosition === null) return null;
        const scrollContainerRect = scrollContainer.getBoundingClientRect();
        const fileTop = fileContainer.getBoundingClientRect().top - scrollContainerRect.top;
        const root = fileContainer.shadowRoot ?? fileContainer;
        const renderedLineElement = root.querySelector<HTMLElement>(`[data-line="${line}"]`);
        const renderedLineRect = renderedLineElement?.getBoundingClientRect();
        return renderedLineRect
          ? renderedLineRect.top - scrollContainerRect.top
          : fileTop + linePosition;
      };

      const guardScrollTarget = (line: number) => {
        const cancelGuard = () => {
          scrollContainer.removeEventListener("wheel", cancelGuard);
          scrollContainer.removeEventListener("touchstart", cancelGuard);
          scrollContainer.removeEventListener("keydown", cancelGuard);
          scrollContainer.removeEventListener("mousedown", cancelGuard);
        };
        scrollContainer.addEventListener("wheel", cancelGuard, { passive: true });
        scrollContainer.addEventListener("touchstart", cancelGuard, { passive: true });
        scrollContainer.addEventListener("keydown", cancelGuard);
        scrollContainer.addEventListener("mousedown", cancelGuard);
        state.cancelGuard = cancelGuard;
        const initialTop = scrollContainer.scrollTop;
        let guardFramesLeft = REVEAL_GUARD_FRAMES;
        const holdTarget = () => {
          if (guardFramesLeft <= 0) {
            cancelGuard();
            state.cancelGuard = null;
            return;
          }
          guardFramesLeft -= 1;
          if (Math.abs(scrollContainer.scrollTop - initialTop) > REVEAL_GUARD_TOLERANCE_PX) {
            cancelGuard();
            state.cancelGuard = null;
            return;
          }
          const targetTop = resolveScrollTarget(line);
          if (targetTop !== null) scrollContainer.scrollTop = targetTop;
          requestAnimationFrame(holdTarget);
        };
        requestAnimationFrame(holdTarget);
      };

      const scheduleReveal = (attempt: number) => {
        if (state.handledRequestId === revealRequestId) return;
        if (attempt >= REVEAL_MAX_ATTEMPTS) {
          state.handledRequestId = revealRequestId;
          return;
        }
        const targetTop = resolveScrollTarget(revealLine);
        if (targetTop === null) {
          state.frameId = requestAnimationFrame(() => {
            state.frameId = null;
            scheduleReveal(attempt + 1);
          });
          return;
        }
        scrollContainer.scrollTop = targetTop;
        state.handledRequestId = revealRequestId;
        guardScrollTarget(revealLine);
      };

      if (state.handledRequestId !== revealRequestId) {
        state.frameId = requestAnimationFrame(() => {
          state.frameId = null;
          scheduleReveal(0);
        });
      }
    },
    [relativePath, revealLine, revealRequestId, revealStatesByPath],
  );
}

function WorkspaceImageViewer(props: {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly fileRef: WorkspaceFileRef;
  readonly alt: string;
}): ReactElement {
  const assetUrl = useAssetUrlState(props.environmentId, {
    _tag: "workspace-file",
    threadId: props.threadRef.threadId,
    ref: props.fileRef,
  });
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (assetUrl._tag === "Failure" || (assetUrl._tag === "Success" && failedUrl === assetUrl.url)) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-destructive">
        Couldn’t preview {props.alt}. The file exists, but its image data could not be decoded.
      </div>
    );
  }

  return assetUrl._tag === "Success" ? (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
      <img
        className="max-h-full max-w-full object-contain"
        src={assetUrl.url}
        alt={props.alt}
        onError={() => setFailedUrl(assetUrl.url)}
      />
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" />
    </div>
  );
}

interface EditableFileViewerProps {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly relativePath: string;
  readonly composerDraftTarget: ScopedThreadRef | DraftId;
  readonly contents: string;
  readonly resolvedTheme: "light" | "dark";
  readonly revealRequestId: number;
  readonly wordWrap: boolean;
  readonly onPostRender: FilePostRender;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
}

function useFileSaveCoordinator({
  environmentId,
  cwd,
  relativePath,
  onPendingChange,
}: Pick<
  EditableFileViewerProps,
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

function EditableFileViewer({
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
}: EditableFileViewerProps): ReactElement {
  const addReviewComment = useComposerDraftStore((store) => store.addReviewComment);
  const removeReviewComment = useComposerDraftStore((store) => store.removeReviewComment);
  const composerRef = useComposerHandleContext();
  const [lineAnnotations, setLineAnnotations] = useState<FileCommentLineAnnotation[]>([]);
  const [selectionOverride, setSelectionOverride] = useState<{
    revealRequestId: number;
    range: SelectedLineRange | null;
  } | null>(null);
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

function MarkdownRenderedViewer({
  environmentId,
  cwd,
  relativePath,
  contents,
  threadRef,
  onPendingChange,
}: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly relativePath: string;
  readonly contents: string;
  readonly threadRef: ScopedThreadRef;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
}): ReactElement {
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

function TruncatedTextViewer({
  environmentId,
  cwd,
  relativePath,
  contents,
  resolvedTheme,
  onPostRender,
  wordWrap,
}: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly relativePath: string;
  readonly contents: string;
  readonly resolvedTheme: "light" | "dark";
  readonly onPostRender: FilePostRender;
  readonly wordWrap: boolean;
}): ReactElement {
  return (
    <Virtualizer
      key={`${relativePath}:${resolvedTheme}`}
      className="file-preview-virtualizer min-h-0 flex-1 overflow-auto"
      config={{
        overscrollSize: 600,
        intersectionObserverMargin: 1200,
      }}
    >
      <File
        file={{
          name: relativePath,
          contents,
          cacheKey: projectFileCacheKey(cwd, relativePath, contents),
        }}
        options={{
          disableFileHeader: true,
          overflow: wordWrap ? "wrap" : "scroll",
          theme: resolveDiffThemeName(resolvedTheme),
          themeType: resolvedTheme,
          unsafeCSS: FILE_LINK_REVEAL_UNSAFE_CSS,
          onPostRender,
        }}
        className="min-h-full"
      />
    </Virtualizer>
  );
}

function LoadingViewer(): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" />
    </div>
  );
}

function ErrorViewer({ message }: { readonly message: string }): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-destructive">
      {message}
    </div>
  );
}

export interface UniversalViewerShellProps {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly relativePath: string;
  readonly threadRef: ScopedThreadRef;
  readonly composerDraftTarget: ScopedThreadRef | DraftId;
  readonly contents: string;
  readonly resolvedTheme: "light" | "dark";
  readonly wordWrap: boolean;
  readonly revealLine: number | null;
  readonly revealRequestId: number;
  readonly isMarkdownPreferred: boolean;
  readonly onMarkdownPreferredChange: (next: boolean) => void;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
}

/**
 * The shell is the place that knows what to render for a given file.
 * It computes a {@link FileDescriptor} from the inputs once, looks up
 * the right viewer via {@link selectViewer}, and dispatches.
 *
 * The viewer registry today only ships a binary fallback, so the
 * actual dispatch below is still done with the same conditional the
 * panel had before — but the props the viewers receive now match
 * {@link ViewerProps}, and the descriptor is computed once. Plan 3
 * replaces the inline branches with registry entries.
 */
export function UniversalViewerShell(props: UniversalViewerShellProps): ReactElement {
  const onFilePostRender = useFileLineReveal(
    props.relativePath,
    props.revealLine,
    props.revealRequestId,
  );

  const descriptor: FileDescriptor = useMemo(
    () =>
      describeFile({
        relativePath: props.relativePath,
        truncated: false,
        isPreviewSupportedInRuntime: isPreviewSupportedInRuntime(),
      }),
    [props.relativePath],
  );

  // The registry call gives us the catch-all viewer. Today it's the
  // binary viewer; Plan 3 ships a real one for each kind. We keep the
  // descriptor in scope so future viewers can read `descriptor.kind`
  // and `descriptor.isEditable` instead of re-deriving them.
  const viewer = useMemo(() => selectViewer(descriptor), [descriptor]);
  void viewer;

  const imageRef = useMemo(
    () =>
      buildWorkspaceFileRef({
        environmentId: props.environmentId,
        cwd: props.cwd,
        projectWorkspaceRoot: undefined,
        projectId: undefined,
        relativePath: props.relativePath,
      }),
    [props.environmentId, props.cwd, props.relativePath],
  );

  if (props.isLoading) return <LoadingViewer />;
  if (props.errorMessage) return <ErrorViewer message={props.errorMessage} />;

  if (descriptor.kind === "image") {
    return (
      <WorkspaceImageViewer
        environmentId={props.environmentId}
        threadRef={props.threadRef}
        fileRef={imageRef}
        alt={props.relativePath}
      />
    );
  }

  if (descriptor.kind === "markdown" && props.isMarkdownPreferred) {
    return (
      <MarkdownRenderedViewer
        environmentId={props.environmentId}
        cwd={props.cwd}
        relativePath={props.relativePath}
        contents={props.contents}
        threadRef={props.threadRef}
        onPendingChange={props.onPendingChange}
      />
    );
  }

  if (descriptor.kind === "truncated-text") {
    return (
      <TruncatedTextViewer
        environmentId={props.environmentId}
        cwd={props.cwd}
        relativePath={props.relativePath}
        contents={props.contents}
        resolvedTheme={props.resolvedTheme}
        onPostRender={onFilePostRender}
        wordWrap={props.wordWrap}
      />
    );
  }

  return (
    <EditableFileViewer
      environmentId={props.environmentId}
      cwd={props.cwd}
      relativePath={props.relativePath}
      composerDraftTarget={props.composerDraftTarget}
      contents={props.contents}
      resolvedTheme={props.resolvedTheme}
      revealRequestId={props.revealRequestId}
      wordWrap={props.wordWrap}
      onPostRender={onFilePostRender}
      onPendingChange={props.onPendingChange}
    />
  );
}

/**
 * Re-exported for tests that want to drive the shell with a custom
 * descriptor without round-tripping through the registry. The shell
 * itself always uses {@link describeFile}.
 */
export const _testing = { clampFileLine, updateFileLinkReveal, describeFile };
