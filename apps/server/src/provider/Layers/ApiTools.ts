import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import { HostProcessPlatform } from "@t3tools/shared/hostProcess";

import { ProcessRunner } from "../../processRunner.ts";
import { WorkspaceFileSystem } from "../../workspace/WorkspaceFileSystem.ts";
import { WorkspaceEntries } from "../../workspace/WorkspaceEntries.ts";

/**
 * Native tools for the API-provider agent loop.
 *
 * Tools execute against trusted workspace services (confinement, binary
 * detection, and search all live there) and return plain-text observations
 * for the model. Every failure becomes an `Error: …` observation instead of
 * failing the turn — a bad tool call is information for the next round-trip,
 * not an abort condition.
 */

export interface NativeToolContext {
  readonly cwd: string;
  readonly workspaceFileSystem: typeof WorkspaceFileSystem.Service;
  readonly workspaceEntries: typeof WorkspaceEntries.Service;
  /** Required by `bash`; absent contexts fail that tool with an observation. */
  readonly processRunner?: typeof ProcessRunner.Service | undefined;
}

export interface NativeToolDef {
  readonly name: string;
  readonly description: string;
  /** Plain JSON Schema object — these providers take `tools` verbatim. */
  readonly parametersJsonSchema: Record<string, unknown>;
  /**
   * Gated tools pause the turn with an approval request before executing;
   * safe tools run unattended. The policy mapping that decides whether a
   * gated tool actually waits lives in the adapter.
   */
  readonly requiresApproval: boolean;
  readonly execute: (
    args: Record<string, unknown>,
    ctx: NativeToolContext,
  ) => Effect.Effect<string>;
}

const describeError = (error: unknown): string =>
  error instanceof Error && error.message.length > 0 ? error.message : JSON.stringify(error);

const observe = <E>(effect: Effect.Effect<string, E>): Effect.Effect<string, never> =>
  effect.pipe(Effect.catch((error) => Effect.succeed(`Error: ${describeError(error)}`)));

const stringArg = (value: unknown): string => (typeof value === "string" ? value : "");

const optionalIntArg = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;

/** Cap observations so one huge file or match set cannot flood the context. */
const MAX_OBSERVATION_CHARS = 16_384;

const clamp = (text: string): string =>
  text.length <= MAX_OBSERVATION_CHARS
    ? text
    : `${text.slice(0, MAX_OBSERVATION_CHARS)}\n[clamped]`;

export const readFileTool: NativeToolDef = {
  name: "read_file",
  description:
    "Read a UTF-8 text file from the workspace. Paths are workspace-relative; optionally return a window of lines.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Workspace-relative path to the file." },
      offset: { type: "integer", minimum: 1, description: "1-based line number to start from." },
      limit: { type: "integer", minimum: 1, description: "Maximum number of lines to return." },
    },
    required: ["path"],
  },
  requiresApproval: false,
  execute: (args, ctx) => {
    const offset = optionalIntArg(args.offset);
    const limit = optionalIntArg(args.limit);
    return ctx.workspaceFileSystem
      .readFile({ cwd: ctx.cwd, relativePath: stringArg(args.path) })
      .pipe(
        Effect.map((result) => {
          let text = result.contents;
          if (offset !== undefined || limit !== undefined) {
            const lines = text.split("\n");
            const start = Math.max((offset ?? 1) - 1, 0);
            const end = limit !== undefined ? start + limit : lines.length;
            text = lines.slice(start, end).join("\n");
          }
          if (result.truncated) text += "\n[truncated]";
          return clamp(text.length === 0 ? "(empty file)" : text);
        }),
        observe,
      );
  },
};

export const listDirTool: NativeToolDef = {
  name: "list_dir",
  description:
    "List the immediate entries of a directory in the workspace without reading file contents.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: 'Workspace-relative directory path ("." for the workspace root).',
      },
    },
    required: ["path"],
  },
  requiresApproval: false,
  execute: (args, ctx) => {
    const target = stringArg(args.path) || ".";
    const listing =
      target === "."
        ? ctx.workspaceEntries.list({ cwd: ctx.cwd }).pipe(
            Effect.map((result) =>
              result.entries
                .map((entry) => (entry.kind === "directory" ? `${entry.path}/` : entry.path))
                .join("\n"),
            ),
            observe,
          )
        : ctx.workspaceEntries.browse({ partialPath: target, cwd: ctx.cwd }).pipe(
            Effect.map((result) => result.entries.map((entry) => entry.name).join("\n")),
            observe,
          );
    return listing.pipe(Effect.map(clamp));
  },
};

