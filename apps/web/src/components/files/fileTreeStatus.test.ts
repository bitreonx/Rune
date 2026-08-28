import { describe, expect, it } from "vite-plus/test";

import { fileTreeGitStatus } from "./fileTreeStatus";

describe("file tree status", () => {
  it("projects real working-tree paths into the status lane", () => {
    expect(
      fileTreeGitStatus({
        isRepo: true,
        hasPrimaryRemote: false,
        isDefaultRef: true,
        refName: "main",
        hasWorkingTreeChanges: true,
        workingTree: {
          files: [{ path: "src/App.tsx", insertions: 2, deletions: 1 }],
          insertions: 2,
          deletions: 1,
        },
        aheadCount: 0,
        behindCount: 0,
        hasUpstream: false,
        pr: null,
      }),
    ).toEqual([{ path: "src/App.tsx", status: "modified" }]);
  });

  it("does not fabricate status while the repository query is unavailable", () => {
    expect(fileTreeGitStatus(null)).toEqual([]);
  });
});
