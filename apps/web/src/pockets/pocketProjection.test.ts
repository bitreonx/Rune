import { describe, expect, it } from "vite-plus/test";

import { EnvironmentId, PocketId, ThreadId } from "@rune/contracts";

import { pocketDescendantIds, pocketThreadKeys } from "./pocketProjection";

const snapshot = {
  revision: 3,
  pockets: [
    {
      id: PocketId.make("root"),
      title: "Root",
      parentPocketId: null,
      orderKey: "a",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: PocketId.make("child"),
      title: "Child",
      parentPocketId: PocketId.make("root"),
      orderKey: "b",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  threadMemberships: [
    { pocketId: PocketId.make("child"), threadId: ThreadId.make("thread-1"), orderKey: "a" },
  ],
  fileReferences: [],
} as const;

describe("Pocket projection", () => {
  it("counts nested membership when entering a parent Pocket", () => {
    expect([...pocketDescendantIds(snapshot, PocketId.make("root"))]).toEqual(["root", "child"]);
    expect([
      ...pocketThreadKeys(snapshot, EnvironmentId.make("env-a"), PocketId.make("root")),
    ]).toEqual(["env-a:thread-1"]);
  });
});
