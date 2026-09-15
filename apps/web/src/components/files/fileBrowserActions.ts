import type { ContextMenuItem, ProjectEntry } from "@rune/contracts";

export type FileBrowserFolderAction =
  | "expand-folder"
  | "expand-descendants"
  | "expand-all-folders"
  | "collapse-folder"
  | "collapse-descendants"
  | "collapse-all-folders";

export type FileBrowserWorkspaceAction =
  | "new-file"
  | "new-folder"
  | "refresh"
  | "expand-all-folders"
  | "collapse-all-folders"
  | "reveal-workspace";

export function folderActionItems(input: {
  readonly expanded: boolean;
  readonly disabled?: boolean;
}): readonly ContextMenuItem<FileBrowserFolderAction>[] {
  const disabled = input.disabled ?? false;
  return input.expanded
    ? [
        { id: "collapse-folder", label: "Collapse folder", icon: "chevron-up", disabled },
        {
          id: "collapse-descendants",
          label: "Collapse descendants",
          icon: "chevrons-up",
          disabled,
        },
        {
          id: "collapse-all-folders",
          label: "Collapse all folders",
          icon: "fold-vertical",
          disabled,
        },
      ]
    : [
        { id: "expand-folder", label: "Expand folder", icon: "chevron-down", disabled },
        {
          id: "expand-descendants",
          label: "Expand descendants",
          icon: "chevrons-down",
          disabled,
        },
        {
          id: "expand-all-folders",
          label: "Expand all folders",
          icon: "unfold-vertical",
          disabled,
        },
      ];
}

export function folderContextMenuItems(input: {
  readonly expanded: boolean;
  readonly chatScoped: boolean;
  readonly fileManagerName: string;
}): readonly ContextMenuItem[] {
  return [
    { id: "new-file", label: "New File", icon: "file-plus", disabled: input.chatScoped },
    { id: "new-folder", label: "New Folder", icon: "folder-plus", disabled: input.chatScoped },
    {
      id: "rename-entry",
      label: "Rename",
      icon: "pencil",
      disabled: input.chatScoped,
      separatorBefore: true,
    },
    { id: "delete-entry", label: "Delete", icon: "trash", destructive: true },
    {
      id: "open-in-explorer",
      label: `Reveal in ${input.fileManagerName}`,
      icon: "external-link",
      separatorBefore: true,
    },
    { id: "copy-path", label: "Copy Path", icon: "copy" },
    {
      id: "folder-actions",
      label: "Folder actions",
      icon: "folder-cog",
      separatorBefore: true,
      // Navigation remains available in chat-scoped/read-only trees. Only
      // filesystem mutations are disabled by chat scope.
      children: folderActionItems({ expanded: input.expanded }),
    },
    {
      id: "add-to-chat",
      label: "Add to Chat",
      icon: "message-square-plus",
      separatorBefore: true,
    },
  ];
}

export function fileContextMenuItems(input: {
  readonly chatScoped: boolean;
  readonly fileManagerName: string;
  readonly isChanged: boolean;
}): readonly ContextMenuItem[] {
  return [
    { id: "open-file", label: "Open preview / editor", icon: "file-code" },
    ...(input.isChanged
      ? [{ id: "open-diff", label: "Open diff", icon: "file-diff" }]
      : []),
    {
      id: "rename-entry",
      label: "Rename",
      icon: "pencil",
      disabled: input.chatScoped,
      separatorBefore: true,
    },
    { id: "delete-entry", label: "Delete", icon: "trash", destructive: true },
    {
      id: "open-in-explorer",
      label: `Reveal in ${input.fileManagerName}`,
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
}

export function workspaceContextMenuItems(input: {
  readonly chatScoped: boolean;
  readonly fileManagerName: string;
}): readonly ContextMenuItem<FileBrowserWorkspaceAction>[] {
  return [
    { id: "new-file", label: "New File", icon: "file-plus", disabled: input.chatScoped },
    { id: "new-folder", label: "New Folder", icon: "folder-plus", disabled: input.chatScoped },
    { id: "refresh", label: "Refresh", icon: "refresh-cw", separatorBefore: true },
    {
      id: "expand-all-folders",
      label: "Expand all folders",
      icon: "unfold-vertical",
    },
    {
      id: "collapse-all-folders",
      label: "Collapse all folders",
      icon: "fold-vertical",
    },
    {
      id: "reveal-workspace",
      label: `Reveal workspace in ${input.fileManagerName}`,
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
