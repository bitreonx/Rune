import { describe, expect, it } from "vite-plus/test";

import { EnvironmentId } from "@rune/contracts";

import { createThreadOrganizationState } from "../threadOrganization";
import { buildLegacyPocketImport } from "./legacyPocketImport";

describe("buildLegacyPocketImport", () => {
  it("keeps scoped threads on their environment and preserves hierarchy", () => {
    const state = createThreadOrganizationState();
    const now = "2026-08-28T00:00:00.000Z";
    const legacy = {
      ...state,
      folders: {
        parent: {
          id: "parent",
          name: "Workspace",
          description: "",
          parentId: null,
          order: 0,
          defaultDesign: null,
          icon: null,
          archivedAt: null,
          trashedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        child: {
          id: "child",
          name: "Frontend",
          description: "",
          parentId: "parent",
          order: 0,
          defaultDesign: null,
          icon: "F",
          archivedAt: null,
          trashedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      threadFolderByKey: {
        "environment-a:thread-a": "child",
        "environment-b:thread-a": "child",
      },
    };

    const imported = buildLegacyPocketImport(legacy, EnvironmentId.make("environment-a"));
    expect(imported.snapshot.pockets).toHaveLength(2);
    expect(imported.snapshot.pockets.find((pocket) => pocket.id === "child")?.parentPocketId).toBe(
      "parent",
    );
    expect(imported.snapshot.threadMemberships).toEqual([
      { pocketId: "child", threadId: "thread-a", orderKey: "000000000000:thread-a" },
    ]);
  });

  it("breaks malformed legacy cycles at the importer boundary", () => {
    const state = createThreadOrganizationState();
    const now = "2026-08-28T00:00:00.000Z";
    const folder = (id: string, parentId: string | null) => ({
      id,
      name: id,
      description: "",
      parentId,
      order: 0,
      defaultDesign: null,
      icon: null,
      archivedAt: null,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const imported = buildLegacyPocketImport(
      {
        ...state,
        folders: { first: folder("first", "second"), second: folder("second", "first") },
      },
      EnvironmentId.make("environment-a"),
    );
    expect(imported.snapshot.pockets.map((pocket) => pocket.parentPocketId)).toEqual([null, null]);
  });
});