export const searchTool: NativeToolDef = {
  name: "search",
  description:
    "Search file contents across the workspace for a substring. Returns matches as `path:line: snippet` lines.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text to find inside files.", minLength: 1 },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Maximum number of matches (default 20).",
      },
    },
    required: ["query"],
  },
  requiresApproval: false,
  execute: (args, ctx) =>
    ctx.workspaceEntries
      .searchContents({
        cwd: ctx.cwd,
        query: stringArg(args.query),
        limit: optionalIntArg(args.limit) ?? 20,
        caseSensitive: false,
        wholeWord: false,
        useRegex: false,
      })
      .pipe(
        Effect.map((result) => {
          const formatted = result.matches
            .map((match) => `${match.path}:${match.lineNumber}: ${match.lineContent.trim()}`)
            .join("\n");
          const body = clamp(formatted.length === 0 ? "No matches." : formatted);
          return result.truncated ? `${body}\n[results truncated]` : body;
        }),
        observe,
      ),
};

export const SAFE_TOOLS: ReadonlyArray<NativeToolDef> = [readFileTool, listDirTool, searchTool];

const BASH_TIMEOUT = Duration.seconds(120);
const BASH_MAX_OUTPUT_BYTES = 64 * 1024;

export const editFileTool: NativeToolDef = {
  name: "edit_file",
  description:
    "Replace text inside a workspace file. oldText must match exactly one location in the file.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Workspace-relative path to the file." },
      oldText: {
        type: "string",
        description: "Exact text to replace; must be unique in the file.",
      },
      newText: { type: "string", description: "Replacement text." },
    },
    required: ["path", "oldText", "newText"],
  },
  requiresApproval: true,
  execute: (args, ctx) => {
    const relativePath = stringArg(args.path);
    const oldText = stringArg(args.oldText);
    return Effect.gen(function* () {
      if (oldText.length === 0) {
        return `Error: edit_file oldText must not be empty`;
      }
      const result = yield* ctx.workspaceFileSystem.readFile({ cwd: ctx.cwd, relativePath });
      const occurrences = result.contents.split(oldText).length - 1;
      if (occurrences !== 1) {
        return `Error: oldText matched ${occurrences} locations in ${relativePath}; it must match exactly one. Include more surrounding text.`;
      }
      const newText = stringArg(args.newText);
      yield* ctx.workspaceFileSystem.writeFile({
        cwd: ctx.cwd,
        relativePath,
        contents: result.contents.replace(oldText, newText),
      });
      return `Edited ${relativePath}`;
    }).pipe(observe);
  },
};

export const bashTool: NativeToolDef = {
  name: "bash",
  description:
    "Run a shell command in the workspace root and see its output. Output is truncated to fit; the command times out after two minutes.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to run.", minLength: 1 },
    },
    required: ["command"],
  },
  requiresApproval: true,
  execute: (args, ctx) => {
    const runner = ctx.processRunner;
    if (!runner) {
      return Effect.succeed("Error: bash is unavailable in this context");
    }
    const command = stringArg(args.command);
    return Effect.gen(function* () {
      // Windows has no bundled POSIX shell; cmd.exe is the lowest common shell there.
      const isWindows = (yield* HostProcessPlatform) === "win32";
      const output = yield* runner.run({
        command: isWindows ? "cmd.exe" : "bash",
        args: isWindows ? ["/c", command] : ["-c", command],
        cwd: ctx.cwd,
        timeout: BASH_TIMEOUT,
        maxOutputBytes: BASH_MAX_OUTPUT_BYTES,
        outputMode: "truncate",
        timeoutBehavior: "timedOutResult",
      });
      const sections: Array<string> = [];
      if (output.stdout.length > 0) sections.push(output.stdout.replace(/\n$/, ""));
      if (output.stderr.length > 0) sections.push(`[stderr]\n${output.stderr}`);
      const suffix = `${output.timedOut ? " (timed out)" : ""}${output.stdoutTruncated || output.stderrTruncated ? " [output truncated]" : ""}`;
      return clamp(`exit ${String(output.code)}${suffix}\n${sections.join("\n")}`);
    }).pipe(observe);
  },
};

export const GATED_TOOLS: ReadonlyArray<NativeToolDef> = [editFileTool, bashTool];

export const NATIVE_TOOLS: ReadonlyArray<NativeToolDef> = [...SAFE_TOOLS, ...GATED_TOOLS];
