import { describe, expect, it } from "vite-plus/test";

import {
  assignThreadToFolder,
  createFolder,
  createThreadOrganizationState,
  decodeThreadOrganizationState,
  designForPreset,
  effectiveThreadDesign,
  folderAndDescendantIds,
  moveFolder,
  purgeExpiredTrash,
  restoreFolder,
  setThreadDesign,
  trashFolder,
  visibleFolderIds,
} from "./threadOrganization";

const NOW = "2026-08-27T12:00:00.000Z";

function withFolders() {
  let state = createThreadOrganizationState();
  state = createFolder(state, { id: "work", name: "Work" }, NOW);
  state = createFolder(state, { id: "client", name: "Client", parentId: "work" }, NOW);
  state = createFolder(state, { id: "empty", name: "Empty" }, NOW);
  return state;
}

describe("thread organization model", () => {
  it("prevents folder cycles and exposes descendants for scoped views", () => {
    const state = withFolders();

    expect(moveFolder(state, "work", "client", NOW)).toBe(state);
    expect(folderAndDescendantIds(state, "work")).toEqual(new Set(["work", "client"]));
  });

  it("shows matching folders plus their parents, while optionally showing empty folders", () => {
    const assigned = assignThreadToFolder(withFolders(), "thread-1", "client");
    const projects = { "thread-1": "env:project" };

    expect(visibleFolderIds(assigned, projects, new Set(["env:project"]), false)).toEqual(
      new Set(["client", "work"]),
    );
    expect(visibleFolderIds(assigned, projects, new Set(["env:project"]), true)).toEqual(
      new Set(["work", "client", "empty"]),
    );
  });

  it("inherits folder design until a thread override is set, then resets cleanly", () => {
    let state = createFolder(
      withFolders(),
      {
        id: "design-folder",
        name: "Design",
        defaultDesign: designForPreset("rose-creative"),
      },
      NOW,
    );
    state = assignThreadToFolder(state, "thread-1", "design-folder");
    expect(effectiveThreadDesign(state, "thread-1").preset).toBe("rose-creative");

    state = setThreadDesign(state, "thread-1", designForPreset("indigo-code"));
    expect(effectiveThreadDesign(state, "thread-1").preset).toBe("indigo-code");
    state = setThreadDesign(state, "thread-1", null);
    expect(effectiveThreadDesign(state, "thread-1").preset).toBe("rose-creative");
  });

  it("trashes and restores a folder tree together, then purges expired records", () => {
    let state = assignThreadToFolder(withFolders(), "thread-1", "client");
    state = trashFolder(state, "work", "2026-08-01T00:00:00.000Z");
    expect(state.folders.work?.trashedAt).toBe("2026-08-01T00:00:00.000Z");
    expect(state.folders.client?.trashedAt).toBe("2026-08-01T00:00:00.000Z");
    expect(state.threadTrashedAtByKey["thread-1"]).toBe("2026-08-01T00:00:00.000Z");

    state = restoreFolder(state, "work", NOW);
    expect(state.folders.work?.trashedAt).toBeNull();
    expect(state.folders.client?.trashedAt).toBeNull();
    expect(state.threadTrashedAtByKey["thread-1"]).toBeUndefined();

    state = trashFolder(state, "work", "2026-08-01T00:00:00.000Z");
    state = purgeExpiredTrash(state, Date.parse("2026-08-08T00:00:01.000Z"));
    expect(state.folders.work).toBeUndefined();
    expect(state.folders.client).toBeUndefined();
  });

  it("recovers malformed persisted data with safe defaults", () => {
    const state = decodeThreadOrganizationState({
      folders: { broken: { id: "broken" } },
      trashRetentionDays: 999,
    });
    expect(state.folders).toEqual({});
    expect(state.trashRetentionDays).toBe(5);
  });
});
