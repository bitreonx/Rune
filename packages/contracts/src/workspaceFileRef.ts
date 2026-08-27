import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";

const WORKSPACE_FILE_PATH_MAX_LENGTH = 512;

// Segment-anchored. Rejects a path that:
//  - starts with `.` or `..` (single segment), or
//  - contains a `/..` or `/.` mid-path segment (traversal), or
//  - starts with `/` (absolute), or
//  - contains a NUL byte (NUL injection).
// Plain dots inside a segment (`.gitignore`, `app.config.ts`) are allowed.
const FORBIDDEN_PATH_PATTERN = /^\.{1,2}(\/|$)|(^|\/)\.\.?(\/|$)|^\/|\x00/;

const isAllowedPath = (value: string): boolean => {
  if (value.includes("\\")) return false;
  return !FORBIDDEN_PATH_PATTERN.test(value);
};

export const WorkspaceFileRefPath = TrimmedNonEmptyString.check(
  Schema.isMaxLength(WORKSPACE_FILE_PATH_MAX_LENGTH),
).check(
  Schema.makeFilter<typeof TrimmedNonEmptyString.Type>((value) => isAllowedPath(value)),
);
export type WorkspaceFileRefPath = typeof WorkspaceFileRefPath.Type;

export const WorkspaceFileRef = Schema.Struct({
  workspaceId: TrimmedNonEmptyString,
  workspaceRoot: TrimmedNonEmptyString,
  relativePath: WorkspaceFileRefPath,
});
export type WorkspaceFileRef = typeof WorkspaceFileRef.Type;

export function workspaceFileRefFrom(input: {
  readonly workspaceId: string;
  readonly workspaceRoot: string;
  readonly relativePath: string;
}): WorkspaceFileRef {
  return {
    workspaceId: input.workspaceId,
    workspaceRoot: input.workspaceRoot,
    relativePath: input.relativePath,
  };
}

export function formatWorkspaceFileRelativePath(ref: WorkspaceFileRef): string {
  return ref.relativePath;
}
