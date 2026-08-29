import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  formatWorkspaceFileRelativePath,
  WorkspaceFileRef,
  WorkspaceFileRefPath,
  workspaceFileRefFrom,
} from "./workspaceFileRef.ts";

describe("WorkspaceFileRef", () => {
  it("decodes a valid ref", () => {
    const decoded = Schema.decodeUnknownSync(WorkspaceFileRef)({
      workspaceId: "ws_1",
      workspaceRoot: "D:\\workspace",
      relativePath: "apps/web/src/assets/openrouter-color.png",
    });
    expect(decoded.relativePath).toBe("apps/web/src/assets/openrouter-color.png");
  });

  it("rejects relative paths with backslashes", () => {
    expect(() =>
      Schema.decodeUnknownSync(WorkspaceFileRefPath)("apps\\web\\src\\file.png"),
    ).toThrow();
  });

  it("rejects absolute relative paths", () => {
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("/etc/passwd")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("D:\\file.png")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("D:/file.png")).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(WorkspaceFileRefPath)("//server/share/file.png"),
    ).toThrow();
  });

  it("rejects traversal segments", () => {
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("../secret.png")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("a/../b")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("a/./b")).toThrow();
  });

  it("rejects empty or NUL-bearing paths", () => {
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkspaceFileRefPath)("a/b\u0000c")).toThrow();
  });

  it("allows dotted single-segment names that are not traversal", () => {
    // .gitignore, .env, app.config.ts, package.lock.json — single dots inside a segment
    // are normal file names. Only leading or interior `..` / `.` segments are traversal.
    expect(Schema.decodeUnknownSync(WorkspaceFileRefPath)(".gitignore")).toBe(".gitignore");
    expect(Schema.decodeUnknownSync(WorkspaceFileRefPath)(".env")).toBe(".env");
    expect(Schema.decodeUnknownSync(WorkspaceFileRefPath)("app.config.ts")).toBe("app.config.ts");
    expect(Schema.decodeUnknownSync(WorkspaceFileRefPath)("a/.env")).toBe("a/.env");
    expect(Schema.decodeUnknownSync(WorkspaceFileRefPath)("a/b.config.json")).toBe(
      "a/b.config.json",
    );
  });

  it("round-trips a ref through encode/decode", () => {
    const ref = workspaceFileRefFrom({
      workspaceId: "ws_1",
      workspaceRoot: "D:\\workspace",
      relativePath: "apps/web/README.md",
    });
    const encoded = Schema.encodeSync(WorkspaceFileRef)(ref);
    const decoded = Schema.decodeUnknownSync(WorkspaceFileRef)(encoded);
    expect(decoded).toEqual(ref);
    expect(formatWorkspaceFileRelativePath(decoded)).toBe("apps/web/README.md");
  });
});
