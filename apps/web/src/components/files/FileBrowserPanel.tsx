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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
  executeAtomQuery,
} from "@rune/client-runtime/state/runtime";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
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
import { deletionConfirmationMessage, relativeEntryTarget } from "./fileBrowserActions";
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
            data-rune-action="workspace.refresh"
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
  action: string;
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
            data-rune-action={props.action}
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

interface NameRequest {
  readonly title: string;
  readonly initialValue: string;
}

function NameRequestDialog(props: {
  request: NameRequest | null;
  value: string;
  onValueChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={props.request !== null} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogPopup className="max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{props.request?.title ?? "Name entry"}</DialogTitle>
            <DialogDescription>Choose a name for this workspace entry.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-1">
            <Input
              value={props.value}
              onChange={(event) => props.onValueChange(event.target.value)}
              aria-label="Workspace entry name"
              autoFocus
              spellCheck={false}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={props.value.trim().length === 0}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
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
  onOpenDiffFile,
  onRefreshSelectedFile,
}: FileBrowserPanelProps) {
  const [scopedToChat, setScopedToChat] = useState(chatDiff !== null && routeThreadKey !== null);
  const [nameRequest, setNameRequest] = useState<NameRequest | null>(null);
  const [nameValue, setNameValue] = useState("");
  const nameRequestResolveRef = useRef<((value: string | null) => void) | null>(null);
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
  const finishNameRequest = useCallback((value: string | null) => {
    const resolve = nameRequestResolveRef.current;
    nameRequestResolveRef.current = null;
    setNameRequest(null);
    if (resolve) resolve(value);
  }, []);
  const requestName = useCallback((title: string, initialValue: string) => {
    return new Promise<string | null>((resolve) => {
      nameRequestResolveRef.current = resolve;
      setNameValue(initialValue);
      setNameRequest({ title, initialValue });
    });
  }, []);
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
    const relativePath = toPosixRelativePath(item.path.replace(/\/$/, ""));
    const mention = serializeComposerFileLink(relativePath);
    const pointer = contextMenuPointerRef.current;
    const pointerIsFresh = pointer !== null && performance.now() - pointer.at < 1000;
    const anchorRect = context.anchorElement.getBoundingClientRect();
    const position = pointerIsFresh
      ? { x: pointer.x, y: pointer.y }
      : { x: anchorRect.left, y: anchorRect.bottom };
    const treeItem = directoryHandle(treeModelRef.current?.getItem(item.path));
    const isExpanded = treeItem?.isExpanded() ?? false;
    const isChanged = chatDiff?.some((file) => file.path === relativePath) ?? false;
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
              id: "focus-entry",
              label: "Open / focus",
              icon: "folder-open",
            },
            {
              id: "toggle-folder",
              label: isExpanded ? "Collapse folder" : "Expand folder",
              icon: isExpanded ? "chevron-right" : "chevron-down",
            },
            {
              id: "expand-descendants",
              label: "Expand descendants",
              icon: "folder-tree",
            },
            {
              id: "collapse-descendants",
              label: "Collapse descendants",
              icon: "folder-tree",
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
      ...(item.kind === "file"
        ? [
            {
              id: "open-file",
              label: "Open preview / editor",
              icon: "file-code",
              separatorBefore: true,
            },
            ...(isChanged && onOpenDiffFile
              ? [{ id: "open-diff", label: "Open diff", icon: "file-diff" }]
              : []),
          ]
        : []),
      {
        id: "new-file",
        label: "New file…",
        icon: "file-plus",
        separatorBefore: true,
      },
      {
        id: "new-folder",
        label: "New folder…",
        icon: "folder-plus",
      },
      {
        id: "rename-entry",
        label: "Rename…",
        icon: "pencil",
        separatorBefore: true,
      },
      {
        id: "delete-entry",
        label: `Delete ${item.kind === "directory" ? "folder" : "file"}…`,
        icon: "trash",
        destructive: true,
      },
      {
        id: "open-in-explorer",
        label: `Open in ${fileManagerName}`,
        icon: "external-link",
        separatorBefore: true,
      },
      {
        id: "refresh-entry",
        label: "Refresh files",
        icon: "refresh-cw",
      },
      {
        id: "copy-path",
        label: "Copy relative path",
        icon: "copy",
      },
      {
        id: "copy-mention",
        label: "Copy mention",
        icon: "copy",
      },
      { id: "add-to-chat", label: "Add to chat", icon: "message-square-plus" },
    ];
    try {
      const clicked = await api.contextMenu.show(menuItems, position);
      if (clicked === "focus-entry") {
        if (item.kind === "file") onOpenFile(relativePath);
        else model.scrollToPath(item.path, { focus: true, offset: "center" });
        return;
      }
      if (clicked === "open-file") {
        onOpenFile(relativePath);
        return;
      }
      if (clicked === "open-diff") {
        onOpenDiffFile?.(relativePath);
        return;
      }
      if (clicked === "toggle-folder" && treeItem) {
        treeItem.toggle();
        return;
      }
      if (clicked === "expand-descendants" || clicked === "collapse-descendants") {
        const prefix = `${item.path.replace(/[\\/]$/, "")}/`;
        for (const path of directoryPathsRef.current) {
          if (path !== item.path && !path.startsWith(prefix)) continue;
          const directory = directoryHandle(treeModelRef.current?.getItem(path));
          if (directory) {
            if (clicked === "expand-descendants") directory.expand();
            else directory.collapse();
          }
        }
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
      if (clicked === "new-file" || clicked === "new-folder") {
        const name = await requestName(
          clicked === "new-file" ? "New file" : "New folder",
          "untitled",
        );
        if (!name) return;
        const parentRelative = item.kind === "directory" ? relativePath : entryTarget;
        const targetPath = relativeEntryTarget({ kind: item.kind, path: parentRelative }, name);
        const result = await createEntry({
          environmentId,
          input: {
            cwd,
            relativePath: targetPath,
            kind: clicked === "new-file" ? "file" : "directory",
          },
        });
        if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
          toastManager.add({
            type: "error",
            title: `Could not create ${clicked === "new-file" ? "file" : "folder"}`,
            description: failureDescription(squashAtomCommandFailure(result)),
          });
          return;
        }
        if (clicked === "new-file") onOpenFile(targetPath);
        return;
      }
      if (clicked === "rename-entry") {
        const oldName = relativePath.slice(relativePath.lastIndexOf("/") + 1);
        const name = await requestName("Rename", oldName);
        if (!name || name === oldName) return;
        const result = await renameEntry({
          environmentId,
          input: { cwd, relativePath, newName: name },
        });
        if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
          toastManager.add({
            type: "error",
            title: "Could not rename",
            description: failureDescription(squashAtomCommandFailure(result)),
          });
        }
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
      if (clicked === "refresh-entry") {
        handleRefresh();
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    treeModelRef.current = model;
  }, [model]);
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
            Workspace files — {loadedEntries.length} loaded
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
        <RefreshFilesButton isPending={directoryQuery.isPending} onRefresh={handleRefresh} />
        <FileTreeActionButton
          action="workspace.expand-all"
          ariaLabel="Expand all folders"
          label="Expand all folders"
          onClick={() => setAllFoldersExpanded(true)}
        >
          <ChevronsDownUp />
        </FileTreeActionButton>
        <FileTreeActionButton
          action="workspace.collapse-all"
          ariaLabel="Collapse all folders"
          label="Collapse all folders"
          onClick={() => setAllFoldersExpanded(false)}
        >
          <ChevronsUpDown />
        </FileTreeActionButton>
        <FileTreeActionButton
          action="workspace.open-in-file-manager"
          ariaLabel={`Open project in ${fileManagerName}`}
          label={`Open project in ${fileManagerName}`}
          disabled={directoryQuery.isPending}
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
          {chatScoped ? "No changed files in this chat." : "No files found in this workspace."}
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
      <NameRequestDialog
        request={nameRequest}
        value={nameValue}
        onValueChange={setNameValue}
        onCancel={() => finishNameRequest(null)}
        onSubmit={() => finishNameRequest(nameValue.trim() || null)}
      />
    </div>
  );
}
