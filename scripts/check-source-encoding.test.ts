// @effect-diagnostics nodeBuiltinImport:off - Tests exercise the host-side source check directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { findMojibake } from "./check-source-encoding.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) NodeFS.rmSync(root, { recursive: true, force: true });
});

describe("source encoding check", () => {
  it("finds common mojibake markers in source files", () => {
    const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "rune-encoding-check-"));
    tempRoots.push(root);
    const sourcePath = NodePath.join(root, "bad.ts");
    const marker = String.fromCharCode(0xe2, 0x20ac, 0x201d);
    NodeFS.writeFileSync(sourcePath, `const label = "${marker}";`, "utf8");

    const expectedMarker = String.fromCharCode(0xe2, 0x20ac);
    expect(findMojibake([root])).toEqual([
      { path: sourcePath, marker: expectedMarker, line: 1, column: 16 },
    ]);
  });

  it("ignores clean source files and excluded directories", () => {
    const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "rune-encoding-check-"));
    tempRoots.push(root);
    NodeFS.mkdirSync(NodePath.join(root, "node_modules"));
    NodeFS.writeFileSync(
      NodePath.join(root, "clean.ts"),
      'const label = "Workspace files — 2";',
      "utf8",
    );
    NodeFS.writeFileSync(
      NodePath.join(root, "node_modules", "ignored.ts"),
      `const ignored = "${String.fromCharCode(0xe2, 0x20ac, 0x201d)}";`,
      "utf8",
    );

    expect(findMojibake([root])).toEqual([]);
  });
});
