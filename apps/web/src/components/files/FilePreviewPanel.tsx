import type {
  EditorId,
  EnvironmentId,
  ResolvedKeybindingsConfig,
  ScopedThreadRef,
} from "@rune/contracts";
import type { TurnDiffFileChange } from "~/types";
import { isWorkspaceExactPreviewPath } from "@rune/shared/filePreview";
import { serializeComposerFileLink } from "@rune/shared/composerTrigger";
import { ChevronRight, Code2, Columns2, Eye, FolderTree, Globe2, LoaderCircle } from "lucide-react";
import * as Schema from "effect/Schema";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { isBrowserPreviewFile, openFileInPreview } from "~/browser/openFileInPreview";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@rune/client-runtime/state/runtime";
import ChatMarkdown from "~/components/ChatMarkdown";
import { OpenInPicker } from "~/components/chat/OpenInPicker";
import { useRemoteOpenState } from "~/remoteOpen";
import { useClientSettings } from "~/hooks/useSettings";
import { useResizableWidth } from "~/hooks/useResizableWidth";
import { useTheme } from "~/hooks/useTheme";
import { getLocalStorageItem, setLocalStorageItem, useLocalStorage } from "~/hooks/useLocalStorage";
import { cn } from "~/lib/utils";
import { isPreviewSupportedInRuntime } from "~/previewStateStore";
import { resolvePathLinkTarget } from "~/terminal-links";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { type DraftId, useComposerDraftStore } from "~/composerDraftStore";
import { useComposerHandleContext } from "~/composerHandleContext";
import { writeTextToClipboard } from "~/hooks/useCopyToClipboard";
import { assetEnvironment } from "~/state/assets";
import { useEnvironmentHttpBaseUrl, usePrimaryEnvironmentId } from "~/state/environments";
import { previewEnvironment } from "~/state/preview";
import { projectEnvironment } from "~/state/projects";
import { shellEnvironment } from "~/state/shell";
import { useAtomCommand } from "~/state/use-atom-command";
import { useAtomQueryRunner } from "~/state/use-atom-query-runner";

import {
  fileViewerCapabilities,
  useFileDescriptor,
  FilePreviewSurface,
  type ViewerMode,
} from "./FileViewerHost";
import { fileBreadcrumbs } from "./filePath";
import { isMarkdownPreviewFile } from "./filePreviewMode";
import {
  EditableFileSurface,
  FILE_LINK_REVEAL_UNSAFE_CSS,
  RenderedMarkdownSurface,
} from "./EditableFileSurface";
import { useFileLineReveal } from "./fileReveal";
import { projectFileCacheKey } from "./fileContentRevision";
import FileBrowserPanel from "./FileBrowserPanel";
import { FILE_TREE_MIN_WIDTH, getFileTreeMaxWidth } from "./fileTreeSizing";
import { RightPanelResizeHandle } from "../preview/RightPanelResizeHandle";
import { Virtualizer, File } from "@pierre/diffs/react";
import { resolveDiffThemeName } from "~/lib/diffRendering";
import { useProjectFileMetadataQuery, useProjectFileQuery } from "./projectFilesQueryState";
import { useWorkspaceFileEvents } from "~/state/projectFileEvents";

interface FilePreviewPanelProps {
  environmentId: EnvironmentId;
  cwd: string;
  projectName: string;
  chatDiff?: ReadonlyArray<TurnDiffFileChange> | null;
  threadTitle?: string | null;
  onToggleScope?: () => void;
  relativePath: string | null;
  threadRef: ScopedThreadRef;
  composerDraftTarget: ScopedThreadRef | DraftId;
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  revealLine: number | null;
  revealRequestId: number;
  onOpenFile: (relativePath: string) => void;
  onOpenDiffFile?: (relativePath: string) => void;
  onPendingChange: (relativePath: string, pending: boolean) => void;
  onClose?: () => void;
}

const FILE_EXPLORER_STORAGE_KEY = "rune.fileExplorerOpen";
const RENDER_MARKDOWN_STORAGE_KEY = "rune.renderMarkdown";
const FILE_TREE_WIDTH_STORAGE_KEY = "rune:file-tree-width";
/** 22rem — the tree's width before it became user-resizable. */
const FILE_TREE_DEFAULT_WIDTH = 352;

