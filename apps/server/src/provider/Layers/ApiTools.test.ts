// @effect-diagnostics nodeBuiltinImport:off
import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";
import * as WorkspaceEntries from "../../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../../workspace/WorkspacePaths.ts";
import { SAFE_TOOLS, type NativeToolContext } from "./ApiTools.ts";

const workspaceEntriesLayer = WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer));

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(
    WorkspaceFileSystem.layer.pipe(
      Layer.provide(WorkspacePaths.layer),
      Layer.provide(workspaceEntriesLayer),
      // Tool execution never touches VCS state; an empty mock keeps tests hermetic.
      Layer.provideMerge(Layer.mock(GitVcsDriver.GitVcsDriver)({})),
    ),
  ),
  Layer.provideMerge(workspaceEntriesLayer),
  Layer.provideMerge(WorkspacePaths.layer),
  Layer.provideMerge(NodeServices.layer),
);

const makeContext: Effect.Effect<NativeToolContext> = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-api-tools-" });
  yield* fileSystem.writeFileString(path.join(cwd, "hello.txt"), "line1\nline2\n").pipe(Effect.orDie);
  yield* fileSystem.makeDirectory(path.join(cwd, "sub"), { recursive: true }).pipe(Effect.orDie);
  yield* fileSystem.writeFileString(path.join(cwd, "sub", "nested.txt"), "nested\n").pipe(Effect.orDie);
  return {
    cwd,
    workspaceFileSystem: yield* WorkspaceFileSystem.WorkspaceFileSystem,
    workspaceEntries: yield* WorkspaceEntries.WorkspaceEntries,
  };
});

const safeTool = (name: string) => {
  const def = SAFE_TOOLS.find((tool) => tool.name === name);
  expect(def, `expected a safe tool named ${name}`).toBeDefined();
  return def!;
};

it.layer(TestLayer, { excludeTestServices: true })("ApiTools safe tools", (it) => {
  describe("safe tool executions", () => {
    it.effect("read_file returns contents and honors line offset/limit", () =>
      Effect.gen(function* () {
        const read = safeTool("read_file");
        const ctx = yield* makeContext;

        expect(yield* read.execute({ path: "hello.txt" }, ctx)).toContain("line2");
        expect(yield* read.execute({ path: "hello.txt", offset: 2, limit: 1 }, ctx)).toBe("line2");
      }));

    it.effect("read_file denies paths escaping the root", () =>
      Effect.gen(function* () {
        const read = safeTool("read_file");
        const ctx = yield* makeContext;

        const observation = yield* read.execute({ path: "../outside.txt" }, ctx);

        expect(observation.startsWith("Error:")).toBe(true);
      }));

    it.effect("list_dir lists without reading file contents", () =>
      Effect.gen(function* () {
        const list = safeTool("list_dir");
        const ctx = yield* makeContext;

        const observation = yield* list.execute({ path: "." }, ctx);

        expect(observation).toContain("hello.txt");
        expect(observation).toContain("sub/");
        expect(observation).not.toContain("line1");
      }));

    it.effect("search finds content matches formatted as path:line: snippet", () =>
      Effect.gen(function* () {
        const search = safeTool("search");
        const ctx = yield* makeContext;

        const observation = yield* search.execute({ query: "nested" }, ctx);

        expect(observation).toMatch(/sub[\\/]nested\.txt:\d+:/);
      }));

    it.effect("tool failures become Error observations instead of failing the turn", () =>
      Effect.gen(function* () {
        const read = safeTool("read_file");
        const ctx = yield* makeContext;

        const observation = yield* read.execute({ path: "does-not-exist.txt" }, ctx);

        expect(observation.startsWith("Error:")).toBe(true);
      }));
  });

  describe("tool definitions", () => {
    it("every safe tool def is fully described", () => {
      expect(SAFE_TOOLS.map((tool) => tool.name)).toEqual(["read_file", "list_dir", "search"]);
      for (const def of SAFE_TOOLS) {
        expect(def.description.length).toBeGreaterThan(0);
        expect(
          Object.keys((def.parametersJsonSchema as { properties?: object }).properties ?? {}).length,
        ).toBeGreaterThan(0);
        expect(def.requiresApproval).toBe(false);
      }
    });
  });
});
