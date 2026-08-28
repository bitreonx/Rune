import * as Schema from "effect/Schema";

import { NonNegativeInt, PositiveInt, TrimmedNonEmptyString } from "./baseSchemas.ts";

const COMMAND_PATH_MAX_LENGTH = 1_024;
const COMMAND_QUERY_MAX_LENGTH = 512;
const COMMAND_ROOTS_MAX_LENGTH = 32;
const COMMAND_ARGS_MAX_LENGTH = 64;

const commandPath = TrimmedNonEmptyString.check(Schema.isMaxLength(COMMAND_PATH_MAX_LENGTH));
const executablePath = commandPath.check(Schema.isPattern(/^[^|&;<>\n]+$/u));
const commandQuery = Schema.String.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(COMMAND_QUERY_MAX_LENGTH),
);

/**
 * Provider-neutral operations for deterministic repository work.
 *
 * These values deliberately carry data, not shell syntax. The server chooses
 * the platform implementation; arbitrary shell text belongs to an explicit
 * dialect tool instead.
 */
export const RuneCommandOperation = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("search"),
    query: commandQuery,
    roots: Schema.Array(commandPath).check(Schema.isMaxLength(COMMAND_ROOTS_MAX_LENGTH)),
    glob: Schema.optionalKey(Schema.Array(commandPath)),
    contextLines: Schema.optionalKey(NonNegativeInt),
  }),
  Schema.Struct({
    kind: Schema.Literal("readLines"),
    path: commandPath,
    start: PositiveInt,
    end: PositiveInt,
  }),
  Schema.Struct({
    kind: Schema.Literal("listDirectory"),
    path: commandPath,
    depth: Schema.optionalKey(NonNegativeInt),
  }),
  Schema.Struct({
    kind: Schema.Literal("findFiles"),
    query: commandQuery,
    root: commandPath,
  }),
  Schema.Struct({
    kind: Schema.Literal("runProcess"),
    executable: executablePath,
    args: Schema.Array(Schema.String).check(Schema.isMaxLength(COMMAND_ARGS_MAX_LENGTH)),
    cwd: commandPath,
  }),
  Schema.Struct({
    kind: Schema.Literal("runTest"),
    target: Schema.optionalKey(commandPath),
  }),
]);
export type RuneCommandOperation = typeof RuneCommandOperation.Type;

export const RuneShellDialect = Schema.Literals(["powershell", "bash", "cmd"]);
export type RuneShellDialect = typeof RuneShellDialect.Type;

/** Explicit escape hatch for commands that genuinely require shell grammar. */
export const RuneShellCommand = Schema.Struct({
  dialect: RuneShellDialect,
  command: TrimmedNonEmptyString,
  cwd: commandPath,
});
export type RuneShellCommand = typeof RuneShellCommand.Type;
