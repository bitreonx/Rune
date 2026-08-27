import { describe, expect, it } from "vite-plus/test";

import { formatAbsolutePath, formatRelativePath } from "./filePathFormat.ts";

describe("formatAbsolutePath", () => {
  it("joins POSIX cwd with a relative path using forward slashes", () => {
    expect(formatAbsolutePath("/home/user/ws", "apps/web/src/file.ts", "linux")).toBe(
      "/home/user/ws/apps/web/src/file.ts",
    );
  });

  it("joins Windows cwd with a relative path using backslashes", () => {
    expect(formatAbsolutePath("D:\\ws", "apps\\web\\src\\file.png", "win32")).toBe(
      "D:\\ws\\apps\\web\\src\\file.png",
    );
  });

  it("trims trailing separators from the cwd", () => {
    expect(formatAbsolutePath("/home/user/ws/", "foo.ts", "linux")).toBe(
      "/home/user/ws/foo.ts",
    );
    expect(formatAbsolutePath("D:\\ws\\", "foo.ts", "win32")).toBe("D:\\ws\\foo.ts");
  });

  it("returns the cwd unchanged when the relative path is empty", () => {
    expect(formatAbsolutePath("/home/user/ws", "", "linux")).toBe("/home/user/ws");
  });
});

describe("formatRelativePath", () => {
  it("returns the path verbatim", () => {
    expect(formatRelativePath("apps/web/src/file.ts")).toBe("apps/web/src/file.ts");
  });

  it("returns an empty path unchanged", () => {
    expect(formatRelativePath("")).toBe("");
  });
});
