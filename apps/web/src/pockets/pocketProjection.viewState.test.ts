import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_POCKET_VIEW_STATE, sanitizePocketViewState } from "./pocketProjection";

describe("Pocket view state", () => {
  it("fails closed to the Flow/Activity defaults", () => {
    expect(sanitizePocketViewState(null)).toEqual(DEFAULT_POCKET_VIEW_STATE);
    expect(sanitizePocketViewState({ view: "unknown", sort: "bad" })).toEqual(
      DEFAULT_POCKET_VIEW_STATE,
    );
  });

  it("keeps only safe persisted values", () => {
    expect(
      sanitizePocketViewState({
        view: "board",
        sort: "title",
        lastThreadKey: "thread-1",
        scrollTop: 128,
        expandedChildPocketIds: ["child", 4, ""],
      }),
    ).toEqual({
      view: "board",
      sort: "title",
      lastThreadKey: "thread-1",
      scrollTop: 128,
      expandedChildPocketIds: ["child"],
    });
  });
});
