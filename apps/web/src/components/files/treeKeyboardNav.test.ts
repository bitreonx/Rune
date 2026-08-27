import { describe, expect, it } from "vite-plus/test";

import { nextFocused } from "./treeKeyboardNav.ts";

describe("nextFocused", () => {
  it("down moves to the next path", () => {
    expect(nextFocused(["a", "b", "c"], "b", "down")).toBe("c");
  });

  it("down at the last row stays put", () => {
    expect(nextFocused(["a", "b", "c"], "c", "down")).toBe("c");
  });

  it("up moves to the previous path", () => {
    expect(nextFocused(["a", "b", "c"], "b", "up")).toBe("a");
  });

  it("up at the first row stays put", () => {
    expect(nextFocused(["a", "b", "c"], "a", "up")).toBe("a");
  });

  it("home and end jump to the first and last paths", () => {
    expect(nextFocused(["a", "b", "c"], "b", "home")).toBe("a");
    expect(nextFocused(["a", "b", "c"], "b", "end")).toBe("c");
  });

  it("from null, down picks the first, up picks the last", () => {
    expect(nextFocused(["a", "b", "c"], null, "down")).toBe("a");
    expect(nextFocused(["a", "b", "c"], null, "up")).toBe("c");
  });

  it("returns null for an empty path list", () => {
    expect(nextFocused([], null, "down")).toBeNull();
    expect(nextFocused([], "x", "down")).toBeNull();
  });

  it("if current is not in the list, down picks the first", () => {
    expect(nextFocused(["a", "b", "c"], "missing", "down")).toBe("a");
  });
});
