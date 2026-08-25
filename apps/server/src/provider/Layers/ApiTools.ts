import * as Effect from "effect/Effect";

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

const observe = <E>(
  effect: Effect.Effect<string, E>,
): Effect.Effect<string, never> =>
  effect.pipe(Effect.catch((error) => Effect.succeed(`Error: ${describeError(error)}`)));

const stringArg = (value: unknown): string => (typeof value === "string" ? value : "");

const optionalIntArg = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;

/** Cap observations so one huge file or match set cannot flood the context. */
const MAX_OBSERVATION_CHARS = 16_384;

const clamp = (text: string): string =>
  text.length <= MAX_OBSERVATION_CHARS ? text : `${text.slice(0, MAX_OBSERVATION_CHARS)}\n[clamped]`;

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
          )
        : ctx.workspaceEntries.browse({ partialPath: target, cwd: ctx.cwd }).pipe(
            Effect.map((result) => result.entries.map((entry) => entry.name).join("\n")),
          );
    return listing.pipe(Effect.map(clamp), observe);
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

export const SAFE_TOOLS: ReadonlyArray<NativeToolDef> = [
  readFileTool,
  listDirTool,
  searchTool,
];
