import type {
  ContextMenuItem as TreeContextMenuItem,
  ContextMenuOpenContext as TreeContextMenuOpenContext,
  FileTreeDirectoryHandle,
  FileTreeItemHandle,
} from "@pierre/trees";
import type { ContextMenuItem, EnvironmentId, ProjectEntry } from "@rune/contracts";
import { FileTree, useFileTree, useFileTreeSearch } from "@pierre/trees/react";
import { serializeComposerFileLink } from "@rune/shared/composerTrigger";
import { ChevronsDownUp, ChevronsUpDown, ExternalLink, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@rune/client-runtime/state/runtime";
import { Button } from "~/components/ui/button";
import { InputGroup, InputGroupInput } from "~/components/ui/input-group";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { useComposerHandleContext } from "~/composerHandleContext";
import { writeTextToClipboard } from "~/hooks/useCopyToClipboard";
import { useLiveRefresh } from "~/hooks/useLiveRefresh";
import { useTheme } from "~/hooks/useTheme";
import { cn, getLocalFileManagerName } from "~/lib/utils";
import { readLocalApi } from "~/localApi";
import { RUNE_PIERRE_ICONS } from "~/pierre-icons";
import { shellEnvironment } from "~/state/shell";
import { useAtomCommand } from "~/state/use-atom-command";

import { fileTreeAreaState } from "./fileTreeArea";
import { createFileTreeDragMentionController } from "./fileTreeDragMention";
import { FileTreeTruncationFooter } from "./FileTreeTruncationFooter";
import { useProjectEntriesQuery } from "./projectFilesQueryState";
import type { TurnDiffFileChange } from "~/types";

interface FileBrowserPanelProps {
  environmentId: EnvironmentId;
  cwd: string;
  projectName: string;
  routeThreadKey?: string | null;
  chatDiff?: ReadonlyArray<TurnDiffFileChange> | null;
  threadTitle?: string | null;
  onToggleScope?: () => void;
  /** File currently open in the preview pane; revealed and selected in the tree. */
  selectedPath: string | null;
  /** Bumped when the same path should be revealed again (e.g. re-opened from search). */
  selectedPathRevealId: number;
  onOpenFile: (relativePath: string) => void;
  onRefreshSelectedFile?: () => void;
}

const TREE_UNSAFE_CSS = `
  :host {
    --trees-bg-override: transparent;
    --trees-selected-bg-override: color-mix(in srgb, currentColor 12%, transparent);
    --trees-hover-bg-override: color-mix(in srgb, currentColor 7%, transparent);
    --trees-border-color-override: color-mix(in srgb, currentColor 14%, transparent);
    --trees-font-family-override: var(--font-sans);
    --trees-font-size-override: 12px;
  }
  button[data-type='item'] { border-radius: 5px; }
`;

function treePath(entry: ProjectEntry): string {
  return entry.kind === "directory" ? `${entry.path}/` : entry.path;
}

function directoryHandle(
  item: FileTreeItemHandle | null | undefined,
): FileTreeDirectoryHandle | null {
  return item?.isDirectory() ? (item as FileTreeDirectoryHandle) : null;
}

function RefreshFilesButton(props: { isPending: boolean; onRefresh: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Refresh workspace files"
            onClick={props.onRefresh}
          />
        }
      >
        <RotateCw className={cn(props.isPending && "animate-spin")} />
      </TooltipTrigger>
      <TooltipPopup>{props.isPending ? "Refreshing…" : "Refresh files"}</TooltipPopup>
    </Tooltip>
  );
}

