import { describe, expect, it } from "vite-plus/test";

import { buildChatDiffTree } from "./chatDiffTree";

describe("buildChatDiffTree", () => {
  it("constructs only changed files and their ancestors", () => {
    expect(
      buildChatDiffTree([
        "apps/web/src/Sidebar.tsx",
        "apps/web/src/FileBrowser.tsx",
        "packages/contracts/src/foo.ts",
      ]),
    ).toEqual([
      { path: "apps", kind: "directory" },
      { path: "apps/web", kind: "directory" },
      { path: "apps/web/src", kind: "directory" },
      { path: "apps/web/src/FileBrowser.tsx", kind: "file" },
      { path: "apps/web/src/Sidebar.tsx", kind: "file" },
      { path: "packages", kind: "directory" },
      { path: "packages/contracts", kind: "directory" },
      { path: "packages/contracts/src", kind: "directory" },
      { path: "packages/contracts/src/foo.ts", kind: "file" },
    ]);
  });

  it("stays bounded to the changed paths for a 100,000-file chat diff", () => {
    const paths = Array.from(
      { length: 100_000 },
      (_, index) => `packages/pkg-${index % 100}/src/file-${index}.ts`,
    );
    const tree = buildChatDiffTree(paths);
    expect(tree).toHaveLength(100_000 + 201);
    expect(tree.filter((entry) => entry.kind === "directory")).toHaveLength(201);
  });
});
