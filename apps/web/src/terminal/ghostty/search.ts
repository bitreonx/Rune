/**
 * Buffer search for the Ghostty surface. The scan walks snapshot rows and
 * records matches as absolute grid rows (0 = top of scrollback), which stay
 * stable as output streams below; a scrollback trim (>10k rows) can shift
 * them, and the next query change rescans anyway.
 *
 * Everything here is pure so the coordinate math is testable without WASM.
 */

export interface TerminalSearchCell {
  readonly text: string;
  readonly wide: number;
}

export interface TerminalSearchMatch {
  /** Absolute row index, 0 = top of scrollback. */
  readonly row: number;
  readonly startCol: number;
  /** Exclusive. */
  readonly endCol: number;
}

/** Wide-cell spacer variants from GHOSTTY_CELL_WIDE; duplicated to stay dependency-free. */
const WIDE_SPACER_TAIL = 2;
const WIDE_SPACER_HEAD = 3;

export interface SearchableRow {
  /** Cell text with blanks as spaces and spacers removed. */
  readonly text: string;
  /** char index -> cell column, same length as `text`. */
  readonly columns: readonly number[];
}

export function searchableRowText(cells: readonly TerminalSearchCell[]): SearchableRow {
  let text = "";
  const columns: number[] = [];
  for (let col = 0; col < cells.length; col += 1) {
    const cell = cells[col];
    if (!cell) continue;
    if (cell.wide === WIDE_SPACER_TAIL || cell.wide === WIDE_SPACER_HEAD) continue;
    text += cell.text.length > 0 ? cell.text : " ";
    columns.push(col);
  }
  return { text, columns };
}

export function findRowMatches(
  cells: readonly TerminalSearchCell[],
  row: number,
  query: string,
): TerminalSearchMatch[] {
  if (query.length === 0) return [];
  const needle = query.toLowerCase();
  const { text, columns } = searchableRowText(cells);
  const haystack = text.toLowerCase();
  const matches: TerminalSearchMatch[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const found = haystack.indexOf(needle, from);
    if (found < 0) break;
    const startCol = columns[found] ?? 0;
    const lastChar = found + needle.length - 1;
    const endCol = (columns[lastChar] ?? startCol) + 1;
    matches.push({ row, startCol, endCol });
    from = found + 1;
  }
  return matches;
}

export function findBufferMatches(
  rows: ReadonlyArray<readonly TerminalSearchCell[]>,
  firstRow: number,
  query: string,
): TerminalSearchMatch[] {
  const matches: TerminalSearchMatch[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    matches.push(...findRowMatches(rows[index] ?? [], firstRow + index, query));
  }
  return matches;
}

/** Steps the active match with wrap-around; -1 means "nothing to navigate". */
export function wrapMatchIndex(index: number, count: number, direction: 1 | -1): number {
  if (count <= 0 || index < 0) return -1;
  return (((index + direction) % count) + count) % count;
}

export function scrollOffsetForMatch(options: {
  matchRow: number;
  offset: number;
  viewportRows: number;
  maxOffset: number;
}): number {
  const { matchRow, offset, viewportRows, maxOffset } = options;
  if (matchRow >= offset && matchRow < offset + viewportRows) return offset;
  const target = matchRow - 2;
  return Math.max(0, Math.min(target, maxOffset));
}

/**
 * Absolute offsets a scan must snapshot: the viewport pages through the whole
 * scrollback from the top. A missing scrollbar state (no scrollback yet) means
 * only the current viewport is scanned.
 */
export function searchScanOffsets(
  scrollbar: { total: number; len: number } | null,
  viewportRows: number,
): number[] {
  const len = Math.max(1, scrollbar?.len ?? viewportRows);
  const maxOffset = Math.max(0, (scrollbar?.total ?? viewportRows) - len);
  const offsets: number[] = [];
  for (let offset = 0; offset <= maxOffset; offset += len) {
    offsets.push(offset);
  }
  return offsets;
}

/** First match at or below the viewport top, wrapping to index 0; -1 when empty. */
export function initialActiveMatch(
  matches: readonly TerminalSearchMatch[],
  offset: number,
): number {
  if (matches.length === 0) return -1;
  const index = matches.findIndex((match) => match.row >= offset);
  return index >= 0 ? index : 0;
}

export interface TerminalSearchStatus {
  readonly query: string;
  readonly count: number;
  /** Index into the match list; -1 when there is no active match. */
  readonly activeIndex: number;
}

/** Whether the viewport is on the last page of scrollback; null state = pinned. */
export function scrollbarAtBottom(state: GhosttyScrollbarLike | null): boolean {
  if (state === null) return true;
  return state.offset >= Math.max(0, state.total - state.len);
}

/** Structural subset of GhosttyScrollbar so this module stays dependency-free. */
export interface GhosttyScrollbarLike {
  readonly total: number;
  readonly offset: number;
  readonly len: number;
}

export interface ViewportSearchRange {
  readonly y: number;
  readonly startCol: number;
  readonly endCol: number;
}

/** Projects absolute-row matches into viewport coordinates for the renderer. */
export function viewportSearchRanges(
  matches: readonly TerminalSearchMatch[],
  activeIndex: number,
  offset: number,
  rowCount: number,
): { ranges: ViewportSearchRange[]; active: ViewportSearchRange | null } {
  const ranges: ViewportSearchRange[] = [];
  let active: ViewportSearchRange | null = null;
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (!match) continue;
    const y = match.row - offset;
    if (y < 0 || y >= rowCount) continue;
    const range: ViewportSearchRange = { y, startCol: match.startCol, endCol: match.endCol };
    ranges.push(range);
    if (index === activeIndex) active = range;
  }
  return { ranges, active };
}