function FileTreeActionButton(props: {
  ariaLabel: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={props.ariaLabel}
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

function FileSearchField(props: {
  ariaLabel: string;
  name: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <InputGroup variant="ghost" className="h-7 min-w-0 flex-1">
      <InputGroupInput
        type="search"
        name={props.name}
        size="sm"
        value={props.value}
        aria-label={props.ariaLabel}
        placeholder="Search files"
        spellCheck={false}
        onChange={(event) => props.onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          props.onClose();
          event.currentTarget.blur();
        }}
      />
    </InputGroup>
  );
}

export default function FileBrowserPanel({
  environmentId,
  cwd,
  projectName,
  routeThreadKey = null,
  chatDiff = null,
  threadTitle = null,
  onToggleScope,
  selectedPath,
  selectedPathRevealId,
  onOpenFile,
  onRefreshSelectedFile,
}: FileBrowserPanelProps) {
  const [scopedToChat, setScopedToChat] = useState(chatDiff !== null && routeThreadKey !== null);
  const { resolvedTheme } = useTheme();
  const composerRef = useComposerHandleContext();
  const openInEditor = useAtomCommand(shellEnvironment.openInEditor, "open in file manager");
  const fileManagerName = getLocalFileManagerName(navigator.platform);
  const entriesQuery = useProjectEntriesQuery(environmentId, cwd);
  const openInFileManager = async (path: string) => {
    const result = await openInEditor({
      environmentId,
      input: { cwd: path, editor: "file-manager" },
    });
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      const error = squashAtomCommandFailure(result);
      toastManager.add({
        type: "error",
        title: `Could not open in ${fileManagerName}`,
        description: error instanceof Error ? error.message : "Unable to open the file manager.",
      });
    }
  };
  // Agents mutate the workspace while the tree sits open; a tree that only
  // reads on mount shows yesterday's file list. The open file is deliberately
  // not re-read here — the editor may hold unsaved edits.
  useLiveRefresh(entriesQuery.refresh, {
    key: `workspace-files:${environmentId}:${cwd}`,
  });
  const entries = entriesQuery.data?.entries ?? [];
  const chatScoped = routeThreadKey !== null && chatDiff !== null && scopedToChat;
  const visibleEntries = useMemo(() => {
    if (!chatScoped || chatDiff === null) return entries;
    const paths = new Set(chatDiff.map((file) => file.path));
    return entries.filter((entry) => {
      if (entry.kind === "file") return paths.has(entry.path);
      const prefix = `${entry.path.replace(/[\\/]$/, "")}/`;
      return [...paths].some((path) => path.startsWith(prefix));
    });
  }, [chatDiff, chatScoped, entries]);
  // Until the first listing lands the tree would render zero rows; say so
  // instead of showing a silently blank panel while the walk (or an
  // environment reconnect) is still in flight.
  const treeArea = fileTreeAreaState({
    pending: entriesQuery.isPending,
    error: entriesQuery.error,
    hasData: entriesQuery.data !== null,
  });
  const entryKinds = useMemo(
    () => new Map(visibleEntries.map((entry) => [entry.path, entry.kind] as const)),
    [visibleEntries],
  );
  const entryKindsRef = useRef<ReadonlyMap<string, ProjectEntry["kind"]>>(entryKinds);
  const treePaths = useMemo(() => visibleEntries.map(treePath), [visibleEntries]);
  const previousTreePathsRef = useRef<readonly string[]>([]);
  const directoryPathsRef = useRef<readonly string[]>([]);
  const syncingSelectionRef = useRef(false);
  const treeSelectionPathRef = useRef<string | null>(null);
  const handledRevealRef = useRef<{ path: string; revealId: number } | null>(null);

  // The tree renders rows in shadow DOM and its anchor rect is unreliable, so
  // capture the right-click position ourselves; contextmenu is a composed
  // event, so a capture-phase listener sees it with viewport coordinates.
  const contextMenuPointerRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const treeModelRef = useRef<ReturnType<typeof useFileTree>["model"] | null>(null);
  useEffect(() => {
    const capturePointer = (event: MouseEvent) => {
      contextMenuPointerRef.current = { x: event.clientX, y: event.clientY, at: event.timeStamp };
    };
    document.addEventListener("contextmenu", capturePointer, true);
    return () => document.removeEventListener("contextmenu", capturePointer, true);
  }, []);

  const showEntryContextMenu = async (
    item: TreeContextMenuItem,
    context: TreeContextMenuOpenContext,
  ) => {
    const api = readLocalApi();
    if (!api) {
      context.close();
      return;
    }
    const relativePath = item.path.replace(/\/$/, "");
    const mention = serializeComposerFileLink(relativePath);
    const pointer = contextMenuPointerRef.current;
    const pointerIsFresh = pointer !== null && performance.now() - pointer.at < 1000;
    const anchorRect = context.anchorElement.getBoundingClientRect();
    const position = pointerIsFresh
      ? { x: pointer.x, y: pointer.y }
      : { x: anchorRect.left, y: anchorRect.bottom };
    const treeItem = directoryHandle(treeModelRef.current?.getItem(item.path));
    const isExpanded = treeItem?.isExpanded() ?? false;
    const lastSeparator = relativePath.lastIndexOf("/");
    const entryTarget =
      item.kind === "directory"
        ? relativePath
        : lastSeparator >= 0
          ? relativePath.slice(0, lastSeparator)
          : "";
    const absoluteEntryTarget = entryTarget ? `${cwd.replace(/[\\/]$/, "")}/${entryTarget}` : cwd;
    const menuItems: ContextMenuItem[] = [
      ...(item.kind === "directory"
        ? [
            {
              id: "toggle-folder",
              label: isExpanded ? "Collapse folder" : "Expand folder",
              icon: isExpanded ? "chevron-right" : "chevron-down",
            },
            {
              id: "expand-all",
              label: "Expand all folders",
              icon: "folder-tree",
              separatorBefore: true,
            },
            {
              id: "collapse-all",
              label: "Collapse all folders",
              icon: "folder-tree",
            },
          ]
        : []),
      {
        id: "open-in-explorer",
        label: `Open in ${fileManagerName}`,
        icon: "external-link",
        separatorBefore: item.kind === "file",
      },
      {
        id: "copy-mention",
        label: "Copy mention",
        icon: "copy",
        separatorBefore: item.kind === "directory",
      },
      { id: "add-to-chat", label: "Add to chat", icon: "message-square-plus" },
    ];
    try {
      const clicked = await api.contextMenu.show(menuItems, position);
      if (clicked === "toggle-folder" && treeItem) {
        treeItem.toggle();
        return;
      }
      if (clicked === "expand-all" || clicked === "collapse-all") {
        for (const path of directoryPathsRef.current) {
          const directory = directoryHandle(treeModelRef.current?.getItem(path));
          if (!directory) continue;
          if (clicked === "expand-all") directory.expand();
          else directory.collapse();
        }
        return;
      }
      if (clicked === "copy-mention") {
        try {
          await writeTextToClipboard(mention);
          toastManager.add({ type: "success", title: "Mention copied", description: relativePath });
        } catch (error) {
          toastManager.add({
            type: "error",
            title: "Failed to copy mention",
            description: error instanceof Error ? error.message : "An error occurred.",
          });
        }
        return;
      }
      if (clicked === "open-in-explorer") {
        await openInFileManager(absoluteEntryTarget);
        return;
      }
      if (clicked === "add-to-chat") {
        const composer = composerRef?.current;
        if (!composer) {
          toastManager.add({
            type: "error",
            title: "Unable to add to chat",
            description: "Open a chat for this project and try again.",
          });
          return;
        }
        const inserted = composer.insertTextAtEnd(`${mention} `, { ensureLeadingBoundary: true });
        if (!inserted) {
          toastManager.add({
            type: "error",
            title: "Unable to add to chat",
            description: "The chat isn't ready to accept input right now.",
          });
        }
      }
    } finally {
      context.close();
    }
  };
  const showEntryContextMenuRef = useRef(showEntryContextMenu);
  useEffect(() => {
    showEntryContextMenuRef.current = showEntryContextMenu;
  });

  const dragMention = useMemo(
    () =>
      createFileTreeDragMentionController({
        deselect: (path) => treeModelRef.current?.getItem(path)?.deselect(),
      }),
    [],
  );
  const { model } = useFileTree({
    composition: {
      contextMenu: {
        triggerMode: "right-click",
        onOpen: (item, context) => {
          void showEntryContextMenuRef.current(item, context);
        },
      },
    },
    // Rows only need to be draggable so entries can be dropped into the chat
    // composer; rearranging files inside the tree stays off.
    dragAndDrop: { canDrop: () => false },
    density: "compact",
    fileTreeSearchMode: "hide-non-matches",
    flattenEmptyDirectories: true,
    initialExpansion: "closed",
    icons: RUNE_PIERRE_ICONS,
    onSelectionChange: (selectedPaths) => {
      // The drag controller's selection cache must track every change,
      // including reveal-driven ones, or drags act on a stale selection.
      dragMention.handleSelectionChange(selectedPaths);
      // Selection changes driven by the reveal sync below are echoes of an
      // already-open file, not a request to open it again.
      if (syncingSelectionRef.current) return;
      // Starting a drag selects the dragged row; that selection is a side
      // effect of the gesture, not a request to open the file.
      if (dragMention.isDragInProgress()) {
        return;
      }
      const selectedPath = selectedPaths.at(-1)?.replace(/\/$/, "");
      if (selectedPath && entryKindsRef.current.get(selectedPath) === "file") {
        treeSelectionPathRef.current = selectedPath;
        onOpenFile(selectedPath);
      }
    },
    paths: [],
    search: false,
    unsafeCSS: TREE_UNSAFE_CSS,
  });
  const search = useFileTreeSearch(model);
  const handleSearchValueChange = (value: string) => {
    if (value.trim().length === 0) {
      search.close();
      return;
    }
    search.setValue(value);
  };
  const handleRefresh = () => {
    entriesQuery.refresh();
    onRefreshSelectedFile?.();
  };
  const setAllFoldersExpanded = (expanded: boolean) => {
    for (const path of directoryPathsRef.current) {
      const directory = directoryHandle(treeModelRef.current?.getItem(path));
      if (!directory) continue;
      if (expanded) directory.expand();
      else directory.collapse();
    }
  };

  useEffect(() => {
    if (previousTreePathsRef.current === treePaths) return;
    entryKindsRef.current = entryKinds;
    directoryPathsRef.current = treePaths.filter(
      (path) => entryKinds.get(path.replace(/\/$/, "")) === "directory",
    );
    previousTreePathsRef.current = treePaths;
    model.resetPaths(treePaths, { initialExpandedPaths: [] });
  }, [entryKinds, model, treePaths]);

  useEffect(() => {
    if (!selectedPath) {
      handledRevealRef.current = null;
      return;
    }
    const revealRequest = { path: selectedPath, revealId: selectedPathRevealId };
    const handledReveal = handledRevealRef.current;
    // Entry refreshes rebuild treePaths while the same preview stays open.
    // Replaying a handled reveal would close an active tree search and steal focus.
    if (
      handledReveal?.path === revealRequest.path &&
      handledReveal.revealId === revealRequest.revealId
    ) {
      return;
    }
    if (entryKinds.get(selectedPath) !== "file") return;
    const selectedItem = model.getItem(selectedPath);
    if (!selectedItem) return;

    // A selection that originated inside the tree (clicking a row, possibly
    // in an active tree search) is already visible; re-revealing it would
    // close the search and clobber the user's context. Only sync external
    // opens (file picker, content search, chat links).
    const selectedInTree = model
      .getSelectedPaths()
      .some((path) => path.replace(/\/$/, "") === selectedPath);
    if (selectedInTree && treeSelectionPathRef.current === selectedPath) {
      treeSelectionPathRef.current = null;
      handledRevealRef.current = revealRequest;
      return;
    }
    treeSelectionPathRef.current = null;
    handledRevealRef.current = revealRequest;

    syncingSelectionRef.current = true;
    model.closeSearch();
    for (const path of model.getSelectedPaths()) {
      model.getItem(path)?.deselect();
    }

    // Directory rows are registered with a trailing slash (see treePath), so
    // ancestor lookups must use the same form to expand them.
    const segments = selectedPath.split("/");
    let ancestorPath = "";
    for (const segment of segments.slice(0, -1)) {
      ancestorPath = ancestorPath ? `${ancestorPath}/${segment}` : segment;
      const item = model.getItem(`${ancestorPath}/`) ?? model.getItem(ancestorPath);
      if (item && "expand" in item) item.expand();
    }

    selectedItem.select();
    model.scrollToPath(selectedPath, { focus: true, offset: "center" });
    queueMicrotask(() => {
      syncingSelectionRef.current = false;
    });
  }, [entryKinds, model, selectedPath, selectedPathRevealId, treePaths]);

  // Tag tree drags with the composer mention payload. The row is read from
  // the composed event path (the tree's shadow root is open), so this does
  // not depend on running after the tree's own dragstart handler; the drag
  // data store is writable for every dragstart listener in the dispatch.
  // The capture phase runs before the tree's own dragstart handler selects
  // the dragged row, so the drag flag is up before that selection emits.
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    treeModelRef.current = model;
  }, [model]);
  useEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const handleDragStart = (event: DragEvent) => dragMention.handleDragStart(event);
    const handleDragEnd = () => dragMention.handleDragEnd();
    panel.addEventListener("dragstart", handleDragStart, true);
    panel.addEventListener("dragend", handleDragEnd);
    return () => {
      panel.removeEventListener("dragstart", handleDragStart, true);
      panel.removeEventListener("dragend", handleDragEnd);
    };
  }, [dragMention]);

  return (
    <div
      ref={panelRef}
      className="flex min-h-0 flex-1 flex-col bg-background/90"
      data-file-browser-panel={`${environmentId}:${cwd}`}
    >
      <div
        className="surface-glass flex h-10 min-h-10 shrink-0 items-center gap-1 border-b border-border/60 px-2 in-data-[preview-panel-mode=inline]:mb-3 in-data-[preview-panel-mode=inline]:h-7 in-data-[preview-panel-mode=inline]:min-h-7 in-data-[preview-panel-mode=inline]:border-b-transparent"
        data-surface-subheader
        data-file-tree-toolbar="true"
      >
        {chatScoped ? (
          <span
            className="min-w-0 max-w-44 truncate px-1 text-xs font-medium"
            title={threadTitle ?? undefined}
          >
            Changes in this chat â€” {chatDiff?.length ?? 0}{" "}
            {chatDiff?.length === 1 ? "file" : "files"}
          </span>
        ) : (
          <span className="min-w-0 max-w-44 truncate px-1 text-xs font-medium">
            Workspace files â€” {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
        {routeThreadKey !== null && chatDiff !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="shrink-0 text-[11px]"
            onClick={() => {
              setScopedToChat((value) => !value);
              onToggleScope?.();
            }}
          >
            {chatScoped ? "Show all workspace files" : "Show changes in this chat"}
          </Button>
        ) : null}
        <RefreshFilesButton isPending={entriesQuery.isPending} onRefresh={handleRefresh} />
        <FileTreeActionButton
          ariaLabel="Expand all folders"
          label="Expand all folders"
          onClick={() => setAllFoldersExpanded(true)}
        >
          <ChevronsDownUp />
        </FileTreeActionButton>
        <FileTreeActionButton
          ariaLabel="Collapse all folders"
          label="Collapse all folders"
          onClick={() => setAllFoldersExpanded(false)}
        >
          <ChevronsUpDown />
        </FileTreeActionButton>
        <FileTreeActionButton
          ariaLabel={`Open project in ${fileManagerName}`}
          label={`Open project in ${fileManagerName}`}
          disabled={entriesQuery.isPending}
          onClick={() => void openInFileManager(cwd)}
        >
          <ExternalLink />
        </FileTreeActionButton>
        <FileSearchField
          name="project-files-search"
          ariaLabel={`Search ${projectName} files`}
          value={search.value}
          onValueChange={handleSearchValueChange}
          onClose={search.close}
        />
      </div>
      {treeArea.kind === "error" ? (
        <div className="p-4 text-xs leading-relaxed text-destructive">{treeArea.message}</div>
      ) : treeArea.kind === "loading" ? (
        <div
          className="flex min-h-0 flex-1 items-center justify-center gap-2 pb-16 text-xs text-muted-foreground"
          data-file-tree-loading
        >
          <RotateCw className="size-3.5 animate-spin" aria-hidden />
          Loading {projectName} files…
        </div>
      ) : (
        <FileTree
          model={model}
          aria-label={`${projectName} files`}
          className="min-h-0 flex-1 overflow-hidden"
          style={{
            colorScheme: resolvedTheme,
            ["--trees-fg-override" as string]: "var(--contrast-foreground)",
          }}
        />
      )}
      {entriesQuery.data?.truncated ? <FileTreeTruncationFooter /> : null}
    </div>
  );
}
