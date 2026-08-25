// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFSP from "node:fs/promises";

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { ProjectEntry, ProjectListEntriesResult } from "@t3tools/contracts";

export const WORKSPACE_TREE_MAX_ENTRIES = 25_000;

/**
 * Directories the tree never descends into: version control internals and
 * dependency/cache directories that drown real source files in thousands of
 * entries. Everything else is listed, including hidden and git-ignored
 * entries — the tree is a file manager, not a search index.
 */
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", ".venv", "venv", "__pycache__"]);

export class WorkspaceTreeWalkError extends Schema.TaggedErrorClass<WorkspaceTreeWalkError>()(
  "WorkspaceTreeWalkError",
  {
    rootPath: Schema.String,
    directoryPath: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect()),
    message: Schema.String,
  },
) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: {
    readonly rootPath: string;
    readonly directoryPath?: string;
    readonly cause?: unknown;
  }) {
    super({
      ...props,
      message: `Failed to walk workspace tree at '${props.rootPath}'.`,
    } as any);
  }
}

export interface WorkspaceTreeWalkDirent {
  readonly name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface WorkspaceTreeWalkOptions {
  readonly maxEntries?: number;
  readonly readDir?: (
    path: string,
    options: { readonly withFileTypes: true },
  ) => Promise<Array<WorkspaceTreeWalkDirent>>;
}

const isIgnorableReadDirCause = (error: WorkspaceTreeWalkError): boolean => {
  const code = (error.cause as NodeJS.ErrnoException | undefined)?.code;
  return code === "EACCES" || code === "EPERM" || code === "ENOENT";
};

/**
 * Lists workspace entries with a breadth-first directory walk, so the
 * shallowest entries survive the cap and a workspace renders without waiting
 * for any search index. Symlinks are classified by their target kind but
 * never followed, which keeps cycles and outside-the-root escapes out.
 */
export const workspaceTreeWalk = Effect.fn("WorkspaceTreeWalk.workspaceTreeWalk")(function* (
  rootPath: string,
  options?: WorkspaceTreeWalkOptions,
): Effect.fn.Return<ProjectListEntriesResult, WorkspaceTreeWalkError> {
  const readDir = options?.readDir ?? NodeFSP.readdir;
  const maxEntries = options?.maxEntries ?? WORKSPACE_TREE_MAX_ENTRIES;

  const entries: Array<ProjectEntry> = [];
  const pendingDirectories: Array<string> = [""];
  let truncated = false;

  while (pendingDirectories.length > 0 && !truncated) {
    const relativeDirectory = pendingDirectories.shift()!;
    const absoluteDirectory = relativeDirectory ? `${rootPath}/${relativeDirectory}` : rootPath;
    const isRoot = relativeDirectory === "";
    const readDirents = Effect.tryPromise({
      try: () => readDir(absoluteDirectory, { withFileTypes: true }),
      catch: (cause) =>
        new WorkspaceTreeWalkError({
          rootPath,
          ...(isRoot ? {} : { directoryPath: relativeDirectory }),
          cause,
        }),
    });
    // A directory that vanished or denies access between its parent's read
    // and its own must not take down the whole listing; the root failing is
    // the one case where there is nothing to show at all.
    const dirents = yield* (
      isRoot
        ? readDirents
        : readDirents.pipe(Effect.catchIf(isIgnorableReadDirCause, () => Effect.succeed([])))
    );

    const sortedDirents = dirents.toSorted((left, right) => left.name.localeCompare(right.name));
    for (const dirent of sortedDirents) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${dirent.name}`
        : dirent.name;

      if (dirent.isSymbolicLink()) {
        if (entries.length >= maxEntries) {
          truncated = true;
          break;
        }
        // The target kind decides how the row renders, but the target is
        // never walked: cycles and outside-the-root escapes stay out.
        const linkTarget = yield* Effect.tryPromise({
          try: () => NodeFSP.stat(`${rootPath}/${relativePath}`),
          catch: (cause) => new WorkspaceTreeWalkError({ rootPath, cause }),
        }).pipe(Effect.orElseSucceed(() => null));
        entries.push({
          path: relativePath,
          kind: linkTarget?.isDirectory() ? "directory" : "file",
        });
        continue;
      }

      if (dirent.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(dirent.name)) continue;
        if (entries.length >= maxEntries) {
          truncated = true;
          break;
        }
        entries.push({ path: relativePath, kind: "directory" });
        pendingDirectories.push(relativePath);
        continue;
      }

      if (!dirent.isFile()) continue;
      if (entries.length >= maxEntries) {
        truncated = true;
        break;
      }
      entries.push({ path: relativePath, kind: "file" });
    }
  }

  return {
    entries: entries.toSorted((left, right) => left.path.localeCompare(right.path)),
    truncated,
  };
});
