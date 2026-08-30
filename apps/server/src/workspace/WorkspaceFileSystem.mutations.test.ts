import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as NodeFS from "node:fs";
import * as OS from "node:os";
import * as NodePath from "node:path";

import * as WorkspaceFileSystem from "./WorkspaceFileSystem.ts";
import * as WorkspaceEntries from "./WorkspaceEntries.ts";
import * as WorkspacePaths from "./WorkspacePaths.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as ServerConfig from "../config.ts";
import * as VcsDriverRegistry from "../vcs/VcsDriverRegistry.ts";
import * as VcsProcess from "../vcs/VcsProcess.ts";

const TestLayers = WorkspaceFileSystem.layer.pipe(
  Layer.provide(WorkspacePaths.layer),
  Layer.provide(WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer))),
  Layer.provideMerge(GitVcsDriver.layer),
  Layer.provideMerge(VcsDriverRegistry.layer.pipe(Layer.provide(VcsProcess.layer))),
  Layer.provide(
    ServerConfig.ServerConfig.layerTest(process.cwd(), {
      prefix: "rune-workspace-mutations-test-",
    }),
  ),
  Layer.provideMerge(NodeServices.layer),
);

function makeTemporaryWorkspace(): string {
  return NodeFS.mkdtempSync(NodePath.join(OS.tmpdir(), "rune-workspace-fs-"));
}

