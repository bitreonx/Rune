// @effect-diagnostics nodeBuiltinImport:off
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import Mime from "@effect/platform-node/Mime";
import type { ChatAttachment } from "@rune/contracts";

import {
  normalizeAttachmentRelativePath,
  resolveAttachmentRelativePath,
} from "./attachmentPaths.ts";
import { inferImageExtension, SAFE_IMAGE_FILE_EXTENSIONS } from "./imageMime.ts";

const ATTACHMENT_FILENAME_EXTENSIONS = [...SAFE_IMAGE_FILE_EXTENSIONS, ".bin"];
const SAFE_ATTACHMENT_EXTENSION_PATTERN = /^\.[a-z0-9]{1,16}$/i;
const ATTACHMENT_ID_THREAD_SEGMENT_MAX_CHARS = 80;
const ATTACHMENT_ID_THREAD_SEGMENT_PATTERN = "[a-z0-9_]+(?:-[a-z0-9_]+)*";
const ATTACHMENT_ID_UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ATTACHMENT_ID_PATTERN = new RegExp(
  `^(${ATTACHMENT_ID_THREAD_SEGMENT_PATTERN})-(${ATTACHMENT_ID_UUID_PATTERN})$`,
  "i",
);

export const PENDING_ATTACHMENT_THREAD_SEGMENT = "pending";
export const PENDING_ATTACHMENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PARTIAL_UPLOAD_MAX_AGE_MS = 60 * 60 * 1000;

export function toSafeThreadAttachmentSegment(threadId: string): string | null {
  const segment = threadId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, ATTACHMENT_ID_THREAD_SEGMENT_MAX_CHARS)
    .replace(/[-_]+$/g, "");
  if (segment.length === 0) {
    return null;
  }
  return segment === PENDING_ATTACHMENT_THREAD_SEGMENT ? "_pending" : segment;
}

function threadAttachmentFingerprint(threadId: string): string {
  return NodeCrypto.createHash("sha256").update(threadId).digest("hex").slice(0, 16);
}

function formatAttachmentUuid(compactUuid: string): string {
  return [
    compactUuid.slice(0, 8),
    compactUuid.slice(8, 12),
    compactUuid.slice(12, 16),
    compactUuid.slice(16, 20),
    compactUuid.slice(20, 32),
  ].join("-");
}

export function createPendingAttachmentId(): string {
  return `${PENDING_ATTACHMENT_THREAD_SEGMENT}-${NodeCrypto.randomUUID()}`;
}

export function parseAttachmentUuid(attachmentId: string): string | null {
  const normalizedId = normalizeAttachmentRelativePath(attachmentId);
  if (!normalizedId || normalizedId.includes("/") || normalizedId.includes(".")) {
    return null;
  }
  return normalizedId.match(ATTACHMENT_ID_PATTERN)?.[2]?.toLowerCase() ?? null;
}

export function createAttachmentId(threadId: string): string | null {
  const threadSegment = toSafeThreadAttachmentSegment(threadId);
  if (!threadSegment) {
    return null;
  }
  const randomUuid = NodeCrypto.randomUUID().replaceAll("-", "");
  const compactUuid = threadAttachmentFingerprint(threadId) + randomUuid.slice(16);
  return `${threadSegment}-${formatAttachmentUuid(compactUuid)}`;
}

/** Validate the exact thread identity embedded in newly-created attachment IDs. */
export function attachmentBelongsToThread(input: {
  readonly attachmentId: string;
  readonly threadId: string;
}): boolean {
  const uuid = parseAttachmentUuid(input.attachmentId);
  return (
    uuid !== null &&
    uuid.replaceAll("-", "").startsWith(threadAttachmentFingerprint(input.threadId))
  );
}

export function parseThreadSegmentFromAttachmentId(attachmentId: string): string | null {
  const normalizedId = normalizeAttachmentRelativePath(attachmentId);
  if (!normalizedId || normalizedId.includes("/") || normalizedId.includes(".")) {
    return null;
  }
  const match = normalizedId.match(ATTACHMENT_ID_PATTERN);
  if (!match) {
    return null;
  }
  return match[1]?.toLowerCase() ?? null;
}

