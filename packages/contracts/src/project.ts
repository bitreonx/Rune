import * as Schema from "effect/Schema";
import {
  NonNegativeInt,
  PositiveInt,
  TrimmedNonEmptyString,
  TrimmedString,
} from "./baseSchemas.ts";

const PROJECT_SEARCH_ENTRIES_MAX_LIMIT = 200;
const PROJECT_SEARCH_CONTENTS_MAX_LIMIT = 500;
const PROJECT_WRITE_FILE_PATH_MAX_LENGTH = 512;
const PROJECT_READ_FILE_PATH_MAX_LENGTH = 512;

export const ProjectEntryKind = Schema.Literals(["file", "directory"]);
export type ProjectEntryKind = typeof ProjectEntryKind.Type;

export const ProjectSearchEntriesInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  // An empty query is a bounded browse: the index returns frecency-ordered
  // entries, which the file picker uses for its initial results.
  query: TrimmedString.check(Schema.isMaxLength(256)),
  limit: PositiveInt.check(Schema.isLessThanOrEqualTo(PROJECT_SEARCH_ENTRIES_MAX_LIMIT)),
  kind: Schema.optional(ProjectEntryKind),
  imageOnly: Schema.optional(Schema.Boolean),
});
export type ProjectSearchEntriesInput = typeof ProjectSearchEntriesInput.Type;

export const ProjectEntry = Schema.Struct({
  path: TrimmedNonEmptyString,
  kind: ProjectEntryKind,
});
export type ProjectEntry = typeof ProjectEntry.Type;

export const ProjectSearchEntriesResult = Schema.Struct({
  entries: Schema.Array(ProjectEntry),
  truncated: Schema.Boolean,
});
export type ProjectSearchEntriesResult = typeof ProjectSearchEntriesResult.Type;

export const ProjectSearchContentsInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  // Whitespace is significant in content queries (" foo", regex trailing
  // spaces), so the query is deliberately not trimmed on the wire.
  query: Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(256)),
  limit: PositiveInt.check(Schema.isLessThanOrEqualTo(PROJECT_SEARCH_CONTENTS_MAX_LIMIT)),
  caseSensitive: Schema.Boolean,
  wholeWord: Schema.Boolean,
  useRegex: Schema.Boolean,
});
export type ProjectSearchContentsInput = typeof ProjectSearchContentsInput.Type;

export const ProjectContentMatchRange = Schema.Struct({
  start: NonNegativeInt,
  end: NonNegativeInt,
});
export type ProjectContentMatchRange = typeof ProjectContentMatchRange.Type;

export const ProjectContentMatch = Schema.Struct({
  path: TrimmedNonEmptyString,
  lineNumber: PositiveInt,
  lineContent: Schema.String,
  matchRanges: Schema.Array(ProjectContentMatchRange),
});
export type ProjectContentMatch = typeof ProjectContentMatch.Type;

export const ProjectSearchContentsResult = Schema.Struct({
  matches: Schema.Array(ProjectContentMatch),
  truncated: Schema.Boolean,
  regexFallbackError: Schema.optional(Schema.String),
});
export type ProjectSearchContentsResult = typeof ProjectSearchContentsResult.Type;

export const ProjectListEntriesInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type ProjectListEntriesInput = typeof ProjectListEntriesInput.Type;

export const ProjectListEntriesResult = Schema.Struct({
  entries: Schema.Array(ProjectEntry),
  truncated: Schema.Boolean,
});
export type ProjectListEntriesResult = typeof ProjectListEntriesResult.Type;

export const ProjectListDirectoryInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  // Workspace-root-relative directory. The empty string addresses the root.
  directory: Schema.String.check(Schema.isMaxLength(512)),
  cursor: Schema.optional(Schema.String.check(Schema.isMaxLength(128))),
  limit: Schema.optional(PositiveInt.check(Schema.isLessThanOrEqualTo(2_000))),
});
export type ProjectListDirectoryInput = typeof ProjectListDirectoryInput.Type;

export const ProjectListDirectoryResult = Schema.Struct({
  directory: Schema.String,
  entries: Schema.Array(ProjectEntry),
  nextCursor: Schema.NullOr(Schema.String),
});
export type ProjectListDirectoryResult = typeof ProjectListDirectoryResult.Type;

export const ProjectEntriesFailure = Schema.Literals([
  "workspace_root_not_found",
  "workspace_root_create_failed",
  "workspace_root_stat_failed",
  "workspace_root_not_directory",
  "workspace_path_outside_root",
  "search_index_create_failed",
  "search_index_scan_timed_out",
  "search_index_search_failed",
  "workspace_tree_walk_failed",
]);
export type ProjectEntriesFailure = typeof ProjectEntriesFailure.Type;

type ProjectEntriesFailureContext = {
  readonly failure: ProjectEntriesFailure;
  readonly normalizedCwd?: string;
  readonly timeout?: string;
  readonly detail?: string;
  readonly cause?: unknown;
};

