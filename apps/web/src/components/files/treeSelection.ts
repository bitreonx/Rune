/**
 * Tree selection reducer. Pure function: same input → same output.
 *
 * The selection is a `Set<string>` of relative paths. The reducer
 * applies a click modifier and the "anchor" (the last single-click
 * path) to produce the next set. The anchor is kept separately so
 * shift-clicks can compute their range from a stable origin.
 */
export type ClickModifier = "single" | "shift" | "ctrl" | "meta";

export type SelectionState = {
  readonly selected: ReadonlySet<string>;
  readonly anchor: string | null;
};

export function emptySelection(): SelectionState {
  return { selected: new Set(), anchor: null };
}

/**
 * Apply a click to the current selection.
 *
 * - single: replaces the selection with just this path; anchor moves here.
 * - shift: extends the selection from the anchor (or the current
 *          selection's only path) to the clicked path, inclusive,
 *          using the order in `allPaths`.
 * - ctrl/meta: toggles the path in the selection; the anchor stays
 *              put (so a future shift-click uses the old anchor).
 */
export function applyClick(
  state: SelectionState,
  clickedPath: string,
  modifier: ClickModifier,
  allPaths: ReadonlyArray<string>,
): SelectionState {
  if (modifier === "single") {
    return { selected: new Set([clickedPath]), anchor: clickedPath };
  }
  if (modifier === "ctrl" || modifier === "meta") {
    const next = new Set(state.selected);
    if (next.has(clickedPath)) {
      next.delete(clickedPath);
    } else {
      next.add(clickedPath);
    }
    return { selected: next, anchor: state.anchor };
  }
  // shift: range from anchor (or single-selected path) to clickedPath
  const rangeAnchor = state.anchor ?? (state.selected.size === 1 ? [...state.selected][0] : null);
  if (rangeAnchor === null) {
    return { selected: new Set([clickedPath]), anchor: clickedPath };
  }
  const fromIndex = allPaths.indexOf(rangeAnchor);
  const toIndex = allPaths.indexOf(clickedPath);
  if (fromIndex < 0 || toIndex < 0) {
    return { selected: new Set([clickedPath]), anchor: clickedPath };
  }
  const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  const next = new Set<string>();
  for (let index = start; index <= end; index += 1) {
    const path = allPaths[index];
    if (path !== undefined) next.add(path);
  }
  return { selected: next, anchor: state.anchor };
}
