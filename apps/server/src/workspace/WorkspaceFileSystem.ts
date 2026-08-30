// @effect-diagnostics nodeBuiltinImport:off
/**
 * WorkspaceFileSystem - Effect service contract for workspace file mutations.
 *
 * Owns workspace-root-relative file read/write operations and their associated
 * safety checks and cache invalidation hooks.
 *
 * @module WorkspaceFileSystem
 */
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import { createHash } from "node:crypto";

import {
  PROJECT_WRITE_BATCH_MAX_BYTES,
  PROJECT_WRITE_BATCH_MAX_FILES,
  PROJECT_WRITE_FILE_MAX_BYTES,
} from "@rune/contracts";
import type {
  ProjectCreateEntryInput,
  ProjectCreateEntryResult,
  ProjectDeleteEntryInput,
  ProjectDeleteEntryResult,
  ProjectReadFileAtHeadResult,
  ProjectReadFileInput,
  ProjectReadFileResult,
  ProjectRenameEntryInput,
  ProjectRenameEntryResult,
  ProjectWriteFileInput,
  ProjectWriteFileContents,
  ProjectWriteFilesFile,
  ProjectWriteFileResult,
} from "@rune/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { workspaceFileMimeType } from "@rune/shared/fileKind";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as WorkspaceEntries from "./WorkspaceEntries.ts";
import * as WorkspacePaths from "./WorkspacePaths.ts";

const PROJECT_READ_FILE_MAX_BYTES = 1024 * 1024;
const PROJECT_METADATA_HASH_MAX_BYTES = 16 * 1024 * 1024;

function decodeBatchFileContents(contents: ProjectWriteFileContents): Buffer {
  if (typeof contents === "string") return Buffer.from(contents, "utf8");

  const decoded = Buffer.from(contents.data, "base64");
  if (contents.data.length % 4 !== 0 || decoded.toString("base64") !== contents.data) {
    throw new Error("Batch file contents must be valid padded base64.");
  }
  return decoded;
}

async function assertBatchTargetDoesNotTraverseSymlink(
  workspaceRoot: string,
  targetPath: string,
): Promise<void> {
  const rootPath = NodePath.resolve(workspaceRoot);
  let currentPath = NodePath.resolve(targetPath);
  while (currentPath !== rootPath) {
    try {
      const stat = await NodeFSP.lstat(currentPath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Workspace batch target traverses a symlink: ${currentPath}`);
      }
      if (currentPath !== targetPath && !stat.isDirectory()) {
        throw new Error(`Workspace batch parent is not a directory: ${currentPath}`);
      }
      currentPath = NodePath.dirname(currentPath);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
      currentPath = NodePath.dirname(currentPath);
    }
  }
}

async function missingParentDirectories(
  parentPath: string,
  workspaceRoot: string,
): Promise<string[]> {
  const rootPath = NodePath.resolve(workspaceRoot);
  let currentPath = NodePath.resolve(parentPath);
  const missing: string[] = [];
  while (currentPath !== rootPath) {
    try {
      const stat = await NodeFSP.lstat(currentPath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Workspace batch parent traverses a symlink: ${currentPath}`);
      }
      if (!stat.isDirectory()) {
        throw new Error(`Workspace batch parent is not a directory: ${currentPath}`);
      }
      break;
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
      missing.push(currentPath);
      currentPath = NodePath.dirname(currentPath);
    }
  }
  return missing.reverse();
}

async function restoreBatchTarget(backupPath: string, targetPath: string): Promise<void> {
  if (process.platform === "win32") {
    await NodeFSP.copyFile(backupPath, targetPath);
  } else {
    await NodeFSP.rename(backupPath, targetPath);
  }
}

