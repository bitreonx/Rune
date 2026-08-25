import { describe, expect, it } from "vite-plus/test";

import { buildRuneProjectWorkspaceModel } from "./runeProjectWorkspace.logic";

describe("buildRuneProjectWorkspaceModel", () => {
  it("keeps active threads from every grouped checkout and sorts by activity", () => {
    const model = buildRuneProjectWorkspaceModel({
      group: {
        projectKey: "repo:rune",
        displayName: "RUNE",
        workspaceRoot: "D:/Work/RUNE",
        updatedAt: "2026-08-20T12:00:00.000Z",
        memberProjects: [
          { environmentId: "local", id: "local-rune", environmentLabel: "This device" },
          { environmentId: "remote", id: "remote-rune", environmentLabel: "Build server" },
        ],
      },
      threads: [
        {
          environmentId: "local",
          id: "older",
          projectId: "local-rune",
          title: "Older thread",
          updatedAt: "2026-08-22T12:00:00.000Z",
          archivedAt: null,
        },
        {
          environmentId: "remote",
          id: "newer",
          projectId: "remote-rune",
          title: "Newest thread",
          updatedAt: "2026-08-24T12:00:00.000Z",
          archivedAt: null,
        },
        {
          environmentId: "local",
          id: "archived",
          projectId: "local-rune",
          title: "Archived thread",
          updatedAt: "2026-08-25T12:00:00.000Z",
          archivedAt: "2026-08-25T12:30:00.000Z",
        },
        {
          environmentId: "remote",
          id: "unrelated",
          projectId: "other-project",
          title: "Other project",
          updatedAt: "2026-08-26T12:00:00.000Z",
          archivedAt: null,
        },
      ],
    });

    expect(model).toEqual({
      projectKey: "repo:rune",
      title: "RUNE",
      workspaceRoot: "D:/Work/RUNE",
      threadCount: 2,
      environmentCount: 2,
      latestActivityAt: "2026-08-24T12:00:00.000Z",
      environmentLabels: ["This device", "Build server"],
      threads: [
        expect.objectContaining({ id: "newer", title: "Newest thread" }),
        expect.objectContaining({ id: "older", title: "Older thread" }),
      ],
    });
  });
});

describe("buildRuneProjectWorkspaceModel temporary threads", () => {
  it("excludes temporary threads from counts, activity, and the thread list", () => {
    const model = buildRuneProjectWorkspaceModel({
      group: {
        projectKey: "repo:rune",
        displayName: "RUNE",
        workspaceRoot: "D:/Work/RUNE",
        updatedAt: "2026-08-20T12:00:00.000Z",
        memberProjects: [
          { environmentId: "local", id: "local-rune", environmentLabel: "This device" },
        ],
      },
      threads: [
        {
          environmentId: "local",
          id: "permanent",
          projectId: "local-rune",
          title: "Permanent thread",
          updatedAt: "2026-08-22T12:00:00.000Z",
          archivedAt: null,
        },
        {
          environmentId: "local",
          id: "temp",
          projectId: "local-rune",
          title: "Temporary thread",
          updatedAt: "2026-08-25T12:00:00.000Z",
          archivedAt: null,
          temporaryAt: "2026-08-25T12:00:00.000Z",
        },
      ],
    });

    expect(model.threadCount).toBe(1);
    expect(model.latestActivityAt).toBe("2026-08-22T12:00:00.000Z");
    expect(model.threads.map((thread) => thread.id)).toEqual(["permanent"]);
  });
});