function decodedProjectErrorMessage(props: object): string | undefined {
  if (!("message" in props)) return undefined;
  return typeof props.message === "string" ? props.message : undefined;
}

export class ProjectSearchEntriesError extends Schema.TaggedErrorClass<ProjectSearchEntriesError>()(
  "ProjectSearchEntriesError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    queryLength: Schema.optional(NonNegativeInt),
    limit: Schema.optional(PositiveInt),
    failure: Schema.optional(ProjectEntriesFailure),
    normalizedCwd: Schema.optional(TrimmedNonEmptyString),
    timeout: Schema.optional(TrimmedNonEmptyString),
    detail: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // The structured fields are optional on the wire so newer peers can decode legacy message-only
  // failures. New application code must provide them through this constructor.
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(
    props: ProjectEntriesFailureContext & {
      readonly cwd: string;
      readonly queryLength: number;
      readonly limit: number;
    },
  ) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to search workspace entries in '${props.cwd}'.`,
    } as any);
  }
}

export class ProjectSearchContentsError extends Schema.TaggedErrorClass<ProjectSearchContentsError>()(
  "ProjectSearchContentsError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    queryLength: Schema.optional(NonNegativeInt),
    limit: Schema.optional(PositiveInt),
    failure: Schema.optional(ProjectEntriesFailure),
    normalizedCwd: Schema.optional(TrimmedNonEmptyString),
    timeout: Schema.optional(TrimmedNonEmptyString),
    detail: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(
    props: ProjectEntriesFailureContext & {
      readonly cwd: string;
      readonly queryLength: number;
      readonly limit: number;
    },
  ) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to search workspace contents in '${props.cwd}'.`,
    } as any);
  }
}

export class ProjectListEntriesError extends Schema.TaggedErrorClass<ProjectListEntriesError>()(
  "ProjectListEntriesError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectEntriesFailure),
    normalizedCwd: Schema.optional(TrimmedNonEmptyString),
    timeout: Schema.optional(TrimmedNonEmptyString),
    detail: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectEntriesFailureContext & { readonly cwd: string }) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ?? `Failed to list workspace entries in '${props.cwd}'.`,
    } as any);
  }
}

export const ProjectReadFileInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_READ_FILE_PATH_MAX_LENGTH)),
});
export type ProjectReadFileInput = typeof ProjectReadFileInput.Type;

export const ProjectReadFileResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
  contents: Schema.String,
  byteLength: NonNegativeInt,
  truncated: Schema.Boolean,
});
export type ProjectReadFileResult = typeof ProjectReadFileResult.Type;

export const ProjectReadFileAtHeadInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_READ_FILE_PATH_MAX_LENGTH)),
});
export type ProjectReadFileAtHeadInput = typeof ProjectReadFileAtHeadInput.Type;

export const ProjectReadFileAtHeadResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
  // False for untracked files and repositories without commits: there is
  // legitimately nothing committed to diff against, so that is a success.
  presentInHead: Schema.Boolean,
  // Empty when `presentInHead` is false.
  contents: Schema.String,
  byteLength: NonNegativeInt,
  truncated: Schema.Boolean,
});
export type ProjectReadFileAtHeadResult = typeof ProjectReadFileAtHeadResult.Type;

export const ProjectFileFailure = Schema.Literals([
  "workspace_path_outside_root",
  "resolved_path_outside_root",
  "path_not_file",
  "binary_file",
  "not_git_repository",
  "operation_failed",
]);
export type ProjectFileFailure = typeof ProjectFileFailure.Type;

export const ProjectFileOperation = Schema.Literals([
  "realpath-workspace-root",
  "realpath-target",
  "open",
  "stat",
  "read",
  "close",
  "make-directory",
  "write-file",
  "create-directory",
  "rename",
  "delete",
]);
export type ProjectFileOperation = typeof ProjectFileOperation.Type;

type ProjectFileFailureContext = {
  readonly cwd: string;
  readonly relativePath: string;
  readonly failure: ProjectFileFailure;
  readonly resolvedPath?: string;
  readonly resolvedWorkspaceRoot?: string;
  readonly operation?: ProjectFileOperation;
  readonly operationPath?: string;
  readonly cause?: unknown;
};

export class ProjectReadFileError extends Schema.TaggedErrorClass<ProjectReadFileError>()(
  "ProjectReadFileError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    relativePath: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectFileFailure),
    resolvedPath: Schema.optional(TrimmedNonEmptyString),
    resolvedWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
    operation: Schema.optional(ProjectFileOperation),
    operationPath: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectFileFailureContext) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to read workspace file '${props.relativePath}' in '${props.cwd}'.`,
    } as any);
  }
}

export class ProjectReadFileAtHeadError extends Schema.TaggedErrorClass<ProjectReadFileAtHeadError>()(
  "ProjectReadFileAtHeadError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    relativePath: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectFileFailure),
    resolvedPath: Schema.optional(TrimmedNonEmptyString),
    resolvedWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
    operation: Schema.optional(ProjectFileOperation),
    operationPath: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectFileFailureContext) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to read committed contents of '${props.relativePath}' in '${props.cwd}'.`,
    } as any);
  }
}

