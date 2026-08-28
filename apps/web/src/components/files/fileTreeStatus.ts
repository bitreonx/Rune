import type { GitStatusEntry } from "@pierre/trees";
import type { VcsStatusResult } from "@rune/contracts";

/** Maps the server's working-tree projection to the tree's semantic status lane. */
export function fileTreeGitStatus(status: VcsStatusResult | null): ReadonlyArray<GitStatusEntry> {
  if (status === null) return [];
  return status.workingTree.files.map((file) => ({
    path: file.path,
    // The current VCS contract intentionally exposes change counts rather than
    // porcelain subtypes. "modified" is truthful for every tracked change and
    // avoids inventing add/delete semantics the server did not report.
    status: "modified",
  }));
}
