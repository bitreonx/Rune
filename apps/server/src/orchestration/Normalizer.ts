import * as NodePath from "node:path";

import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import {
  type ClientOrchestrationCommand,
  type IsoDateTime,
  type OrchestrationCommand,
  OrchestrationDispatchCommandError,
  PROVIDER_SEND_TURN_MAX_IMAGE_BYTES,
} from "@rune/contracts";

import {
  createAttachmentId,
  attachmentBelongsToThread,
  inferAttachmentExtension,
  planAttachmentClaim,
  PENDING_ATTACHMENT_THREAD_SEGMENT,
  parseThreadSegmentFromAttachmentId,
  resolveAttachmentPathById,
  resolveAttachmentPath,
} from "../attachmentStore.ts";
import { ServerConfig } from "../config.ts";
import { parseBase64DataUrl } from "../imageMime.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";

export const canonicalizeClientCommandTimestamps = (
  command: ClientOrchestrationCommand,
  receivedAt: IsoDateTime,
): ClientOrchestrationCommand => {
  const canonicalCommand =
    "createdAt" in command
      ? {
          ...command,
          createdAt: receivedAt,
        }
      : command;

  if (canonicalCommand.type !== "thread.turn.start" || !canonicalCommand.bootstrap?.createThread) {
    return canonicalCommand;
  }

  return {
    ...canonicalCommand,
    bootstrap: {
      ...canonicalCommand.bootstrap,
      createThread: {
        ...canonicalCommand.bootstrap.createThread,
        createdAt: receivedAt,
      },
    },
  };
};

const removeClaimedAttachmentPaths = Effect.fn("Normalizer.removeClaimedAttachmentPaths")(
  function* (attachmentPaths: ReadonlyArray<string>) {
    if (attachmentPaths.length === 0) {
      return;
    }
    const fileSystem = yield* FileSystem.FileSystem;
    yield* Effect.forEach(
      attachmentPaths,
      (attachmentPath) =>
        fileSystem.remove(attachmentPath, { force: true }).pipe(
          Effect.tapError((cause) =>
            Effect.logWarning("Failed to remove an unclaimed attachment copy.", {
              attachmentPath,
              cause,
            }),
          ),
          Effect.orElseSucceed(() => undefined),
        ),
      { concurrency: 1 },
    );
  },
);

