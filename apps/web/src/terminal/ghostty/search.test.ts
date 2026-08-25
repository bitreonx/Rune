import { describe, expect, it } from "vite-plus/test";

import {
  findBufferMatches,
  findRowMatches,
  initialActiveMatch,
  scrollbarAtBottom,
  scrollOffsetForMatch,
  searchScanOffsets,
  searchableRowText,
  viewportSearchRanges,
  wrapMatchIndex,
  type TerminalSearchCell,
} from "./search";

function cells(text: string): TerminalSearchCell[] {
  return [...text].map((char) => ({ text: char === " " ? "" : char, wide: 0 }));
}

function wideCell(text: string): TerminalSearchCell {
  return { text, wide: 1 };
}

describe("searchableRowText", () => {
  it("maps every character to its cell column", () => {
    const row = searchableRowText(cells("abc"));
    expect(row.text).toBe("abc");
    expect(row.columns).toEqual([0, 1, 2]);
  });

  it("turns blank cells into spaces while keeping columns aligned", () => {
    const row = searchableRowText([...cells("ab"), { text: "", wide: 0 }, ...cells("c")]);
    expect(row.text).toBe("ab c");
    expect(row.columns).toEqual([0, 1, 2, 3]);
  });

  it("skips wide-cell spacers so adjacent wide characters stay contiguous", () => {
    const row = searchableRowText([
      wideCell("你"),
      { text: "", wide: 2 },
      wideCell("好"),
      { text: "", wide: 2 },
    ]);
    expect(row.text).toBe("你好");
    expect(row.columns).toEqual([0, 2]);
  });
});

describe("findRowMatches", () => {
  it("finds case-insensitive matches with exclusive cell columns", () => {
    const matches = findRowMatches(cells("Foo foo FOO"), 7, "foo");
    expect(matches).toEqual([
      { row: 7, startCol: 0, endCol: 3 },
      { row: 7, startCol: 4, endCol: 7 },
      { row: 7, startCol: 8, endCol: 11 },
    ]);
  });

  it("matches across blank filler cells", () => {
    const matches = findRowMatches([...cells("ab"), { text: "", wide: 0 }, ...cells("c")], 0, "B c");
    expect(matches).toEqual([{ row: 0, startCol: 1, endCol: 4 }]);
  });

  it("returns no matches for an empty query", () => {
    expect(findRowMatches(cells("abc"), 0, "")).toEqual([]);
  });
});

describe("findBufferMatches", () => {
  it("scans rows in order tagging each match with its absolute row", () => {
    const rows = [cells("first"), cells("target here"), cells("again target")];
    const matches = findBufferMatches(rows, 42, "target");
    expect(matches).toEqual([
      { row: 43, startCol: 0, endCol: 6 },
      { row: 44, startCol: 6, endCol: 12 },
    ]);
  });
});

describe("wrapMatchIndex", () => {
  it("advances forward and wraps at the end", () => {
    expect(wrapMatchIndex(0, 3, 1)).toBe(1);
    expect(wrapMatchIndex(2, 3, 1)).toBe(0);
  });

  it("steps backward and wraps at the start", () => {
    expect(wrapMatchIndex(1, 3, -1)).toBe(0);
    expect(wrapMatchIndex(0, 3, -1)).toBe(2);
  });

  it("keeps a sentinel when there is nothing to navigate", () => {
    expect(wrapMatchIndex(0, 0, 1)).toBe(-1);
    expect(wrapMatchIndex(-1, 5, 1)).toBe(-1);
  });
});

describe("scrollOffsetForMatch", () => {
  it("keeps the current offset when the match is already visible", () => {
    expect(
      scrollOffsetForMatch({ matchRow: 12, offset: 10, viewportRows: 5, maxOffset: 95 }),
    ).toBe(10);
    expect(
      scrollOffsetForMatch({ matchRow: 14, offset: 10, viewportRows: 5, maxOffset: 95 }),
    ).toBe(10);
  });

  it("places an off-screen match two rows from the top", () => {
    expect(scrollOffsetForMatch({ matchRow: 40, offset: 0, viewportRows: 5, maxOffset: 95 })).toBe(
      38,
    );
  });

  it("clamps the target offset into range", () => {
    expect(scrollOffsetForMatch({ matchRow: 1, offset: 90, viewportRows: 5, maxOffset: 95 })).toBe(
      0,
    );
    expect(
      scrollOffsetForMatch({ matchRow: 99, offset: 0, viewportRows: 5, maxOffset: 95 }),
    ).toBe(95);
  });
});

describe("searchScanOffsets", () => {
  it("pages the buffer from the top without revisiting rows", () => {
    expect(searchScanOffsets({ total: 17, len: 5 }, 4)).toEqual([0, 5, 10]);
  });

  it("covers the exact-fit case with a single page", () => {
    expect(searchScanOffsets({ total: 9, len: 5 }, 4)).toEqual([0]);
    expect(searchScanOffsets({ total: 5, len: 5 }, 4)).toEqual([0]);
  });

  it("handles an unknown scrollbar state by scanning just the viewport", () => {
    expect(searchScanOffsets(null, 30)).toEqual([0]);
  });
});

describe("initialActiveMatch", () => {
  const matches = [
    { row: 2, startCol: 0, endCol: 1 },
    { row: 7, startCol: 0, endCol: 1 },
    { row: 11, startCol: 0, endCol: 1 },
  ];

  it("selects the first match at or below the viewport top", () => {
    expect(initialActiveMatch(matches, 6)).toBe(1);
    expect(initialActiveMatch(matches, 0)).toBe(0);
  });

  it("wraps to the first match when everything is above the viewport", () => {
    expect(initialActiveMatch(matches, 20)).toBe(0);
  });

  it("returns the sentinel when there are no matches", () => {
    expect(initialActiveMatch([], 3)).toBe(-1);
  });
});

describe("scrollbarAtBottom", () => {
  it("is true when the viewport reaches the last page", () => {
    expect(scrollbarAtBottom({ total: 50, offset: 45, len: 5 })).toBe(true);
    expect(scrollbarAtBottom({ total: 5, offset: 0, len: 5 })).toBe(true);
  });

  it("is false while scrolled up into history", () => {
    expect(scrollbarAtBottom({ total: 50, offset: 44, len: 5 })).toBe(false);
  });

  it("treats a missing scrollbar state as pinned to the bottom", () => {
    expect(scrollbarAtBottom(null)).toBe(true);
  });
});

describe("viewportSearchRanges", () => {
  const matches = [
    { row: 9, startCol: 2, endCol: 5 },
    { row: 10, startCol: 0, endCol: 3 },
    { row: 20, startCol: 4, endCol: 7 },
  ];

  it("projects matches inside the viewport and reports the active one", () => {
    expect(viewportSearchRanges(matches, 1, 8, 5)).toEqual({
      ranges: [
        { y: 1, startCol: 2, endCol: 5 },
        { y: 2, startCol: 0, endCol: 3 },
      ],
      active: { y: 2, startCol: 0, endCol: 3 },
    });
  });

  it("drops matches outside the viewport and a stale active index", () => {
    expect(viewportSearchRanges(matches, 2, 8, 5)).toEqual({
      ranges: [
        { y: 1, startCol: 2, endCol: 5 },
        { y: 2, startCol: 0, endCol: 3 },
      ],
      active: null,
    });
    expect(viewportSearchRanges(matches, 0, 12, 5)).toEqual({ ranges: [], active: null });
  });
});
