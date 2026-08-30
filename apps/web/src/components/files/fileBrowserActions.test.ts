import { describe, expect, it } from "vite-plus/test";

import {
  fileContextMenuItems,
  folderActionItems,
  folderContextMenuItems,
  workspaceContextMenuItems,
} from "./fileBrowserActions";

describe("file browser context menu actions", () => {
  it("exposes the state-aware folder actions submenu", () => {
    const collapsed = folderContextMenuItems({
      expanded: false,
      chatScoped: false,
      fileManagerName: "Explorer",
    });
    const expanded = folderContextMenuItems({
      expanded: true,
      chatScoped: false,
      fileManagerName: "Explorer",
    });

    expect(collapsed.find((item) => item.id === "folder-actions")?.children?.map((item) => item.label)).toEqual([
      "Expand folder",
      "Expand descendants",
      "Expand all folders",
    ]);
    expect(expanded.find((item) => item.id === "folder-actions")?.children?.map((item) => item.label)).toEqual([
      "Collapse folder",
      "Collapse descendants",
      "Collapse all folders",
    ]);
  });

  it("keeps folder-only actions out of file menus and disables workspace mutation in chat scope", () => {
    const fileItems = fileContextMenuItems({
      chatScoped: false,
      fileManagerName: "Explorer",
      isChanged: true,
    });
    const workspaceItems = workspaceContextMenuItems({
      chatScoped: true,
      fileManagerName: "Explorer",
    });

    expect(fileItems.some((item) => item.id === "folder-actions")).toBe(false);
    expect(fileItems.some((item) => item.id === "open-diff")).toBe(true);
    expect(workspaceItems.find((item) => item.id === "new-file")?.disabled).toBe(true);
    expect(workspaceItems.find((item) => item.id === "expand-all-folders")?.disabled).toBeUndefined();
    expect(workspaceItems.map((item) => item.label)).toEqual([
      "New File",
      "New Folder",
      "Refresh",
      "Expand all folders",
      "Collapse all folders",
      "Reveal workspace in Explorer",
    ]);
  });

  it("switches folder action state without changing the action vocabulary", () => {
    expect(folderActionItems({ expanded: false }).map((item) => item.id)).toEqual([
      "expand-folder",
      "expand-descendants",
      "expand-all-folders",
    ]);
    expect(folderActionItems({ expanded: true }).map((item) => item.id)).toEqual([
      "collapse-folder",
      "collapse-descendants",
      "collapse-all-folders",
    ]);
  });
});
