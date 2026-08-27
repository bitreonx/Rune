/**
 * JSON helpers for the JSON viewer. The viewer pretty-prints files
 * with a 2-space indent, parses defensively (any failure becomes a
 * "couldn't parse" error surface), and exposes a small recursive
 * collapse/expand component for the tree.
 */

export type JsonParseResult =
  | { readonly _tag: "Ok"; readonly value: unknown }
  | { readonly _tag: "Err"; readonly message: string };

export function tryParseJson(input: string): JsonParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { _tag: "Ok", value: null };
  }
  try {
    return { _tag: "Ok", value: JSON.parse(trimmed) };
  } catch (error) {
    return {
      _tag: "Err",
      message: error instanceof Error ? error.message : "Could not parse JSON",
    };
  }
}

const INDENT = "  ";

export function formatJson(input: string): string {
  // JSON.parse + JSON.stringify(..., null, 2) is the standard pretty-
  // print. The viewer catches errors before this is called so we don't
  // need to handle them here.
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, INDENT);
}

/**
 * Count the number of leaf values in a parsed JSON tree. Arrays of
 * primitives each count their elements; objects with primitive values
 * count each value. Used to show "N entries" in the toolbar.
 */
export function countJsonLeaves(value: unknown): number {
  if (value === null) return 1;
  const type = typeof value;
  if (type !== "object") return 1;
  if (Array.isArray(value)) {
    if (value.length === 0) return 0;
    return value.reduce<number>((acc, item) => acc + countJsonLeaves(item), 0);
  }
  const entries = Object.values(value as Record<string, unknown>);
  if (entries.length === 0) return 0;
  return entries.reduce<number>((acc, item) => acc + countJsonLeaves(item), 0);
}