function safeAttachmentExtension(extension: string | undefined): string | null {
  const normalized = extension?.trim().toLowerCase() ?? "";
  if (
    normalized.length === 0 ||
    normalized === ".part" ||
    !SAFE_ATTACHMENT_EXTENSION_PATTERN.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

/** Derive a single safe on-disk extension without ever using the uploaded name as a path. */
export function inferAttachmentExtension(input: {
  readonly mimeType: string;
  readonly fileName?: string;
}): string {
  if (input.mimeType.toLowerCase().startsWith("image/")) {
    return inferImageExtension(input);
  }

  const fromMime = safeAttachmentExtension(Mime.getExtension(input.mimeType));
  if (fromMime) {
    return fromMime;
  }

  const fromFileName = safeAttachmentExtension(NodePath.extname(input.fileName?.trim() ?? ""));
  return fromFileName ?? ".bin";
}

export function attachmentRelativePath(attachment: ChatAttachment): string | null {
  switch (attachment.type) {
    case "image": {
      const extension = inferImageExtension({
        mimeType: attachment.mimeType,
        fileName: attachment.name,
      });
      return `${attachment.id}${extension}`;
    }
    case "file":
      // A path-bearing file is a provider-host reference and does not belong
      // to the server-owned attachment store. Pathless files use the same
      // deterministic extension as the signed upload writer.
      return attachment.path === undefined
        ? `${attachment.id}${inferAttachmentExtension({
            mimeType: attachment.mimeType,
            fileName: attachment.name,
          })}`
        : null;
    // Thread mentions are cross-thread references, not uploaded artifacts;
    // there is no on-disk path to resolve.
    case "thread-mention":
      return null;
  }
}

export function resolveAttachmentPath(input: {
  readonly attachmentsDir: string;
  readonly attachment: ChatAttachment;
}): string | null {
  if (input.attachment.type === "file") {
    if (input.attachment.path !== undefined) {
      return resolveProviderHostAttachmentPath({
        attachment: input.attachment,
        path: input.attachment.path,
      });
    }

    const relativePath = attachmentRelativePath(input.attachment);
    const expectedPath = relativePath
      ? resolveAttachmentRelativePath({
          attachmentsDir: input.attachmentsDir,
          relativePath,
        })
      : null;
    const resolvedExpectedPath = expectedPath
      ? resolveRegularAttachmentPath(input.attachmentsDir, expectedPath)
      : null;
    return (
      resolvedExpectedPath ??
      resolveAttachmentPathById({
        attachmentsDir: input.attachmentsDir,
        attachmentId: input.attachment.id,
      })
    );
  }

  const relativePath = attachmentRelativePath(input.attachment);
  if (relativePath === null) {
    return null;
  }
  return resolveAttachmentRelativePath({
    attachmentsDir: input.attachmentsDir,
    relativePath,
  });
}

/**
 * Path-bearing files come from the provider host rather than the server-owned
 * upload directory. Still canonicalize and inspect them here so a direct
 * provider call cannot turn a deleted path or a directory/file mismatch into
 * prompt text.
 */
function resolveProviderHostAttachmentPath(input: {
  readonly attachment: Extract<ChatAttachment, { readonly type: "file" }>;
  readonly path: string;
}): string | null {
  try {
    const canonicalPath = NodeFS.realpathSync(input.path);
    const info = NodeFS.statSync(canonicalPath);
    if (input.attachment.kind === "file" && !info.isFile()) {
      return null;
    }
    if (input.attachment.kind === "folder" && !info.isDirectory()) {
      return null;
    }
    if (input.attachment.kind === "file" && info.size !== input.attachment.sizeBytes) {
      return null;
    }
    return canonicalPath;
  } catch {
    return null;
  }
}

export function resolveAttachmentPathById(input: {
  readonly attachmentsDir: string;
  readonly attachmentId: string;
}): string | null {
  const normalizedId = normalizeAttachmentRelativePath(input.attachmentId);
  if (!normalizedId || normalizedId.includes("/") || normalizedId.includes(".")) {
    return null;
  }
  for (const extension of ATTACHMENT_FILENAME_EXTENSIONS) {
    const maybePath = resolveAttachmentRelativePath({
      attachmentsDir: input.attachmentsDir,
      relativePath: `${normalizedId}${extension}`,
    });
    if (maybePath) {
      const resolvedPath = resolveRegularAttachmentPath(input.attachmentsDir, maybePath);
      if (resolvedPath) {
        return resolvedPath;
      }
    }
  }

  let entries: string[];
  try {
    entries = NodeFS.readdirSync(input.attachmentsDir);
  } catch {
    return null;
  }
  const entryPrefix = `${normalizedId}.`;
  for (const entry of entries) {
    if (!entry.startsWith(entryPrefix)) {
      continue;
    }
    if (parseAttachmentIdFromRelativePath(entry) !== normalizedId) {
      continue;
    }
    if (!safeAttachmentExtension(NodePath.extname(entry))) {
      continue;
    }
    const maybePath = resolveAttachmentRelativePath({
      attachmentsDir: input.attachmentsDir,
      relativePath: entry,
    });
    if (!maybePath) {
      continue;
    }
    const resolvedPath = resolveRegularAttachmentPath(input.attachmentsDir, maybePath);
    if (resolvedPath) {
      return resolvedPath;
    }
  }
  return null;
}

function resolveRegularAttachmentPath(attachmentsDir: string, attachmentPath: string): string | null {
  try {
    if (!NodeFS.lstatSync(attachmentPath).isFile()) {
      return null;
    }
    const attachmentsRoot = NodeFS.realpathSync(attachmentsDir);
    const canonicalPath = NodeFS.realpathSync(attachmentPath);
    const relativePath = NodePath.relative(attachmentsRoot, canonicalPath);
    if (
      relativePath.length === 0 ||
      relativePath === ".." ||
      relativePath.startsWith(`..${NodePath.sep}`) ||
      NodePath.isAbsolute(relativePath)
    ) {
      return null;
    }
    return canonicalPath;
  } catch {
    return null;
  }
}

export type AttachmentClaimPlan =
  | {
      readonly ok: true;
      readonly finalId: string;
      readonly currentPath: string;
      readonly finalPath: string;
    }
  | { readonly ok: false; readonly reason: string };

export function planAttachmentClaim(input: {
  readonly attachmentsDir: string;
  readonly threadId: string;
  readonly attachmentId: string;
}): AttachmentClaimPlan {
  const uuid = parseAttachmentUuid(input.attachmentId);
  const requestedSegment = parseThreadSegmentFromAttachmentId(input.attachmentId);
  if (!uuid || !requestedSegment) {
    return { ok: false, reason: "invalid attachment id" };
  }

  if (!toSafeThreadAttachmentSegment(input.threadId)) {
    return { ok: false, reason: "invalid thread id" };
  }
  if (requestedSegment !== PENDING_ATTACHMENT_THREAD_SEGMENT) {
    return { ok: false, reason: "attachment must be a pending upload" };
  }

  const currentPath = resolveAttachmentPathById({
    attachmentsDir: input.attachmentsDir,
    attachmentId: input.attachmentId,
  });
  if (!currentPath) {
    return { ok: false, reason: "attachment not found (removed or expired)" };
  }
  const finalId = createAttachmentId(input.threadId);
  if (!finalId) {
    return { ok: false, reason: "failed to create attachment id" };
  }

  const expectedFinalPath = resolveAttachmentRelativePath({
    attachmentsDir: input.attachmentsDir,
    relativePath: `${finalId}${NodePath.extname(currentPath)}`,
  });
  if (!expectedFinalPath) {
    return { ok: false, reason: "failed to resolve attachment path" };
  }
  return {
    ok: true,
    finalId,
    currentPath,
    finalPath: expectedFinalPath,
  };
}

export function sweepStalePendingAttachments(input: {
  readonly attachmentsDir: string;
  readonly nowMs: number;
}): { readonly deleted: number } {
  let entries: string[];
  try {
    entries = NodeFS.readdirSync(input.attachmentsDir);
  } catch {
    return { deleted: 0 };
  }

  let deleted = 0;
  for (const entry of entries) {
    const isPartial = entry.endsWith(".part");
    if (!isPartial) {
      const attachmentId = parseAttachmentIdFromRelativePath(entry);
      if (
        !attachmentId ||
        parseThreadSegmentFromAttachmentId(attachmentId) !== PENDING_ATTACHMENT_THREAD_SEGMENT
      ) {
        continue;
      }
    }

    const resolved = resolveAttachmentRelativePath({
      attachmentsDir: input.attachmentsDir,
      relativePath: entry,
    });
    if (!resolved) {
      continue;
    }
    try {
      const maxAgeMs = isPartial ? PARTIAL_UPLOAD_MAX_AGE_MS : PENDING_ATTACHMENT_MAX_AGE_MS;
      if (input.nowMs - NodeFS.statSync(resolved).mtimeMs > maxAgeMs) {
        NodeFS.unlinkSync(resolved);
        deleted += 1;
      }
    } catch {
      continue;
    }
  }

  return { deleted };
}

export function parseAttachmentIdFromRelativePath(relativePath: string): string | null {
  const normalized = normalizeAttachmentRelativePath(relativePath);
  if (!normalized || normalized.includes("/")) {
    return null;
  }
  const extensionIndex = normalized.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return null;
  }
  const id = normalized.slice(0, extensionIndex);
  return id.length > 0 && !id.includes(".") ? id : null;
}
