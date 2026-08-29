import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HostProcessPlatform } from "@rune/shared/hostProcess";
import { getHostCommandProfile } from "@rune/shared/hostCommandProfile";
import {
  RuneCommandOperation,
  type RuneCommandOperation as RuneCommandOperationType,
  type UserInputQuestion,
} from "@rune/contracts";
import { WINDOWS_SHELL_CANDIDATES, windowsPowerShellArgs } from "@rune/shared/shell";

import {
  classifyProcessFailure,
  isWindowsCommandNotFound,
  ProcessRunner,
} from "../../processRunner.ts";
import { WorkspaceFileSystem } from "../../workspace/WorkspaceFileSystem.ts";
import { WorkspaceEntries } from "../../workspace/WorkspaceEntries.ts";
import { COMPOUND_MUTATION_TOOLS, COMPOUND_READ_TOOLS } from "./ApiWorkspaceTools.ts";

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
  /** Required by `shell`; absent contexts fail that tool with an observation. */
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
  /** Marks a read-only tool whose identical calls may share one observation. */
  readonly dedupeSafeRead?: boolean;
  /** Marks a tool whose successful output is usable as completion evidence. */
  readonly verificationTool?: boolean;
  /** Marks a tool that can make prior verification stale. */
  readonly invalidatesVerification?: boolean;
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

const formatProcessObservation = (input: {
  readonly platform: NodeJS.Platform;
  readonly command: string;
  readonly cwd: string;
  readonly result: {
    readonly code: number | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly timedOut: boolean;
    readonly stdoutTruncated: boolean;
    readonly stderrTruncated: boolean;
    readonly stdoutInvalidUtf8: boolean;
    readonly stderrInvalidUtf8: boolean;
  };
}): string => {
  const failure = classifyProcessFailure({
    platform: input.platform,
    runInput: { command: input.command, cwd: input.cwd },
    output: input.result,
  });
  const sections: Array<string> = [];
  if (failure !== undefined) sections.push(`failure ${failure}`);
  sections.push(`exit ${String(input.result.code)}${input.result.timedOut ? " (timed out)" : ""}`);
  if (input.result.stdout.length > 0) sections.push(input.result.stdout.replace(/\n$/u, ""));
  if (input.result.stderr.length > 0) sections.push(`[stderr]\n${input.result.stderr}`);
  if (input.result.stdoutTruncated || input.result.stderrTruncated) sections.push("[output truncated]");
  return clamp(sections.join("\n"));
};

/**
 * Native API models use this tool to pause the same turn while the composer
 * collects a structured answer. Keeping the wire shape compatible with the
 * provider-runtime contract means the existing composer asker can render it
 * without a provider-specific UI.
 */
export const askUserTool: NativeToolDef = {
  name: "ask_user",
  description:
    "Ask the user one or more important questions in the RUNE composer. Use this only when the answer cannot be determined from the workspace or the request. Provide concise options; the user can also type a custom answer.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Stable short identifier for the question." },
            header: { type: "string", description: "Short label shown above the question." },
            question: { type: "string", description: "The complete question for the user." },
            options: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Stable option identifier." },
                  label: { type: "string" },
                  description: { type: "string" },
                },
                required: ["label", "description"],
                additionalProperties: false,
              },
            },
            multiSelect: { type: "boolean" },
            recommendedOptionId: {
              type: "string",
              description: "The id or label of the recommended option, when one is clearly best.",
            },
            allowCustomAnswer: { type: "boolean" },
            allowEditSuggestedAnswer: { type: "boolean" },
            allowSkip: { type: "boolean" },
          },
          required: ["id", "header", "question", "options"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  },
  requiresApproval: false,
  execute: () => Effect.succeed("Error: ask_user must be handled by the native composer asker"),
};

export function parseAskUserQuestions(
  args: Record<string, unknown>,
): ReadonlyArray<UserInputQuestion> {
  if (!Array.isArray(args.questions)) return [];
  return args.questions
    .flatMap((raw, index): ReadonlyArray<UserInputQuestion> => {
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
      const question = raw as Record<string, unknown>;
      const text = stringArg(question.question).trim();
      if (text.length === 0) return [];
      const id = stringArg(question.id).trim() || text.slice(0, 64);
      const header = stringArg(question.header).trim() || `Question ${index + 1}`;
      const options = Array.isArray(question.options)
        ? question.options
            .flatMap(
              (rawOption): ReadonlyArray<{ id?: string; label: string; description: string }> => {
              if (rawOption === null || typeof rawOption !== "object" || Array.isArray(rawOption))
                return [];
              const option = rawOption as Record<string, unknown>;
              const id = stringArg(option.id).trim();
              const label = stringArg(option.label).trim();
              if (label.length === 0) return [];
              return [
                {
                  ...(id.length === 0 ? {} : { id }),
                  label,
                  description: stringArg(option.description).trim() || label,
                },
              ];
              },
            )
            .slice(0, 8)
        : [];
      const recommendedOptionId = stringArg(question.recommendedOptionId).trim();
      const hasRecommendedOption = options.some(
        (option) => option.id === recommendedOptionId || option.label === recommendedOptionId,
      );
      return [
        {
          id,
          header,
          question: text,
          options,
          multiSelect: question.multiSelect === true,
          ...(hasRecommendedOption ? { recommendedOptionId } : {}),
          ...(typeof question.allowCustomAnswer === "boolean"
            ? { allowCustomAnswer: question.allowCustomAnswer }
            : {}),
          ...(typeof question.allowEditSuggestedAnswer === "boolean"
            ? { allowEditSuggestedAnswer: question.allowEditSuggestedAnswer }
            : {}),
          ...(typeof question.allowSkip === "boolean" ? { allowSkip: question.allowSkip } : {}),
        },
      ];
    })
    .slice(0, 4);
}

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
  dedupeSafeRead: true,
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
  dedupeSafeRead: true,
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
  dedupeSafeRead: true,
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