export class WorkspaceFileSystemOperationError extends Schema.TaggedErrorClass<WorkspaceFileSystemOperationError>()(
  "WorkspaceFileSystemOperationError",
  {
    workspaceRoot: Schema.String,
    relativePath: Schema.String,
    resolvedPath: Schema.String,
    operationPath: Schema.String,
    operation: Schema.Literals([
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
    ]),
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Workspace file operation '${this.operation}' failed at '${this.operationPath}' for resolved path '${this.resolvedPath}' (requested as '${this.relativePath}' in '${this.workspaceRoot}').`;
  }
}

export class WorkspaceFilePathEscapeError extends Schema.TaggedErrorClass<WorkspaceFilePathEscapeError>()(
  "WorkspaceFilePathEscapeError",
  {
    workspaceRoot: Schema.String,
    relativePath: Schema.String,
    resolvedWorkspaceRoot: Schema.String,
    resolvedPath: Schema.String,
  },
) {
  override get message(): string {
    return `Workspace file '${this.relativePath}' resolves outside workspace root '${this.workspaceRoot}': ${this.resolvedPath}`;
  }
}

export class WorkspacePathNotFileError extends Schema.TaggedErrorClass<WorkspacePathNotFileError>()(
  "WorkspacePathNotFileError",
  {
    workspaceRoot: Schema.String,
    relativePath: Schema.String,
    resolvedPath: Schema.String,
  },
) {
  override get message(): string {
    return `Workspace path '${this.relativePath}' in '${this.workspaceRoot}' is not a file: ${this.resolvedPath}`;
  }
}

export class WorkspaceBinaryFileError extends Schema.TaggedErrorClass<WorkspaceBinaryFileError>()(
  "WorkspaceBinaryFileError",
  {
    workspaceRoot: Schema.String,
    relativePath: Schema.String,
    resolvedPath: Schema.String,
  },
) {
  override get message(): string {
    return `Workspace file '${this.relativePath}' in '${this.workspaceRoot}' is binary and cannot be previewed as text.`;
  }
}

export class WorkspaceHeadReadError extends Schema.TaggedErrorClass<WorkspaceHeadReadError>()(
  "WorkspaceHeadReadError",
  {
    workspaceRoot: Schema.String,
    relativePath: Schema.String,
    reason: Schema.Literals(["not_git_repository", "git_command_failed"]),
    detail: Schema.optional(Schema.String),
  },
) {
  override get message(): string {
    const detail = this.detail === undefined ? "" : `: ${this.detail}`;
    return `Failed to read committed contents of '${this.relativePath}' in '${this.workspaceRoot}' (${this.reason})${detail}.`;
  }
}

export const WorkspaceFileSystemError = Schema.Union([
  WorkspaceFileSystemOperationError,
  WorkspaceFilePathEscapeError,
  WorkspacePathNotFileError,
  WorkspaceBinaryFileError,
  WorkspaceHeadReadError,
]);
export type WorkspaceFileSystemError = typeof WorkspaceFileSystemError.Type;

/** Service tag for workspace file operations. */
export class WorkspaceFileSystem extends Context.Service<
  WorkspaceFileSystem,
  {
    /** Read a UTF-8 text file relative to the workspace root. */
    readonly readFile: (
      input: ProjectReadFileInput,
    ) => Effect.Effect<
      ProjectReadFileResult,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
    /**
     * Write a file relative to the workspace root.
     *
     * Creates parent directories as needed and rejects paths that escape the
     * workspace root.
     */
    readonly writeFile: (
      input: ProjectWriteFileInput,
    ) => Effect.Effect<
      ProjectWriteFileResult,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
    /** Validate every target before writing a batch of related files. */
    readonly writeFiles: (input: {
      readonly cwd: string;
      readonly files: ReadonlyArray<ProjectWriteFilesFile>;
    }) => Effect.Effect<
      ReadonlyArray<ProjectWriteFileResult>,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
    /**
     * Read a file's committed (HEAD) contents relative to the workspace root,
     * for diffing uncommitted work. Untracked files and repositories without
     * commits succeed with `presentInHead: false` rather than failing — there
     * is legitimately nothing to diff against.
     */
    readonly readFileAtHead: (
      input: ProjectReadFileInput,
    ) => Effect.Effect<
      ProjectReadFileAtHeadResult,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
    /**
     * Create an empty file or a directory inside the workspace root. Fails
     * when the entry already exists unless `allowExisting` is set.
     */
    readonly createEntry: (
      input: ProjectCreateEntryInput,
    ) => Effect.Effect<
      ProjectCreateEntryResult,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
    /**
     * Rename a file or directory within its own directory. The new name is a
     * single segment, so renames can never move entries across directories.
     */
    readonly renameEntry: (
      input: ProjectRenameEntryInput,
    ) => Effect.Effect<
      ProjectRenameEntryResult,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
    /**
     * Delete a file, or a directory when `recursive` allows it. Rejects
     * deleting the workspace root itself.
     */
    readonly deleteEntry: (
      input: ProjectDeleteEntryInput,
    ) => Effect.Effect<
      ProjectDeleteEntryResult,
      WorkspaceFileSystemError | WorkspacePaths.WorkspacePathOutsideRootError
    >;
  }
>()("rune/workspace/WorkspaceFileSystem") {}

export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const gitVcsDriver = yield* GitVcsDriver.GitVcsDriver;
  const workspacePaths = yield* WorkspacePaths.WorkspacePaths;
  const workspaceEntries = yield* WorkspaceEntries.WorkspaceEntries;

  const readFile: WorkspaceFileSystem["Service"]["readFile"] = Effect.fn(
    "WorkspaceFileSystem.readFile",
  )(function* (input) {
    const target = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: input.relativePath,
    });

    const realWorkspaceRoot = yield* Effect.tryPromise({
      try: () => NodeFSP.realpath(input.cwd),
      catch: (cause) =>
        new WorkspaceFileSystemOperationError({
          workspaceRoot: input.cwd,
          relativePath: input.relativePath,
          resolvedPath: target.absolutePath,
          operationPath: input.cwd,
          operation: "realpath-workspace-root",
          cause,
        }),
    });
    const realTargetPath = yield* Effect.tryPromise({
      try: () => NodeFSP.realpath(target.absolutePath),
      catch: (cause) =>
        new WorkspaceFileSystemOperationError({
          workspaceRoot: input.cwd,
          relativePath: input.relativePath,
          resolvedPath: target.absolutePath,
          operationPath: target.absolutePath,
          operation: "realpath-target",
          cause,
        }),
    });
    const relativeRealPath = path.relative(realWorkspaceRoot, realTargetPath);
    if (
      relativeRealPath.startsWith(`..${path.sep}`) ||
      relativeRealPath === ".." ||
      path.isAbsolute(relativeRealPath)
    ) {
      return yield* new WorkspaceFilePathEscapeError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedWorkspaceRoot: realWorkspaceRoot,
        resolvedPath: realTargetPath,
      });
    }

    return yield* Effect.acquireUseRelease(
      Effect.tryPromise({
        try: () => NodeFSP.open(realTargetPath, "r"),
        catch: (cause) =>
          new WorkspaceFileSystemOperationError({
            workspaceRoot: input.cwd,
            relativePath: input.relativePath,
            resolvedPath: realTargetPath,
            operationPath: realTargetPath,
            operation: "open",
            cause,
          }),
      }),
      (handle) =>
        Effect.gen(function* () {
          const stat = yield* Effect.tryPromise({
            try: () => handle.stat(),
            catch: (cause) =>
              new WorkspaceFileSystemOperationError({
                workspaceRoot: input.cwd,
                relativePath: input.relativePath,
                resolvedPath: realTargetPath,
                operationPath: realTargetPath,
                operation: "stat",
                cause,
              }),
          });
          if (!stat.isFile()) {
            return yield* new WorkspacePathNotFileError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: realTargetPath,
            });
          }

          if (input.metadataOnly === true) {
            const sha256 =
              stat.size <= PROJECT_METADATA_HASH_MAX_BYTES
                ? createHash("sha256")
                    .update(
                      yield* Effect.tryPromise({ try: () => handle.readFile() }).pipe(
                        Effect.mapError(
                          (cause) =>
                            new WorkspaceFileSystemOperationError({
                              workspaceRoot: input.cwd,
                              relativePath: input.relativePath,
                              resolvedPath: realTargetPath,
                              operationPath: realTargetPath,
                              operation: "read",
                              cause,
                            }),
                        ),
                      ),
                    )
                    .digest("hex")
                : undefined;
            return {
              relativePath: target.relativePath,
              contents: "",
              byteLength: stat.size,
              truncated: false,
              modifiedAt: stat.mtime.toISOString(),
              mimeType: workspaceFileMimeType(target.relativePath) || undefined,
              ...(sha256 === undefined ? {} : { sha256 }),
            };
          }

          const bytesToRead = Math.min(stat.size, PROJECT_READ_FILE_MAX_BYTES);
          const buffer = Buffer.alloc(bytesToRead);
          const { bytesRead } = yield* Effect.tryPromise({
            try: () => handle.read(buffer, 0, bytesToRead, 0),
            catch: (cause) =>
              new WorkspaceFileSystemOperationError({
                workspaceRoot: input.cwd,
                relativePath: input.relativePath,
                resolvedPath: realTargetPath,
                operationPath: realTargetPath,
                operation: "read",
                cause,
              }),
          });
          const fileBytes = buffer.subarray(0, bytesRead);
          if (fileBytes.includes(0)) {
            return yield* new WorkspaceBinaryFileError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: realTargetPath,
            });
          }

          return {
            relativePath: target.relativePath,
            contents: new TextDecoder("utf-8").decode(fileBytes),
            byteLength: stat.size,
            truncated: stat.size > PROJECT_READ_FILE_MAX_BYTES,
          };
        }),
      (handle) =>
        Effect.tryPromise({
          try: () => handle.close(),
          catch: (cause) =>
            new WorkspaceFileSystemOperationError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: realTargetPath,
              operationPath: realTargetPath,
              operation: "close",
              cause,
            }),
        }),
    );
  });

  const readFileAtHead: WorkspaceFileSystem["Service"]["readFileAtHead"] = Effect.fn(
    "WorkspaceFileSystem.readFileAtHead",
  )(function* (input) {
    const target = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: input.relativePath,
    });

    // Spawn-level failures (git missing, timeouts) surface as the same tagged
    // error as command failures; non-zero exits are captured below.
    const headReadError = (detail: string) =>
      new WorkspaceHeadReadError({
        workspaceRoot: input.cwd,
        relativePath: target.relativePath,
        reason: "git_command_failed",
        detail: detail || undefined,
      });

    // `git show` alone cannot tell "not a repository" from "path absent from
    // HEAD", so probe for a work tree first.
    const insideWorkTree = yield* gitVcsDriver
      .execute({
        operation: "WorkspaceFileSystem.readFileAtHead.insideWorkTree",
        cwd: input.cwd,
        args: ["rev-parse", "--is-inside-work-tree"],
        allowNonZeroExit: true,
        timeoutMs: 5_000,
        maxOutputBytes: 4_096,
      })
      .pipe(Effect.mapError((cause) => headReadError(cause.detail)));
    if (insideWorkTree.exitCode !== 0 || insideWorkTree.stdout.trim() !== "true") {
      return yield* new WorkspaceHeadReadError({
        workspaceRoot: input.cwd,
        relativePath: target.relativePath,
        reason: "not_git_repository",
        detail: insideWorkTree.stderr.trim() || undefined,
      });
    }

    const show = yield* gitVcsDriver
      .execute({
        operation: "WorkspaceFileSystem.readFileAtHead.show",
        cwd: input.cwd,
        args: ["show", `HEAD:${target.relativePath}`],
        allowNonZeroExit: true,
        // Truncate oversized blobs gracefully instead of failing, matching how
        // readFile serves an oversized file from disk.
        appendTruncationMarker: true,
        timeoutMs: 10_000,
        maxOutputBytes: PROJECT_READ_FILE_MAX_BYTES,
      })
      .pipe(Effect.mapError((cause) => headReadError(cause.detail)));
    if (show.exitCode !== 0) {
      // An unborn branch and a path absent from HEAD both mean "nothing to
      // diff against"; anything else is a genuine failure worth reporting.
      const stderr = show.stderr.trim();
      const absentFromHead =
        /does not exist in 'HEAD'|unknown revision|bad revision|invalid object name|does not have any commits yet|exists on disk, but not in/.test(
          stderr,
        );
      if (!absentFromHead) {
        return yield* new WorkspaceHeadReadError({
          workspaceRoot: input.cwd,
          relativePath: target.relativePath,
          reason: "git_command_failed",
          detail: stderr || undefined,
        });
      }
      return {
        relativePath: target.relativePath,
        presentInHead: false,
        contents: "",
        byteLength: 0,
        truncated: false,
      };
    }

    if (show.stdout.includes("\0")) {
      return yield* new WorkspaceBinaryFileError({
        workspaceRoot: input.cwd,
        relativePath: target.relativePath,
        resolvedPath: target.absolutePath,
      });
    }
    return {
      relativePath: target.relativePath,
      presentInHead: true,
      contents: show.stdout,
      byteLength: Buffer.byteLength(show.stdout),
      truncated: show.stdoutTruncated,
    };
  });

  const writeFile: WorkspaceFileSystem["Service"]["writeFile"] = Effect.fn(
    "WorkspaceFileSystem.writeFile",
  )(function* (input) {
    const target = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: input.relativePath,
    });

    yield* fileSystem.makeDirectory(path.dirname(target.absolutePath), { recursive: true }).pipe(
      Effect.mapError(
        (cause) =>
          new WorkspaceFileSystemOperationError({
            workspaceRoot: input.cwd,
            relativePath: input.relativePath,
            resolvedPath: target.absolutePath,
            operationPath: path.dirname(target.absolutePath),
            operation: "make-directory",
            cause,
          }),
      ),
    );
    yield* fileSystem.writeFileString(target.absolutePath, input.contents).pipe(
      Effect.mapError(
        (cause) =>
          new WorkspaceFileSystemOperationError({
            workspaceRoot: input.cwd,
            relativePath: input.relativePath,
            resolvedPath: target.absolutePath,
            operationPath: target.absolutePath,
            operation: "write-file",
            cause,
          }),
      ),
    );
    yield* workspaceEntries.refresh(input.cwd);
    return { relativePath: target.relativePath };
  });

  const writeFiles: WorkspaceFileSystem["Service"]["writeFiles"] = Effect.fn(
    "WorkspaceFileSystem.writeFiles",
  )(function* (input) {
    const targets = yield* Effect.forEach(input.files, (file) =>
      workspacePaths.resolveRelativePathWithinRoot({
        workspaceRoot: input.cwd,
        relativePath: file.relativePath,
      }),
    );
    const seen = new Set<string>();
    for (const target of targets) {
      if (seen.has(target.relativePath)) {
        return yield* new WorkspacePathNotFileError({
          workspaceRoot: input.cwd,
          relativePath: target.relativePath,
          resolvedPath: target.absolutePath,
        });
      }
      seen.add(target.relativePath);
    }
    let failedFile = input.files[0];
    let failedTarget = targets[0];
    const results = yield* Effect.tryPromise({
      try: async () => {
        if (input.files.length > PROJECT_WRITE_BATCH_MAX_FILES) {
          throw new Error(
            `A workspace batch may contain at most ${PROJECT_WRITE_BATCH_MAX_FILES} files.`,
          );
        }
        const preparedContents = input.files.map((file, index) => {
          failedFile = file;
          failedTarget = targets[index];
          const contents = decodeBatchFileContents(file.contents);
          if (contents.byteLength > PROJECT_WRITE_FILE_MAX_BYTES) {
            throw new Error(
              `Workspace batch file '${file.relativePath}' exceeds RUNE's per-file size limit.`,
            );
          }
          return contents;
        });
        const totalBytes = preparedContents.reduce(
          (total, contents) => total + contents.byteLength,
          0,
        );
        if (totalBytes > PROJECT_WRITE_BATCH_MAX_BYTES) {
          throw new Error("The workspace batch exceeds RUNE's safe aggregate size limit.");
        }
        for (const [index, target] of targets.entries()) {
          failedFile = input.files[index];
          failedTarget = target;
          await assertBatchTargetDoesNotTraverseSymlink(input.cwd, target.absolutePath);
        }
        const stagingRoot = await NodeFSP.mkdtemp(NodePath.join(input.cwd, ".rune-write-files-"));
        const backups = new Map<string, string>();
        const liveBackups = new Map<string, string>();
        const committed: string[] = [];
        const createdDirectories: string[] = [];
        try {
          for (const [index, target] of targets.entries()) {
            failedFile = input.files[index];
            failedTarget = target;
            try {
              const stat = await NodeFSP.stat(target.absolutePath);
              if (stat.isDirectory()) {
                throw new Error("Target is a directory.");
              }
              const backupPath = NodePath.join(stagingRoot, "backup-" + backups.size);
              await NodeFSP.copyFile(target.absolutePath, backupPath);
              backups.set(target.absolutePath, backupPath);
            } catch (cause) {
              if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
            }
          }

          for (const [index, target] of targets.entries()) {
            const file = input.files[index];
            if (!file) continue;
            const stagedPath = NodePath.join(stagingRoot, "file-" + index);
            failedFile = file;
            failedTarget = target;
            await NodeFSP.writeFile(stagedPath, preparedContents[index]!);
          }

          for (const [index, target] of targets.entries()) {
            const file = input.files[index];
            if (!file) continue;
            failedFile = file;
            failedTarget = target;
            const parentPath = NodePath.dirname(target.absolutePath);
            const missingDirectories = await missingParentDirectories(parentPath, input.cwd);
            await NodeFSP.mkdir(parentPath, { recursive: true });
            createdDirectories.push(...missingDirectories);
            await assertBatchTargetDoesNotTraverseSymlink(input.cwd, target.absolutePath);
            committed.push(target.absolutePath);
            const stagedPath = NodePath.join(stagingRoot, "file-" + index);
            if (process.platform === "win32" && backups.has(target.absolutePath)) {
              // Windows rename cannot overwrite a live file reliably. Move the
              // verified original out of the way first, then install the staged
              // file with a second atomic rename. The live backup lets rollback
              // restore without ever copying over a partially-written target.
              const liveBackupPath = NodePath.join(stagingRoot, "live-backup-" + index);
              await NodeFSP.rename(target.absolutePath, liveBackupPath);
              liveBackups.set(target.absolutePath, liveBackupPath);
              await NodeFSP.rename(stagedPath, target.absolutePath);
            } else {
              await NodeFSP.rename(stagedPath, target.absolutePath);
            }
          }
          return targets.map((target) => ({ relativePath: target.relativePath }));
        } catch (cause) {
          const rollbackErrors: unknown[] = [];
          for (const absolutePath of committed.toReversed()) {
            const backupPath = backups.get(absolutePath);
            const liveBackupPath = liveBackups.get(absolutePath);
            if (liveBackupPath && backupPath) {
              await NodeFSP.rm(absolutePath, { force: true }).catch((rollbackCause) => {
                rollbackErrors.push(rollbackCause);
              });
              await NodeFSP.rename(liveBackupPath, absolutePath).catch((rollbackCause) => {
                rollbackErrors.push(rollbackCause);
              });
            } else if (backupPath && process.platform !== "win32") {
              await restoreBatchTarget(backupPath, absolutePath).catch((rollbackCause) => {
                rollbackErrors.push(rollbackCause);
              });
            } else {
              await NodeFSP.rm(absolutePath, { force: true }).catch((rollbackCause) => {
                rollbackErrors.push(rollbackCause);
              });
            }
          }
          for (const directory of createdDirectories.toReversed()) {
            await NodeFSP.rm(directory, { force: true }).catch((rollbackCause) => {
              rollbackErrors.push(rollbackCause);
            });
          }
          if (rollbackErrors.length > 0) {
            const details = rollbackErrors
              .map((rollbackCause) =>
                rollbackCause instanceof Error ? rollbackCause.message : String(rollbackCause),
              )
              .join("; ");
            throw new Error(`Batch write failed and rollback was incomplete: ${details}`, {
              cause,
            });
          }
          throw cause;
        } finally {
          await NodeFSP.rm(stagingRoot, { recursive: true, force: true });
        }
      },
      catch: (cause) => {
        return new WorkspaceFileSystemOperationError({
          workspaceRoot: input.cwd,
          relativePath: failedFile?.relativePath ?? ".",
          resolvedPath: failedTarget?.absolutePath ?? input.cwd,
          operationPath: failedTarget?.absolutePath ?? input.cwd,
          operation: "write-file",
          cause,
        });
      },
    });
    yield* workspaceEntries.refresh(input.cwd);
    return results;
  });

  const createEntry: WorkspaceFileSystem["Service"]["createEntry"] = Effect.fn(
    "WorkspaceFileSystem.createEntry",
  )(function* (input) {
    const target = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: input.relativePath,
    });
    if (target.relativePath === "") {
      return yield* new WorkspacePathNotFileError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: target.absolutePath,
      });
    }

    const existing = Option.getOrNull(
      yield* fileSystem.stat(target.absolutePath).pipe(Effect.option),
    );
    if (existing !== null) {
      // Directories are mkdir-p idempotent; files must not be silently clobbered.
      if (input.kind === "directory") {
        return { relativePath: target.relativePath };
      }
      return yield* new WorkspaceFileSystemOperationError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: target.absolutePath,
        operationPath: target.absolutePath,
        operation: input.kind === "directory" ? "create-directory" : "write-file",
        cause: new Error("An entry already exists at this path."),
      });
    }

    if (input.kind === "directory") {
      yield* fileSystem.makeDirectory(target.absolutePath, { recursive: true }).pipe(
        Effect.mapError(
          (cause) =>
            new WorkspaceFileSystemOperationError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: target.absolutePath,
              operationPath: target.absolutePath,
              operation: "create-directory",
              cause,
            }),
        ),
      );
    } else {
      // Same parent-creation the editor's save path uses, so a "new file" in a
      // not-yet-existing folder behaves like typing the file into an editor.
      yield* fileSystem.makeDirectory(path.dirname(target.absolutePath), { recursive: true }).pipe(
        Effect.mapError(
          (cause) =>
            new WorkspaceFileSystemOperationError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: target.absolutePath,
              operationPath: path.dirname(target.absolutePath),
              operation: "make-directory",
              cause,
            }),
        ),
      );
      yield* fileSystem.writeFileString(target.absolutePath, "").pipe(
        Effect.mapError(
          (cause) =>
            new WorkspaceFileSystemOperationError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: target.absolutePath,
              operationPath: target.absolutePath,
              operation: "write-file",
              cause,
            }),
        ),
      );
    }

    yield* workspaceEntries.refresh(input.cwd);
    return { relativePath: target.relativePath };
  });

  const renameEntry: WorkspaceFileSystem["Service"]["renameEntry"] = Effect.fn(
    "WorkspaceFileSystem.renameEntry",
  )(function* (input) {
    if (
      input.newName.includes("/") ||
      input.newName.includes("\\") ||
      input.newName.includes("\0")
    ) {
      return yield* new WorkspaceFileSystemOperationError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: input.newName,
        operationPath: input.newName,
        operation: "rename",
        cause: new Error("The new name must be a single path segment."),
      });
    }
    const target = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: input.relativePath,
    });
    if (target.relativePath === "") {
      return yield* new WorkspacePathNotFileError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: target.absolutePath,
      });
    }

    const lastSeparator = target.relativePath.lastIndexOf("/");
    const nextRelative =
      lastSeparator >= 0
        ? `${target.relativePath.slice(0, lastSeparator)}/${input.newName}`
        : input.newName;
    const renamedTarget = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: nextRelative,
    });

    const stat = yield* fileSystem.stat(target.absolutePath).pipe(
      Effect.mapError(
        (cause) =>
          new WorkspaceFileSystemOperationError({
            workspaceRoot: input.cwd,
            relativePath: input.relativePath,
            resolvedPath: target.absolutePath,
            operationPath: target.absolutePath,
            operation: "stat",
            cause,
          }),
      ),
    );
    if (stat.type !== "Directory" && stat.type !== "File") {
      return yield* new WorkspacePathNotFileError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: target.absolutePath,
      });
    }
    const destinationStat = Option.getOrNull(
      yield* fileSystem.stat(renamedTarget.absolutePath).pipe(Effect.option),
    );
    if (destinationStat !== null) {
      return yield* new WorkspaceFileSystemOperationError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: renamedTarget.absolutePath,
        operationPath: renamedTarget.absolutePath,
        operation: "rename",
        cause: new Error("An entry already exists at the destination."),
      });
    }

    yield* Effect.tryPromise({
      try: () => NodeFSP.rename(target.absolutePath, renamedTarget.absolutePath),
      catch: (cause) =>
        new WorkspaceFileSystemOperationError({
          workspaceRoot: input.cwd,
          relativePath: input.relativePath,
          resolvedPath: renamedTarget.absolutePath,
          operationPath: target.absolutePath,
          operation: "rename",
          cause,
        }),
    });

    yield* workspaceEntries.refresh(input.cwd);
    return { relativePath: renamedTarget.relativePath };
  });

  const deleteEntry: WorkspaceFileSystem["Service"]["deleteEntry"] = Effect.fn(
    "WorkspaceFileSystem.deleteEntry",
  )(function* (input) {
    const target = yield* workspacePaths.resolveRelativePathWithinRoot({
      workspaceRoot: input.cwd,
      relativePath: input.relativePath,
    });
    if (target.relativePath === "") {
      return yield* new WorkspacePathNotFileError({
        workspaceRoot: input.cwd,
        relativePath: input.relativePath,
        resolvedPath: target.absolutePath,
      });
    }

    const stat = yield* fileSystem.stat(target.absolutePath).pipe(
      Effect.mapError(
        (cause) =>
          new WorkspaceFileSystemOperationError({
            workspaceRoot: input.cwd,
            relativePath: input.relativePath,
            resolvedPath: target.absolutePath,
            operationPath: target.absolutePath,
            operation: "stat",
            cause,
          }),
      ),
    );
    if (stat.type === "Directory") {
      if (input.recursive !== true) {
        return yield* new WorkspaceFileSystemOperationError({
          workspaceRoot: input.cwd,
          relativePath: input.relativePath,
          resolvedPath: target.absolutePath,
          operationPath: target.absolutePath,
          operation: "delete",
          cause: new Error("Directory is not empty; recursive deletion was not requested."),
        });
      }
      yield* fileSystem.remove(target.absolutePath, { recursive: true }).pipe(
        Effect.mapError(
          (cause) =>
            new WorkspaceFileSystemOperationError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: target.absolutePath,
              operationPath: target.absolutePath,
              operation: "delete",
              cause,
            }),
        ),
      );
    } else {
      yield* fileSystem.remove(target.absolutePath, { force: true }).pipe(
        Effect.mapError(
          (cause) =>
            new WorkspaceFileSystemOperationError({
              workspaceRoot: input.cwd,
              relativePath: input.relativePath,
              resolvedPath: target.absolutePath,
              operationPath: target.absolutePath,
              operation: "delete",
              cause,
            }),
        ),
      );
    }

    yield* workspaceEntries.refresh(input.cwd);
    return { relativePath: target.relativePath };
  });
  return WorkspaceFileSystem.of({
    readFile,
    writeFile,
    writeFiles,
    readFileAtHead,
    createEntry,
    renameEntry,
    deleteEntry,
  });
});

export const layer = Layer.effect(WorkspaceFileSystem, make);
