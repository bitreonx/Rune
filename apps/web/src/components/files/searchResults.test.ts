import { describe, expect, it } from "vite-plus/test";

import { mapSearchResults, type SearchMatch } from "./searchResults.ts";

describe("mapSearchResults", () => {
  it("returns an empty array for an empty input", () => {
    expect(mapSearchResults([], "foo")).toEqual([]);
  });

  it("sorts matches by frecency (high to low)", () => {
    const matches: SearchMatch[] = [
      { path: "a.ts", frecency: 1 },
      { path: "b.ts", frecency: 5 },
      { path: "c.ts", frecency: 3 },
    ];
    const result = mapSearchResults(matches, "ts");
    expect(result.map((r) => r.path)).toEqual(["b.ts", "c.ts", "a.ts"]);
  });

  it("projects the filename (last segment) and breadcrumb (rest)", () => {
    const result = mapSearchResults(
      [{ path: "apps/web/src/file.ts", frecency: 1 }],
      "file",
    );
    expect(result[0]?.filename).toBe("file.ts");
    expect(result[0]?.breadcrumb).toBe("apps/web/src");
  });

  it("empty breadcrumb for top-level files", () => {
    const result = mapSearchResults(
      [{ path: "README.md", frecency: 1 }],
      "readme",
    );
    expect(result[0]?.filename).toBe("README.md");
    expect(result[0]?.breadcrumb).toBe("");
  });

  it("is stable: same input produces the same output", () => {
    const matches: SearchMatch[] = [
      { path: "a.ts", frecency: 1 },
      { path: "b.ts", frecency: 1 },
    ];
    const result1 = mapSearchResults(matches, "ts");
    const result2 = mapSearchResults(matches, "ts");
    expect(result1.map((r) => r.path)).toEqual(result2.map((r) => r.path));
  });
});
