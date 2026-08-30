import { describe, expect, it } from "vitest";

import {
  deletionConfirmationMessage,
  fileBrowserBackgroundContextMenuItems,
  fileBrowserEntryContextMenuItems,
  relativeEntryTarget,
} from "./fileBrowserActions";

describe("file browser action outcomes", () => {
  it("creates a child path for a directory", () => {
    expect(relativeEntryTarget({ kind: "directory", path: "src" }, "main.ts")).toBe("src/main.ts");
  });

  it("creates a sibling path for a file", () => {
    expect(relativeEntryTarget({ kind: "file", path: "src/main.ts" }, "app.ts")).toBe("src/app.ts");
  });

  it("uses a destructive confirmation message for recursive deletion", () => {
    expect(deletionConfirmationMessage({ kind: "directory", path: "src" })).toBe(
      "Delete src and everything inside it?",
    );
  });
});

describe("file browser entry context menu", () => {
  it("offers expansion actions for a collapsed folder", () => {
    const items = fileBrowserEntryContextMenuItems({
      kind: "directory",
      isExpanded: false,
      chatScoped: false,
      fileManagerName: "File Explorer",
    });
    const folderActions = items.find((item) => item.id === "folder-actions");

    expect(items.map((item) => item.label)).toEqual([
      "New File",
      "New Folder",
      "Rename",
      "Delete",
      "Reveal in File Explorer",
      "Folder actions",
      "Copy Path",
      "Add to Chat",
    ]);
    expect(folderActions?.children?.map((item) => item.label)).toEqual([
      "Expand folder",
      "Expand descendants",
      "Expand all folders",
    ]);
  });

  it("offers collapse actions for an expanded folder", () => {
    const items = fileBrowserEntryContextMenuItems({
      kind: "directory",
      isExpanded: true,
      chatScoped: false,
      fileManagerName: "Finder",
    });
    const folderActions = items.find((item) => item.id === "folder-actions");

    expect(folderActions?.children?.map((item) => item.label)).toEqual([
      "Collapse folder",
      "Collapse descendants",
      "Collapse all folders",
    ]);
    expect(items.find((item) => item.label === "Folder actions")?.children).toBeDefined();
  });

  it("does not expose folder actions for a file", () => {
    const items = fileBrowserEntryContextMenuItems({
      kind: "file",
      chatScoped: false,
      isChanged: true,
      canOpenDiff: true,
      fileManagerName: "File Explorer",
    });

    expect(items.some((item) => item.id === "folder-actions")).toBe(false);
    expect(items.map((item) => item.label)).toContain("Open diff");
  });
});

describe("file browser background context menu", () => {
  it("offers inline creation, tree controls, refresh, and workspace reveal", () => {
    const items = fileBrowserBackgroundContextMenuItems({ chatScoped: false });

    expect(items.map((item) => item.label)).toEqual([
      "New File",
      "New Folder",
      "Refresh",
      "Expand all",
      "Collapse all",
      "Reveal workspace",
    ]);
  });

  it("disables inline creation while viewing chat changes", () => {
    const items = fileBrowserBackgroundContextMenuItems({ chatScoped: true });

    expect(items[0]?.disabled).toBe(true);
    expect(items[1]?.disabled).toBe(true);
    expect(items.slice(2).every((item) => item.disabled !== true)).toBe(true);
  });
});
