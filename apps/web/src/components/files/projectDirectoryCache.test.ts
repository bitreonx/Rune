import { describe, expect, it } from "vite-plus/test";

import {
  directoriesToInvalidate,
  flattenDirectorySnapshots,
  parentDirectoryPath,
} from "./projectDirectoryCache";

describe("project directory cache", () => {
  it("invalidates only containing cached directories", () => {
    expect(
      directoriesToInvalidate(
        ["apps/web/src/Sidebar.tsx", "apps/web", "README.md"],
        new Set(["apps/web", "apps/web/src"]),
      ),
    ).toEqual(["", "apps", "apps/web", "apps/web/src"]);
  });

  it("normalizes parent directory paths", () => {
    expect(parentDirectoryPath("apps\\web\\src\\Sidebar.tsx")).toBe("apps/web/src");
    expect(parentDirectoryPath("README.md")).toBe("");
  });

  it("flattens cached snapshots without re-walking the workspace", () => {
    expect(
      flattenDirectorySnapshots(
        new Map([
          [
            "",
            [
              { path: "apps", kind: "directory" },
              { path: "README.md", kind: "file" },
            ],
          ],
          ["apps", [{ path: "apps/web", kind: "directory" }]],
        ]),
      ),
    ).toEqual([
      { path: "apps", kind: "directory" },
      { path: "apps/web", kind: "directory" },
      { path: "README.md", kind: "file" },
    ]);
  });
});
