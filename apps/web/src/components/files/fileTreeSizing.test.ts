import { describe, expect, it } from "vite-plus/test";

import { getFileTreeMaxWidth } from "./fileTreeSizing";

describe("getFileTreeMaxWidth", () => {
  it("lets the tree take 60% of a wide row", () => {
    expect(getFileTreeMaxWidth(2_000)).toBe(1_200);
  });

  it("rounds fractional widths down", () => {
    expect(getFileTreeMaxWidth(1_999)).toBe(1_199);
  });

  it("reserves the editor column minimum when the row is moderate", () => {
    // 700px row: the 60% fraction (420) would leave the editor 280px; the
    // reservation caps the tree at 700 − 320 instead.
    expect(getFileTreeMaxWidth(700)).toBe(380);
  });

  it("keeps the tree minimum when the row cannot fit both columns", () => {
    // The editor yields before the tree inverts the resize clamp.
    expect(getFileTreeMaxWidth(400)).toBe(200);
  });

  it("stays at the tree minimum even when the row is narrower than that", () => {
    expect(getFileTreeMaxWidth(150)).toBe(200);
  });
});
