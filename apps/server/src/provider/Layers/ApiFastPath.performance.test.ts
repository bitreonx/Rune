import * as Effect from "effect/Effect";
import { describe, expect, it } from "@effect/vitest";

import type { NativeToolContext } from "./ApiTools.ts";
import { generateFilesTool } from "./ApiWorkspaceTools.ts";

describe("API fast path", () => {
  it.effect("generates 10000 deterministic lines locally without a provider round-trip", () =>
    Effect.gen(function* () {
      const writes: Array<{ relativePath: string; contents: string }> = [];
      const context = {
        cwd: "C:/workspace",
        workspaceFileSystem: {
          writeFiles: ({ files }: { files: ReadonlyArray<{ relativePath: string; contents: string }> }) =>
            Effect.sync(() => {
              writes.push(...files);
              return files.map((file) => ({ relativePath: file.relativePath }));
            }),
        },
      } as unknown as NativeToolContext;

      const startedAt = performance.now();
      const result = yield* generateFilesTool.execute(
        { files: [{ path: "generated.txt", template: "line {{index}}", count: 10_000 }] },
        context,
      );
      const elapsedMs = performance.now() - startedAt;
      const contents = writes[0]?.contents ?? "";

      expect(result).toContain("10000 lines");
      expect(contents.split("\n")).toHaveLength(10_000);
      expect(contents).toBe(
        Array.from({ length: 10_000 }, (_, index) => `line ${index + 1}`).join("\n"),
      );
      expect(elapsedMs).toBeLessThan(2_000);
    }),
  );
});
