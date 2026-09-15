import type {
  ContextMenuItem as TreeContextMenuItem,
  ContextMenuOpenContext as TreeContextMenuOpenContext,
  FileTreeDirectoryHandle,
  FileTreeItemHandle,
} from "@pierre/trees";
import {
  workspaceFileRefFrom,
  type ContextMenuItem,
  type EnvironmentId,
  type ProjectEntry,
  type WorkspaceFileRef,
} from "@rune/contracts";
import { FileTree, useFileTree, useFileTreeSearch } from "@pierre/trees/react";
import { serializeComposerFileLink } from "@rune/shared/composerTrigger";
import { MoreHorizontal, RotateCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
  executeAtomQuery,
} from "@rune/client-runtime/state/runtime";
import { Button } from "~/components/ui/button";
import { InputGroup, InputGroupInput } from "~/components/ui/input-group";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { toastManager } from "~/components/ui/toast";
import { useComposerHandleContext } from "~/composerHandleContext";
import { writeTextToClipboard } from "~/hooks/useCopyToClipboard";
import { useLiveRefresh } from "~/hooks/useLiveRefresh";
import { useTheme } from "~/hooks/useTheme";
import { cn, getLocalFileManagerName } from "~/lib/utils";
import { readLocalApi } from "~/localApi";
import { RUNE_PIERRE_ICONS } from "~/pierre-icons";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { shellEnvironment } from "~/state/shell";
import { projectEnvironment } from "~/state/projects";
import { useEnvironmentQuery } from "~/state/query";
import { vcsEnvironment } from "~/state/vcs";
import { useWorkspaceFileEvents } from "~/state/projectFileEvents";
import { useAtomCommand } from "~/state/use-atom-command";

