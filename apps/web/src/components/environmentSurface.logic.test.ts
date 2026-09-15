import { describe, expect, it } from "vite-plus/test";

import {
  formatChangeSummary,
  hasEnvironmentChanges,
  summarizeEnvironmentChanges,
} from "./environmentSurface.logic";

describe("environment surface change summary", () => {
  it("prefers chat-scoped changes when they are available", () => {
    const summary = summarizeEnvironmentChanges({
      chatDiff: [
        { path: "src/app.ts", insertions: 12, deletions: 3 },
        { path: "README.md", insertions: 2, deletions: 0 },
      ],
      gitStatus: {
        workingTree: {
          files: [{ path: "other.ts", insertions: 0, deletions: 0 }],
          insertions: 99,
          deletions: 99,
        },
      },
    });

    expect(summary).toEqual({ files: 2, additions: 14, deletions: 3 });
    expect(formatChangeSummary(summary)).toBe("2 files · +14 −3");
  });

  it("falls back to the live workspace status when chat scope is absent", () => {
    expect(
      summarizeEnvironmentChanges({
        chatDiff: null,
        gitStatus: {
          workingTree: {
            files: [
              { path: "src/app.ts", insertions: 0, deletions: 0 },
              { path: "src/style.css", insertions: 0, deletions: 0 },
            ],
            insertions: 7,
            deletions: 4,
          },
        },
      }),
    ).toEqual({ files: 2, additions: 7, deletions: 4 });
  });

  it("does not treat a zero chat scope as proof that the workspace is clean", () => {
    expect(hasEnvironmentChanges({ files: 0, additions: 0, deletions: 0 })).toBe(false);
    expect(hasEnvironmentChanges({ files: 1, additions: 0, deletions: 0 })).toBe(true);
  });
});
