/**
 * Keyboard navigation helpers for the file tree.
 *
 * The tree renders rows in a fixed order. Up/Down move the focused
 * row. Down wraps to the end if the user goes past the bottom; up
 * wraps to the start if the user goes past the top. Home and End
 * jump to the first and last rows.
 *
 * Pure functions: callers wire the result to their `focusedPath`
 * state and to whatever action Enter / F2 / Delete should perform.
 */
export type NavDirection = "up" | "down" | "home" | "end";

export function nextFocused(
  paths: ReadonlyArray<string>,
  current: string | null,
  direction: NavDirection,
): string | null {
  if (paths.length === 0) return null;
  if (direction === "home") return paths[0] ?? null;
  if (direction === "end") return paths[paths.length - 1] ?? null;
  if (current === null) {
    return direction === "down" ? (paths[0] ?? null) : (paths[paths.length - 1] ?? null);
  }
  const currentIndex = paths.indexOf(current);
  if (currentIndex < 0) {
    return direction === "down" ? (paths[0] ?? null) : (paths[paths.length - 1] ?? null);
  }
  if (direction === "down") {
    return currentIndex === paths.length - 1 ? paths[paths.length - 1] ?? null : paths[currentIndex + 1] ?? null;
  }
  return currentIndex === 0 ? paths[0] ?? null : paths[currentIndex - 1] ?? null;
}
