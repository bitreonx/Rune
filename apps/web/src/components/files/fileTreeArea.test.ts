import { describe, expect, it } from "vite-plus/test";

import { fileTreeAreaState } from "./fileTreeArea";

describe("fileTreeAreaState", () => {
  it("shows loading while the first listing is in flight", () => {
    expect(fileTreeAreaState({ pending: true, error: null, hasData: false })).toEqual({
      kind: "loading",
    });
  });

  it("stays loading when nothing has arrived yet, even without pending", () => {
    // A lost response (environment dropped mid-request) must not render an
    // empty tree forever; until data or an error exists the area says loading.
    expect(fileTreeAreaState({ pending: false, error: null, hasData: false })).toEqual({
      kind: "loading",
    });
  });

  it("prefers showing data over a stale error", () => {
    expect(
      fileTreeAreaState({ pending: false, error: "boom", hasData: true }),
    ).toEqual({ kind: "ready" });
  });

  it("surfaces the error only when there is no data to show", () => {
    expect(fileTreeAreaState({ pending: false, error: "workspace_tree_walk_failed", hasData: false })).toEqual({
      kind: "error",
      message: "workspace_tree_walk_failed",
    });
  });
});