function decodeRuneCommandOperation(value: unknown): RuneCommandOperationType | null {
  try {
    return Schema.decodeUnknownSync(RuneCommandOperation)(value);
  } catch {
    return null;
  }
}

function pathMatchesRoot(filePath: string, root: string): boolean {
  const normalizedRoot = root.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
  if (normalizedRoot.length === 0 || normalizedRoot === ".") return true;
  return filePath === normalizedRoot || filePath.startsWith(`${normalizedRoot}/`);
}

/**
 * Keep the operation union concrete on the model wire. A generic object
 * description makes models guess the discriminant and is the main reason
 * they fall back to raw shell for deterministic repository work.
 */
export const RUNE_OPERATION_JSON_SCHEMA: {
  readonly oneOf: ReadonlyArray<Record<string, unknown>>;
} = {
  oneOf: [
    {
      type: "object",
      properties: {
        kind: { const: "search" },
        query: { type: "string", minLength: 1, maxLength: 512 },
        roots: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 32 },
        glob: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 32 },
        contextLines: { type: "integer", minimum: 0 },
      },
      required: ["kind", "query", "roots"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "readLines" },
        path: { type: "string", minLength: 1, maxLength: 1024 },
        start: { type: "integer", minimum: 1 },
        end: { type: "integer", minimum: 1 },
      },
      required: ["kind", "path", "start", "end"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "listDirectory" },
        path: { type: "string", minLength: 1, maxLength: 1024 },
        depth: { type: "integer", minimum: 0 },
      },
      required: ["kind", "path"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "findFiles" },
        query: { type: "string", minLength: 1, maxLength: 512 },
        root: { type: "string", minLength: 1, maxLength: 1024 },
      },
      required: ["kind", "query", "root"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "runProcess" },
        executable: { type: "string", minLength: 1, maxLength: 1024 },
        args: { type: "array", items: { type: "string" }, maxItems: 64 },
        cwd: { type: "string", minLength: 1, maxLength: 1024 },
      },
      required: ["kind", "executable", "args", "cwd"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "runTest" },
        target: { type: "string", minLength: 1, maxLength: 1024 },
      },
      required: ["kind"],
      additionalProperties: false,
    },
  ],
};

/**
 * Execute the provider-neutral command IR against the existing confined
 * workspace services. Ordinary repository work never needs shell syntax.
 */
export const runeOperationTool: NativeToolDef = {
  name: "rune_operation",
  description:
    "Run a structured repository operation (search, read lines, list a directory, find files, or run a focused test) without shell syntax.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      operation: {
        type: "object",
        description: "Choose exactly one structured repository operation by its kind field.",
        ...RUNE_OPERATION_JSON_SCHEMA,
      },
    },
    required: ["operation"],
    additionalProperties: false,
  },
  requiresApproval: true,
  verificationTool: true,
  execute: (args, ctx) => {
    const operation = decodeRuneCommandOperation(args.operation);
    if (operation === null) return Effect.succeed("Error: invalid structured RUNE operation");
    if (operation.kind === "runProcess" || operation.kind === "runTest") {
      if (!ctx.processRunner) return Effect.succeed("Error: process execution is unavailable");
      const command = operation.kind === "runProcess" ? operation.executable : "vp";
      const processArgs =
        operation.kind === "runProcess"
          ? operation.args
          : ["test", "run", ...(operation.target === undefined ? [] : [operation.target])];
      const cwd = operation.kind === "runProcess" ? operation.cwd : ctx.cwd;
      return Effect.gen(function* () {
        const platform = yield* HostProcessPlatform;
        const result = yield* ctx.processRunner!.run({
          command,
          args: processArgs,
          cwd,
          timeout: "120 seconds",
          maxOutputBytes: 64 * 1024,
          outputMode: "truncate",
          timeoutBehavior: "timedOutResult",
        });
        return formatProcessObservation({ platform, command, cwd, result });
      }).pipe(observe);
    }

    if (operation.kind === "readLines") {
      return ctx.workspaceFileSystem.readFile({ cwd: ctx.cwd, relativePath: operation.path }).pipe(
        Effect.map((result) => {
          const lines = result.contents.split("\n");
          return clamp(
            lines.slice(operation.start - 1, operation.end).join("\n") || "(empty range)",
          );
        }),
        observe,
      );
    }

    if (operation.kind === "listDirectory") {
      return ctx.workspaceEntries.list({ cwd: ctx.cwd }).pipe(
        Effect.map((result) => {
          const root =
            operation.path === "." ? "" : operation.path.replaceAll("\\", "/").replace(/\/$/u, "");
          const prefix = root.length === 0 ? "" : `${root}/`;
          const depth = operation.depth ?? 1;
          const entries = result.entries.filter((entry) => {
            if (!entry.path.startsWith(prefix) && root.length > 0) return false;
            const relative = root.length === 0 ? entry.path : entry.path.slice(prefix.length);
            return relative.length > 0 && relative.split("/").length <= depth;
          });
          return clamp(
            entries
              .map((entry) => `${entry.path}${entry.kind === "directory" ? "/" : ""}`)
              .join("\n") || "(empty directory)",
          );
        }),
        observe,
      );
    }

    if (operation.kind === "findFiles") {
      return ctx.workspaceEntries
        .search({ cwd: ctx.cwd, query: operation.query, limit: 100, kind: "file" })
        .pipe(
          Effect.map((result) =>
            clamp(
              result.entries
                .filter((entry) => pathMatchesRoot(entry.path, operation.root))
                .map((entry) => entry.path)
                .join("\n") || "No files found.",
            ),
          ),
          observe,
        );
    }

    return ctx.workspaceEntries
      .searchContents({
        cwd: ctx.cwd,
        query: operation.query,
        limit: 100,
        caseSensitive: false,
        wholeWord: false,
        useRegex: false,
      })
      .pipe(
        Effect.map((result) =>
          clamp(
            result.matches
              .filter((match) => operation.roots.some((root) => pathMatchesRoot(match.path, root)))
              .map((match) => `${match.path}:${match.lineNumber}: ${match.lineContent.trim()}`)
              .join("\n") || "No matches.",
          ),
        ),
        observe,
      );
  },
};

