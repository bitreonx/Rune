import { describe, expect, it } from "vite-plus/test";

import {
  filterPocketThreads,
  groupPocketThreads,
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