describe("WorkspaceFileSystem mutations", () => {
  it("writes a batch and rolls back earlier files when a later target fails", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          NodeFS.writeFileSync(NodePath.join(root, "existing.txt"), "before");
          NodeFS.writeFileSync(NodePath.join(root, "blocked"), "not-a-directory");

          const result = yield* workspaceFileSystem
            .writeFiles({
              cwd: root,
              files: [
                { relativePath: "existing.txt", contents: "after" },
                { relativePath: "created.txt", contents: "new" },
                { relativePath: "created/nested.txt", contents: "nested" },
                { relativePath: "blocked/child.txt", contents: "failure" },
              ],
            })
            .pipe(Effect.exit);

          expect(result._tag).toBe("Failure");
          expect(NodeFS.readFileSync(NodePath.join(root, "existing.txt"), "utf8")).toBe("before");
          expect(NodeFS.existsSync(NodePath.join(root, "created.txt"))).toBe(false);
          expect(NodeFS.existsSync(NodePath.join(root, "created"))).toBe(false);
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("writes explicitly encoded binary batch contents without UTF-8 corruption", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          yield* workspaceFileSystem.writeFiles({
            cwd: root,
            files: [
              {
                relativePath: "assets/icon.bin",
                contents: { encoding: "base64", data: "AAEC/w==" },
              },
            ],
          });
          expect([...NodeFS.readFileSync(NodePath.join(root, "assets/icon.bin"))]).toEqual([
            0, 1, 2, 255,
          ]);
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("replaces an existing target through the platform-safe staged path", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          NodeFS.writeFileSync(NodePath.join(root, "existing.bin"), Buffer.from([0, 1, 2]));
          yield* workspaceFileSystem.writeFiles({
            cwd: root,
            files: [
              { relativePath: "existing.bin", contents: { encoding: "base64", data: "/wA=" } },
            ],
          });
          expect([...NodeFS.readFileSync(NodePath.join(root, "existing.bin"))]).toEqual([255, 0]);
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("rejects invalid binary transport and aggregate-over-limit batches before mutation", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          const invalidBase64 = yield* workspaceFileSystem
            .writeFiles({
              cwd: root,
              files: [
                { relativePath: "invalid.bin", contents: { encoding: "base64", data: "bad" } },
              ],
            })
            .pipe(Effect.exit);
          expect(invalidBase64._tag).toBe("Failure");
          expect(NodeFS.existsSync(NodePath.join(root, "invalid.bin"))).toBe(false);

          const perFileOversized = yield* workspaceFileSystem
            .writeFiles({
              cwd: root,
              files: [{ relativePath: "per-file.txt", contents: "x".repeat(256 * 1024 + 1) }],
            })
            .pipe(Effect.exit);
          expect(perFileOversized._tag).toBe("Failure");
          expect(NodeFS.existsSync(NodePath.join(root, "per-file.txt"))).toBe(false);

          const oversized = yield* workspaceFileSystem
            .writeFiles({
              cwd: root,
              files: [{ relativePath: "oversized.txt", contents: "x".repeat(2 * 1024 * 1024 + 1) }],
            })
            .pipe(Effect.exit);
          expect(oversized._tag).toBe("Failure");
          expect(NodeFS.existsSync(NodePath.join(root, "oversized.txt"))).toBe(false);
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("createEntry makes a file, parents included, and rejects duplicates", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          const created = yield* workspaceFileSystem.createEntry({
            cwd: root,
            relativePath: "src/assets/hero.txt",
            kind: "file",
          });
          expect(created.relativePath.replace(/\\/g, "/")).toBe("src/assets/hero.txt");
          expect(NodeFS.readFileSync(NodePath.join(root, "src/assets/hero.txt"), "utf8")).toBe("");

          const duplicate = yield* workspaceFileSystem
            .createEntry({ cwd: root, relativePath: "src/assets/hero.txt", kind: "file" })
            .pipe(Effect.exit);
          expect(duplicate._tag).toBe("Failure");
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("createEntry makes directories and is idempotent for them", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          yield* workspaceFileSystem.createEntry({
            cwd: root,
            relativePath: "docs",
            kind: "directory",
          });
          yield* workspaceFileSystem.createEntry({
            cwd: root,
            relativePath: "docs",
            kind: "directory",
          });
          expect(NodeFS.statSync(NodePath.join(root, "docs")).isDirectory()).toBe(true);
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("renameEntry renames within its own directory and refuses segment escapes", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          NodeFS.mkdirSync(NodePath.join(root, "src"), { recursive: true });
          NodeFS.writeFileSync(NodePath.join(root, "src", "old.txt"), "hello");

          const renamed = yield* workspaceFileSystem.renameEntry({
            cwd: root,
            relativePath: "src/old.txt",
            newName: "new.txt",
          });
          expect(renamed.relativePath.replace(/\\/g, "/")).toBe("src/new.txt");
          expect(NodeFS.existsSync(NodePath.join(root, "src", "old.txt"))).toBe(false);
          expect(NodeFS.readFileSync(NodePath.join(root, "src", "new.txt"), "utf8")).toBe("hello");

          const escape = yield* workspaceFileSystem
            .renameEntry({ cwd: root, relativePath: "src/new.txt", newName: "../escape.txt" })
            .pipe(Effect.exit);
          expect(escape._tag).toBe("Failure");
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });

  it("deleteEntry removes files and recursive directories, refuses the root", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
        const root = makeTemporaryWorkspace();
        try {
          NodeFS.mkdirSync(NodePath.join(root, "pkg", "nested"), { recursive: true });
          NodeFS.writeFileSync(NodePath.join(root, "pkg", "nested", "a.txt"), "a");

          const nonRecursive = yield* workspaceFileSystem
            .deleteEntry({ cwd: root, relativePath: "pkg", recursive: false })
            .pipe(Effect.exit);
          expect(nonRecursive._tag).toBe("Failure");

          yield* workspaceFileSystem.deleteEntry({
            cwd: root,
            relativePath: "pkg",
            recursive: true,
          });
          expect(NodeFS.existsSync(NodePath.join(root, "pkg"))).toBe(false);

          const rootDelete = yield* workspaceFileSystem
            .deleteEntry({ cwd: root, relativePath: "" })
            .pipe(Effect.exit);
          expect(rootDelete._tag).toBe("Failure");
        } finally {
          NodeFS.rmSync(root, { recursive: true, force: true });
        }
      }).pipe(Effect.provide(TestLayers)),
    );
  });
});
