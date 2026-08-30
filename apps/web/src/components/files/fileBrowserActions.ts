import type { ContextMenuItem, ProjectEntry } from "@rune/contracts";

export type FileBrowserContextMenuAction =
  | "open-file"
  | "open-diff"
  | "new-file"
  | "new-folder"
  | "rename-entry"
  | "delete-entry"
  | "open-in-explorer"
  | "folder-actions"
  | "copy-path"
  | "copy-mention"
  | "add-to-chat"
  | "expand-folder"
  | "expand-descendants"
  | "expand-all-folders"
  | "collapse-folder"
  | "collapse-descendants"
  | "collapse-all-folders";

export type FileBrowserBackgroundContextMenuAction =
  | "new-file"
  | "new-folder"
  | "refresh"
  | "expand-all"
  | "collapse-all"
  | "reveal-workspace";

export function fileBrowserEntryContextMenuItems(options: {
  readonly kind: ProjectEntry["kind"];
  readonly isExpanded?: boolean;
  readonly chatScoped: boolean;
  readonly isChanged?: boolean;
  readonly canOpenDiff?: boolean;
  readonly fileManagerName: string;
}): readonly ContextMenuItem<FileBrowserContextMenuAction>[] {
  const folderActions: ContextMenuItem<FileBrowserContextMenuAction> = {
    id: "folder-actions",
    label: "Folder actions",
    icon: "folder-tree",
    children:
      options.isExpanded === true
        ? [
            { id: "collapse-folder", label: "Collapse folder", icon: "chevron-down" },
            { id: "collapse-descendants", label: "Collapse descendants", icon: "chevron-down" },
            { id: "collapse-all-folders", label: "Collapse all folders", icon: "folder-tree" },
          ]
        : [
            { id: "expand-folder", label: "Expand folder", icon: "chevron-right" },
            { id: "expand-descendants", label: "Expand descendants", icon: "chevron-down" },
            { id: "expand-all-folders", label: "Expand all folders", icon: "folder-tree" },
          ],
  };

  if (options.kind === "directory") {
    return [
      { id: "new-file", label: "New File", icon: "file-plus", disabled: options.chatScoped },
      { id: "new-folder", label: "New Folder", icon: "folder-plus", disabled: options.chatScoped },
      {
        id: "rename-entry",
        label: "Rename",
        icon: "pencil",
        disabled: options.chatScoped,
        separatorBefore: true,
      },
      { id: "delete-entry", label: "Delete", icon: "trash", destructive: true },
      {
        id: "open-in-explorer",
        label: `Reveal in ${options.fileManagerName}`,
        icon: "external-link",
        separatorBefore: true,
      },
      { ...folderActions, separatorBefore: true },
      { id: "copy-path", label: "Copy Path", icon: "copy" },
      {
        id: "add-to-chat",
        label: "Add to Chat",
        icon: "message-square-plus",
        separatorBefore: true,
      },
    ];
  }

  const fileItems: ContextMenuItem<FileBrowserContextMenuAction>[] = [
    { id: "open-file", label: "Open preview / editor", icon: "file-code" },
    ...(options.isChanged && options.canOpenDiff
      ? [
          {
            id: "open-diff",
            label: "Open diff",
            icon: "file-diff",
          } satisfies ContextMenuItem<FileBrowserContextMenuAction>,
        ]
      : []),
    {
      id: "rename-entry",
      label: "Rename",
      icon: "pencil",
      disabled: options.chatScoped,
      separatorBefore: true,
    },
    { id: "delete-entry", label: "Delete", icon: "trash", destructive: true },
    {
      id: "open-in-explorer",
      label: `Reveal in ${options.fileManagerName}`,
      icon: "external-link",
      separatorBefore: true,
    },
    { id: "copy-path", label: "Copy Path", icon: "copy" },
    { id: "copy-mention", label: "Copy mention", icon: "copy" },
    {
      id: "add-to-chat",
      label: "Add to Chat",
      icon: "message-square-plus",
      separatorBefore: true,
    },
  ];
  return fileItems;
}

export function fileBrowserBackgroundContextMenuItems(options: {
  readonly chatScoped: boolean;
}): readonly ContextMenuItem<FileBrowserBackgroundContextMenuAction>[] {
  return [
    { id: "new-file", label: "New File", icon: "file-plus", disabled: options.chatScoped },
    { id: "new-folder", label: "New Folder", icon: "folder-plus", disabled: options.chatScoped },
    { id: "refresh", label: "Refresh", icon: "refresh-cw", separatorBefore: true },
    { id: "expand-all", label: "Expand all", icon: "folder-tree" },
    { id: "collapse-all", label: "Collapse all", icon: "folder-tree" },
    {
      id: "reveal-workspace",
      label: "Reveal workspace",
      icon: "external-link",
      separatorBefore: true,
    },
  ];
}

export function relativeEntryTarget(
  item: Pick<ProjectEntry, "kind" | "path">,
  name: string,
): string {
  const parent =
    item.kind === "directory" ? item.path : item.path.slice(0, item.path.lastIndexOf("/"));
  return parent ? `${parent.replace(/[\\/]$/, "")}/${name}` : name;
}

export function deletionConfirmationMessage(item: Pick<ProjectEntry, "kind" | "path">): string {
  const suffix = item.kind === "directory" ? " and everything inside it" : "";
  return `Delete ${item.path}${suffix}?`;
}
