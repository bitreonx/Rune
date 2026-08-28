import * as Schema from "effect/Schema";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  designForPreset,
  folderAndDescendantIds,
  visibleFolderIds,
  THREAD_DESIGN_PRESETS,
  type FolderRecord,
  type ThreadOrganizationState,
  type ThreadDesignPreset,
} from "../../threadOrganization";
import { useThreadOrganizationStore } from "../../threadOrganizationStore";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";

interface FolderSidebarSectionProps {
  projectScopeKeys: ReadonlySet<string> | null;
  threadProjectKeysByThreadKey: Readonly<Record<string, string>>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

function newFolderId(): string {
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function folderCount(
  folder: FolderRecord,
  state: ThreadOrganizationState,
  threadFolderByKey: Readonly<Record<string, string | null>>,
  threadProjectKeysByThreadKey: Readonly<Record<string, string>>,
  projectScopeKeys: ReadonlySet<string> | null,
): number {
  const ids = folderAndDescendantIds(state, folder.id);
  return Object.entries(threadFolderByKey).filter(([threadKey, folderId]) => {
    return (
      folderId !== null &&
      ids.has(folderId) &&
      (projectScopeKeys === null ||
        projectScopeKeys.has(threadProjectKeysByThreadKey[threadKey] ?? ""))
    );
  }).length;
}

function folderProjectCount(
  folder: FolderRecord,
  state: ThreadOrganizationState,
  threadFolderByKey: Readonly<Record<string, string | null>>,
  threadProjectKeysByThreadKey: Readonly<Record<string, string>>,
): number {
  const ids = folderAndDescendantIds(state, folder.id);
  return new Set(
    Object.entries(threadFolderByKey)
      .filter(([, folderId]) => folderId !== null && ids.has(folderId))
      .map(([threadKey]) => threadProjectKeysByThreadKey[threadKey])
      .filter((projectKey): projectKey is string => Boolean(projectKey)),
  ).size;
}

export function FolderSidebarSection(props: FolderSidebarSectionProps) {
  const organization = useThreadOrganizationStore();
  const [showEmptyFolders, setShowEmptyFolders] = useLocalStorage(
    "rune:sidebar:show-empty-folders",
    false,
    Schema.Boolean,
  );
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderEditorOpen, setNewFolderEditorOpen] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const visibleIds = useMemo(
    () =>
      visibleFolderIds(
        organization,
        props.threadProjectKeysByThreadKey,
        props.projectScopeKeys,
        showEmptyFolders,
      ),
    [organization, props.projectScopeKeys, props.threadProjectKeysByThreadKey, showEmptyFolders],
  );
  const foldersByParent = useMemo(() => {
    const result = new Map<string | null, FolderRecord[]>();
    for (const folder of Object.values(organization.folders)) {
      if (folder.trashedAt !== null || folder.archivedAt !== null || !visibleIds.has(folder.id)) {
        continue;
      }
      const siblings = result.get(folder.parentId) ?? [];
      siblings.push(folder);
      result.set(folder.parentId, siblings);
    }
    for (const siblings of result.values()) {
      siblings.sort(
        (left, right) => left.order - right.order || left.name.localeCompare(right.name),
      );
    }
    return result;
  }, [organization.folders, visibleIds]);
  const selectedFolder = props.selectedFolderId
    ? (organization.folders[props.selectedFolderId] ?? null)
    : null;
  const trashedFolders = useMemo(
    () => Object.values(organization.folders).filter((folder) => folder.trashedAt !== null),
    [organization.folders],
  );
  const selectedFolderDescendants = selectedFolder
    ? folderAndDescendantIds(organization, selectedFolder.id)
    : new Set<string>();
  const selectedFolderProjectCount = selectedFolder
    ? folderProjectCount(
        selectedFolder,
        organization,
        organization.threadFolderByKey,
        props.threadProjectKeysByThreadKey,
      )
    : 0;
  const parentChoices = useMemo(
    () =>
      Object.values(organization.folders)
        .filter(
          (folder) =>
            folder.id !== selectedFolder?.id &&
            folder.trashedAt === null &&
            folder.archivedAt === null &&
            !selectedFolderDescendants.has(folder.id),
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [organization.folders, selectedFolder?.id, selectedFolderDescendants],
  );
  const [trashExpanded, setTrashExpanded] = useState(false);

  useEffect(() => {
    organization.purgeExpiredTrash();
  }, [organization.purgeExpiredTrash]);

  useEffect(() => {
    if (selectedFolder === null) {
      setEditingName("");
      setEditingDescription("");
      return;
    }
    setEditingName(selectedFolder.name);
    setEditingDescription(selectedFolder.description);
    setExpandedIds(
      (current) =>
        new Set([...current, ...folderAndDescendantIds(organization, selectedFolder.id)]),
    );
  }, [organization, selectedFolder]);

  const toggleExpanded = (folderId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const submitNewFolder = (event: FormEvent) => {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const id = newFolderId();
    organization.createFolder({ id, name, parentId: newFolderParentId });
    setNewFolderName("");
    setNewFolderParentId(null);
    setNewFolderEditorOpen(false);
    if (newFolderParentId !== null)
      setExpandedIds((current) => new Set([...current, newFolderParentId]));
    props.onSelectFolder(id);
  };

  const saveSelectedFolder = () => {
    if (!selectedFolder) return;
    organization.updateFolder(selectedFolder.id, {
      name: editingName,
      description: editingDescription,
    });
  };

  const renderFolder = (folder: FolderRecord, depth: number): ReactNode => {
    const children = foldersByParent.get(folder.id) ?? [];
    const expanded = expandedIds.has(folder.id);
    const selected = props.selectedFolderId === folder.id;
    const count = folderCount(
      folder,
      organization,
      organization.threadFolderByKey,
      props.threadProjectKeysByThreadKey,
      props.projectScopeKeys,
    );
    return (
      <li key={folder.id} className="list-none" data-rune-folder-id={folder.id}>
        <div
          className={cn(
            "group/folder flex min-h-8 items-center gap-1 rounded-lg border border-transparent px-1 text-sm transition-colors",
            selected
              ? "border-sidebar-border/80 bg-sidebar-row-active text-sidebar-foreground shadow-[inset_0_1px_0_rgb(255_255_255/8%)]"
              : "text-sidebar-muted-foreground hover:border-sidebar-border/60 hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
          )}
          style={{ paddingInlineStart: `${depth * 12 + 4}px` }}
          data-rune-folder-design={folder.defaultDesign?.preset ?? "slate-minimal"}
          title={folder.description || undefined}
        >
          {children.length > 0 ? (
            <button
              type="button"
              aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
              onClick={() => toggleExpanded(folder.id)}
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
          <button
            type="button"
            onClick={() => props.onSelectFolder(selected ? null : folder.id)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={selected}
          >
            {folder.icon ? (
              <span className="size-4 shrink-0 text-center text-xs leading-4" aria-hidden>
                {folder.icon}
              </span>
            ) : (
              <FolderIcon className="size-4 shrink-0 text-[var(--rune-folder-accent)]" />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-sidebar-muted-foreground/60">
              {count}
            </span>
          </button>
          <Menu>
            <MenuTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost-muted"
                  className="size-6 shrink-0 opacity-0 transition-opacity group-hover/folder:opacity-100 focus-visible:opacity-100"
                  aria-label={`Actions for ${folder.name}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-3.5" />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuItem
                onClick={() => {
                  setNewFolderParentId(folder.id);
                  setNewFolderName("");
                  setNewFolderEditorOpen(true);
                }}
              >
                <FolderPlusIcon />
                Add subfolder
              </MenuItem>
              <MenuItem onClick={() => props.onSelectFolder(folder.id)}>
                <PaletteIcon />
                Customize folder
              </MenuItem>
              <MenuItem onClick={() => organization.archiveFolder(folder.id)}>
                <ArchiveIcon />
                Archive folder
              </MenuItem>
              <MenuItem variant="destructive" onClick={() => organization.trashFolder(folder.id)}>
                <Trash2Icon />
                Move folder to Trash
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
        {expanded && children.length > 0 ? (
          <ul className="flex flex-col gap-px">
            {children.map((child) => renderFolder(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <section
      className="rune-folder-section mt-2 border-t border-sidebar-border/50 pt-2"
      data-rune-sidebar-section="folders"
    >
      <div className="flex items-center gap-2 px-1.5 pb-1">
        <FolderIcon className="size-3.5 text-sidebar-muted-foreground/75" />
        <span className="flex-1 font-mono text-[10px] font-medium tracking-[0.12em] text-sidebar-muted-foreground/65 uppercase">
          Folders
        </span>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost-muted"
          aria-label="Add folder"
          className="size-6"
          onClick={() => {
            setNewFolderParentId(null);
            setNewFolderName("");
            setNewFolderEditorOpen(true);
          }}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
      <form onSubmit={submitNewFolder} className="mb-1 flex items-center gap-1 px-1">
        <input
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          placeholder={newFolderParentId ? "New subfolder…" : "New folder…"}
          aria-label={newFolderParentId ? "New subfolder name" : "New folder name"}
          className={cn(
            "min-w-0 flex-1 rounded-md border border-sidebar-border/70 bg-sidebar-control-surface/65 px-2 py-1 text-xs text-sidebar-foreground outline-none placeholder:text-sidebar-muted-foreground/55 focus:border-sidebar-ring focus:ring-2 focus:ring-sidebar-ring/25",
            !newFolderEditorOpen && "hidden",
          )}
          autoFocus={newFolderEditorOpen}
        />
        {newFolderName ? (
          <Button type="submit" size="icon-xs" variant="ghost-muted" aria-label="Create folder">
            <PlusIcon className="size-3.5" />
          </Button>
        ) : null}
      </form>
      {foldersByParent.get(null)?.length ? (
        <ul className="flex flex-col gap-px">
          {foldersByParent.get(null)?.map((folder) => renderFolder(folder, 0))}
        </ul>
      ) : (
        <p className="px-2 py-1 text-[11px] text-sidebar-muted-foreground/55">
          Organize threads into calm, reusable spaces.
        </p>
      )}
      <button
        type="button"
        className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] text-sidebar-muted-foreground/60 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
        onClick={() => setShowEmptyFolders((value) => !value)}
        aria-pressed={showEmptyFolders}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            showEmptyFolders ? "bg-[var(--rune-folder-accent)]" : "bg-sidebar-muted-foreground/35",
          )}
        />
        Show empty folders
      </button>
      {selectedFolder ? (
        <div
          className="mt-2 rounded-xl border border-sidebar-border/70 bg-sidebar-control-surface/55 p-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/7%)] backdrop-blur-xl"
          data-rune-folder-details
        >
          <div className="mb-2 flex items-start gap-2">
            {selectedFolder.icon ? (
              <span className="mt-0.5 size-4 shrink-0 text-center text-xs leading-4" aria-hidden>
                {selectedFolder.icon}
              </span>
            ) : (
              <FolderIcon className="mt-0.5 size-4 shrink-0 text-[var(--rune-folder-accent)]" />
            )}
            <div className="min-w-0 flex-1">
              <input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={saveSelectedFolder}
                aria-label="Folder name"
                className="w-full min-w-0 rounded-sm bg-transparent text-sm font-semibold text-sidebar-foreground outline-none focus:ring-2 focus:ring-sidebar-ring/30"
              />
              <div className="text-[10px] text-sidebar-muted-foreground/60">
                {folderCount(
                  selectedFolder,
                  organization,
                  organization.threadFolderByKey,
                  props.threadProjectKeysByThreadKey,
                  props.projectScopeKeys,
                )} threads · {selectedFolderProjectCount} projects
              </div>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost-muted"
              aria-label="Close folder details"
              className="size-6"
              onClick={() => props.onSelectFolder(null)}
            >
              <ChevronDownIcon className="size-3.5 rotate-90" />
            </Button>
          </div>
          <textarea
            value={editingDescription}
            onChange={(event) => setEditingDescription(event.target.value)}
            onBlur={saveSelectedFolder}
            placeholder="Add a short description…"
            aria-label="Folder description"
            rows={2}
            className="mb-2 w-full resize-none rounded-md border border-sidebar-border/60 bg-sidebar/35 px-2 py-1.5 text-[11px] text-sidebar-foreground outline-none placeholder:text-sidebar-muted-foreground/45 focus:border-sidebar-ring focus:ring-2 focus:ring-sidebar-ring/20"
          />
          <label className="mb-2 flex items-center gap-2 text-[11px] text-sidebar-muted-foreground">
            <span className="size-3.5 text-center text-xs leading-3.5" aria-hidden>
              {selectedFolder.icon ?? "□"}
            </span>
            <span className="flex-1">Folder icon</span>
            <input
              key={selectedFolder.id}
              defaultValue={selectedFolder.icon ?? ""}
              maxLength={2}
              onBlur={(event) =>
                organization.updateFolder(selectedFolder.id, {
                  icon: event.target.value.trim().slice(0, 2) || null,
                })
              }
              aria-label="Folder icon"
              placeholder="□"
              className="w-12 rounded-md border border-sidebar-border/70 bg-sidebar-control-surface px-1.5 py-1 text-center text-xs text-sidebar-foreground outline-none focus:ring-2 focus:ring-sidebar-ring/25"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-sidebar-muted-foreground">
            <PaletteIcon className="size-3.5 text-[var(--rune-folder-accent)]" />
            <span className="flex-1">Folder style</span>
            <select
              value={selectedFolder.defaultDesign?.preset ?? "slate-minimal"}
              onChange={(event) =>
                organization.updateFolder(selectedFolder.id, {
                  defaultDesign: designForPreset(event.target.value as ThreadDesignPreset),
                })
              }
              aria-label="Folder style"
              className="max-w-32 rounded-md border border-sidebar-border/70 bg-sidebar-control-surface px-1.5 py-1 text-[10px] text-sidebar-foreground outline-none focus:ring-2 focus:ring-sidebar-ring/25"
            >
              {THREAD_DESIGN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-sidebar-muted-foreground">
            <FolderIcon className="size-3.5 text-sidebar-muted-foreground/70" />
            <span className="flex-1">Parent folder</span>
            <select
              value={selectedFolder.parentId ?? "root"}
              onChange={(event) =>
                organization.moveFolder(
                  selectedFolder.id,
                  event.target.value === "root" ? null : event.target.value,
                )
              }
              aria-label="Parent folder"
              className="max-w-32 rounded-md border border-sidebar-border/70 bg-sidebar-control-surface px-1.5 py-1 text-[10px] text-sidebar-foreground outline-none focus:ring-2 focus:ring-sidebar-ring/25"
            >
              <option value="root">Root</option>
              {parentChoices.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost-muted"
              className="h-7 flex-1 text-[11px]"
              onClick={() => {
                setNewFolderParentId(selectedFolder.id);
                setNewFolderName("");
                setNewFolderEditorOpen(true);
              }}
            >
              <FolderPlusIcon className="size-3.5" />
              Subfolder
            </Button>
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost-muted"
                    className="h-7 px-2"
                    aria-label="Folder lifecycle actions"
                  />
                }
              >
                <MoreHorizontalIcon className="size-3.5" />
              </MenuTrigger>
              <MenuPopup align="end">
                {selectedFolder.archivedAt ? (
                  <MenuItem onClick={() => organization.restoreFolder(selectedFolder.id)}>
                    <RotateCcwIcon />
                    Restore folder
                  </MenuItem>
                ) : (
                  <MenuItem onClick={() => organization.archiveFolder(selectedFolder.id)}>
                    <ArchiveIcon />
                    Archive folder
                  </MenuItem>
                )}
                <MenuItem
                  variant="destructive"
                  onClick={() => organization.trashFolder(selectedFolder.id)}
                >
                  <Trash2Icon />
                  Move folder to Trash
                </MenuItem>
              </MenuPopup>
            </Menu>
          </div>
        </div>
      ) : null}
      {trashedFolders.length > 0 ? (
        <div className="mt-2 border-t border-sidebar-border/50 pt-2" data-rune-folder-trash>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] text-sidebar-muted-foreground/65 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
            onClick={() => setTrashExpanded((expanded) => !expanded)}
            aria-expanded={trashExpanded}
          >
            <Trash2Icon className="size-3.5" />
            <span className="flex-1">Folder Trash</span>
            <span className="font-mono text-[10px] tabular-nums">{trashedFolders.length}</span>
            <ChevronDownIcon className={cn("size-3", trashExpanded && "rotate-180")} />
          </button>
          {trashExpanded ? (
            <div className="mt-1 flex flex-col gap-1">
              {trashedFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-2 rounded-md bg-sidebar-control-surface/45 px-2 py-1.5 text-[11px]"
                >
                  <FolderIcon className="size-3.5 shrink-0 text-sidebar-muted-foreground/60" />
                  <span className="min-w-0 flex-1 truncate text-sidebar-muted-foreground">
                    {folder.name}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost-muted"
                    aria-label={`Restore ${folder.name}`}
                    className="size-6"
                    onClick={() => organization.restoreFolder(folder.id)}
                  >
                    <RotateCcwIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
              <label className="flex items-center justify-between px-1 text-[10px] text-sidebar-muted-foreground/55">
                Retention
                <select
                  value={organization.trashRetentionDays}
                  onChange={(event) =>
                    organization.setTrashRetentionDays(
                      Number(event.target.value) as 1 | 5 | 14 | 30 | 90,
                    )
                  }
                  aria-label="Trash retention"
                  className="rounded border border-sidebar-border/60 bg-sidebar-control-surface px-1 py-0.5 text-[10px] text-sidebar-foreground"
                >
                  {[1, 5, 14, 30, 90].map((days) => (
                    <option key={days} value={days}>
                      {days} days
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
