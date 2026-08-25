// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import type { ProjectEntry } from "@t3tools/contracts";

import { WorkspaceTreeWalkError, workspaceTreeWalk } from "./WorkspaceTreeWalk.ts";
import type { WorkspaceTreeWalkOptions } from "./WorkspaceTreeWalk.ts";

function entry(path: string, kind: ProjectEntry["kind"]): ProjectEntry {
  return { path, kind };
}

function makeWorkspace(): string {
  return NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3code-tree-walk-"));
}

function writeTree(root: string, files: ReadonlyArray<string>): void {
  for (const relativePath of files) {
    const absolutePath = NodePath.join(root, ...relativePath.split("/"));
    NodeFS.mkdirSync(NodePath.dirname(absolutePath), { recursive: true });
    NodeFS.writeFileSync(absolutePath, "");
  }
}

it.effect("lists hidden and git-ignored entries alongside tracked ones", () =>
  Effect.gen(function* () {
    const root = makeWorkspace();
    try {
      writeTree(root, [
        ".gitignore",
        ".env",
        ".temp/cache.bin",
        "src/a.ts",
      ]);

      const result = yield* workspaceTreeWalk(root);

      expect(result.entries).toEqual([
        entry(".env", "file"),
        entry(".gitignore", "file"),
        entry(".temp", "directory"),
        entry(".temp/cache.bin", "file"),
        entry("src", "directory"),
        entry("src/a.ts", "file"),
      ]);
      expect(result.truncated).toBe(false);
    } finally {
      NodeFS.rmSync(root, { recursive: true, force: true });
    }
  }),
);

it.effect("skips .git and dependency directories at any depth", () =>
  Effect.gen(function* () {
    const root = makeWorkspace();
    try {
      writeTree(root, [
        ".git/HEAD",
        ".venv/lib.py",
        "__pycache__/a.pyc",
        "node_modules/pkg/index.js",
        "node-modules.txt",
        "packages/app/node_modules/x.js",
        "src/main.ts",
        "venv/x.py",
      ]);

      const result = yield* workspaceTreeWalk(root);

      expect(result.entries).toEqual([
        entry("node-modules.txt", "file"),
        entry("packages", "directory"),
        entry("packages/app", "directory"),
        entry("src", "directory"),
        entry("src/main.ts", "file"),
      ]);
    } finally {
      NodeFS.rmSync(root, { recursive: true, force: true });
    }
  }),
);

it.effect("caps the listing breadth-first and reports truncation", () =>
  Effect.gen(function* () {
    const root = makeWorkspace();
    try {
      writeTree(root, ["a.txt", "dir1/c.txt", "dir1/sub/d.txt", "z.txt"]);

      const result = yield* workspaceTreeWalk(root, { maxEntries: 4 });

      // Breadth-first: the shallow dir1/c.txt survives the cap ahead of the
      // deeper dir1/sub/d.txt.
      expect(result.entries).toEqual([
        entry("a.txt", "file"),
        entry("dir1", "directory"),
        entry("dir1/c.txt", "file"),
        entry("z.txt", "file"),
      ]);
      expect(result.truncated).toBe(true);
    } finally {
      NodeFS.rmSync(root, { recursive: true, force: true });
    }
  }),
);

it.effect("does not report truncation when the tree fits the cap exactly", () =>
  Effect.gen(function* () {
    const root = makeWorkspace();
    try {
      writeTree(root, ["a.txt", "dir1/c.txt", "z.txt"]);

      const result = yield* workspaceTreeWalk(root, { maxEntries: 4 });

      expect(result.entries).toEqual([
        entry("a.txt", "file"),
        entry("dir1", "directory"),
        entry("dir1/c.txt", "file"),
        entry("z.txt", "file"),
      ]);
      expect(result.truncated).toBe(false);
    } finally {
      NodeFS.rmSync(root, { recursive: true, force: true });
    }
  }),
);

it.effect("fails with a tagged error when the root cannot be read", () =>
  Effect.gen(function* () {
    const root = NodePath.join(makeWorkspace(), "missing");

    const error = yield* Effect.flip(workspaceTreeWalk(root));

    expect(error).toBeInstanceOf(WorkspaceTreeWalkError);
    expect(error.rootPath).toBe(root);
  }),
);

it.effect("skips unreadable subdirectories instead of failing the walk", () =>
  Effect.gen(function* () {
    const root = makeWorkspace();
    try {
      writeTree(root, ["locked/x.txt", "ok/y.txt"]);
      const readDir: NonNullable<WorkspaceTreeWalkOptions["readDir"]> = (
        path,
        options,
      ) => {
        if (path.endsWith("locked")) {
          return Promise.reject(Object.assign(new Error("denied"), { code: "EACCES" }));
        }
        return NodeFSP.readdir(path, options);
      };

      const result = yield* workspaceTreeWalk(root, { readDir });

      expect(result.entries).toEqual([
        entry("locked", "directory"),
        entry("ok", "directory"),
        entry("ok/y.txt", "file"),
      ]);
      expect(result.truncated).toBe(false);
    } finally {
      NodeFS.rmSync(root, { recursive: true, force: true });
    }
  }),
);

it.effect("lists symlinks by their target kind without following them", () =>
  Effect.gen(function* () {
    const root = makeWorkspace();
    const outside = makeWorkspace();
    try {
      writeTree(root, ["real/a.ts"]);
      writeTree(outside, ["leak.txt", "nested/deep.txt"]);
      try {
        NodeFS.symlinkSync(
          NodePath.join(outside, "leak.txt"),
          NodePath.join(root, "link.txt"),
          "file",
        );
        NodeFS.symlinkSync(
          NodePath.join(outside, "nested"),
          NodePath.join(root, "link-dir"),
          "dir",
        );
      } catch {
        // Creating symlinks on Windows needs developer mode or admin rights;
        // the no-follow behavior is enforced by the walker, not the OS.
        return;
      }

      const result = yield* workspaceTreeWalk(root);

      expect(result.entries).toEqual([
        entry("link-dir", "directory"),
        entry("link.txt", "file"),
        entry("real", "directory"),
        entry("real/a.ts", "file"),
      ]);
    } finally {
      NodeFS.rmSync(root, { recursive: true, force: true });
      NodeFS.rmSync(outside, { recursive: true, force: true });
    }
  }),
);