import { fileTreeAreaState } from "./fileTreeArea";
import { buildChatDiffTree } from "./chatDiffTree";
import { createFileTreeDragMentionController } from "./fileTreeDragMention";
import {
  deletionConfirmationMessage,
  fileContextMenuItems,
  folderContextMenuItems,
  workspaceContextMenuItems,
  type FileBrowserFolderAction,
  type FileBrowserWorkspaceAction,
} from "./fileBrowserActions";
import {
  getProjectDirectoryQueryAtom,
  refreshProjectDirectoryQuery,
  useProjectDirectoryQuery,
} from "./projectFilesQueryState";
import {
  directoryEntryPath,
  directoriesToInvalidate,
  flattenDirectorySnapshots,
  normalizeDirectoryPath,
  parentDirectoryPath,
} from "./projectDirectoryCache";
import { fileTreeGitStatus } from "./fileTreeStatus";
import {
  readFileTreeExpandedDirectories,
  writeFileTreeExpandedDirectories,
} from "./fileTreeExpansionState";
import { toPosixRelativePath } from "./toPosixRelativePath.ts";
import {
  inlineEditNameError,
  inlineNameSelection,
  inlinePlaceholderPath,
  relativeEntryName,
  relativeEntryParentPath,
  type FileTreeInlineEdit,
} from "./fileTreeInlineEdit";
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
  onOpenDiffFile?: (relativePath: string) => void;
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
  button[data-type='item'] {
    border-radius: 5px;
    transition: opacity 160ms ease, transform 160ms ease, clip-path 160ms ease;
  }
  @starting-style {
    button[data-type='item'] {
      opacity: 0;
      transform: translateY(-2px);
      clip-path: inset(0 0 4px 0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button[data-type='item'] { transition: none; }
  }
`;

function treePath(entry: ProjectEntry): string {
  return entry.kind === "directory" ? `${entry.path}/` : entry.path;
}

function directoryHandle(
  item: FileTreeItemHandle | null | undefined,
): FileTreeDirectoryHandle | null {
  return item?.isDirectory() ? (item as FileTreeDirectoryHandle) : null;
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
        data-rune-action="workspace.search"
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

function failureDescription(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "An error occurred.";
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
  onOpenDiffFile,
  onRefreshSelectedFile,
}: FileBrowserPanelProps) {
  const [scopedToChat, setScopedToChat] = useState(chatDiff !== null && routeThreadKey !== null);
  const [inlineEdit, setInlineEdit] = useState<FileTreeInlineEdit | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const inlineEditRef = useRef<FileTreeInlineEdit | null>(null);
  const inlineErrorRef = useRef<string | null>(null);
  const inlineCommitRef = useRef<{ sourcePath: string; destinationPath: string } | null>(null);
  useEffect(() => {
    setScopedToChat(chatDiff !== null && routeThreadKey !== null);
  }, [chatDiff, routeThreadKey]);
  const { resolvedTheme } = useTheme();
  const composerRef = useComposerHandleContext();
  const openInEditor = useAtomCommand(shellEnvironment.openInEditor, "open in file manager");
  const createEntry = useAtomCommand(projectEnvironment.createEntry, "create file or folder");
  const renameEntry = useAtomCommand(projectEnvironment.renameEntry, "rename entry");
  const deleteEntry = useAtomCommand(projectEnvironment.deleteEntry, "delete entry");
  const fileManagerName = getLocalFileManagerName(navigator.platform);
  const chatScopeRequested = routeThreadKey !== null && chatDiff !== null && scopedToChat;
  const directoryQuery = useProjectDirectoryQuery(environmentId, cwd, "", {
    enabled: !chatScopeRequested,
  });
  const gitStatusQuery = useEnvironmentQuery(
    vcsEnvironment.status({ environmentId, input: { cwd } }),
  );
  const gitStatus = useMemo(
    () => fileTreeGitStatus(gitStatusQuery.data ?? null),
    [gitStatusQuery.data],
  );
  const setInlineErrorState = useCallback((message: string | null) => {
    inlineErrorRef.current = message;
    setInlineError(message);
  }, []);
  const setInlineEditState = useCallback(
    (next: FileTreeInlineEdit | null) => {
      inlineEditRef.current = next;
      inlineCommitRef.current = null;
      setInlineErrorState(null);
      setInlineEdit(next);
    },
    [setInlineErrorState],
  );
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
  useLiveRefresh(directoryQuery.refresh, {
    key: `workspace-files:${environmentId}:${cwd}`,
  });
  const chatScoped = chatScopeRequested;
  const chatEntries = useMemo(
    () =>
      chatScoped && chatDiff !== null ? buildChatDiffTree(chatDiff.map((file) => file.path)) : [],
    [chatDiff, chatScoped],
  );
  const directorySnapshotsRef = useRef<Map<string, ReadonlyArray<ProjectEntry>>>(new Map());
  const pendingDirectoryLoadsRef = useRef(new Set<string>());
  const persistedExpandedDirectories = useMemo(
    () => readFileTreeExpandedDirectories(environmentId, cwd),
    [cwd, environmentId],
  );
  const [directoryCacheVersion, setDirectoryCacheVersion] = useState(0);
  const loadedEntries = useMemo(
    () => flattenDirectorySnapshots(directorySnapshotsRef.current),
    [directoryCacheVersion],
  );
  const visibleEntries = chatScoped ? chatEntries : loadedEntries;
  // Until the first listing lands the tree would render zero rows; say so
  // instead of showing a silently blank panel while the walk (or an
  // environment reconnect) is still in flight.
  const treeArea = fileTreeAreaState({
    pending: directoryQuery.isPending,
    error: directoryQuery.error,
    hasData: chatScoped || directoryQuery.data !== null,
  });
  const entryKinds = useMemo(
    () => new Map(visibleEntries.map((entry) => [entry.path, entry.kind] as const)),
    [visibleEntries],
  );
  const entryKindsRef = useRef<ReadonlyMap<string, ProjectEntry["kind"]>>(entryKinds);
  const chatTreePaths = useMemo(() => chatEntries.map(treePath), [chatEntries]);
  const directoryPathsRef = useRef<readonly string[]>([]);
  entryKindsRef.current = entryKinds;
  directoryPathsRef.current = visibleEntries
    .filter((entry) => entry.kind === "directory")
    .map(treePath);
  const syncingSelectionRef = useRef(false);
  const treeSelectionPathRef = useRef<string | null>(null);
  const handledRevealRef = useRef<{ path: string; revealId: number } | null>(null);

  // The tree renders rows in shadow DOM and its anchor rect is unreliable, so
  // capture the right-click position ourselves; contextmenu is a composed
  // event, so a capture-phase listener sees it with viewport coordinates.
  const contextMenuPointerRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const treeModelRef = useRef<ReturnType<typeof useFileTree>["model"] | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const refreshDirectoryRef = useRef<(directory: string) => void>(() => {});
  useEffect(() => {
    const capturePointer = (event: MouseEvent) => {
      contextMenuPointerRef.current = { x: event.clientX, y: event.clientY, at: event.timeStamp };
    };
    document.addEventListener("contextmenu", capturePointer, true);
    return () => document.removeEventListener("contextmenu", capturePointer, true);
  }, []);

  const beginInlineCreate = useCallback(
    (input: { readonly kind: "file" | "directory"; readonly parentPath: string }) => {
      if (chatScoped) return;
      const model = treeModelRef.current;
      if (!model) return;
      const baseName = input.kind === "file" ? "untitled" : "new-folder";
      const existingPaths = new Set([
        ...visibleEntries.map(treePath),
        ...model.getVisibleRows(0, model.getVisibleCount()).map((row) => row.path),
      ]);
      const placeholderPath = inlinePlaceholderPath({
        parentPath: input.parentPath,
        name: baseName,
        isFolder: input.kind === "directory",
        existingPaths,
      });
      model.add(placeholderPath);
      const parentRef =
        input.parentPath.length > 0
          ? workspaceFileRefFrom({
              workspaceId: String(environmentId),
              workspaceRoot: cwd,
              relativePath: input.parentPath,
            })
          : null;
      setInlineEditState({
        type: input.kind === "file" ? "create-file" : "create-folder",
        parentRef,
        placeholderPath,
        value: baseName,
      });
      if (!model.startRenaming(placeholderPath, { removeIfCanceled: true })) {
        model.remove(placeholderPath, input.kind === "directory" ? { recursive: true } : undefined);
        setInlineEditState(null);
      }
    },
    [chatScoped, cwd, environmentId, setInlineEditState, visibleEntries],
  );

  const beginInlineRename = useCallback(
    (relativePath: string, isFolder: boolean) => {
      if (chatScoped) return;
      const model = treeModelRef.current;
      if (!model) return;
      const normalizedPath = relativePath.replace(/\/$/, "");
      const ref = workspaceFileRefFrom({
        workspaceId: String(environmentId),
        workspaceRoot: cwd,
        relativePath: normalizedPath,
      });
      setInlineEditState({
        type: "rename",
        ref,
        sourcePath: normalizedPath,
        originalName: relativeEntryName(normalizedPath),
        value: relativeEntryName(normalizedPath),
        isFolder,
      });
      if (!model.startRenaming(relativePath)) setInlineEditState(null);
    },
    [chatScoped, cwd, environmentId, setInlineEditState],
  );

  const handleTreeRenameError = useCallback(
    (message: string) => setInlineErrorState(message),
    [setInlineErrorState],
  );

  const handleTreeRename = useCallback(
    (event: { sourcePath: string; destinationPath: string; isFolder: boolean }) => {
      const sourcePath = event.sourcePath.replace(/\/$/, "");
      const destinationPath = event.destinationPath.replace(/\/$/, "");
      const sourceTreePath = event.isFolder ? `${sourcePath}/` : sourcePath;
      const destinationTreePath = event.isFolder ? `${destinationPath}/` : destinationPath;
      const edit = inlineEditRef.current;
      inlineCommitRef.current = { sourcePath, destinationPath };
      setInlineErrorState(null);
      const nameError = inlineEditNameError(relativeEntryName(destinationPath));
      if (nameError !== null) {
        inlineCommitRef.current = null;
        setInlineErrorState(nameError);
        queueMicrotask(() => {
          treeModelRef.current?.move(destinationTreePath, sourceTreePath);
          treeModelRef.current?.startRenaming(sourcePath, {
            removeIfCanceled: edit?.type === "create-file" || edit?.type === "create-folder",
          });
        });
        return;
      }

      if (edit?.type === "create-file" || edit?.type === "create-folder") {
        const kind = edit.type === "create-file" ? "file" : "directory";
        const parentPath = relativeEntryParentPath(destinationPath);
        void createEntry({
          environmentId,
          input: { cwd, relativePath: destinationPath, kind },
        }).then((result) => {
          if (result._tag === "Success") {
            setInlineEditState(null);
            refreshDirectoryRef.current(parentPath);
            if (kind === "file") onOpenFile(destinationPath);
            return;
          }
          if (isAtomCommandInterrupted(result)) return;
          const model = treeModelRef.current;
          model?.move(destinationTreePath, sourceTreePath);
          const message = failureDescription(squashAtomCommandFailure(result));
          setInlineErrorState(message);
          inlineCommitRef.current = null;
          queueMicrotask(() => {
            treeModelRef.current?.startRenaming(sourcePath, { removeIfCanceled: true });
          });
        });
        return;
      }

      const parentPath = relativeEntryParentPath(sourcePath);
      void renameEntry({
        environmentId,
        input: { cwd, relativePath: sourcePath, newName: relativeEntryName(destinationPath) },
      }).then((result) => {
        if (result._tag === "Success") {
          setInlineEditState(null);
          refreshDirectoryRef.current(parentPath);
          return;
        }
        if (isAtomCommandInterrupted(result)) return;
        const model = treeModelRef.current;
        if (model) model.move(destinationTreePath, sourceTreePath);
        setInlineErrorState(failureDescription(squashAtomCommandFailure(result)));
        inlineCommitRef.current = null;
        queueMicrotask(() => {
          treeModelRef.current?.startRenaming(sourcePath);
        });
      });
    },
    [
      createEntry,
      cwd,
      environmentId,
      onOpenFile,
      renameEntry,
      setInlineEditState,
      setInlineErrorState,
    ],
  );

  const handleTreeKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "F2" && !chatScoped) {
        const model = treeModelRef.current;
        const focusedPath = model?.getFocusedPath();
        if (focusedPath) beginInlineRename(focusedPath, focusedPath.endsWith("/"));
        return;
      }
      if (event.key === "Escape" && inlineEditRef.current) {
        setInlineEditState(null);
        return;
      }
      if (event.key === "Enter" && inlineEditRef.current) {
        queueMicrotask(() => {
          if (inlineCommitRef.current === null && inlineErrorRef.current === null) {
            setInlineEditState(null);
          }
        });
      }
    },
    [beginInlineRename, chatScoped, setInlineEditState],
  );
  const chatScopedRef = useRef(chatScoped);
  chatScopedRef.current = chatScoped;
  const handleTreeRenameRef = useRef(handleTreeRename);
  handleTreeRenameRef.current = handleTreeRename;
  const handleTreeRenameErrorRef = useRef(handleTreeRenameError);
  handleTreeRenameErrorRef.current = handleTreeRenameError;

  const showEntryContextMenu = async (
    item: TreeContextMenuItem,
    context: TreeContextMenuOpenContext,
  ) => {
    const api = readLocalApi();
    if (!api) {
      context.close();
      return;
    }
    const relativePath = toPosixRelativePath(item.path.replace(/\/$/, ""));
    const mention = serializeComposerFileLink(relativePath);
    const pointer = contextMenuPointerRef.current;
    const pointerIsFresh = pointer !== null && performance.now() - pointer.at < 1000;
    const anchorRect = context.anchorElement.getBoundingClientRect();
    const position = pointerIsFresh
      ? { x: pointer.x, y: pointer.y }
      : { x: anchorRect.left, y: anchorRect.bottom };
    const isChanged = chatDiff?.some((file) => file.path === relativePath) ?? false;
    const lastSeparator = relativePath.lastIndexOf("/");
    const entryTarget =
      item.kind === "directory"
        ? relativePath
        : lastSeparator >= 0
          ? relativePath.slice(0, lastSeparator)
          : "";
    const absoluteEntryTarget = entryTarget ? `${cwd.replace(/[\\/]$/, "")}/${entryTarget}` : cwd;
    const menuItems: readonly ContextMenuItem[] =
      item.kind === "directory"
        ? folderContextMenuItems({
            expanded:
              directoryHandle(treeModelRef.current?.getItem(`${relativePath}/`))?.isExpanded() ??
              false,
            chatScoped,
            fileManagerName,
          })
        : fileContextMenuItems({
            chatScoped,
            fileManagerName,
            isChanged: isChanged && onOpenDiffFile !== undefined,
          });
    let transferredFocus = false;
    try {
      const clicked = await api.contextMenu.show(menuItems, position);
      if (clicked === "open-file") {
        onOpenFile(relativePath);
        return;
      }
      if (clicked === "open-diff") {
        onOpenDiffFile?.(relativePath);
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
      if (clicked === "new-file" || clicked === "new-folder") {
        transferredFocus = true;
        context.close({ restoreFocus: false });
        beginInlineCreate({
          kind: clicked === "new-file" ? "file" : "directory",
          parentPath: relativePath,
        });
        return;
      }
      if (clicked === "rename-entry") {
        transferredFocus = true;
        context.close({ restoreFocus: false });
        beginInlineRename(relativePath, item.kind === "directory");
        return;
      }
      if (clicked === "delete-entry") {
        const confirmed = await api.dialogs.confirm(
          deletionConfirmationMessage({ kind: item.kind, path: relativePath }),
          { variant: "destructive" },
        );
        if (!confirmed) return;
        const result = await deleteEntry({
          environmentId,
          input: {
            cwd,
            relativePath,
            ...(item.kind === "directory" ? { recursive: true } : {}),
          },
        });
        if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
          toastManager.add({
            type: "error",
            title: "Could not delete",
            description: failureDescription(squashAtomCommandFailure(result)),
          });
        }
        return;
      }
      if (clicked === "copy-path") {
        try {
          await writeTextToClipboard(relativePath);
          toastManager.add({ type: "success", title: "Path copied", description: relativePath });
        } catch (error) {
          toastManager.add({
            type: "error",
            title: "Failed to copy path",
            description: error instanceof Error ? error.message : "An error occurred.",
          });
        }
        return;
      }
      if (clicked === "open-in-explorer") {
        await openInFileManager(absoluteEntryTarget);
        return;
      }
      if (
        item.kind === "directory" &&
        [
          "expand-folder",
          "expand-descendants",
          "expand-all-folders",
          "collapse-folder",
          "collapse-descendants",
          "collapse-all-folders",
        ].includes(clicked)
      ) {
        const folderAction = clicked as FileBrowserFolderAction;
        if (folderAction === "expand-all-folders") setAllFoldersExpanded(true);
        else if (folderAction === "collapse-all-folders") setAllFoldersExpanded(false);
        else if (folderAction === "expand-folder") setFolderExpansion(relativePath, true, false);
        else if (folderAction === "collapse-folder") setFolderExpansion(relativePath, false, false);
        else if (folderAction === "expand-descendants")
          setFolderExpansion(relativePath, true, true);
        else if (folderAction === "collapse-descendants")
          setFolderExpansion(relativePath, false, true);
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
      context.close({ restoreFocus: !transferredFocus });
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
    renaming: {
      canRename: ({ path }) => {
        const normalizedPath = path.replace(/\/$/, "");
        const placeholderPath = inlineEditRef.current?.placeholderPath.replace(/\/$/, "");
        return (
          !chatScopedRef.current &&
          (entryKindsRef.current.has(normalizedPath) || placeholderPath === normalizedPath)
        );
      },
      onError: (message) => handleTreeRenameErrorRef.current(message),
      onRename: (event) => handleTreeRenameRef.current(event),
    },
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
        // The tree already stores POSIX paths today, but normalise here as a
        // single chokepoint so a future server change that returns OS-native
        // separators can't smuggle backslashes into the WorkspaceFileRef the
        // preview panel builds (and which the asset service would reject).
        onOpenFile(toPosixRelativePath(selectedPath));
      }
    },
    paths: [],
    search: false,
    unsafeCSS: TREE_UNSAFE_CSS,
  });
  useEffect(() => {
    model.setGitStatus(gitStatus);
  }, [gitStatus, model]);

  const applyDirectorySnapshot = useCallback(
    (directory: string, nextEntries: ReadonlyArray<ProjectEntry>) => {
      const normalizedDirectory = normalizeDirectoryPath(directory);
      const snapshots = directorySnapshotsRef.current;
      const previousEntries = snapshots.get(normalizedDirectory) ?? [];
      const nextPaths = new Set(nextEntries.map((entry) => entry.path));

      for (const previousEntry of previousEntries) {
        if (nextPaths.has(previousEntry.path)) continue;
        model.remove(directoryEntryPath(previousEntry), {
          recursive: previousEntry.kind === "directory",
        });
        if (previousEntry.kind === "directory") {
          const descendantPrefix = `${previousEntry.path}/`;
          for (const cachedDirectory of snapshots.keys()) {
            if (
              cachedDirectory === previousEntry.path ||
              cachedDirectory.startsWith(descendantPrefix)
            ) {
              snapshots.delete(cachedDirectory);
            }
          }
        }
      }
      for (const nextEntry of nextEntries) {
        const previousEntry = previousEntries.find((entry) => entry.path === nextEntry.path);
        if (previousEntry?.kind === nextEntry.kind) continue;
        if (previousEntry !== undefined) {
          model.remove(directoryEntryPath(previousEntry), {
            recursive: previousEntry.kind === "directory",
          });
        }
        model.add(directoryEntryPath(nextEntry));
      }
      snapshots.set(normalizedDirectory, nextEntries);
      setDirectoryCacheVersion((version) => version + 1);
    },
    [model],
  );

  const loadDirectory = useCallback(
    async (directory: string): Promise<void> => {
      if (chatScoped) return;
      const normalizedDirectory = normalizeDirectoryPath(directory);
      if (pendingDirectoryLoadsRef.current.has(normalizedDirectory)) return;
      pendingDirectoryLoadsRef.current.add(normalizedDirectory);
      try {
        const result = await executeAtomQuery(
          appAtomRegistry,
          getProjectDirectoryQueryAtom(environmentId, cwd, normalizedDirectory),
          { reportFailure: false, reportDefect: false },
        );
        if (result._tag === "Success") {
          applyDirectorySnapshot(normalizedDirectory, result.value.entries);
        }
      } finally {
        pendingDirectoryLoadsRef.current.delete(normalizedDirectory);
      }
    },
    [applyDirectorySnapshot, chatScoped, cwd, environmentId],
  );

  const refreshLoadedDirectory = useCallback(
    (directory: string) => {
      const normalizedDirectory = normalizeDirectoryPath(directory);
      if (!directorySnapshotsRef.current.has(normalizedDirectory)) return;
      refreshProjectDirectoryQuery(environmentId, cwd, normalizedDirectory);
      void loadDirectory(normalizedDirectory);
    },
    [cwd, environmentId, loadDirectory],
  );
  refreshDirectoryRef.current = refreshLoadedDirectory;

  const search = useFileTreeSearch(model);
  const handleSearchValueChange = (value: string) => {
    if (value.trim().length === 0) {
      search.close();
      return;
    }
    search.setValue(value);
  };
  const handleRefresh = () => {
    directoryQuery.refresh();
    void loadDirectory("");
    for (const directory of directorySnapshotsRef.current.keys()) {
      if (directory !== "") refreshLoadedDirectory(directory);
    }
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
  const setFolderExpansion = (
    relativePath: string,
    expanded: boolean,
    includeDescendants: boolean,
  ) => {
    const normalizedPath = relativePath.replace(/[\\/]$/, "");
    const selfPath = `${normalizedPath}/`;
    const descendantPrefix = selfPath;
    const paths = directoryPathsRef.current.filter((path) =>
      includeDescendants
        ? path === selfPath || path.startsWith(descendantPrefix)
        : path === selfPath,
    );
    for (const path of paths) {
      const directory = directoryHandle(treeModelRef.current?.getItem(path));
      if (!directory) continue;
      if (expanded) {
        directory.expand();
        void loadDirectory(path.replace(/\/$/, ""));
      } else {
        directory.collapse();
      }
    }
  };
  const showWorkspaceContextMenu = async (position: { readonly x: number; readonly y: number }) => {
    const api = readLocalApi();
    if (!api) return;
    const clicked = await api.contextMenu.show(
      workspaceContextMenuItems({ chatScoped, fileManagerName }),
      position,
    );
    const action = clicked as FileBrowserWorkspaceAction | null;
    if (action === "new-file" || action === "new-folder") {
      beginInlineCreate({ kind: action === "new-file" ? "file" : "directory", parentPath: "" });
    } else if (action === "refresh") {
      handleRefresh();
    } else if (action === "expand-all-folders") {
      setAllFoldersExpanded(true);
    } else if (action === "collapse-all-folders") {
      setAllFoldersExpanded(false);
    } else if (action === "reveal-workspace") {
      await openInFileManager(cwd);
    }
  };
  const handlePanelContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    const path = event.nativeEvent.composedPath();
    const isTreeRow = path.some(
      (node) =>
        node instanceof HTMLElement &&
        (node.hasAttribute("data-item-path") || node.hasAttribute("data-file-tree-toolbar")),
    );
    if (isTreeRow) return;
    event.preventDefault();
    void showWorkspaceContextMenu({ x: event.clientX, y: event.clientY });
  };

  const handleWorkspaceFileEvent = useCallback(
    (event: { readonly paths: ReadonlyArray<string> }) => {
      if (chatScoped) return;
      const loadedDirectories = new Set(directorySnapshotsRef.current.keys());
      for (const directory of directoriesToInvalidate(event.paths, loadedDirectories)) {
        refreshLoadedDirectory(directory);
      }
    },
    [chatScoped, refreshLoadedDirectory],
  );
  useWorkspaceFileEvents(environmentId, cwd, handleWorkspaceFileEvent);

  useEffect(() => {
    const loadExpandedDirectories = () => {
      if (chatScoped) return;
      for (const path of directoryPathsRef.current) {
        const directory = directoryHandle(model.getItem(path));
        const normalizedPath = normalizeDirectoryPath(path);
        if (
          directory &&
          persistedExpandedDirectories.has(normalizedPath) &&
          !directory.isExpanded()
        ) {
          directory.expand();
        }
        if (directory?.isExpanded() && !directorySnapshotsRef.current.has(normalizedPath)) {
          void loadDirectory(path);
        }
      }
    };
    const unsubscribe = model.subscribe(() => {
      const expanded = directoryPathsRef.current.filter((path) => {
        const directory = directoryHandle(model.getItem(path));
        return directory?.isExpanded() === true;
      });
      writeFileTreeExpandedDirectories(environmentId, cwd, expanded);
      loadExpandedDirectories();
    });
    loadExpandedDirectories();
    return unsubscribe;
  }, [chatScoped, cwd, environmentId, loadDirectory, model, persistedExpandedDirectories]);

  useEffect(() => {
    directorySnapshotsRef.current.clear();
    pendingDirectoryLoadsRef.current.clear();
    setDirectoryCacheVersion((version) => version + 1);
    model.resetPaths(chatScoped ? chatTreePaths : []);
  }, [chatScoped, chatTreePaths, model]);

  useEffect(() => {
    if (chatScoped || directoryQuery.data === null) return;
    applyDirectorySnapshot("", directoryQuery.data.entries);
  }, [applyDirectorySnapshot, chatScoped, directoryQuery.data]);

  useEffect(() => {
    if (chatScoped || selectedPath === null || entryKinds.has(selectedPath)) return;
    const parentDirectories: string[] = [];
    let parent = parentDirectoryPath(selectedPath);
    while (parent.length > 0) {
      parentDirectories.unshift(parent);
      parent = parentDirectoryPath(parent);
    }
    void (async () => {
      await loadDirectory("");
      for (const directory of parentDirectories) await loadDirectory(directory);
    })();
  }, [chatScoped, entryKinds, loadDirectory, selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      handledRevealRef.current = null;
      return;
    }
    const revealRequest = { path: selectedPath, revealId: selectedPathRevealId };
    const handledReveal = handledRevealRef.current;
    // Directory refreshes mutate the tree in place while the same preview stays
    // open. Replaying a handled reveal would close an active tree search and
    // steal focus.
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
  }, [entryKinds, model, selectedPath, selectedPathRevealId]);

  // Tag tree drags with the composer mention payload. The row is read from
  // the composed event path (the tree's shadow root is open), so this does
  // not depend on running after the tree's own dragstart handler; the drag
  // data store is writable for every dragstart listener in the dispatch.
  // The capture phase runs before the tree's own dragstart handler selects
  // the dragged row, so the drag flag is up before that selection emits.
  useEffect(() => {
    treeModelRef.current = model;
  }, [model]);
  useLayoutEffect(() => {
    if (!inlineEdit) return;
    const frame = requestAnimationFrame(() => {
      const host = panelRef.current?.querySelector<HTMLElement>("file-tree-container");
      const input = host?.shadowRoot?.querySelector<HTMLInputElement>("input");
      if (!input) return;
      const selection = inlineNameSelection({
        name: inlineEdit.value,
        isFolder:
          inlineEdit.type === "create-folder" ||
          (inlineEdit.type === "rename" && inlineEdit.isFolder),
      });
      input.setSelectionRange(selection.start, selection.end);
    });
    return () => cancelAnimationFrame(frame);
  }, [inlineEdit]);
  useEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const handleDragStart = (event: DragEvent) => {
      dragMention.handleDragStart(event);
      const itemPath = event
        .composedPath()
        .map((node) => (node instanceof Element ? node.getAttribute("data-item-path") : null))
        .find((path): path is string => path !== null);
      if (itemPath === undefined || event.dataTransfer === null) return;
      const selectedPaths = model.getSelectedPaths();
      const draggedPaths = selectedPaths.includes(itemPath) ? selectedPaths : [itemPath];
      const filePaths = draggedPaths
        .map((path) => path.replace(/\/$/, ""))
        .filter((path) => entryKindsRef.current.get(path) === "file");
      if (filePaths.length > 0) {
        event.dataTransfer.setData(
          "application/x-rune-pocket-files",
          JSON.stringify([...new Set(filePaths)]),
        );
      }
    };
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
      className="surface-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-background/55 shadow-lg shadow-black/10"
      data-file-browser-panel={`${environmentId}:${cwd}`}
      onContextMenu={handlePanelContextMenu}
    >
      <div
        className="surface-glass flex h-10 min-h-10 shrink-0 items-center gap-1 border-b border-border/60 px-2 in-data-[preview-panel-mode=inline]:mb-3 in-data-[preview-panel-mode=inline]:h-7 in-data-[preview-panel-mode=inline]:min-h-7 in-data-[preview-panel-mode=inline]:border-b-transparent"
        data-surface-subheader
        data-file-tree-toolbar="true"
      >
        {chatScoped ? (
          <span
            className="min-w-0 max-w-44 truncate px-1 text-xs font-medium"
            aria-label={threadTitle ? `Changes in ${threadTitle}` : "Changes in this chat"}
          >
            Changes in this chat — {chatDiff?.length ?? 0}{" "}
            {chatDiff?.length === 1 ? "file" : "files"}
          </span>
        ) : (
          <span className="min-w-0 max-w-44 truncate px-1 text-xs font-medium">
            Workspace Files — {loadedEntries.length} loaded
          </span>
        )}
        {routeThreadKey !== null && chatDiff !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="shrink-0 text-[11px]"
            data-rune-action="workspace.toggle-chat-scope"
            onClick={() => {
              setScopedToChat((value) => !value);
              onToggleScope?.();
            }}
          >
            {chatScoped ? "Show all workspace files" : "Show changes in this chat"}
          </Button>
        ) : null}
        <Menu>
          <MenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Workspace file actions"
                data-rune-action="workspace.file-actions"
              />
            }
          >
            <MoreHorizontal />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuItem
              disabled={chatScoped}
              onClick={() => beginInlineCreate({ kind: "file", parentPath: "" })}
            >
              New File
            </MenuItem>
            <MenuItem
              disabled={chatScoped}
              onClick={() => beginInlineCreate({ kind: "directory", parentPath: "" })}
            >
              New Folder
            </MenuItem>
            <MenuSeparator />
            <MenuItem onClick={() => setAllFoldersExpanded(true)}>Expand all folders</MenuItem>
            <MenuItem onClick={() => setAllFoldersExpanded(false)}>Collapse All</MenuItem>
            <MenuItem onClick={handleRefresh}>Refresh</MenuItem>
            <MenuSeparator />
            <MenuItem
              disabled={directoryQuery.isPending}
              onClick={() => void openInFileManager(cwd)}
            >
              Reveal workspace in {fileManagerName}
            </MenuItem>
          </MenuPopup>
        </Menu>
        <FileSearchField
          name="project-files-search"
          ariaLabel={`Search ${projectName} files`}
          value={search.value}
          onValueChange={handleSearchValueChange}
          onClose={search.close}
        />
      </div>
      {treeArea.kind === "error" ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
          role="alert"
        >
          <p className="text-xs leading-relaxed text-destructive">{treeArea.message}</p>
          <Button
            type="button"
            size="xs"
            variant="outline"
            data-rune-action="workspace.retry"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </div>
      ) : treeArea.kind === "loading" ? (
        <div
          className="flex min-h-0 flex-1 items-center justify-center gap-2 pb-16 text-xs text-muted-foreground"
          data-file-tree-loading
          role="status"
          aria-live="polite"
        >
          <RotateCw
            className="motion-safe:animate-spin motion-reduce:animate-none size-3.5"
            aria-hidden
          />
          Loading {projectName} files…
        </div>
      ) : visibleEntries.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center px-6 pb-16 text-center text-xs text-muted-foreground"
          role="status"
        >
          {chatScoped
            ? chatDiff?.length === 0
              ? "No changes in this chat. Workspace files remain available below when you switch scope."
              : "No files found in this chat scope."
            : "No files found in this workspace."}
        </div>
      ) : (
        <FileTree
          model={model}
          aria-label={`${projectName} files`}
          onKeyDown={handleTreeKeyDown}
          className="min-h-0 flex-1 overflow-hidden"
          style={{
            colorScheme: resolvedTheme,
            ["--trees-fg-override" as string]: "var(--contrast-foreground)",
          }}
        />
      )}
      {inlineError ? (
        <p
          className="border-t border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
          role="alert"
        >
          {inlineError} Press Enter to retry or Escape to cancel.
        </p>
      ) : null}
    </div>
  );
}
