import { serializeComposerFileLink } from "@rune/shared/composerTrigger";

import { formatFileCommentRange } from "./fileCommentAnnotations";

/**
 * Composer text for "add selection to chat": a file mention plus the
 * selected line range, so the agent knows which part of the file is meant.
 * `startLine`/`endLine` are zero-based editor positions; the label is 1-based.
 */
export function buildFileSelectionMention(
  relativePath: string,
  startLine: number,
  endLine: number,
): string {
  const first = Math.min(startLine, endLine) + 1;
  const last = Math.max(startLine, endLine) + 1;
  return `${serializeComposerFileLink(relativePath)} ${formatFileCommentRange(first, last)}`;
}
