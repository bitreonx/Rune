import * as Effect from "effect/Effect";
import { describe, expect, it } from "@effect/vitest";

import type { NativeToolContext } from "./ApiTools.ts";
import { applyPatchTool, generateFilesTool, runChecksTool } from "./ApiWorkspaceTools.ts";

const makeContext = (current = "old") => {
  const writes: Array<{ path: string; contents: string }> = [];
  const ctx = {
    cwd: "C:/workspace",
    workspaceFileSystem: {
      readFile: ({ relativePath }: { relativePath: string }) =>
        Effect.succeed({ relativePath, contents: current, byteLength: current.length, truncated: false }),
      writeFiles: ({ files }: { files: ReadonlyArray<{ relativePath: string; contents: string }> }) =>
        Effect.sync(() => {
          writes.push(...files.map((file) => ({ path: file.relativePath, contents: file.contents })));
          return files.map((file) => ({ relativePath: file.relativePath }));
        }),
    },
    workspaceEntries: {},
    processRunner: {
      run: () =>
        Effect.succeed({
          stdout: "ok",
          stderr: "",
          code: 0,
          timedOut: false,
          stdoutTruncated: false,
          stderrTruncated: false,
          stdoutInvalidUtf8: false,
          stderrInvalidUtf8: false,
        }),
    },
  } as unknown as NativeToolContext;
  return { ctx, writes };
};

describe("ApiWorkspaceTools mutations", () => {
  it.effect("applies a multi-file patch only after all preconditions pass", () =>
    Effect.gen(function* () {
      const { ctx, writes } = makeContext();
      const result = yield* applyPatchTool.execute(
        {
          files: [
            { path: "a.ts", oldText: "old", newText: "new" },
            { path: "b.ts", oldText: "old", newText: "new" },
          ],
        },
        ctx,
      );

      expect(result).toContain("Applied 2 files");
      expect(writes).toEqual([
        { path: "a.ts", contents: "new" },
        { path: "b.ts", contents: "new" },
      ]);
    }),
  );

  it.effect("does not write any file when one patch precondition fails", () =>
    Effect.gen(function* () {
      const { ctx, writes } = makeContext("different");
      const result = yield* applyPatchTool.execute(
        { files: [{ path: "a.ts", oldText: "old", newText: "new" }] },
        ctx,
      );

      expect(result).toContain("precondition");
      expect(writes).toEqual([]);
    }),
  );

  it.effect("generates 10000 deterministic lines from a bounded manifest", () =>
    Effect.gen(function* () {
      const { ctx, writes } = makeContext();
      const result = yield* generateFilesTool.execute(
        { files: [{ path: "generated.txt", template: "line {{index}}", count: 10_000 }] },
        ctx,
      );

      expect(result).toContain("generated.txt");
      expect(result).toContain("10000 lines");
      expect(writes[0]?.contents.split("\n")).toHaveLength(10_000);
      expect(writes[0]?.contents.startsWith("line 1")).toBe(true);
    }),
  );

  it.effect("returns structured focused-check output", () =>
    Effect.gen(function* () {
      const { ctx } = makeContext();
      const result = yield* runChecksTool.execute(
        { checks: [{ command: "node", args: ["--version"] }] },
        ctx,
      );

      expect(result).toContain("exit 0");
      expect(result).toContain("ok");
    }),
  );
});
