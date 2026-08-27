import { describe, expect, it } from "vite-plus/test";

import { toPosixRelativePath } from "./toPosixRelativePath.ts";

describe("toPosixRelativePath", () => {
  it("leaves an already-POSIX path unchanged", () => {
    expect(toPosixRelativePath("apps/web/src/file.png")).toBe("apps/web/src/file.png");
  });

  it("rewrites Windows-style backslashes to forward slashes", () => {
    expect(toPosixRelativePath("apps\\web\\src\\file.png")).toBe("apps/web/src/file.png");
  });

  it("rewrites mixed separators", () => {
    expect(toPosixRelativePath("apps\\web/src\\file.png")).toBe("apps/web/src/file.png");
  });

  it("preserves a leading forward slash (we do not strip absolute roots)", () => {
    // The explorer should never produce a leading slash, but if a caller
    // hands us one, we do not silently rewrite it. Stripping is a separate
    // concern handled by WorkspaceFileRefPath validation downstream.
    expect(toPosixRelativePath("/apps/web/src/file.png")).toBe("/apps/web/src/file.png");
  });
});
