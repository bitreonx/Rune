import { describe, expect, it } from "vite-plus/test";

import { applyClick, emptySelection } from "./treeSelection.ts";

describe("applyClick", () => {
  it("single-click replaces the selection with the clicked path", () => {
    const state = applyClick(emptySelection(), "a/b", "single", ["a/b", "a/c", "a/d"]);
    expect([...state.selected]).toEqual(["a/b"]);
    expect(state.anchor).toBe("a/b");
  });

  it("ctrl-click toggles a path in the selection", () => {
    const initial = applyClick(emptySelection(), "a", "single", ["a", "b", "c"]);
    const next = applyClick(initial, "b", "ctrl", ["a", "b", "c"]);
    expect([...next.selected].sort()).toEqual(["a", "b"]);
    expect(next.anchor).toBe("a");
  });

  it("ctrl-click on an already-selected path removes it", () => {
    const initial = applyClick(emptySelection(), "a", "single", ["a", "b"]);
    const withBoth = applyClick(initial, "b", "ctrl", ["a", "b"]);
    const backToA = applyClick(withBoth, "b", "ctrl", ["a", "b"]);
    expect([...backToA.selected]).toEqual(["a"]);
  });

  it("shift-click extends from the anchor to the clicked path", () => {
    const initial = applyClick(emptySelection(), "a", "single", ["a", "b", "c", "d", "e"]);
    const next = applyClick(initial, "d", "shift", ["a", "b", "c", "d", "e"]);
    expect([...next.selected].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("shift-click below the anchor extends downward", () => {
    const initial = applyClick(emptySelection(), "d", "single", ["a", "b", "c", "d", "e"]);
    const next = applyClick(initial, "b", "shift", ["a", "b", "c", "d", "e"]);
    expect([...next.selected].sort()).toEqual(["b", "c", "d"]);
  });

  it("shift-click without an anchor falls back to a single selection", () => {
    const next = applyClick(emptySelection(), "b", "shift", ["a", "b", "c"]);
    expect([...next.selected]).toEqual(["b"]);
    expect(next.anchor).toBe("b");
  });

  it("ctrl-click keeps the anchor stable for future shift-clicks", () => {
    const initial = applyClick(emptySelection(), "a", "single", ["a", "b", "c", "d"]);
    const withC = applyClick(initial, "c", "ctrl", ["a", "b", "c", "d"]);
    const ranged = applyClick(withC, "d", "shift", ["a", "b", "c", "d"]);
    // The anchor is "a" (from the single click); shift-click on d
    // extends from a..d inclusive.
    expect([...ranged.selected].sort()).toEqual(["a", "b", "c", "d"]);
  });
});
