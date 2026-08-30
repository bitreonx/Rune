// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import {
  type ClientOrchestrationCommand,
  CommandId,
  MessageId,
  ThreadId,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ServerConfig from "../config.ts";
import { createAttachmentId } from "../attachmentStore.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";
import { cleanupFailedUploadedAttachments, normalizeDispatchCommand } from "./Normalizer.ts";

const testLayer = Layer.mergeAll(
  WorkspacePaths.layer,
  ServerConfig.layerTest(process.cwd(), { prefix: "rune-normalizer-attachments-" }),
).pipe(Layer.provideMerge(NodeServices.layer));

const attachmentUuid = "00000000-0000-4000-8000-0000000000aa";

function turnStartCommand(input: {
  readonly threadId?: string;
  readonly attachments: ReadonlyArray<
    | { readonly id: string; readonly sizeBytes: number }
    | { readonly dataUrl: string; readonly sizeBytes: number }
  >;
}): ClientOrchestrationCommand {
  return {
    type: "thread.turn.start",
    commandId: CommandId.make("command-1"),
    threadId: ThreadId.make(input.threadId ?? "thread-1"),
    message: {
      messageId: MessageId.make("message-1"),
      role: "user",
      text: "look at this",
      attachments: input.attachments.map((attachment) => ({
        type: "image" as const,
        name: "screenshot.png",
        mimeType: "image/png",
        ...attachment,
      })),
    },
    runtimeMode: "full-access",
    interactionMode: "default",
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}


function expectImage(
  attachment:
    | { readonly type: "image"; readonly id: string }
    | { readonly type: "file"; readonly id: string }
    | { readonly type: "thread-mention" }
    | undefined,
): { readonly id: string } {
  if (attachment === undefined || attachment.type !== "image") {
    throw new Error("Expected an image attachment.");
  }
  return attachment;
}

function fileAttachmentCommand(path: string): Extract<
  ClientOrchestrationCommand,
  { readonly type: "thread.turn.start" }
> {
  return {
    type: "thread.turn.start",
    commandId: CommandId.make("command-file-attachment"),
    threadId: ThreadId.make("thread-file-attachment"),
    message: {
      messageId: MessageId.make("message-file-attachment"),
      role: "user",
      text: "inspect this file",
      attachments: [
        {
          type: "file",
          kind: "file",
          id: "attachment-file-1",
          name: "clip.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1234,
          path,
        },
      ],
    },
    runtimeMode: "full-access",
    interactionMode: "default",
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

describe("normalizeDispatchCommand attachments", () => {
  it.effect("preserves typed non-image attachments without claiming an upload", () =>
    Effect.gen(function* () {
      const tempDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "rune-file-attachment-"));
      const filePath = NodePath.join(tempDir, "clip.mp4");
      NodeFS.writeFileSync(filePath, Buffer.alloc(1234));
      try {
        const command = fileAttachmentCommand(filePath);
        const normalized = yield* normalizeDispatchCommand(command);

        if (normalized.type !== "thread.turn.start") {
          throw new Error("Expected a thread.turn.start command.");
        }

        expect(normalized.message.attachments).toEqual(command.message.attachments);
      } finally {
        NodeFS.rmSync(tempDir, { recursive: true, force: true });
      }
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("preserves inline image attachments from existing mobile clients", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const normalized = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ dataUrl: "data:image/png;base64,cGl4ZWxz", sizeBytes: 6 }],
        }),
      );
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      const attachment = normalized.message.attachments[0]!;
      if (attachment.type !== "image") {
        throw new Error("Expected an image attachment.");
      }
      expect(attachment.id.startsWith("thread-1-")).toBe(true);
      expect(
        NodeFS.readFileSync(NodePath.join(config.attachmentsDir, `${attachment.id}.png`)),
      ).toEqual(Buffer.from("pixels"));
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("claims uploaded attachments while retaining a retryable pending copy", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const bytes = Buffer.from("pixels");
      const pendingPath = NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`);
      NodeFS.writeFileSync(pendingPath, bytes);

      const normalized = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: bytes.byteLength }],
        }),
      );
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      const firstAttachment = normalized.message.attachments[0]!;
      if (firstAttachment.type !== "image") {
        throw new Error("Expected an image attachment.");
      }
      const attachmentId = firstAttachment.id;
      expect(attachmentId.startsWith("thread-1-")).toBe(true);
      expect(attachmentId).not.toBe(`thread-1-${attachmentUuid}`);
      expect(NodeFS.existsSync(pendingPath)).toBe(true);
      expect(NodeFS.existsSync(NodePath.join(config.attachmentsDir, `${attachmentId}.png`))).toBe(
        true,
      );
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("reuses a finalized image attachment from the same thread", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const attachmentId = createAttachmentId("thread-1");
      if (!attachmentId) throw new Error("Expected a thread attachment id.");
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, attachmentId + ".png"),
        Buffer.from("pixels"),
      );

      const normalized = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ id: attachmentId, sizeBytes: 6 }],
        }),
      );
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      expect(normalized.message.attachments).toEqual([
        {
          type: "image",
          id: attachmentId,
          name: "screenshot.png",
          mimeType: "image/png",
          sizeBytes: 6,
          ownerThreadId: "thread-1",
        },
      ]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("reuses a finalized file attachment from the same thread", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const attachmentId = createAttachmentId("thread-file-attachment");
      if (!attachmentId) throw new Error("Expected a thread attachment id.");
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, attachmentId + ".mp4"),
        Buffer.alloc(1234),
      );
      const command = fileAttachmentCommand("unused");
      const [fileAttachment] = command.message.attachments;
      if (!fileAttachment || fileAttachment.type !== "file") {
        throw new Error("Expected a file attachment.");
      }
      const { path: _path, ...reusableAttachment } = fileAttachment;
      const reusableCommand = {
        ...command,
        message: {
          ...command.message,
          attachments: [{ ...reusableAttachment, id: attachmentId }],
        },
      } satisfies ClientOrchestrationCommand;

      const normalized = yield* normalizeDispatchCommand(reusableCommand);
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      expect(normalized.message.attachments).toEqual([
        {
          type: "file",
          kind: "file",
          id: attachmentId,
          name: "clip.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1234,
          ownerThreadId: "thread-file-attachment",
        },
      ]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("reuses a legacy finalized attachment when migration ownership matches", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const attachmentId = "legacy-thread-a-00000000-0000-4000-8000-000000000001";
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, `${attachmentId}.png`),
        Buffer.from("pixels"),
      );
      const command = turnStartCommand({
        threadId: "thread-a",
        attachments: [{ id: attachmentId, sizeBytes: 6 }],
      });
      const original = command.message.attachments[0]!;
      const migratedCommand = {
        ...command,
        message: {
          ...command.message,
          attachments: [{ ...original, ownerThreadId: "thread-a" }],
        },
      } satisfies ClientOrchestrationCommand;

      const normalized = yield* normalizeDispatchCommand(migratedCommand);
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }
      expect(normalized.message.attachments[0]).toMatchObject({
        id: attachmentId,
        ownerThreadId: "thread-a",
      });
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("rejects a finalized attachment whose stored extension disagrees with its type", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const attachmentId = createAttachmentId("thread-1");
      if (!attachmentId) throw new Error("Expected a thread attachment id.");
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, attachmentId + ".bin"),
        Buffer.from("pixels"),
      );

      const failure = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ id: attachmentId, sizeBytes: 6 }],
        }),
      ).pipe(Effect.flip);

      expect(failure.message).toContain("stored type or size does not match");
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("normalizes inline and uploaded attachments in the same turn", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`),
        Buffer.from("pixels"),
      );

      const normalized = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [
            { dataUrl: "data:image/png;base64,cGl4ZWxz", sizeBytes: 6 },
            { id: `pending-${attachmentUuid}`, sizeBytes: 6 },
          ],
        }),
      );
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      expect(normalized.message.attachments).toHaveLength(2);
      const secondAttachment = normalized.message.attachments[1]!;
      if (secondAttachment.type !== "image") {
        throw new Error("Expected an image attachment.");
      }
      expect(secondAttachment.id.startsWith("thread-1-")).toBe(true);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("retries a failed bootstrap with a fresh thread id", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const bytes = Buffer.from("pixels");
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`),
        bytes,
      );

      const first = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: bytes.byteLength }],
        }),
      );
      if (first.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }
      const firstImage = first.message.attachments[0]!;
      if (firstImage.type !== "image") {
        throw new Error("Expected an image attachment.");
      }
      NodeFS.rmSync(NodePath.join(config.attachmentsDir, `${firstImage.id}.png`));

      const retried = yield* normalizeDispatchCommand(
        turnStartCommand({
          threadId: "thread-retry",
          attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: bytes.byteLength }],
        }),
      );
      if (retried.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }
      expect(expectImage(retried.message.attachments[0]).id.startsWith("thread-retry-")).toBe(true);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("removes failed attachment claims without deleting their pending uploads", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const pendingPath = NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`);
      NodeFS.writeFileSync(pendingPath, Buffer.from("pixels"));
      const command = turnStartCommand({
        attachments: [
          { dataUrl: "data:image/png;base64,cGl4ZWxz", sizeBytes: 6 },
          { id: `pending-${attachmentUuid}`, sizeBytes: 6 },
        ],
      });
      const normalized = yield* normalizeDispatchCommand(command);
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      const inlinePath = NodePath.join(
        config.attachmentsDir,
        `${expectImage(normalized.message.attachments[0]).id}.png`,
      );
      const claimedPath = NodePath.join(
        config.attachmentsDir,
        `${expectImage(normalized.message.attachments[1]).id}.png`,
      );
      yield* cleanupFailedUploadedAttachments(command, normalized);

      expect(NodeFS.existsSync(pendingPath)).toBe(true);
      expect(NodeFS.existsSync(claimedPath)).toBe(false);
      expect(NodeFS.existsSync(inlinePath)).toBe(true);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("removes a failed claimed copy after its pending original was removed", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const pendingPath = NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`);
      NodeFS.writeFileSync(pendingPath, Buffer.from("pixels"));
      const command = turnStartCommand({
        attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: 6 }],
      });
      const normalized = yield* normalizeDispatchCommand(command);
      if (normalized.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }

      const claimedPath = NodePath.join(
        config.attachmentsDir,
        `${expectImage(normalized.message.attachments[0]).id}.png`,
      );
      NodeFS.rmSync(pendingPath);

      yield* cleanupFailedUploadedAttachments(command, normalized);

      expect(NodeFS.existsSync(claimedPath)).toBe(false);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("keeps concurrent claims independent when one dispatch fails", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const pendingPath = NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`);
      NodeFS.writeFileSync(pendingPath, Buffer.from("pixels"));
      const command = turnStartCommand({
        attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: 6 }],
      });

      const [failed, succeeded] = yield* Effect.all(
        [normalizeDispatchCommand(command), normalizeDispatchCommand(command)],
        { concurrency: 2 },
      );
      if (failed.type !== "thread.turn.start" || succeeded.type !== "thread.turn.start") {
        throw new Error("Expected thread.turn.start commands.");
      }

      const failedPath = NodePath.join(
        config.attachmentsDir,
        `${expectImage(failed.message.attachments[0]).id}.png`,
      );
      const succeededPath = NodePath.join(
        config.attachmentsDir,
        `${expectImage(succeeded.message.attachments[0]).id}.png`,
      );
      expect(failedPath).not.toBe(succeededPath);

      yield* cleanupFailedUploadedAttachments(command, failed);

      expect(NodeFS.existsSync(pendingPath)).toBe(true);
      expect(NodeFS.existsSync(failedPath)).toBe(false);
      expect(NodeFS.existsSync(succeededPath)).toBe(true);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("removes earlier claimed copies when a later attachment cannot be normalized", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      const pendingId = `pending-${attachmentUuid}`;
      const pendingPath = NodePath.join(config.attachmentsDir, `${pendingId}.png`);
      NodeFS.writeFileSync(pendingPath, Buffer.from("pixels"));

      const failure = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [
            { id: pendingId, sizeBytes: 6 },
            {
              id: "pending-00000000-0000-4000-8000-0000000000ff",
              sizeBytes: 6,
            },
          ],
        }),
      ).pipe(Effect.flip);

      expect(failure.message).toContain("not found");
      expect(NodeFS.readdirSync(config.attachmentsDir)).toEqual([`${pendingId}.png`]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("rejects uploaded attachments with the wrong size or thread", () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig.ServerConfig;
      NodeFS.writeFileSync(
        NodePath.join(config.attachmentsDir, `pending-${attachmentUuid}.png`),
        Buffer.from("pixels"),
      );

      const wrongSize = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: 999 }],
        }),
      ).pipe(Effect.flip);
      expect(wrongSize.message).toContain("size");

      const wrongThread = yield* normalizeDispatchCommand(
        turnStartCommand({
          attachments: [{ id: `another-thread-${attachmentUuid}`, sizeBytes: 6 }],
        }),
      ).pipe(Effect.flip);
      expect(wrongThread.message).toContain("pending upload");

      const mismatchedTypeCommand = turnStartCommand({
        attachments: [{ id: `pending-${attachmentUuid}`, sizeBytes: 6 }],
      });
      if (mismatchedTypeCommand.type !== "thread.turn.start") {
        throw new Error("Expected a thread.turn.start command.");
      }
      const mismatchedType = yield* normalizeDispatchCommand({
        ...mismatchedTypeCommand,
        message: {
          ...mismatchedTypeCommand.message,
          attachments: mismatchedTypeCommand.message.attachments.map((attachment) => ({
            ...attachment,
            mimeType: "image/jpeg",
          })),
        },
      }).pipe(Effect.flip);
      expect(mismatchedType.message).toContain("image type");
    }).pipe(Effect.provide(testLayer)),
  );
});
