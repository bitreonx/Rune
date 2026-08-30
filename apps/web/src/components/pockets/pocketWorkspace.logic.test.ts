import { describe, expect, it } from "vite-plus/test";

import {
  filterPocketThreads,
  groupPocketThreads,
  POCKET_MOTION_PHASES,
  POCKET_MOTION_SEQUENCE,
  POCKET_SHELF_DEFAULT_ITEMS,
  POCKET_SHELF_MAX_ITEMS,
  POCKET_SHELF_MIN_ITEMS,
  POCKET_SURFACE_STATES,
  pocketPeekChildLimit,
  projectPocketShelf,
  selectPocketPeekThreads,
  selectPocketShelfThreads,
  sortPocketThreads,
  type PocketWorkspaceThreadData,
} from "./pocketWorkspace.logic";

const thread = (
  id: string,
  overrides: Partial<PocketWorkspaceThreadData> = {},
): PocketWorkspaceThreadData => ({
  id,
  title: `Thread ${id}`,
  updatedAt: "2026-08-29T00:00:00.000Z",
  createdAt: "2026-08-28T00:00:00.000Z",
  status: "done",
  pinned: false,
  providerLabel: "Codex",
  ...overrides,
});

describe("Pocket workspace projection", () => {
  it("keeps the shelf bounded while prioritizing pinned and live work", () => {
    const threads = [
      ...Array.from({ length: 500 }, (_, index) =>
        thread(String(index), {
          updatedAt: new Date(2026, 7, 29, 0, index).toISOString(),
        }),
      ),
      thread("pinned", { pinned: true, updatedAt: "2026-08-01T00:00:00.000Z" }),
      thread("needs-you", { status: "needs-you", updatedAt: "2026-08-02T00:00:00.000Z" }),
    ];

    const shelf = selectPocketShelfThreads(threads);

    expect(shelf).toHaveLength(6);
    expect(shelf.map((item) => item.id)).toContain("pinned");
    expect(shelf.map((item) => item.id)).toContain("needs-you");
  });

  it("keeps the shelf cap between five and seven and reports hidden threads", () => {
    const threads = Array.from({ length: 10 }, (_, index) => thread(String(index)));

    expect(POCKET_SHELF_DEFAULT_ITEMS).toBe(6);
    expect(projectPocketShelf(threads, POCKET_SHELF_MIN_ITEMS)).toMatchObject({
      threads: expect.any(Array),
      overflow: 5,
    });
    expect(projectPocketShelf(threads, 2).threads).toHaveLength(POCKET_SHELF_MIN_ITEMS);
    expect(projectPocketShelf(threads, 99).threads).toHaveLength(POCKET_SHELF_MAX_ITEMS);
    expect(projectPocketShelf(threads, 99).overflow).toBe(3);
  });

  it("keeps the Pocket state and finite motion vocabularies stable", () => {
    expect(POCKET_SURFACE_STATES).toEqual(["closed", "hover", "open"]);
    expect(POCKET_MOTION_PHASES).toEqual([
      "acknowledge",
      "lip-lift",
      "geometry-morph",
      "clip-reveal",
      "settle",
    ]);
    expect(POCKET_MOTION_SEQUENCE).toBe(
      "acknowledge -> lip-lift -> geometry-morph -> clip-reveal -> settle",
    );
  });

  it("keeps a closed Pocket preview to four prioritized threads", () => {
    const threads = [
      thread("recent", { updatedAt: "2026-08-29T00:04:00.000Z" }),
      thread("pinned", { pinned: true, updatedAt: "2026-08-01T00:00:00.000Z" }),
      thread("working", { status: "working", updatedAt: "2026-08-02T00:00:00.000Z" }),
      thread("needs-you", { status: "needs-you", updatedAt: "2026-08-03T00:00:00.000Z" }),
      thread("waiting", { status: "waiting", updatedAt: "2026-08-05T00:00:00.000Z" }),
    ];

    expect(selectPocketPeekThreads(threads)).toHaveLength(4);
    expect(selectPocketPeekThreads(threads).map((item) => item.id)).toEqual([
      "pinned",
      "needs-you",
      "working",
      "recent",
    ]);
  });

  it("caps child-pocket rows after prioritized thread rows", () => {
    expect(pocketPeekChildLimit(0, 9)).toBe(4);
    expect(pocketPeekChildLimit(3, 9)).toBe(1);
    expect(pocketPeekChildLimit(4, 9)).toBe(0);
  });

  it("filters immediately across title, provider, and subtitle", () => {
    const threads = [
      thread("one", { providerLabel: "Claude", subtitle: "routing review" }),
      thread("two", { providerLabel: "Codex", subtitle: "release notes" }),
    ];

    expect(filterPocketThreads(threads, "ROUTING").map((item) => item.id)).toEqual(["one"]);
    expect(filterPocketThreads(threads, "codex").map((item) => item.id)).toEqual(["two"]);
  });

  it("sorts by title and exposes all board buckets", () => {
    const threads = [
      thread("b", { title: "Beta", status: "working" }),
      thread("a", { title: "Alpha", status: "needs-you" }),
    ];

    expect(sortPocketThreads(threads, "title").map((item) => item.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(
      groupPocketThreads(threads).map((group) => [group.status, group.threads.length]),
    ).toEqual([
      ["working", 1],
      ["waiting", 0],
      ["needs-you", 1],
      ["done", 0],
    ]);
  });
});
