import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { mapFsEvent } from "./workspaceWatcherEvents.ts";

describe("mapFsEvent", () => {
  it("maps a change event to a relative POSIX path", () => {
    const root = path.join(path.sep, "ws");
    const result = mapFsEvent(
      { kind: "change", absolutePath: path.join(root, "apps", "web", "src", "file.png") },
      root,
    );
    expect(result).toEqual({ kind: "change", relativePath: "apps/web/src/file.png" });
  });

  it("preserves the kind (add / change / unlink)", () => {
    const root = path.join(path.sep, "ws");
    for (const kind of ["add", "change", "unlink"] as const) {
      const result = mapFsEvent(
        { kind, absolutePath: path.join(root, "a.txt") },
        root,
      );
      expect(result?.kind).toBe(kind);
    }
  });

  it("returns null for events outside the root", () => {
    const root = path.join(path.sep, "ws");
    const outside = path.join(path.sep, "other", "file.png");
    expect(mapFsEvent({ kind: "change", absolutePath: outside }, root)).toBeNull();
  });

  it("handles Windows-style paths via path.relative", () => {
    const root = path.win32.join("D:", "ws");
    const absolute = path.win32.join("D:", "ws", "apps", "web", "file.ts");
    const result = mapFsEvent({ kind: "change", absolutePath: absolute }, root);
    expect(result?.relativePath).toBe("apps/web/file.ts");
  });
});
