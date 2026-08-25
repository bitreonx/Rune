/** Lower bound for the file-tree panel, in CSS pixels. */
export const FILE_TREE_MIN_WIDTH = 200;
/**
 * Width kept for the file surface sharing the row. The fraction cap alone
 * would squeeze the editor to an unreadable sliver on moderate windows.
 */
const FILE_EDITOR_MIN_WIDTH = 320;
/** Upper bound as a fraction of the shared row; only binds on wide rows. */
const FILE_TREE_MAX_WIDTH_FRACTION = 0.6;

/**
 * Upper bound for the file-tree panel within a row of `containerWidth`
 * pixels. Never below the tree's own minimum: when the row cannot fit both
 * columns the editor yields, and useResizableWidth's clamp must not see
 * max < min.
 */
export function getFileTreeMaxWidth(containerWidth: number): number {
  const fractionCap = Math.floor(containerWidth * FILE_TREE_MAX_WIDTH_FRACTION);
  const editorCap = Math.floor(containerWidth) - FILE_EDITOR_MIN_WIDTH;
  return Math.max(FILE_TREE_MIN_WIDTH, Math.min(fractionCap, editorCap));
}