export const normalizeDispatchCommand = (command: ClientOrchestrationCommand) =>
  Effect.gen(function* () {
    const receivedAt = DateTime.formatIso(yield* DateTime.now);
    const canonicalCommand = canonicalizeClientCommandTimestamps(command, receivedAt);
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const serverConfig = yield* ServerConfig;
    const workspacePaths = yield* WorkspacePaths.WorkspacePaths;

    const normalizeProjectWorkspaceRoot = (workspaceRoot: string) =>
      workspacePaths.normalizeWorkspaceRoot(workspaceRoot).pipe(
        Effect.mapError(
          (cause) =>
            new OrchestrationDispatchCommandError({
              message: cause.message,
            }),
        ),
      );

    const normalizeProjectWorkspaceRootForCreate = (
      workspaceRoot: string,
      createIfMissing: boolean | undefined,
    ) =>
      workspacePaths
        .normalizeWorkspaceRoot(workspaceRoot, {
          createIfMissing: createIfMissing === true,
        })
        .pipe(
          Effect.mapError(
            (cause) =>
              new OrchestrationDispatchCommandError({
                message: cause.message,
              }),
          ),
        );

    if (canonicalCommand.type === "project.create") {
      return {
        ...canonicalCommand,
        workspaceRoot: yield* normalizeProjectWorkspaceRootForCreate(
          canonicalCommand.workspaceRoot,
          canonicalCommand.createWorkspaceRootIfMissing,
        ),
        createWorkspaceRootIfMissing: canonicalCommand.createWorkspaceRootIfMissing === true,
      } satisfies OrchestrationCommand;
    }

    if (
      canonicalCommand.type === "project.meta.update" &&
      canonicalCommand.workspaceRoot !== undefined
    ) {
      return {
        ...canonicalCommand,
        workspaceRoot: yield* normalizeProjectWorkspaceRoot(canonicalCommand.workspaceRoot),
      } satisfies OrchestrationCommand;
    }

    if (canonicalCommand.type !== "thread.turn.start") {
      return canonicalCommand as OrchestrationCommand;
    }

    const claimedAttachmentPaths: string[] = [];
    const normalizedAttachments = yield* Effect.forEach(
      canonicalCommand.message.attachments,
      (attachment) =>
        Effect.gen(function* () {
          // Thread mentions are cross-thread references, not uploads; the
          // server resolves them at turn start, nothing to claim on disk.
          if (attachment.type === "thread-mention") {
            return attachment;
          }

          if (attachment.type === "file") {
            if (attachment.path === undefined) {
              if (attachment.kind !== "file") {
                return yield* new OrchestrationDispatchCommandError({
                  message: `Attachment '${attachment.name}' cannot be sent: uploaded folders are not supported.`,
                });
              }

              const existingPath = resolveAttachmentPathById({
                attachmentsDir: serverConfig.attachmentsDir,
                attachmentId: attachment.id,
              });
              if (
                existingPath &&
                attachmentBelongsToThread({
                  attachmentId: attachment.id,
                  threadId: canonicalCommand.threadId,
                })
              ) {
                const info = yield* fileSystem.stat(existingPath).pipe(
                  Effect.mapError(
                    (cause) =>
                      new OrchestrationDispatchCommandError({
                        message:
                          "Attachment '" +
                          attachment.name +
                          "' cannot be sent: attachment not found.",
                        cause,
                      }),
                  ),
                );
                const expectedExtension = inferAttachmentExtension({
                  mimeType: attachment.mimeType,
                  fileName: attachment.name,
                });
                if (
                  info.type !== "File" ||
                  info.size !== BigInt(attachment.sizeBytes) ||
                  NodePath.extname(existingPath).toLowerCase() !== expectedExtension
                ) {
                  return yield* new OrchestrationDispatchCommandError({
                    message:
                      "Attachment '" +
                      attachment.name +
                      "' cannot be sent: stored type or size does not match.",
                  });
                }
                return {
                  ...attachment,
                  mimeType: attachment.mimeType.toLowerCase(),
                };
              }

              const claim = planAttachmentClaim({
                attachmentsDir: serverConfig.attachmentsDir,
                threadId: canonicalCommand.threadId,
                attachmentId: attachment.id,
              });
              if (!claim.ok) {
                return yield* new OrchestrationDispatchCommandError({
                  message: `Attachment '${attachment.name}' cannot be sent: ${claim.reason}.`,
                });
              }

              const info = yield* fileSystem.stat(claim.currentPath).pipe(
                Effect.mapError(
                  (cause) =>
                    new OrchestrationDispatchCommandError({
                      message: `Attachment '${attachment.name}' cannot be sent: attachment not found.`,
                      cause,
                    }),
                ),
              );
              if (info.type !== "File") {
                return yield* new OrchestrationDispatchCommandError({
                  message: `Attachment '${attachment.name}' cannot be sent: uploaded attachment is not a regular file.`,
                });
              }
              if (info.size !== BigInt(attachment.sizeBytes)) {
                return yield* new OrchestrationDispatchCommandError({
                  message: `Attachment '${attachment.name}' cannot be sent: stored size does not match.`,
                });
              }

              // The final file remains server-owned. Do not carry the pending
              // upload's renderer path into the persisted command.
              const normalizedAttachment = {
                type: "file" as const,
                kind: attachment.kind,
                id: claim.finalId,
                name: attachment.name,
                mimeType: attachment.mimeType.toLowerCase(),
                sizeBytes: attachment.sizeBytes,
              };
              yield* fileSystem.copyFile(claim.currentPath, claim.finalPath).pipe(
                Effect.mapError(
                  (cause) =>
                    new OrchestrationDispatchCommandError({
                      message: `Failed to claim attachment '${attachment.name}' for this thread.`,
                      cause,
                    }),
                ),
              );
              claimedAttachmentPaths.push(claim.finalPath);

              return normalizedAttachment;
            }

            const canonicalPath = yield* fileSystem.realPath(attachment.path).pipe(
              Effect.mapError(
                (cause) =>
                  new OrchestrationDispatchCommandError({
                    message: `Attachment '${attachment.name}' cannot be sent: path not found.`,
                    cause,
                  }),
              ),
            );
            const info = yield* fileSystem.stat(canonicalPath).pipe(
              Effect.mapError(
                (cause) =>
                  new OrchestrationDispatchCommandError({
                    message: `Attachment '${attachment.name}' cannot be sent: path not found.`,
                    cause,
                  }),
              ),
            );
            const expectedType = attachment.kind === "file" ? "File" : "Directory";
            if (info.type !== expectedType) {
              return yield* new OrchestrationDispatchCommandError({
                message: `Attachment '${attachment.name}' cannot be sent: expected a ${
                  attachment.kind === "file" ? "regular file" : "directory"
                }.`,
              });
            }
            if (attachment.kind === "file" && info.size !== BigInt(attachment.sizeBytes)) {
              return yield* new OrchestrationDispatchCommandError({
                message: `Attachment '${attachment.name}' cannot be sent: file size does not match.`,
              });
            }

            return {
              ...attachment,
              mimeType: attachment.mimeType.toLowerCase(),
              path: canonicalPath,
            };
          }

          if (!("dataUrl" in attachment)) {
            const existingPath = resolveAttachmentPathById({
              attachmentsDir: serverConfig.attachmentsDir,
              attachmentId: attachment.id,
            });
            if (
              existingPath &&
              attachmentBelongsToThread({
                attachmentId: attachment.id,
                threadId: canonicalCommand.threadId,
              })
            ) {
              const info = yield* fileSystem.stat(existingPath).pipe(
                Effect.mapError(
                  (cause) =>
                    new OrchestrationDispatchCommandError({
                      message:
                        "Attachment '" +
                        attachment.name +
                        "' cannot be sent: attachment not found.",
                      cause,
                    }),
                ),
              );
              const expectedExtension = inferAttachmentExtension({
                mimeType: attachment.mimeType,
                fileName: attachment.name,
              });
              if (
                info.type !== "File" ||
                info.size !== BigInt(attachment.sizeBytes) ||
                NodePath.extname(existingPath).toLowerCase() !== expectedExtension
              ) {
                return yield* new OrchestrationDispatchCommandError({
                  message:
                    "Attachment '" +
                    attachment.name +
                    "' cannot be sent: stored type or size does not match.",
                });
              }
              return {
                ...attachment,
                mimeType: attachment.mimeType.toLowerCase(),
              };
            }

            const claim = planAttachmentClaim({
              attachmentsDir: serverConfig.attachmentsDir,
              threadId: canonicalCommand.threadId,
              attachmentId: attachment.id,
            });
            if (!claim.ok) {
              return yield* new OrchestrationDispatchCommandError({
                message: `Attachment '${attachment.name}' cannot be sent: ${claim.reason}.`,
              });
            }

            const info = yield* fileSystem.stat(claim.currentPath).pipe(
              Effect.mapError(
                (cause) =>
                  new OrchestrationDispatchCommandError({
                    message: `Attachment '${attachment.name}' cannot be sent: attachment not found.`,
                    cause,
                  }),
              ),
            );
            if (info.size !== BigInt(attachment.sizeBytes)) {
              return yield* new OrchestrationDispatchCommandError({
                message: `Attachment '${attachment.name}' cannot be sent: stored size does not match.`,
              });
            }

            const normalizedAttachment = {
              ...attachment,
              id: claim.finalId,
              mimeType: attachment.mimeType.toLowerCase(),
            };
            const expectedPath = resolveAttachmentPath({
              attachmentsDir: serverConfig.attachmentsDir,
              attachment: normalizedAttachment,
            });
            if (expectedPath !== claim.finalPath) {
              return yield* new OrchestrationDispatchCommandError({
                message: `Attachment '${attachment.name}' cannot be sent: image type does not match the upload.`,
              });
            }

            // Keep the pending copy until the turn succeeds. A failed thread
            // bootstrap can then retry with a fresh thread id.
            yield* fileSystem.copyFile(claim.currentPath, claim.finalPath).pipe(
              Effect.mapError(
                (cause) =>
                  new OrchestrationDispatchCommandError({
                    message: `Failed to claim attachment '${attachment.name}' for this thread.`,
                    cause,
                  }),
              ),
            );
            claimedAttachmentPaths.push(claim.finalPath);

            return normalizedAttachment;
          }

          const parsed = parseBase64DataUrl(attachment.dataUrl);
          if (!parsed || !parsed.mimeType.startsWith("image/")) {
            return yield* new OrchestrationDispatchCommandError({
              message: `Invalid image attachment payload for '${attachment.name}'.`,
            });
          }

          const bytes = Buffer.from(parsed.base64, "base64");
          if (bytes.byteLength === 0 || bytes.byteLength > PROVIDER_SEND_TURN_MAX_IMAGE_BYTES) {
            return yield* new OrchestrationDispatchCommandError({
              message: `Image attachment '${attachment.name}' is empty or too large.`,
            });
          }

          const attachmentId = createAttachmentId(canonicalCommand.threadId);
          if (!attachmentId) {
            return yield* new OrchestrationDispatchCommandError({
              message: "Failed to create a safe attachment id.",
            });
          }

          const persistedAttachment = {
            type: "image" as const,
            id: attachmentId,
            name: attachment.name,
            mimeType: parsed.mimeType.toLowerCase(),
            sizeBytes: bytes.byteLength,
          };

          const attachmentPath = resolveAttachmentPath({
            attachmentsDir: serverConfig.attachmentsDir,
            attachment: persistedAttachment,
          });
          if (!attachmentPath) {
            return yield* new OrchestrationDispatchCommandError({
              message: `Failed to resolve persisted path for '${attachment.name}'.`,
            });
          }

          yield* fileSystem.makeDirectory(path.dirname(attachmentPath), { recursive: true }).pipe(
            Effect.mapError(
              () =>
                new OrchestrationDispatchCommandError({
                  message: `Failed to create attachment directory for '${attachment.name}'.`,
                }),
            ),
          );
          yield* fileSystem.writeFile(attachmentPath, bytes).pipe(
            Effect.mapError(
              () =>
                new OrchestrationDispatchCommandError({
                  message: `Failed to persist attachment '${attachment.name}'.`,
                }),
            ),
          );

          return persistedAttachment;
        }),
      { concurrency: 1 },
    ).pipe(Effect.tapError(() => removeClaimedAttachmentPaths(claimedAttachmentPaths)));

    return {
      ...canonicalCommand,
      message: {
        ...canonicalCommand.message,
        attachments: normalizedAttachments,
      },
    } satisfies OrchestrationCommand;
  });

export const cleanupFailedUploadedAttachments = Effect.fn(
  "Normalizer.cleanupFailedUploadedAttachments",
)(function* (command: ClientOrchestrationCommand, normalizedCommand: OrchestrationCommand) {
  if (command.type !== "thread.turn.start" || normalizedCommand.type !== "thread.turn.start") {
    return;
  }

  const serverConfig = yield* ServerConfig;
  const claimedPaths: string[] = [];
  for (const [index, attachment] of normalizedCommand.message.attachments.entries()) {
    const original = command.message.attachments[index];
    if (
      !original ||
      original.type === "thread-mention" ||
      "dataUrl" in original ||
      (original.type === "file" && original.path !== undefined) ||
      parseThreadSegmentFromAttachmentId(original.id) !== PENDING_ATTACHMENT_THREAD_SEGMENT
    ) {
      continue;
    }

    const claimedPath = resolveAttachmentPath({
      attachmentsDir: serverConfig.attachmentsDir,
      attachment,
    });
    if (claimedPath) {
      claimedPaths.push(claimedPath);
    }
  }
  yield* removeClaimedAttachmentPaths(claimedPaths);
});
