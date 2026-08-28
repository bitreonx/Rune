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
          yield* workspaceFileSystem.createEntry({ cwd: root, relativePath: "docs", kind: "directory" });
          yield* workspaceFileSystem.createEntry({ cwd: root, relativePath: "docs", kind: "directory" });
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

          yield* workspaceFileSystem.deleteEntry({ cwd: root, relativePath: "pkg", recursive: true });
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