export const ProjectWriteFileInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  contents: Schema.String,
});
export type ProjectWriteFileInput = typeof ProjectWriteFileInput.Type;

export const ProjectWriteFileResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
});
export type ProjectWriteFileResult = typeof ProjectWriteFileResult.Type;

export class ProjectWriteFileError extends Schema.TaggedErrorClass<ProjectWriteFileError>()(
  "ProjectWriteFileError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    relativePath: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectFileFailure),
    resolvedPath: Schema.optional(TrimmedNonEmptyString),
    resolvedWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
    operation: Schema.optional(ProjectFileOperation),
    operationPath: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectFileFailureContext) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to write workspace file '${props.relativePath}' in '${props.cwd}'.`,
    } as any);
  }
}

const PROJECT_ENTRY_NAME_MAX_LENGTH = 255;

/** A single path segment — separator characters are rejected server-side. */
export const ProjectEntryName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_ENTRY_NAME_MAX_LENGTH),
);

export const ProjectCreateEntryInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  /** Full workspace-relative path of the new entry, e.g. `src/assets/hero.png`. */
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  kind: Schema.Literals(["file", "directory"]),
  /** Fail instead of silently succeeding when the entry already exists. */
  allowExisting: Schema.optional(Schema.Boolean),
});
export type ProjectCreateEntryInput = typeof ProjectCreateEntryInput.Type;

export const ProjectCreateEntryResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
});
export type ProjectCreateEntryResult = typeof ProjectCreateEntryResult.Type;

export class ProjectCreateEntryError extends Schema.TaggedErrorClass<ProjectCreateEntryError>()(
  "ProjectCreateEntryError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    relativePath: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectFileFailure),
    resolvedPath: Schema.optional(TrimmedNonEmptyString),
    resolvedWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
    operation: Schema.optional(ProjectFileOperation),
    operationPath: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectFileFailureContext) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to create '${props.relativePath}' in '${props.cwd}'.`,
    } as any);
  }
}

export const ProjectRenameEntryInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  /** The new file or folder name only — renames never move an entry between directories. */
  newName: ProjectEntryName,
});
export type ProjectRenameEntryInput = typeof ProjectRenameEntryInput.Type;

export const ProjectRenameEntryResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
});
export type ProjectRenameEntryResult = typeof ProjectRenameEntryResult.Type;

export class ProjectRenameEntryError extends Schema.TaggedErrorClass<ProjectRenameEntryError>()(
  "ProjectRenameEntryError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    relativePath: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectFileFailure),
    resolvedPath: Schema.optional(TrimmedNonEmptyString),
    resolvedWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
    operation: Schema.optional(ProjectFileOperation),
    operationPath: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectFileFailureContext) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to rename '${props.relativePath}' in '${props.cwd}'.`,
    } as any);
  }
}

export const ProjectDeleteEntryInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  /** Delete an entire directory tree. Required for directories with contents. */
  recursive: Schema.optional(Schema.Boolean),
});
export type ProjectDeleteEntryInput = typeof ProjectDeleteEntryInput.Type;

export const ProjectDeleteEntryResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
});
export type ProjectDeleteEntryResult = typeof ProjectDeleteEntryResult.Type;

export class ProjectDeleteEntryError extends Schema.TaggedErrorClass<ProjectDeleteEntryError>()(
  "ProjectDeleteEntryError",
  {
    cwd: Schema.optional(TrimmedNonEmptyString),
    relativePath: Schema.optional(TrimmedNonEmptyString),
    failure: Schema.optional(ProjectFileFailure),
    resolvedPath: Schema.optional(TrimmedNonEmptyString),
    resolvedWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
    operation: Schema.optional(ProjectFileOperation),
    operationPath: Schema.optional(TrimmedNonEmptyString),
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: ProjectFileFailureContext) {
    super({
      ...props,
      message:
        decodedProjectErrorMessage(props) ??
        `Failed to delete '${props.relativePath}' in '${props.cwd}'.`,
    } as any);
  }
}

export const ProjectFileEventKind = Schema.Literals(["changed", "created", "removed"]);
export type ProjectFileEventKind = typeof ProjectFileEventKind.Type;

export const ProjectFileEvent = Schema.Struct({
  /** Workspace-relative, posix-normalized paths of the affected entries. */
  paths: Schema.Array(TrimmedNonEmptyString),
  kind: ProjectFileEventKind,
  at: NonNegativeInt,
});
export type ProjectFileEvent = typeof ProjectFileEvent.Type;

export const ProjectFileEventsInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type ProjectFileEventsInput = typeof ProjectFileEventsInput.Type;

/**
 * Batched workspace filesystem events. The server debounces raw watcher
 * noise; each event groups the paths that changed within one debounce window.
 */
export const ProjectFileEventsBatch = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  events: Schema.Array(ProjectFileEvent),
});
export type ProjectFileEventsBatch = typeof ProjectFileEventsBatch.Type;
