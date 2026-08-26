/**
 * What the tree area should show for the current listing state. The tree has
 * no rows until the first workspace listing lands, and environment-gated
 * queries stay pending while an environment reconnects — so "no data yet"
 * must always render as loading, never as a silently empty tree.
 */
export type FileTreeAreaState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export function fileTreeAreaState(query: {
  pending: boolean;
  error: string | null;
  hasData: boolean;
}): FileTreeAreaState {
  if (query.hasData) return { kind: "ready" };
  if (query.error) return { kind: "error", message: query.error };
  return { kind: "loading" };
}
