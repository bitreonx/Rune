import { parseDiffFromFile, type CodeViewDiffItem } from "@pierre/diffs";

import { buildFileDiffRenderKey, fnv1a32 } from "~/lib/diffRendering";

export interface FileChanges {
  /** True when the working copy matches what is committed. */
  readonly unchanged: boolean;
  readonly items: ReadonlyArray<CodeViewDiffItem>;
}

/**
 * The uncommitted-changes view for one file: committed contents (null when
 * the file is untracked or the repository has no commits yet) against the
 * current editor contents.
 */
export function buildFileChanges(
  relativePath: string,
  headContents: string | null,
  currentContents: string,
): FileChanges {
  if (headContents === currentContents) {
    return { unchanged: true, items: [] };
  }

  const fileDiff = parseDiffFromFile(
    headContents === null ? null : { name: relativePath, contents: headContents },
    { name: relativePath, contents: currentContents },
  );
  const key = buildFileDiffRenderKey(fileDiff);
  return {
    unchanged: false,
    items: [{ id: key, type: "diff", fileDiff, collapsed: false, version: fnv1a32(key) }],
  };
}
