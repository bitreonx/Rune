import * as Effect from "effect/Effect";
import { HostProcessPlatform } from "@rune/shared/hostProcess";
import { classifyProcessFailure } from "../../processRunner.ts";

import type { NativeToolContext, NativeToolDef } from "./ApiTools.ts";

const MAX_OBSERVATION_CHARS = 48_000;
const MAX_BATCH_ITEMS = 32;

const clamp = (text: string): string =>
  text.length <= MAX_OBSERVATION_CHARS
    ? text
    : `${text.slice(0, MAX_OBSERVATION_CHARS)}\n[clamped]`;

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const stringArg = (value: unknown): string => (typeof value === "string" ? value : "");

const positiveIntArg = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 1 ? Math.trunc(value) : undefined;

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const safe = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A | string, never, R> =>
  effect.pipe(
    Effect.catch((error) => Effect.succeed(`Error: ${describeError(error)}`)),
  ) as Effect.Effect<A | string, never, R>;

const mutationFiles = (args: Record<string, unknown>): Array<Record<string, unknown>> =>
  Array.isArray(args.files) ? args.files.map(asRecord).slice(0, MAX_BATCH_ITEMS) : [];

export const workspaceSnapshotTool: NativeToolDef = {
  name: "workspace_snapshot",
  description:
    "Return a bounded workspace structure and status summary without reading file contents.",
  parametersJsonSchema: { type: "object", properties: {} },
  requiresApproval: false,
  dedupeSafeRead: true,
  execute: (_args, ctx) =>
    safe(
      ctx.workspaceEntries
        .list({ cwd: ctx.cwd })
        .pipe(
          Effect.map((result) =>
            clamp(
              result.entries
                .map((entry) => `${entry.path}${entry.kind === "directory" ? "/" : ""}`)
                .join("\n") || "(empty workspace)",
            ),
          ),
        ),
    ).pipe(Effect.map(String)),
};

export const searchManyTool: NativeToolDef = {
  name: "search_many",
  description: "Search multiple content queries concurrently and return bounded labeled results.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      queries: { type: "array", items: { type: "string" }, maxItems: MAX_BATCH_ITEMS },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
    required: ["queries"],
  },
  requiresApproval: false,
  dedupeSafeRead: true,
  execute: (args, ctx) => {
    const queries = Array.isArray(args.queries)
      ? args.queries
          .filter((query): query is string => typeof query === "string")
          .slice(0, MAX_BATCH_ITEMS)
      : [];
    const limit = positiveIntArg(args.limit) ?? 20;
    return Effect.all(
      queries.map((query, index) =>
        safe(
          ctx.workspaceEntries.searchContents({
            cwd: ctx.cwd,
            query,
            limit,
            caseSensitive: false,
            wholeWord: false,
            useRegex: false,
          }),
        ).pipe(
          Effect.map((result) => {
            if (typeof result === "string") return `query ${index + 1}: ${query}\n${result}`;
            const lines = result.matches.map(
              (match) => `${match.path}:${match.lineNumber}: ${match.lineContent.trim()}`,
            );
            return `query ${index + 1}: ${query}\n${lines.join("\n") || "No matches."}`;
          }),
        ),
      ),
      { concurrency: 8 },
    ).pipe(Effect.map((results) => clamp(results.join("\n\n") || "No queries.")));
  },
};

export const readManyTool: NativeToolDef = {
  name: "read_many",
  description: "Read bounded windows from multiple UTF-8 workspace files concurrently.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        maxItems: MAX_BATCH_ITEMS,
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            offset: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1 },
          },
          required: ["path"],
        },
      },
    },
    required: ["files"],
  },
  requiresApproval: false,
  dedupeSafeRead: true,
  execute: (args, ctx) => {
    const files = Array.isArray(args.files)
      ? args.files.map(asRecord).slice(0, MAX_BATCH_ITEMS)
      : [];
    return Effect.all(
      files.map((file) => {
        const path = stringArg(file.path);
        const offset = positiveIntArg(file.offset);
        const limit = positiveIntArg(file.limit);
        return safe(ctx.workspaceFileSystem.readFile({ cwd: ctx.cwd, relativePath: path })).pipe(
          Effect.map((result) => {
            if (typeof result === "string") return `${path}\n${result}`;
            const lines = result.contents.split("\n");
            const start = Math.max((offset ?? 1) - 1, 0);
            const end = limit === undefined ? lines.length : start + limit;
            return `${result.relativePath}\n${lines.slice(start, end).join("\n")}`;
          }),
        );
      }),
      { concurrency: 8 },
    ).pipe(Effect.map((results) => clamp(results.join("\n\n") || "No files.")));
  },
};

