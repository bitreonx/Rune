import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  PocketId,
  type EnvironmentId,
  type PocketCommand,
  type PocketSnapshot,
  type ScopedThreadRef,
} from "@rune/contracts";
import type { EnvironmentThreadShell } from "@rune/client-runtime/state/models";
import { scopeThreadRef } from "@rune/client-runtime/environment";

import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { pocketThreadCount } from "../../pockets/pocketProjection";
import { pocketDescendantIds } from "../../pockets/pocketProjection";
import { PocketWorkspace } from "../pockets/PocketWorkspace";
import {
  type PocketThreadStatus,
  type PocketWorkspaceThreadData,
  selectPocketPeekThreads,
} from "../pockets/pocketWorkspace.logic";
import { resolveSidebarThreadStatus } from "../Sidebar.logic";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { SidebarEntityRow } from "./SidebarEntityRow";

interface PocketSidebarSectionProps {
  readonly environmentId: EnvironmentId;
  readonly snapshot: PocketSnapshot | null;
  readonly threads: ReadonlyArray<EnvironmentThreadShell>;
  readonly providerEntryByInstanceId: ReadonlyMap<string, ProviderInstanceEntry>;
  readonly selectedPocketId: PocketId | null;
  readonly onSelectPocket: (pocketId: PocketId | null) => void;
  readonly onThreadActivate: (threadRef: ScopedThreadRef) => void;
  readonly onDispatch: (command: PocketCommand) => Promise<unknown>;
  readonly onThreadDrop: (
    pocketId: PocketId,
    threadKeys: ReadonlyArray<string>,
  ) => Promise<(() => Promise<void>) | null>;
  readonly onFileDrop: (
    pocketId: PocketId,
    relativePaths: ReadonlyArray<string>,
  ) => Promise<(() => Promise<void>) | null>;
  readonly onPocketDrop: (
    targetPocketId: PocketId,
    draggedPocketId: PocketId,
    placement: "inside" | "before" | "after",
  ) => Promise<(() => Promise<void>) | null>;
  readonly onPocketReorder: (
    pocketId: PocketId,
    direction: -1 | 1,
  ) => Promise<(() => Promise<void>) | null>;
  readonly onUndoReady: (undo: (() => Promise<void>) | null) => void;
}

