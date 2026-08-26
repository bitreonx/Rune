import * as Effect from "effect/Effect";
import { describe, expect, it } from "@effect/vitest";

import type { NativeToolContext } from "./ApiTools.ts";
import { readManyTool, searchManyTool, workspaceSnapshotTool } from "./ApiWorkspaceTools.ts";

const makeContext = (): NativeToolContext => ({
  cwd: "C:/workspace",
  workspaceFileSystem: {
    readFile: ({ relativePath }: { readonly relativePath: string }) =>
      Effect.succeed({
        relativePath,
        contents: `contents of ${relativePath}`,
        byteLength: relativePath.length,
        truncated: false,
      }),
  } as unknown as NativeToolContext["workspaceFileSystem"],
  workspaceEntries: {
    list: () =>
      Effect.succeed({
        entries: [
          { path: "apps", kind: "directory" },
          { path: "package.json", kind: "file" },
        ],
        truncated: false,
      }),
    searchContents: ({ query }: { readonly query: string }) =>
      Effect.succeed({
        matches: [
          { path: "src/index.ts", lineNumber: 1, lineContent: `found ${query}`, matchRanges: [] },
        ],
        truncated: false,
      }),
  } as unknown as NativeToolContext["workspaceEntries"],
});

describe("ApiWorkspaceTools", () => {
  it.effect("returns a bounded workspace snapshot", () =>
    Effect.gen(function* () {
      const result = yield* workspaceSnapshotTool.execute({}, makeContext());

      expect(result).toContain("apps/");
      expect(result).toContain("package.json");
      expect(result).not.toContain("contents of");
    }),
  );

  it.effect("batches content searches and preserves query labels", () =>
    Effect.gen(function* () {
      const result = yield* searchManyTool.execute({ queries: ["alpha", "beta"] }, makeContext());

      expect(result).toContain("query 1: alpha");
      expect(result).toContain("found alpha");
      expect(result).toContain("query 2: beta");
      expect(result).toContain("found beta");
    }),
  );

  it.effect("reads multiple bounded file windows in one tool call", () =>
    Effect.gen(function* () {
      const result = yield* readManyTool.execute(
        { files: [{ path: "a.ts" }, { path: "b.ts" }] },
        makeContext(),
      );

      expect(result).toContain("a.ts");
      expect(result).toContain("contents of a.ts");
      expect(result).toContain("b.ts");
      expect(result).toContain("contents of b.ts");
    }),
  );
});
