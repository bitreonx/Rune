import { describe, expect, it } from "vite-plus/test";

import {
  changedFileName,
  selectChangedFilePreview,
  shouldAutoExpandChangedFiles,
  summarizeChangedFileScopes,
  summarizeWorkEntryDiffStat,
  summarizeWorkGroupDiffStat,
} from "./changedFilesPresentation";

describe("changed-files presentation", () => {
  it("auto-expands only small, low-churn latest changes", () => {
    const smallFiles = [
      { path: "src/a.ts", kind: "modified", additions: 80, deletions: 20 },
      { path: "src/b.ts", kind: "modified", additions: 60, deletions: 20 },
    ];

    expect(shouldAutoExpandChangedFiles(smallFiles, true)).toBe(true);
    expect(shouldAutoExpandChangedFiles(smallFiles, false)).toBe(false);
    expect(
      shouldAutoExpandChangedFiles(
        [{ path: "src/a.ts", kind: "modified", additions: 201, deletions: 0 }],
        true,
      ),
    ).toBe(false);
    expect(
      shouldAutoExpandChangedFiles(
        Array.from({ length: 6 }, (_, index) => ({
          path: `src/${index}.ts`,
          kind: "modified",
          additions: 1,
          deletions: 0,
        })),
        true,
      ),
    ).toBe(false);
  });

  it("summarizes the most prominent top-level scopes", () => {
    const files = [
      { path: "apps/web/src/App.tsx", kind: "modified", additions: 1, deletions: 0 },
      { path: "README.md", kind: "modified", additions: 1, deletions: 0 },
      { path: "apps/server/src/index.ts", kind: "modified", additions: 1, deletions: 0 },
      { path: "packages/shared/src/git.ts", kind: "modified", additions: 1, deletions: 0 },
      { path: "apps\\mobile\\App.tsx", kind: "modified", additions: 1, deletions: 0 },
    ];

    expect(summarizeChangedFileScopes(files)).toEqual([
      { label: "apps", fileCount: 3 },
      { label: "root", fileCount: 1 },
      { label: "packages", fileCount: 1 },
    ]);
  });

  it("previews files across different scopes before filling from one scope", () => {
    const files = [
      { path: "apps/web/src/App.tsx", kind: "modified", additions: 1, deletions: 0 },
      { path: "apps/web/src/App.test.tsx", kind: "modified", additions: 1, deletions: 0 },
      { path: "packages/shared/src/git.ts", kind: "modified", additions: 1, deletions: 0 },
      { path: "README.md", kind: "modified", additions: 1, deletions: 0 },
    ];

    expect(selectChangedFilePreview(files).map((file) => file.path)).toEqual([
      "apps/web/src/App.tsx",
      "packages/shared/src/git.ts",
      "README.md",
    ]);
    expect(changedFileName("apps\\web\\src\\App.tsx")).toBe("App.tsx");
  });
});

describe("summarizeWorkEntryDiffStat", () => {
  const turnFiles = [
    { path: "src/app.ts", kind: "modified", additions: 12, deletions: 4 },
    { path: "src/other.ts", kind: "modified", additions: 3, deletions: 1 },
  ];

  it("sums additions and deletions across the entry's changed files", () => {
    expect(summarizeWorkEntryDiffStat({ changedFiles: ["src/app.ts"] }, turnFiles)).toEqual({
      additions: 12,
      deletions: 4,
    });
    expect(
      summarizeWorkEntryDiffStat({ changedFiles: ["src/app.ts", "src/other.ts"] }, turnFiles),
    ).toEqual({ additions: 15, deletions: 5 });
  });

  it("returns null when the entry changed no tracked files", () => {
    expect(summarizeWorkEntryDiffStat({}, turnFiles)).toBeNull();
    expect(summarizeWorkEntryDiffStat({ changedFiles: [] }, turnFiles)).toBeNull();
    expect(summarizeWorkEntryDiffStat({ changedFiles: ["src/missing.ts"] }, turnFiles)).toBeNull();
  });
});

describe("summarizeWorkGroupDiffStat", () => {
  const turnFiles = [
    { path: "src/app.ts", kind: "modified", additions: 12, deletions: 4 },
    { path: "src/other.ts", kind: "modified", additions: 3, deletions: 1 },
  ];

  it("sums the stat once per distinct file across the group's entries", () => {
    const entries = [
      { changedFiles: ["src\\app.ts"] },
      { changedFiles: ["src/app.ts", "src/other.ts"] },
    ];
    expect(summarizeWorkGroupDiffStat(entries, turnFiles)).toEqual({
      additions: 15,
      deletions: 5,
    });
  });

  it("returns null when no entry in the group changed a tracked file", () => {
    expect(summarizeWorkGroupDiffStat([{}, { changedFiles: ["src/missing.ts"] }], turnFiles)).toBe(
      null,
    );
    expect(summarizeWorkGroupDiffStat([], turnFiles)).toBe(null);
  });
});
