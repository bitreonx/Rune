import { describe, expect, it } from "vite-plus/test";

import { buildFileChanges } from "./fileChangesItems";

describe("buildFileChanges", () => {
  it("reports an untouched file as unchanged with nothing to render", () => {
    const result = buildFileChanges("src/a.ts", "line\n", "line\n");
    expect(result.unchanged).toBe(true);
    expect(result.items).toEqual([]);
  });

  it("diffs committed contents against the working copy", () => {
    const result = buildFileChanges("src/a.ts", "old\n", "new\n");
    expect(result.unchanged).toBe(false);
    expect(result.items).toHaveLength(1);
    const item = result.items[0]!;
    expect(item.type).toBe("diff");
    expect(item.id).toContain("src/a.ts");
    // Diff lines keep their terminating newline, Pierre's canonical shape.
    expect(item.fileDiff.additionLines).toEqual(["new\n"]);
    expect(item.fileDiff.deletionLines).toEqual(["old\n"]);
  });

  it("renders an untracked file as pure additions", () => {
    const result = buildFileChanges("src/new.ts", null, "fresh\n");
    expect(result.unchanged).toBe(false);
    const item = result.items[0]!;
    expect(item.fileDiff.deletionLines).toEqual([]);
    expect(item.fileDiff.additionLines).toEqual(["fresh\n"]);
  });
});