function newPocketId(): PocketId {
  return PocketId.make(`pocket-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function orderKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function projectPocketThread(
  thread: EnvironmentThreadShell,
  providerEntryByInstanceId: ReadonlyMap<string, ProviderInstanceEntry>,
): PocketWorkspaceThreadData {
  const status = resolveSidebarThreadStatus(thread);
  const workspaceStatus: PocketThreadStatus =
    status === "working"
      ? "working"
      : status === "approval" || status === "input" || status === "failed"
        ? "needs-you"
        : status === "ready" && thread.latestTurn?.completedAt != null
          ? "done"
          : "waiting";
  const modelInstanceId = thread.session?.providerInstanceId ?? thread.modelSelection.instanceId;
  const providerEntry = providerEntryByInstanceId.get(modelInstanceId);
  return {
    id: thread.id,
    title: thread.title,
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
    status: workspaceStatus,
    pinned: thread.pinnedAt != null,
    providerLabel: providerEntry?.displayName ?? String(modelInstanceId),
    subtitle: thread.branch ?? undefined,
  };
}

export function PocketSidebarSection(props: PocketSidebarSectionProps) {
  const pockets = props.snapshot?.pockets ?? [];
  const activePockets = useMemo(
    () => pockets.filter((pocket) => pocket.archivedAt == null && pocket.trashedAt == null),
    [pockets],
  );
  const pocketsByParent = useMemo(() => {
    const grouped = new Map<PocketId | null, typeof activePockets>();
    for (const pocket of activePockets) {
      const siblings = grouped.get(pocket.parentPocketId) ?? [];
      siblings.push(pocket);
      grouped.set(pocket.parentPocketId, siblings);
    }
    for (const siblings of grouped.values()) {
      siblings.sort(
        (left, right) =>
          left.orderKey.localeCompare(right.orderKey) || left.title.localeCompare(right.title),
      );
    }
    return grouped;
  }, [activePockets]);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<PocketId>>(new Set());
  const [newPocketParentId, setNewPocketParentId] = useState<PocketId | null | undefined>(
    undefined,
  );
  const [newPocketName, setNewPocketName] = useState("");
  const [editingPocketId, setEditingPocketId] = useState<PocketId | null>(null);
  const [editingName, setEditingName] = useState("");
  const [focusedPocketId, setFocusedPocketId] = useState<PocketId | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const typeaheadRef = useRef({ text: "", at: 0 });
  const springTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSpringTimer = () => {
    if (springTimer.current !== null) clearTimeout(springTimer.current);
    springTimer.current = null;
  };

  const clearPeekTimer = () => {
    if (peekTimer.current !== null) clearTimeout(peekTimer.current);
    peekTimer.current = null;
  };

  const [peekedPocketId, setPeekedPocketId] = useState<PocketId | null>(null);
  const startPeek = (pocketId: PocketId) => {
    clearPeekTimer();
    peekTimer.current = setTimeout(() => {
      setPeekedPocketId(pocketId);
      peekTimer.current = null;
    }, 200);
  };

  useEffect(
    () => () => {
      clearSpringTimer();
      clearPeekTimer();
    },
    [],
  );

  useEffect(() => {
    setWorkspaceOpen(false);
  }, [props.selectedPocketId]);

  const selectedPocket =
    props.selectedPocketId === null
      ? null
      : (activePockets.find((pocket) => pocket.id === props.selectedPocketId) ?? null);
  const projectedThreads = useMemo<ReadonlyArray<PocketWorkspaceThreadData>>(
    () =>
      props.threads
        .filter((thread) => thread.environmentId === props.environmentId)
        .map((thread) => projectPocketThread(thread, props.providerEntryByInstanceId)),
    [props.environmentId, props.providerEntryByInstanceId, props.threads],
  );
  const pocketThreadsById = useMemo(() => {
    const result = new Map<PocketId, ReadonlyArray<PocketWorkspaceThreadData>>();
    if (props.snapshot === null) return result;
    for (const pocket of activePockets) {
      const pocketIds = pocketDescendantIds(props.snapshot, pocket.id);
      const threadIds = new Set(
        props.snapshot.threadMemberships
          .filter((membership) => pocketIds.has(membership.pocketId))
          .map((membership) => membership.threadId),
      );
      result.set(
        pocket.id,
        projectedThreads.filter((thread) => threadIds.has(thread.id)),
      );
    }
    return result;
  }, [activePockets, projectedThreads, props.snapshot]);
  const workspaceThreads = useMemo<ReadonlyArray<PocketWorkspaceThreadData>>(() => {
    if (selectedPocket === null) return [];
    return pocketThreadsById.get(selectedPocket.id) ?? [];
  }, [pocketThreadsById, selectedPocket]);

  const renderProviderMark = (thread: PocketWorkspaceThreadData) => {
    const source = props.threads.find((candidate) => candidate.id === thread.id);
    const modelInstanceId =
      source?.session?.providerInstanceId ?? source?.modelSelection.instanceId;
    const entry =
      modelInstanceId === undefined
        ? undefined
        : props.providerEntryByInstanceId.get(modelInstanceId);
    return entry ? (
      <ProviderInstanceIcon
        driverKind={entry.driverKind}
        displayName={entry.displayName}
        accentColor={entry.accentColor}
        className="size-4"
        iconClassName="size-4"
        showBadge={false}
      />
    ) : null;
  };

  const startSpringOpen = (pocketId: PocketId) => {
    clearSpringTimer();
    if (expandedIds.has(pocketId)) return;
    springTimer.current = setTimeout(() => {
      setExpandedIds((current) => new Set([...current, pocketId]));
      springTimer.current = null;
    }, 500);
  };

  const toggleExpanded = (pocketId: PocketId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(pocketId)) next.delete(pocketId);
      else next.add(pocketId);
      return next;
    });
  };

  const submitNewPocket = async (event: FormEvent) => {
    event.preventDefault();
    const title = newPocketName.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const parentPocketId = newPocketParentId === undefined ? null : newPocketParentId;
    const result = await props.onDispatch({
      type: "pocket.create",
      pocket: {
        id: newPocketId(),
        title,
        parentPocketId,
        environmentId: props.environmentId,
        orderKey: orderKey(),
        archivedAt: null,
        trashedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });
    void result;
    if (parentPocketId !== null) {
      setExpandedIds((current) => new Set([...current, parentPocketId]));
    }
    setNewPocketName("");
    setNewPocketParentId(undefined);
  };

  const commitRename = async (pocketId: PocketId) => {
    const title = editingName.trim();
    if (title) await props.onDispatch({ type: "pocket.rename", pocketId, title });
    setEditingPocketId(null);
    setEditingName("");
    restorePocketFocus(pocketId);
  };

  const handleTreeKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "Escape" && newPocketParentId !== undefined) {
      event.preventDefault();
      setNewPocketParentId(undefined);
      setNewPocketName("");
    }
  };

  const focusPocket = (pocketId: PocketId | null) => {
    if (pocketId === null) return;
    const tree = document.querySelector<HTMLElement>('[data-rune-pocket-tree="true"]');
    const button = [...(tree?.querySelectorAll<HTMLElement>("[data-rune-pocket-body]") ?? [])].find(
      (candidate) => candidate.getAttribute("data-rune-pocket-id") === pocketId,
    );
    button?.focus();
  };

  const restorePocketFocus = (pocketId: PocketId) => {
    requestAnimationFrame(() => focusPocket(pocketId));
  };

  const handlePocketKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    pocket: (typeof activePockets)[number],
    children: ReadonlyArray<(typeof activePockets)[number]>,
    expanded: boolean,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onSelectPocket(props.selectedPocketId === pocket.id ? null : pocket.id);
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      setEditingPocketId(pocket.id);
      setEditingName(pocket.title);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!expanded && children.length > 0) {
        toggleExpanded(pocket.id);
      } else if (expanded) {
        focusPocket(children[0]?.id ?? null);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (expanded) {
        toggleExpanded(pocket.id);
      } else {
        focusPocket(pocket.parentPocketId);
      }
      return;
    }
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      void props.onPocketReorder(pocket.id, direction).then(props.onUndoReady);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const tree = event.currentTarget.closest("[data-rune-pocket-tree]");
      const buttons = [...(tree?.querySelectorAll<HTMLElement>("[data-rune-pocket-body]") ?? [])];
      const index = buttons.indexOf(event.currentTarget);
      const next = buttons[index + (event.key === "ArrowDown" ? 1 : -1)];
      next?.focus();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const buffer =
        now - typeaheadRef.current.at > 500
          ? event.key
          : `${typeaheadRef.current.text}${event.key}`;
      typeaheadRef.current = { text: buffer, at: now };
      const tree = event.currentTarget.closest("[data-rune-pocket-tree]");
      const buttons = [...(tree?.querySelectorAll<HTMLElement>("[data-rune-pocket-body]") ?? [])];
      const index = buttons.indexOf(event.currentTarget);
      const ordered = buttons.slice(index + 1).concat(buttons.slice(0, index + 1));
      const match = ordered.find(
        (button) =>
          button
            .getAttribute("data-rune-pocket-title")
            ?.toLocaleLowerCase()
            .startsWith(buffer.toLocaleLowerCase()) ?? false,
      );
      match?.focus();
    }
  };

  const renderPocket = (pocket: (typeof activePockets)[number], depth: number) => {
    const children = pocketsByParent.get(pocket.id) ?? [];
    const expanded = expandedIds.has(pocket.id);
    const selected = props.selectedPocketId === pocket.id;
    const editing = editingPocketId === pocket.id;
    return (
      <li
        key={pocket.id}
        role="none"
        className="relative list-none"
        data-rune-pocket-id={pocket.id}
        data-rune-pocket-state={expanded ? "expanded" : selected ? "selected" : "closed"}
        data-rune-pocket-peek-visible={peekedPocketId === pocket.id ? "true" : "false"}
      >
        <SidebarEntityRow variant="pocket" depth={depth} selected={selected}>
          {children.length > 0 ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${pocket.title}`}
              data-rune-action={expanded ? "pocket.collapse" : "pocket.expand"}
              onClick={() => toggleExpanded(pocket.id)}
              className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-sidebar-control-surface focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expanded ? (
                <ChevronDownIcon className="size-3.5" />
              ) : (
                <ChevronRightIcon className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="size-6 shrink-0" aria-hidden />
          )}
          {editing ? (
            <input
              autoFocus
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              onBlur={() => void commitRename(pocket.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void commitRename(pocket.id);
                if (event.key === "Escape") {
                  setEditingPocketId(null);
                  restorePocketFocus(pocket.id);
                }
              }}
              aria-label={`Rename ${pocket.title}`}
              className="min-w-0 flex-1 rounded-sm border border-sidebar-ring bg-sidebar-control-surface px-1.5 py-0.5 text-sm text-sidebar-foreground outline-none focus:ring-2 focus:ring-sidebar-ring/25"
            />
          ) : (
            <button
              type="button"
              data-rune-pocket-body
              data-rune-pocket-id={pocket.id}
              data-rune-action="pocket.enter"
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={children.length > 0 ? expanded : undefined}
              aria-selected={selected}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter F2 Alt+ArrowUp Alt+ArrowDown"
              tabIndex={
                (focusedPocketId ?? pocketsByParent.get(null)?.[0]?.id ?? null) === pocket.id
                  ? 0
                  : -1
              }
              data-rune-pocket-title={pocket.title}
              draggable
              onFocus={() => setFocusedPocketId(pocket.id)}
              onClick={() => props.onSelectPocket(selected ? null : pocket.id)}
              onKeyDown={(event) => handlePocketKeyDown(event, pocket, children, expanded)}
              onMouseEnter={() => {
                if (!expanded && children.length > 0) startPeek(pocket.id);
              }}
              onMouseLeave={() => {
                clearPeekTimer();
                setPeekedPocketId(null);
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-rune-pocket-id", pocket.id);
              }}
              onDragEnter={() => startSpringOpen(pocket.id)}
              onDragLeave={clearSpringTimer}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                clearSpringTimer();
                const draggedPocketId = event.dataTransfer.getData("application/x-rune-pocket-id");
                if (draggedPocketId) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = rect.height === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;
                  const placement = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
                  void props
                    .onPocketDrop(pocket.id, PocketId.make(draggedPocketId), placement)
                    .then(props.onUndoReady);
                  return;
                }
                const encodedThreadKeys = event.dataTransfer.getData(
                  "application/x-rune-thread-keys",
                );
                const encodedFilePaths = event.dataTransfer.getData(
                  "application/x-rune-pocket-files",
                );
                if (encodedFilePaths) {
                  try {
                    const relativePaths = JSON.parse(encodedFilePaths) as unknown;
                    if (
                      Array.isArray(relativePaths) &&
                      relativePaths.every((path) => typeof path === "string")
                    ) {
                      void props.onFileDrop(pocket.id, relativePaths).then(props.onUndoReady);
                    }
                  } catch {
                    // Ignore malformed drag payloads from other applications.
                  }
                  return;
                }
                if (!encodedThreadKeys) return;
                try {
                  const threadKeys = JSON.parse(encodedThreadKeys) as unknown;
                  if (
                    !Array.isArray(threadKeys) ||
                    !threadKeys.every((key) => typeof key === "string")
                  )
                    return;
                  void props.onThreadDrop(pocket.id, threadKeys).then(props.onUndoReady);
                } catch {
                  // Ignore malformed drag payloads from other applications.
                }
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Enter Pocket ${pocket.title}`}
            >
              <LayersIcon className="size-4 shrink-0 text-sidebar-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{pocket.title}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-sidebar-muted-foreground/60">
                {props.snapshot ? pocketThreadCount(props.snapshot, pocket.id) : 0}
              </span>
            </button>
          )}
          <Menu>
            <MenuTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost-muted"
                  className="size-6 shrink-0 opacity-0 transition-opacity group-hover/pocket:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
                  aria-label={`Actions for ${pocket.title}`}
                  data-rune-action="pocket.menu"
                />
              }
            >
              <MoreHorizontalIcon className="size-3.5" />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuItem
                onClick={() => {
                  setNewPocketParentId(pocket.id);
                  setNewPocketName("");
                  setExpandedIds((current) => new Set([...current, pocket.id]));
                }}
              >
                <PlusIcon />
                Add sub-Pocket
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setEditingPocketId(pocket.id);
                  setEditingName(pocket.title);
                }}
              >
                Rename Pocket
              </MenuItem>
              <MenuItem
                onClick={() => void props.onPocketReorder(pocket.id, -1).then(props.onUndoReady)}
              >
                Move Pocket up
              </MenuItem>
              <MenuItem
                onClick={() => void props.onPocketReorder(pocket.id, 1).then(props.onUndoReady)}
              >
                Move Pocket down
              </MenuItem>
              <MenuItem
                onClick={() =>
                  void props.onDispatch({ type: "pocket.archive", pocketId: pocket.id })
                }
              >
                <ArchiveIcon />
                Archive Pocket
              </MenuItem>
              <MenuItem
                variant="destructive"
                onClick={() => void props.onDispatch({ type: "pocket.trash", pocketId: pocket.id })}
              >
                <Trash2Icon />
                Move Pocket to Trash
              </MenuItem>
            </MenuPopup>
          </Menu>
        </SidebarEntityRow>
        {peekedPocketId === pocket.id &&
        !expanded &&
        (children.length > 0 || (pocketThreadsById.get(pocket.id)?.length ?? 0) > 0) ? (
          <div
            aria-label={`${pocket.title} prioritized threads`}
            role="status"
            data-rune-pocket-peek
            className="rune-pocket-peek pointer-events-none absolute inset-x-2 top-full z-10 translate-y-1.5 rounded-md border border-sidebar-border/70 bg-sidebar px-2 py-1 text-[11px] text-sidebar-muted-foreground opacity-100 shadow-md transition-[opacity,transform] duration-[var(--rune-motion-fast)] motion-reduce:translate-y-0 motion-reduce:transition-none"
          >
            {selectPocketPeekThreads(pocketThreadsById.get(pocket.id) ?? []).map((thread) => (
              <div
                key={thread.id}
                className="flex min-w-0 items-center gap-1.5 py-0.5"
                data-rune-pocket-peek-thread={thread.id}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full bg-sidebar-muted-foreground/50",
                    thread.status === "working" && "bg-sidebar-ring",
                    thread.status === "needs-you" && "bg-amber-400",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{thread.title}</span>
              </div>
            ))}
            {children.slice(0, 4).map((child) => (
              <div key={child.id} className="truncate py-0.5 text-sidebar-muted-foreground/75">
                <span className="me-1 text-sidebar-muted-foreground/60">├</span>
                {child.title}
              </div>
            ))}
            {children.length > 4 ? (
              <div className="py-0.5 text-sidebar-muted-foreground/65">+{children.length - 4}</div>
            ) : null}
          </div>
        ) : null}
        {expanded && children.length > 0 ? (
          <ul role="group" className="flex flex-col gap-px">
            {children.map((child) => renderPocket(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <section
      className="mt-2 border-t border-sidebar-border/50 pt-2"
      data-rune-sidebar-section="pockets"
    >
      {props.selectedPocketId !== null ? (
        <div className="mb-1 flex items-center gap-1 px-1.5">
          <button
            type="button"
            data-rune-action="pocket.exit-focus"
            onClick={() => props.onSelectPocket(null)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 text-left text-[11px] text-sidebar-muted-foreground hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Exit Pocket Focus"
          >
            <ChevronRightIcon className="size-3 shrink-0 rotate-180" aria-hidden />
            <span>All Pockets</span>
            <span aria-hidden>/</span>
            <span className="min-w-0 truncate text-sidebar-foreground">
              {selectedPocket?.title ?? "Pocket"}
            </span>
          </button>
          {selectedPocket && !workspaceOpen ? (
            <Button
              type="button"
              size="xs"
              variant="ghost-muted"
              data-rune-action="pocket.open-workspace"
              onClick={() => setWorkspaceOpen(true)}
            >
              Open workspace
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2 px-1.5 pb-1">
        <LayersIcon className="size-3.5 text-sidebar-muted-foreground/75" />
        <span className="flex-1 font-mono text-[10px] font-medium tracking-[0.12em] text-sidebar-muted-foreground/65 uppercase">
          Pockets
        </span>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost-muted"
          aria-label="Add Pocket"
          data-rune-action="pocket.create"
          className="size-6"
          onClick={() => {
            setNewPocketParentId(null);
            setNewPocketName("");
          }}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
      {newPocketParentId !== undefined ? (
        <form
          onSubmit={(event) => void submitNewPocket(event)}
          className="mb-1 flex items-center gap-1 px-1"
        >
          <input
            autoFocus
            value={newPocketName}
            onChange={(event) => setNewPocketName(event.target.value)}
            placeholder={newPocketParentId === null ? "New Pocket…" : "New sub-Pocket…"}
            aria-label={newPocketParentId === null ? "New Pocket name" : "New sub-Pocket name"}
            className="min-w-0 flex-1 rounded-md border border-sidebar-border/70 bg-sidebar-control-surface/65 px-2 py-1 text-xs text-sidebar-foreground outline-none placeholder:text-sidebar-muted-foreground/55 focus:border-sidebar-ring focus:ring-2 focus:ring-sidebar-ring/25"
          />
          <Button type="submit" size="icon-xs" variant="ghost-muted" aria-label="Create Pocket">
            <PlusIcon className="size-3.5" />
          </Button>
        </form>
      ) : null}
      {workspaceOpen && selectedPocket ? (
        <PocketWorkspace
          pocketId={selectedPocket.id}
          title={selectedPocket.title}
          threads={workspaceThreads}
          children={activePockets
            .filter((pocket) => pocket.parentPocketId === selectedPocket.id)
            .map((pocket) => ({
              id: pocket.id,
              title: pocket.title,
              threadCount: props.snapshot ? pocketThreadCount(props.snapshot, pocket.id) : 0,
            }))}
          fileReferenceCount={
            props.snapshot
              ? props.snapshot.fileReferences.filter((reference) =>
                  pocketDescendantIds(props.snapshot!, selectedPocket.id).has(reference.pocketId),
                ).length
              : 0
          }
          onClose={() => setWorkspaceOpen(false)}
          onOpenThread={(thread) => {
            const source = props.threads.find((candidate) => candidate.id === thread.id);
            if (source) props.onThreadActivate(scopeThreadRef(source.environmentId, source.id));
          }}
          renderProviderMark={renderProviderMark}
        />
      ) : null}
      {activePockets.length > 0 ? (
        <ul
          role="tree"
          aria-label="Pockets"
          data-rune-pocket-tree="true"
          onKeyDown={handleTreeKeyDown}
          className="flex flex-col gap-px"
        >
          {(pocketsByParent.get(null) ?? []).map((pocket) => renderPocket(pocket, 0))}
        </ul>
      ) : (
        <p className="px-2 py-1 text-[11px] text-sidebar-muted-foreground/55">
          Organize threads into reusable workspaces.
        </p>
      )}
    </section>
  );
}
