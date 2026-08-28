// @effect-diagnostics nodeBuiltinImport:off
import * as NodeServices from "@effect/platform-node/NodeServices";
import { HostProcessPlatform } from "@rune/shared/hostProcess";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import * as GitVcsDriver from "../../vcs/GitVcsDriver.ts";
import * as ProcessRunner from "../../processRunner.ts";
import * as WorkspaceEntries from "../../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../../workspace/WorkspacePaths.ts";
import { GATED_TOOLS, SAFE_TOOLS, type NativeToolContext } from "./ApiTools.ts";

const workspaceEntriesLayer = WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer));

interface CapturedProcessRun {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string | undefined;
}

const capturedRuns: Array<CapturedProcessRun> = [];

const fakeProcessRunnerLayer = Layer.mock(ProcessRunner.ProcessRunner)({
  run: (input) =>
    Effect.suspend(() => {
      capturedRuns.push({ command: input.command, args: input.args, cwd: input.cwd });
      return Effect.succeed({
        stdout: "hello from bash\n",
        stderr: "",
        code: ChildProcessSpawner.ExitCode(0),
        timedOut: false,
        stdoutTruncated: false,
        stderrTruncated: false,
        stdoutInvalidUtf8: false,
        stderrInvalidUtf8: false,
      });
    }),
});

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
  Layer.provideMerge(fakeProcessRunnerLayer),
  Layer.provideMerge(NodeServices.layer),
);

const makeContext = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "rune-api-tools-" });
  yield* fileSystem
    .writeFileString(path.join(cwd, "hello.txt"), "line1\nline2\n")
    .pipe(Effect.orDie);
  yield* fileSystem.makeDirectory(path.join(cwd, "sub"), { recursive: true }).pipe(Effect.orDie);
  yield* fileSystem
    .writeFileString(path.join(cwd, "sub", "nested.txt"), "nested\n")
    .pipe(Effect.orDie);
  return {
    cwd,
    workspaceFileSystem: yield* WorkspaceFileSystem.WorkspaceFileSystem,
    workspaceEntries: yield* WorkspaceEntries.WorkspaceEntries,
    processRunner: yield* ProcessRunner.ProcessRunner,
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
      }),
    );

    it.effect("read_file denies paths escaping the root", () =>
      Effect.gen(function* () {
        const read = safeTool("read_file");
        const ctx = yield* makeContext;

        const observation = yield* read.execute({ path: "../outside.txt" }, ctx);

        expect(observation.startsWith("Error:")).toBe(true);
      }),
    );

    it.effect("list_dir lists without reading file contents", () =>
      Effect.gen(function* () {
        const list = safeTool("list_dir");
        const ctx = yield* makeContext;

        const observation = yield* list.execute({ path: "." }, ctx);

        expect(observation).toContain("hello.txt");
        expect(observation).toContain("sub/");
        expect(observation).not.toContain("line1");
      }),
    );

    it.effect("search finds content matches formatted as path:line: snippet", () =>
      Effect.gen(function* () {
        const search = safeTool("search");
        const ctx = yield* makeContext;

        const observation = yield* search.execute({ query: "nested" }, ctx);

        expect(observation).toMatch(/sub[\\/]nested\.txt:\d+:/);
      }),
    );

    it.effect("tool failures become Error observations instead of failing the turn", () =>
      Effect.gen(function* () {
        const read = safeTool("read_file");
        const ctx = yield* makeContext;

        const observation = yield* read.execute({ path: "does-not-exist.txt" }, ctx);

        expect(observation.startsWith("Error:")).toBe(true);
      }),
    );
  });

  describe("tool definitions", () => {
    it("every safe tool def is fully described", () => {
      expect(SAFE_TOOLS.map((tool) => tool.name)).toEqual([
        "ask_user",
        "workspace_snapshot",
        "search_many",
        "read_many",
        "read_file",
        "list_dir",
        "search",
      ]);
      for (const def of SAFE_TOOLS) {
        expect(def.description.length).toBeGreaterThan(0);
        expect(Object.keys(def.parametersJsonSchema).length).toBeGreaterThan(0);
        expect(def.requiresApproval).toBe(false);
      }
    });

    it("every gated tool def is fully described and requires approval", () => {
      expect(GATED_TOOLS.map((tool) => tool.name)).toEqual([
        "apply_patch",
        "generate_files",
        "run_checks",
        "edit_file",
        "rune_operation",
        "bash",
      ]);
      for (const def of GATED_TOOLS) {
        expect(def.description.length).toBeGreaterThan(0);
        expect(
          Object.keys((def.parametersJsonSchema as { properties?: object }).properties ?? {})
            .length,
        ).toBeGreaterThan(0);
        expect(def.requiresApproval).toBe(true);
      }
    });
  });

  describe("gated tool executions", () => {
    it.effect("executes a typed read operation without creating shell syntax", () =>
      Effect.gen(function* () {
        const operation = GATED_TOOLS.find((tool) => tool.name === "rune_operation")!;
        const ctx = yield* makeContext;

        const observation = yield* operation.execute(
          {
            operation: {
              kind: "readLines",
              path: "hello.txt",
              start: 2,
              end: 2,
            },
          },
          ctx,
        );

        expect(observation).toBe("line2");
      }),
    );

    it.effect("edit_file replaces a unique occurrence and persists it", () =>
      Effect.gen(function* () {
        const edit = GATED_TOOLS.find((tool) => tool.name === "edit_file")!;
        const ctx = yield* makeContext;

        const observation = yield* edit.execute(
          { path: "hello.txt", oldText: "line2", newText: "line two" },
          ctx,
        );

        expect(observation.startsWith("Error:")).toBe(false);
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        expect(yield* fileSystem.readFileString(path.join(ctx.cwd, "hello.txt"))).toBe(
          "line1\nline two\n",
        );
      }),
    );

    it.effect("edit_file rejects oldText matching more than one location", () =>
      Effect.gen(function* () {
        const edit = GATED_TOOLS.find((tool) => tool.name === "edit_file")!;
        const ctx = yield* makeContext;

        // "line" appears twice in hello.txt.
        const observation = yield* edit.execute(
          { path: "hello.txt", oldText: "line", newText: "x" },
          ctx,
        );

        expect(observation.startsWith("Error:")).toBe(true);
        expect(observation).toContain("2");
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        expect(yield* fileSystem.readFileString(path.join(ctx.cwd, "hello.txt"))).toBe(
          "line1\nline2\n",
        );
      }),
    );

    it.effect("bash runs through the process runner with a platform shell", () =>
      Effect.gen(function* () {
        const bash = GATED_TOOLS.find((tool) => tool.name === "bash")!;
        capturedRuns.length = 0;
        const ctx = yield* makeContext;

        const observation = yield* bash.execute({ command: "echo hi" }, ctx);

        expect(capturedRuns.length).toBe(1);
        if ((yield* HostProcessPlatform) === "win32") {
          expect(capturedRuns[0]).toMatchObject({
            command: "pwsh.exe",
            args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "echo hi"],
          });
        } else {
          expect(capturedRuns[0]).toMatchObject({ command: "bash", args: ["-c", "echo hi"] });
        }
        expect(capturedRuns[0]?.cwd).toBe(ctx.cwd);
        expect(observation).toContain("hello from bash");
        expect(observation).toContain("exit 0");
      }),
    );
  });
});