export const applyPatchTool: NativeToolDef = {
  name: "apply_patch",
  description:
    "Apply a bounded multi-file exact-text patch after validating every oldText precondition.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        maxItems: MAX_BATCH_ITEMS,
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            oldText: { type: "string" },
            newText: { type: "string" },
          },
          required: ["path", "oldText", "newText"],
        },
      },
    },
    required: ["files"],
  },
  requiresApproval: true,
  invalidatesVerification: true,
  execute: (args, ctx) => {
    const files = mutationFiles(args);
    return Effect.gen(function* () {
      const writes = yield* Effect.all(
        files.map((file) => {
          const path = stringArg(file.path);
          const oldText = stringArg(file.oldText);
          const newText = stringArg(file.newText);
          return safe(ctx.workspaceFileSystem.readFile({ cwd: ctx.cwd, relativePath: path })).pipe(
            Effect.map((result) => {
              if (typeof result === "string") return { error: `${path}: ${result}` };
              const occurrences = result.contents.split(oldText).length - 1;
              if (oldText.length === 0 || occurrences !== 1) {
                return { error: `${path}: precondition matched ${occurrences} locations` };
              }
              return {
                relativePath: result.relativePath,
                contents: result.contents.replace(oldText, newText),
              };
            }),
          );
        }),
        { concurrency: 8 },
      );
      const error = writes.find((write) => "error" in write);
      if (error && "error" in error) return `Error: ${error.error}`;
      const validWrites = writes.filter(
        (write): write is { relativePath: string; contents: string } => "relativePath" in write,
      );
      yield* ctx.workspaceFileSystem.writeFiles({ cwd: ctx.cwd, files: validWrites });
      return `Applied ${validWrites.length} files`;
    }).pipe(Effect.catch((error) => Effect.succeed(`Error: ${describeError(error)}`)));
  },
};

export const generateFilesTool: NativeToolDef = {
  name: "generate_files",
  description: "Generate repetitive files locally from a bounded deterministic template manifest.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        maxItems: MAX_BATCH_ITEMS,
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            template: { type: "string" },
            count: { type: "integer", minimum: 1, maximum: 100_000 },
          },
          required: ["path", "template", "count"],
        },
      },
    },
    required: ["files"],
  },
  requiresApproval: true,
  invalidatesVerification: true,
  execute: (args, ctx) =>
    Effect.gen(function* () {
      const files = mutationFiles(args);
      const writes = files.map((file) => {
        const path = stringArg(file.path);
        const template = stringArg(file.template);
        const count = positiveIntArg(file.count) ?? 0;
        const contents = Array.from({ length: count }, (_, index) =>
          template.replaceAll("{{index}}", String(index + 1)),
        ).join("\n");
        return { path, contents, lines: count };
      });
      const totalBytes = writes.reduce((sum, file) => sum + Buffer.byteLength(file.contents), 0);
      if (totalBytes > 2_000_000) return "Error: generated output exceeds the patch size limit";
      yield* ctx.workspaceFileSystem.writeFiles({
        cwd: ctx.cwd,
        files: writes.map(({ path, contents }) => ({ relativePath: path, contents })),
      });
      return writes.map((file) => `${file.path}: ${file.lines} lines`).join("\n");
    }).pipe(Effect.catch((error) => Effect.succeed(`Error: ${describeError(error)}`))),
};

export const runChecksTool: NativeToolDef = {
  name: "run_checks",
  description: "Run a bounded list of focused workspace checks and return compact diagnostics.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      checks: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            command: { type: "string" },
            args: { type: "array", items: { type: "string" } },
          },
          required: ["command"],
        },
      },
    },
    required: ["checks"],
  },
  requiresApproval: true,
  verificationTool: true,
  execute: (args, ctx) => {
    const checks = Array.isArray(args.checks) ? args.checks.map(asRecord).slice(0, 8) : [];
    const processRunner = ctx.processRunner;
    if (!processRunner) return Effect.succeed("Error: focused checks are unavailable");
    return Effect.gen(function* () {
      const platform = yield* HostProcessPlatform;
      const output: string[] = [];
      for (const check of checks) {
        const command = stringArg(check.command);
        const args = Array.isArray(check.args)
          ? check.args.filter((arg): arg is string => typeof arg === "string").slice(0, 32)
          : [];
        const result = yield* processRunner.run({
          command,
          args,
          cwd: ctx.cwd,
          timeout: "120 seconds",
          maxOutputBytes: 64 * 1024,
          outputMode: "truncate",
          timeoutBehavior: "timedOutResult",
        });
        const failure = classifyProcessFailure({
          platform,
          runInput: { command, cwd: ctx.cwd },
          output: result,
        });
        output.push(
          `${command}${failure === undefined ? "" : ` failure ${failure}`} exit ${String(result.code)}\n${result.stdout}${result.stderr.length > 0 ? `\n[stderr]\n${result.stderr}` : ""}`,
        );
      }
      return clamp(output.join("\n\n") || "No checks.");
    }).pipe(Effect.catch((error) => Effect.succeed(`Error: ${describeError(error)}`)));
  },
};

export const COMPOUND_MUTATION_TOOLS: ReadonlyArray<NativeToolDef> = [
  applyPatchTool,
  generateFilesTool,
  runChecksTool,
];

export const COMPOUND_READ_TOOLS: ReadonlyArray<NativeToolDef> = [
  workspaceSnapshotTool,
  searchManyTool,
  readManyTool,
];
