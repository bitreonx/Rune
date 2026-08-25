import { describe, expect, it } from "vite-plus/test";

import { buildRuneWorkspaceProjectCards } from "./runeWorkspaceLanding.logic";

describe("buildRuneWorkspaceProjectCards", () => {
  it("groups recent thread activity under its project and keeps projects recent-first", () => {
    const cards = buildRuneWorkspaceProjectCards({
      projects: [
        {
          environmentId: "local",
          id: "rune",
          title: "RUNE",
          workspaceRoot: "D:/Work/RUNE",
          updatedAt: "2026-08-20T12:00:00.000Z",
        },
        {
          environmentId: "remote",
          id: "docs",
          title: "Docs",
          workspaceRoot: "/srv/docs",
          updatedAt: "2026-08-23T12:00:00.000Z",
        },
      ],
      threads: [
        {
          environmentId: "local",
          projectId: "rune",
          title: "Polish the startup flow",
          updatedAt: "2026-08-24T10:00:00.000Z",
          archivedAt: null,
        },
        {
          environmentId: "local",
          projectId: "rune",
          title: "Archived thread",
          updatedAt: "2026-08-24T11:00:00.000Z",
          archivedAt: "2026-08-24T11:30:00.000Z",
        },
      ],
      environmentLabels: new Map([
        ["local", "This device"],
        ["remote", "Build server"],
      ]),
    });

    expect(cards).toEqual([
      expect.objectContaining({
        projectId: "rune",
        title: "RUNE",
        workspaceLabel: "RUNE",
        environmentLabel: "This device",
        threadCount: 1,
        latestThreadTitle: "Polish the startup flow",
        latestActivityAt: "2026-08-24T10:00:00.000Z",
      }),
      expect.objectContaining({
        projectId: "docs",
        title: "Docs",
        workspaceLabel: "docs",
        environmentLabel: "Build server",
        threadCount: 0,
        latestThreadTitle: null,
        latestActivityAt: "2026-08-23T12:00:00.000Z",
      }),
    ]);
  });

  it("falls back to a stable workspace label when a root ends in separators", () => {
    const [card] = buildRuneWorkspaceProjectCards({
      projects: [
        {
          environmentId: "local",
          id: "root",
          title: "Root project",
          workspaceRoot: "C:\\",
          updatedAt: "2026-08-24T12:00:00.000Z",
        },
      ],
      threads: [],
      environmentLabels: new Map(),
    });

    expect(card?.workspaceLabel).toBe("Workspace");
  });

  it("keeps grouped environment members in one workspace card", () => {
    const [card] = buildRuneWorkspaceProjectCards({
      projects: [
        {
          environmentId: "local",
          id: "rune-local",
          projectKey: "repo:rune",
          title: "RUNE",
          workspaceRoot: "D:/Work/RUNE",
          updatedAt: "2026-08-20T12:00:00.000Z",
          memberProjectRefs: [
            { environmentId: "local", projectId: "rune-local" },
            { environmentId: "remote", projectId: "rune-remote" },
          ],
        },
      ],
      threads: [
        {
          environmentId: "remote",
          projectId: "rune-remote",
          title: "Review the release surface",
          updatedAt: "2026-08-24T15:00:00.000Z",
          archivedAt: null,
        },
      ],
      environmentLabels: new Map([
        ["local", "This device"],
        ["remote", "Build server"],
      ]),
    });

    expect(card).toEqual(
      expect.objectContaining({
        projectKey: "repo:rune",
        threadCount: 1,
        latestThreadTitle: "Review the release surface",
      }),
    );
  });
});

describe("buildRuneWorkspaceProjectCards temporary threads", () => {
  it("does not count temporary threads toward card activity", () => {
    const cards = buildRuneWorkspaceProjectCards({
      projects: [
        {
          environmentId: "local",
          id: "rune",
          title: "RUNE",
          workspaceRoot: "D:/Work/RUNE",
          updatedAt: "2026-08-20T12:00:00.000Z",
        },
      ],
      threads: [
        {
          environmentId: "local",
          projectId: "rune",
          title: "Temporary thread",
          updatedAt: "2026-08-25T12:00:00.000Z",
          archivedAt: null,
          temporaryAt: "2026-08-25T12:00:00.000Z",
        },
      ],
      environmentLabels: new Map([["local", "This device"]]),
    });

    expect(cards[0]).toEqual(
      expect.objectContaining({
        threadCount: 0,
        latestThreadTitle: null,
        latestActivityAt: "2026-08-20T12:00:00.000Z",
      }),
    );
  });
});