function initialExplorerOpen(): boolean {
  try {
    return getLocalStorageItem(FILE_EXPLORER_STORAGE_KEY, Schema.Boolean) ?? true;
  } catch (error) {
    console.error(error);
    return true;
  }
}

/**
 * Track the editor/tree row's width so shrinking the window re-clamps the
 * stored tree width on the next render (useResizableWidth's clamp picks this
 * up automatically). Measured before first paint so a persisted width is
 * clamped against the row on mount rather than flashing over-wide.
 */
function useRowWidth(rowRef: RefObject<HTMLDivElement | null>, enabled: boolean): number {
  const [rowWidth, setRowWidth] = useState(0);
  useLayoutEffect(() => {
    if (!enabled) return;
    const row = rowRef.current;
    if (!row) return;
    const measure = () => setRowWidth(row.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [rowRef, enabled]);
  return rowWidth;
}

function ViewerModeToggle(props: {
  readonly value: ViewerMode;
  readonly onChange: (mode: ViewerMode) => void;
  readonly modes: ReadonlyArray<{ readonly value: ViewerMode; readonly label: string }>;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/60 p-0.5"
      role="group"
    >
      {props.modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={props.value === mode.value}
          onClick={() => props.onChange(mode.value)}
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[11px] transition-colors",
            props.value === mode.value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export default function FilePreviewPanel({
  environmentId,
  cwd,
  projectName,
  chatDiff = null,
  threadTitle = null,
  onToggleScope,
  relativePath,
  threadRef,
  composerDraftTarget,
  keybindings,
  availableEditors,
  revealLine,
  revealRequestId,
  onOpenFile,
  onOpenDiffFile,
  onPendingChange,
  onClose,
}: FilePreviewPanelProps) {
  const { resolvedTheme } = useTheme();
  const wordWrap = useClientSettings((settings) => settings.wordWrap);
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const remoteOpenState = useRemoteOpenState(environmentId);
  const composerRef = useComposerHandleContext();
  const environmentHttpBaseUrl = useEnvironmentHttpBaseUrl(environmentId);
  const createAssetUrl = useAtomQueryRunner(assetEnvironment.createUrl, {
    reportFailure: false,
  });
  const openPreview = useAtomCommand(previewEnvironment.open, {
    reportFailure: false,
  });
  const descriptor = useFileDescriptor(environmentId, cwd, relativePath);
  const capabilities = descriptor ? fileViewerCapabilities(descriptor.kind) : null;
  // Binary previews never go through the text reader; everything text-ish
  // does, including unknown extensions (they decode as UTF-8 often enough to
  // be worth trying).
  const isBinaryPreview =
    descriptor !== null &&
    (isWorkspaceExactPreviewPath(relativePath ?? "") || descriptor.kind === "binary");
  const file = useProjectFileQuery(environmentId, cwd, relativePath, !isBinaryPreview);
  const binaryMetadata = useProjectFileMetadataQuery(
    environmentId,
    cwd,
    relativePath,
    isBinaryPreview,
  );
  const openInFileManager = useAtomCommand(shellEnvironment.openInEditor, "reveal file");
  const [explorerOpen, setExplorerOpen] = useState(initialExplorerOpen);
  // Reading markdown rendered is a preference, not a property of one file. Keeping
  // it on the panel meant a thread switch dropped it and forced source back.
  const [renderMarkdownPreferred, setRenderMarkdownPreferred] = useLocalStorage(
    RENDER_MARKDOWN_STORAGE_KEY,
    false,
    Schema.Boolean,
  );
  const [viewerModeOverride, setViewerModeOverride] = useState<ViewerMode | null>(null);
  // Paired with the path on purpose: each file surface counts its reveals from
  // one, so a dismissed reveal on one file swallow the first reveal on the next.
  const [handledReveal, setHandledReveal] = useState<{ path: string; requestId: number } | null>(
    null,
  );
  const breadcrumbRef = useRef<HTMLDivElement>(null);
  // The tree only competes with a file surface for width; alone it fills the row.
  const isTreeResizable = relativePath !== null && explorerOpen;
  const fileTreeRowRef = useRef<HTMLDivElement>(null);
  const rowWidth = useRowWidth(fileTreeRowRef, isTreeResizable);
  const { width: treeWidth, handlers: treeResizeHandlers } = useResizableWidth({
    storageKey: FILE_TREE_WIDTH_STORAGE_KEY,
    defaultWidth: FILE_TREE_DEFAULT_WIDTH,
    minWidth: FILE_TREE_MIN_WIDTH,
    // Uncapped until the first measurement lands so a stored width survives
    // the initial clamp instead of being frozen at the pre-measure minimum.
    maxWidth: rowWidth > 0 ? getFileTreeMaxWidth(rowWidth) : Number.MAX_SAFE_INTEGER,
    edge: "left",
  });
  const isMarkdown = relativePath ? isMarkdownPreviewFile(relativePath) : false;
  const isSvg = descriptor?.kind === "svg";
  const isJson = descriptor?.kind === "json";
  const supportsModes =
    (isMarkdown || isSvg || isJson) === true && capabilities?.editable !== false;
  // A reveal still wins over the preference: the line only exists in the source.
  const revealWins =
    revealLine !== null &&
    !(handledReveal?.path === relativePath && handledReveal.requestId === revealRequestId);
  const viewerMode: ViewerMode = useMemo(() => {
    if (!supportsModes) return "preview";
    if (revealWins) return "source";
    if (viewerModeOverride) return viewerModeOverride;
    if (isMarkdown) return renderMarkdownPreferred ? "rendered" : "source";
    return "preview";
  }, [isMarkdown, renderMarkdownPreferred, revealWins, supportsModes, viewerModeOverride]);

  // Watch the workspace: agent writes land here as batched events and refresh
  // the open file (or bust a binary preview's cache) without any manual reload.
  const [diskRevision, setDiskRevision] = useState(0);
  const pendingPathsRef = useRef<ReadonlySet<string>>(new Set());
  const fileRefreshRef = useRef<() => void>(() => {});
  fileRefreshRef.current = file.refresh;
  useWorkspaceFileEvents(
    environmentId,
    cwd,
    useCallback(
      (event) => {
        if (relativePath === null) return;
        const normalized = relativePath.replaceAll("\\", "/");
        const hit = event.paths.some(
          (path) => path === normalized || path.startsWith(`${normalized}/`),
        );
        if (!hit) return;
        if (isBinaryPreview) {
          setDiskRevision((revision) => revision + 1);
          return;
        }
        // A user buffer with unsaved edits wins: the save coordinator owns
        // reconciliation, and clobbering it here would lose keystrokes.
        if (pendingPathsRef.current.has(normalized)) return;
        fileRefreshRef.current();
      },
      [isBinaryPreview, relativePath],
    ),
  );

  const handleSurfacePendingChange = useCallback(
    (path: string, pending: boolean) => {
      const normalized = path.replaceAll("\\", "/");
      const next = new Set(pendingPathsRef.current);
      if (pending) next.add(normalized);
      else next.delete(normalized);
      pendingPathsRef.current = next;
      onPendingChange(path, pending);
    },
    [onPendingChange],
  );

  const canOpenInBrowser =
    relativePath !== null && isPreviewSupportedInRuntime() && isBrowserPreviewFile(relativePath);
  const absolutePath = relativePath ? resolvePathLinkTarget(relativePath, cwd) : null;
  const breadcrumbs = useMemo(
    () => (relativePath ? fileBreadcrumbs(projectName, relativePath) : []),
    [projectName, relativePath],
  );
  const onFilePostRender = useFileLineReveal(relativePath, revealLine, revealRequestId);

  useEffect(() => {
    const currentCrumb = breadcrumbRef.current?.querySelector<HTMLElement>(
      "[data-current-file-crumb='true']",
    );
    currentCrumb?.scrollIntoView({ block: "nearest", inline: "end" });
  }, [relativePath]);

  const toggleExplorer = () => {
    setExplorerOpen((current) => {
      const next = !current;
      try {
        setLocalStorageItem(FILE_EXPLORER_STORAGE_KEY, next, Schema.Boolean);
      } catch (error) {
        console.error(error);
      }
      return next;
    });
  };

  const handleOpenInBrowser = useCallback(() => {
    if (!absolutePath || !environmentHttpBaseUrl) return;
    void (async () => {
      const result = await openFileInPreview({
        threadRef,
        filePath: absolutePath,
        httpBaseUrl: environmentHttpBaseUrl,
        createAssetUrl,
        openPreview,
      });
      if (result._tag === "Success") {
        return;
      }
      const error = "An error occurred opening the file in the browser.";
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Unable to open file in browser",
          description: error,
        }),
      );
    })();
  }, [absolutePath, createAssetUrl, environmentHttpBaseUrl, openPreview, threadRef]);

  const handleCopyViewerPath = useCallback(() => {
    if (!relativePath) return;
    void writeTextToClipboard(relativePath, "file path")
      .then(() => {
        toastManager.add({ type: "success", title: "Path copied", description: relativePath });
      })
      .catch((error: unknown) => {
        toastManager.add({
          type: "error",
          title: "Failed to copy path",
          description: error instanceof Error ? error.message : "An error occurred.",
        });
      });
  }, [relativePath]);

  const handleRevealInFiles = useCallback(() => {
    if (relativePath) onOpenFile(relativePath);
  }, [onOpenFile, relativePath]);

  const handleRevealInExplorer = useCallback(() => {
    if (!absolutePath) return;
    void openInFileManager({
      environmentId,
      input: { cwd: absolutePath, editor: "file-manager" },
    }).then((result) => {
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        const error = squashAtomCommandFailure(result);
        toastManager.add({
          type: "error",
          title: "Could not reveal file",
          description: error instanceof Error ? error.message : "Unable to open the file manager.",
        });
      }
    });
  }, [absolutePath, environmentId, openInFileManager]);

  const handleAddViewerToChat = useCallback(() => {
    if (!relativePath) return;
    const inserted = composerRef?.current?.insertTextAtEnd(
      serializeComposerFileLink(relativePath),
      {
        ensureLeadingBoundary: true,
      },
    );
    if (inserted) {
      toastManager.add({ type: "success", title: "Added to chat", description: relativePath });
      return;
    }
    toastManager.add({
      type: "error",
      title: "Unable to add to chat",
      description: "Open a chat composer for this project and try again.",
    });
  }, [composerRef, relativePath]);

  const showModeToggle = supportsModes && descriptor !== null;
  const modes: ReadonlyArray<{ value: ViewerMode; label: string }> = isMarkdown
    ? [
        { value: "rendered", label: "Rendered" },
        { value: "split", label: "Split" },
        { value: "source", label: "Source" },
      ]
    : [
        { value: "preview", label: "Preview" },
        { value: "split", label: "Split" },
        { value: "source", label: "Source" },
      ];

  const showSource = !supportsModes || viewerMode === "source" || viewerMode === "split";
  const showPreview =
    supportsModes &&
    (viewerMode === "rendered" || viewerMode === "preview" || viewerMode === "split");
  const isSplit = showSource && showPreview;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background/90">
      {relativePath ? (
        <div
          className="surface-glass flex h-10 min-h-10 shrink-0 items-center gap-2 border-b border-border/60 px-3 in-data-[preview-panel-mode=inline]:mb-3 in-data-[preview-panel-mode=inline]:h-7 in-data-[preview-panel-mode=inline]:min-h-7 in-data-[preview-panel-mode=inline]:border-b-transparent"
          data-surface-subheader
        >
          <ScrollArea
            ref={breadcrumbRef}
            hideScrollbars
            scrollFade
            className="min-w-0 flex-1 rounded-none"
            data-file-breadcrumbs
          >
            <div className="flex h-full w-max min-w-full items-center text-xs">
              {breadcrumbs.map((crumb, index) => (
                <div
                  key={crumb.path || "project"}
                  className="flex min-w-0 shrink-0 items-center"
                  data-current-file-crumb={crumb.kind === "file"}
                >
                  {index > 0 ? (
                    <ChevronRight className="mx-1 size-3.5 shrink-0 text-muted-foreground/60" />
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          className={cn(
                            "max-w-40 truncate",
                            crumb.kind === "file"
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        />
                      }
                    >
                      {crumb.label}
                    </TooltipTrigger>
                    <TooltipPopup side="top" className="max-w-80">
                      {crumb.path || projectName}
                    </TooltipPopup>
                  </Tooltip>
                </div>
              ))}
            </div>
          </ScrollArea>
          {showModeToggle ? (
            <ViewerModeToggle
              value={viewerMode === "rendered" ? "rendered" : viewerMode}
              onChange={(mode) => {
                setViewerModeOverride(mode);
                if (isMarkdown && (mode === "rendered" || mode === "source")) {
                  setRenderMarkdownPreferred(mode === "rendered");
                  setHandledReveal(
                    mode === "rendered" && relativePath !== null
                      ? { path: relativePath, requestId: revealRequestId }
                      : null,
                  );
                }
              }}
              modes={modes}
            />
          ) : null}
          {absolutePath &&
          (environmentId === primaryEnvironmentId || remoteOpenState.mode !== "local-exec") ? (
            <OpenInPicker
              environmentId={environmentId}
              keybindings={keybindings}
              availableEditors={availableEditors}
              openInCwd={absolutePath}
              compact
              enableShortcut={false}
            />
          ) : null}
          {canOpenInBrowser ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Toggle
                    className="shrink-0"
                    pressed={false}
                    onPressedChange={handleOpenInBrowser}
                    aria-label="Open file in preview browser"
                    variant="ghost"
                    size="sm"
                  >
                    <Globe2 className="size-3.5" />
                  </Toggle>
                }
              />
              <TooltipPopup>Open file in preview browser</TooltipPopup>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  className="shrink-0"
                  pressed={explorerOpen}
                  onPressedChange={toggleExplorer}
                  aria-label={explorerOpen ? "Hide file explorer" : "Show file explorer"}
                  variant="ghost"
                  size="sm"
                >
                  <FolderTree className="size-3.5" />
                </Toggle>
              }
            />
            <TooltipPopup>
              {explorerOpen ? "Hide file explorer" : "Show file explorer"}
            </TooltipPopup>
          </Tooltip>
        </div>
      ) : null}
      {relativePath && file.data?.truncated ? (
        <div className="shrink-0 border-b border-warning/20 bg-warning-surface px-3 py-1.5 text-[11px] text-warning-foreground">
          Preview limited to the first 1 MB of a {file.data.byteLength.toLocaleString()} byte file.
        </div>
      ) : null}
      <div ref={fileTreeRowRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "min-w-0 flex-1 flex-col overflow-hidden",
            relativePath ? "flex" : "hidden",
          )}
        >
          {relativePath === null ? null : isBinaryPreview && descriptor ? (
            <FilePreviewSurface
              descriptor={descriptor}
              context={{
                environmentId,
                threadRef,
                cwd,
                relativePath,
                revision: diskRevision,
                originKey: `workspace-file:${environmentId}:${cwd}:${relativePath}`,
                onCopyPath: handleCopyViewerPath,
                onAddToChat: handleAddViewerToChat,
                onRevealInFiles: handleRevealInFiles,
                onRevealInExplorer: handleRevealInExplorer,
                ...(canOpenInBrowser ? { onOpenExternally: handleOpenInBrowser } : {}),
                ...(onClose ? { onClose } : {}),
              }}
              contents=""
              byteLength={binaryMetadata.data?.byteLength}
              mimeType={(binaryMetadata.data?.mimeType ?? descriptor.mime) || undefined}
              modifiedAt={binaryMetadata.data?.modifiedAt}
              mode="preview"
              sha256={binaryMetadata.data?.sha256}
            />
          ) : file.error && file.data === null ? (
            <div
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-xs leading-relaxed"
              role="alert"
            >
              <p className="text-destructive">{file.error}</p>
              <button
                type="button"
                className="rounded-md border border-border/60 px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => file.refresh()}
              >
                Retry
              </button>
            </div>
          ) : file.data === null ? (
            <div
              className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle
                className="motion-safe:animate-spin motion-reduce:animate-none size-5"
                aria-hidden
              />
              <span className="sr-only">Loading file…</span>
            </div>
          ) : isSplit ? (
            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1 border-r border-border/60">
                <EditableFileSurface
                  key={`${relativePath}:${resolvedTheme}`}
                  environmentId={environmentId}
                  cwd={cwd}
                  relativePath={relativePath}
                  composerDraftTarget={composerDraftTarget}
                  contents={file.data.contents}
                  resolvedTheme={resolvedTheme}
                  revealRequestId={revealRequestId}
                  wordWrap={wordWrap}
                  onPostRender={onFilePostRender}
                  onPendingChange={handleSurfacePendingChange}
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                {isMarkdown && threadRef ? (
                  <RenderedMarkdownSurface
                    environmentId={environmentId}
                    cwd={cwd}
                    relativePath={relativePath}
                    threadRef={threadRef}
                    contents={file.data.contents}
                    onPendingChange={handleSurfacePendingChange}
                  />
                ) : null}
              </div>
            </div>
          ) : showPreview && descriptor ? (
            descriptor.kind === "markdown" && threadRef ? (
              <RenderedMarkdownSurface
                environmentId={environmentId}
                cwd={cwd}
                relativePath={relativePath}
                threadRef={threadRef}
                contents={file.data.contents}
                onPendingChange={handleSurfacePendingChange}
              />
            ) : (
              <FilePreviewSurface
                descriptor={descriptor}
                context={{
                  environmentId,
                  threadRef,
                  cwd,
                  relativePath,
                  revision: diskRevision,
                  originKey: `workspace-file:${environmentId}:${cwd}:${relativePath}`,
                  onCopyPath: handleCopyViewerPath,
                  onAddToChat: handleAddViewerToChat,
                  ...(canOpenInBrowser ? { onOpenExternally: handleOpenInBrowser } : {}),
                  ...(onClose ? { onClose } : {}),
                }}
                contents={file.data.contents}
                byteLength={file.data.byteLength}
                mode={viewerMode === "rendered" ? "preview" : viewerMode}
              />
            )
          ) : file.data.truncated ? (
            <Virtualizer
              key={`${relativePath}:${resolvedTheme}:${file.data.byteLength}`}
              className="file-preview-virtualizer min-h-0 flex-1 overflow-auto"
              config={{
                overscrollSize: 600,
                intersectionObserverMargin: 1200,
              }}
            >
              <File
                file={{
                  name: relativePath,
                  contents: file.data.contents,
                  cacheKey: projectFileCacheKey(cwd, relativePath, file.data.contents),
                }}
                options={{
                  disableFileHeader: true,
                  overflow: wordWrap ? "wrap" : "scroll",
                  theme: resolveDiffThemeName(resolvedTheme),
                  themeType: resolvedTheme,
                  unsafeCSS: FILE_LINK_REVEAL_UNSAFE_CSS,
                  onPostRender: onFilePostRender,
                }}
                className="min-h-full"
              />
            </Virtualizer>
          ) : (
            <EditableFileSurface
              key={`${relativePath}:${resolvedTheme}`}
              environmentId={environmentId}
              cwd={cwd}
              relativePath={relativePath}
              composerDraftTarget={composerDraftTarget}
              contents={file.data.contents}
              resolvedTheme={resolvedTheme}
              revealRequestId={revealRequestId}
              wordWrap={wordWrap}
              onPostRender={onFilePostRender}
              onPendingChange={handleSurfacePendingChange}
            />
          )}
        </div>
        {explorerOpen || relativePath === null ? (
          <aside
            className={cn(
              "relative flex min-h-0 shrink-0 bg-background/80",
              relativePath ? "border-l border-border/60" : "min-w-0 flex-1",
            )}
            style={relativePath ? { width: `${treeWidth}px` } : undefined}
          >
            {relativePath ? <RightPanelResizeHandle handlers={treeResizeHandlers} /> : null}
            <FileBrowserPanel
              key={`${environmentId}:${cwd}`}
              environmentId={environmentId}
              cwd={cwd}
              projectName={projectName}
              routeThreadKey={`${threadRef.environmentId}:${threadRef.threadId}`}
              chatDiff={chatDiff}
              threadTitle={threadTitle}
              {...(onToggleScope ? { onToggleScope } : {})}
              selectedPath={relativePath}
              selectedPathRevealId={revealRequestId}
              onOpenFile={onOpenFile}
              {...(onOpenDiffFile ? { onOpenDiffFile } : {})}
              {...(relativePath !== null && !isBinaryPreview
                ? { onRefreshSelectedFile: file.refresh }
                : {})}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