export const SAFE_TOOLS: ReadonlyArray<NativeToolDef> = [
  askUserTool,
  ...COMPOUND_READ_TOOLS,
  readFileTool,
  listDirTool,
  searchTool,
];

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
  invalidatesVerification: true,
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

export const shellTool: NativeToolDef = {
  name: "shell",
  description: `Run an explicit raw ${getHostCommandProfile().preferredShellDialect} command. Prefer rune_operation for file discovery, process execution, and focused tests; use this only when shell grammar is required.`,
  parametersJsonSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to run.", minLength: 1 },
    },
    required: ["command"],
  },
  requiresApproval: true,
  invalidatesVerification: true,
  execute: (args, ctx) => {
    const runner = ctx.processRunner;
    if (!runner) {
      return Effect.succeed("Error: shell is unavailable in this context");
    }
    const command = stringArg(args.command);
    return Effect.gen(function* () {
      const platform = yield* HostProcessPlatform;
      const isWindows = platform === "win32";
      const output = isWindows
        ? yield* Effect.suspend(() => {
            const runWindowsPowerShell = (index: number): ReturnType<typeof runner.run> => {
              const shell = WINDOWS_SHELL_CANDIDATES[index];
              if (shell === undefined) {
                return Effect.die(new Error("No PowerShell executable is available."));
              }
              return runner
                .run({
                  command: shell,
                  args: windowsPowerShellArgs(command),
                  cwd: ctx.cwd,
                  timeout: BASH_TIMEOUT,
                  maxOutputBytes: BASH_MAX_OUTPUT_BYTES,
                  outputMode: "truncate",
                  timeoutBehavior: "timedOutResult",
                })
                .pipe(
                  Effect.flatMap((result) =>
                    isWindowsCommandNotFound(result.code, result.stderr).pipe(
                      Effect.flatMap((notFound) =>
                        notFound && index + 1 < WINDOWS_SHELL_CANDIDATES.length
                          ? runWindowsPowerShell(index + 1)
                          : Effect.succeed(result),
                      ),
                    ),
                  ),
                  Effect.catchTag("ProcessSpawnError", (error) =>
                    index + 1 < WINDOWS_SHELL_CANDIDATES.length
                      ? runWindowsPowerShell(index + 1)
                      : Effect.fail(error),
                  ),
                );
            };
            return runWindowsPowerShell(0);
          })
        : yield* runner.run({
            command: "bash",
            args: ["-c", command],
            cwd: ctx.cwd,
            timeout: BASH_TIMEOUT,
            maxOutputBytes: BASH_MAX_OUTPUT_BYTES,
            outputMode: "truncate",
            timeoutBehavior: "timedOutResult",
          });
      return formatProcessObservation({
        platform,
        command: isWindows ? "powershell.exe" : "bash",
        cwd: ctx.cwd,
        result: output,
      });
    }).pipe(observe);
  },
};

export const GATED_TOOLS: ReadonlyArray<NativeToolDef> = [
  ...COMPOUND_MUTATION_TOOLS,
  editFileTool,
  runeOperationTool,
  shellTool,
];

export const NATIVE_TOOLS: ReadonlyArray<NativeToolDef> = [...SAFE_TOOLS, ...GATED_TOOLS];
