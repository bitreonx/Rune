import * as Schema from "effect/Schema";

import { NonNegativeInt, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { WorkspaceFileRefPath, type WorkspaceFileRef } from "./workspaceFileRef.ts";
import {
  PROVIDER_SEND_TURN_MAX_IMAGE_BYTES,
  PROVIDER_SEND_TURN_SUPPORTED_IMAGE_MIME_TYPES,
  ProjectFaviconPath,
} from "./orchestration.ts";
import { ToolActivityNativeAppReference } from "./providerRuntime.ts";

const ASSET_PATH_MAX_LENGTH = 1024;

export const AssetResource = Schema.Union([
  Schema.TaggedStruct("workspace-file", {
    threadId: ThreadId,
    path: TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH)),
    /**
     * The workspace root the caller is actually browsing. Without it the
     * server falls back to the thread's project root, which is wrong for
     * nested workspaces and worktree-backed threads and is what made
     * monorepo image previews fail. Callers that know their root must send
     * it; the server validates the path stays inside it either way.
     */
    cwd: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH))),
  }),
  // One file served in place from anywhere the environment host can read:
  // images, videos, HTML, and PDF. An absolute path may lie outside the
  // workspace; a relative one resolves against the thread's workspace.
  Schema.TaggedStruct("media-file", {
    threadId: ThreadId,
    path: TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH)),
  }),
  Schema.TaggedStruct("attachment", {
    attachmentId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
    /** Display name and mime from the `ChatAttachment` the caller holds. The
        server bakes both into the signed URL so downloads carry the real
        filename and Content-Type. Absent on older clients, which fall back to
        an octet-stream download without a filename. */
    fileName: Schema.optionalKey(TrimmedNonEmptyString.check(Schema.isMaxLength(255))),
    mimeType: Schema.optionalKey(TrimmedNonEmptyString.check(Schema.isMaxLength(100))),
    /** Generic attachments download by default. Document viewers opt into an
        inline response after deciding the file type is safe to preview. */
    disposition: Schema.optionalKey(Schema.Literals(["inline", "attachment"])),
  }),
  Schema.TaggedStruct("project-favicon", {
    cwd: TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH)),
    // A cache-key hint only. The server reads the authoritative path from the
    // project projection before it issues the signed URL.
    path: Schema.optional(ProjectFaviconPath),
  }),
  Schema.TaggedStruct("native-app-icon", {
    app: ToolActivityNativeAppReference,
  }),
]);
export type AssetResource = typeof AssetResource.Type;

/**
 * Read the canonical workspace-file reference while accepting the legacy
 * absolute-path payload used by older clients. This is a pure migration
 * helper; callers still validate the resolved path against the authoritative
 * workspace on the server.
 */
export function extractWorkspaceFileRef(
  resource: unknown,
  fallbackWorkspaceRoot: string | undefined,
): WorkspaceFileRef | null {
  if (
    !resource ||
    typeof resource !== "object" ||
    (resource as { _tag?: unknown })._tag !== "workspace-file"
  ) {
    return null;
  }

  const value = resource as {
    threadId?: unknown;
    workspaceId?: unknown;
    workspaceRoot?: unknown;
    path?: unknown;
    ref?: unknown;
  };
  if (value.ref && typeof value.ref === "object") {
    const ref = value.ref as Record<string, unknown>;
    const relativePath =
      typeof ref.relativePath === "string" ? ref.relativePath.replaceAll("\\", "/") : null;
    if (
      typeof ref.workspaceId === "string" &&
      typeof ref.workspaceRoot === "string" &&
      relativePath !== null &&
      Schema.is(WorkspaceFileRefPath)(relativePath)
    ) {
      return {
        workspaceId: ref.workspaceId,
        workspaceRoot: ref.workspaceRoot,
        relativePath,
      };
    }
  }

  if (typeof value.path !== "string") return null;
  const root =
    typeof value.workspaceRoot === "string" ? value.workspaceRoot : fallbackWorkspaceRoot;
  if (!root || !isAbsolutePortablePath(value.path) || !isAbsolutePortablePath(root)) return null;

  const normalizedRoot = normalizePortablePath(root);
  const normalizedPath = normalizePortablePath(value.path);
  const rootPrefix = normalizedRoot.endsWith("/") ? normalizedRoot : `${normalizedRoot}/`;
  if (!normalizedPath.toLowerCase().startsWith(rootPrefix.toLowerCase())) return null;

  const relativePath = normalizedPath.slice(rootPrefix.length);
  if (!Schema.is(WorkspaceFileRefPath)(relativePath)) return null;
  const workspaceId = value.workspaceId ?? value.threadId;
  if (typeof workspaceId !== "string" || workspaceId.length === 0) return null;
  return { workspaceId, workspaceRoot: root.trim(), relativePath };
}

function isAbsolutePortablePath(value: string): boolean {
  return value.startsWith("/") || /^\\\\|^[A-Za-z]:[\\/]/.test(value);
}

function normalizePortablePath(value: string): string {
  const replaced = value.trim().replaceAll("\\", "/");
  const prefix = /^[A-Za-z]:/.test(replaced)
    ? replaced.slice(0, 2)
    : replaced.startsWith("/")
      ? "/"
      : "";
  const segments: string[] = [];
  for (const segment of replaced.slice(prefix.length).split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length > 0) segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `${prefix}${segments.join("/")}`.replace(/\/$/, "") || prefix || ".";
}

export const AssetCreateUrlInput = Schema.Struct({
  resource: AssetResource,
});
export type AssetCreateUrlInput = typeof AssetCreateUrlInput.Type;

export const AssetImageDimensions = Schema.Struct({
  width: NonNegativeInt.check(Schema.isGreaterThanOrEqualTo(1)),
  height: NonNegativeInt.check(Schema.isGreaterThanOrEqualTo(1)),
});
export type AssetImageDimensions = typeof AssetImageDimensions.Type;

export const AssetCreateUrlResult = Schema.Struct({
  relativeUrl: TrimmedNonEmptyString.check(Schema.isMaxLength(4096)),
  expiresAt: Schema.Number,
  sourcePath: Schema.optional(
    TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH)),
  ),
  /** Pixel size read from the image header, so a client can reserve the exact box before the bytes arrive. */
  imageDimensions: Schema.optional(AssetImageDimensions),
});
export type AssetCreateUrlResult = typeof AssetCreateUrlResult.Type;

export const ATTACHMENT_UPLOAD_URL_TTL_MS = 10 * 60_000;

export const AttachmentCreateUploadUrlInput = Schema.Struct({
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  mimeType: Schema.Literals(PROVIDER_SEND_TURN_SUPPORTED_IMAGE_MIME_TYPES),
  sizeBytes: NonNegativeInt.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(PROVIDER_SEND_TURN_MAX_IMAGE_BYTES),
  ),
});
export type AttachmentCreateUploadUrlInput = typeof AttachmentCreateUploadUrlInput.Type;

export const AttachmentCreateUploadUrlResult = Schema.Struct({
  attachmentId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  relativeUrl: TrimmedNonEmptyString.check(Schema.isMaxLength(4096)),
  expiresAt: Schema.Number,
});
export type AttachmentCreateUploadUrlResult = typeof AttachmentCreateUploadUrlResult.Type;

export const AttachmentDeleteInput = Schema.Struct({
  attachmentId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
});
export type AttachmentDeleteInput = typeof AttachmentDeleteInput.Type;

export class AttachmentUploadSigningKeyError extends Schema.TaggedError<AttachmentUploadSigningKeyError>()(
  "AttachmentUploadSigningKeyError",
  {
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to load the attachment upload signing key.";
  }
}

export class AssetWorkspaceContextNotFoundError extends Schema.TaggedError<AssetWorkspaceContextNotFoundError>()(
  "AssetWorkspaceContextNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Workspace context was not found.";
  }
}

export class AssetWorkspaceContextResolutionError extends Schema.TaggedError<AssetWorkspaceContextResolutionError>()(
  "AssetWorkspaceContextResolutionError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to resolve workspace context.";
  }
}

export class AssetWorkspaceRootNormalizationError extends Schema.TaggedError<AssetWorkspaceRootNormalizationError>()(
  "AssetWorkspaceRootNormalizationError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to normalize the workspace root.";
  }
}

export class AssetWorkspacePathValidationError extends Schema.TaggedError<AssetWorkspacePathValidationError>()(
  "AssetWorkspacePathValidationError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Workspace file path must be relative to the project root.";
  }
}

export class AssetPreviewTypeValidationError extends Schema.TaggedError<AssetPreviewTypeValidationError>()(
  "AssetPreviewTypeValidationError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return this.resource._tag === "media-file"
      ? "Only images, videos, HTML, and PDF files can be previewed."
      : "Only browser documents and images can be previewed.";
  }
}

export class AssetWorkspaceAssetInspectionError extends Schema.TaggedError<AssetWorkspaceAssetInspectionError>()(
  "AssetWorkspaceAssetInspectionError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return this.resource._tag === "media-file"
      ? "Failed to inspect the media file."
      : "Failed to inspect the workspace asset.";
  }
}

export class AssetWorkspaceAssetNotFoundError extends Schema.TaggedError<AssetWorkspaceAssetNotFoundError>()(
  "AssetWorkspaceAssetNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return this.resource._tag === "media-file"
      ? "Media file was not found."
      : "Workspace asset was not found.";
  }
}

export class AssetWorkspaceResolutionError extends Schema.TaggedError<AssetWorkspaceResolutionError>()(
  "AssetWorkspaceResolutionError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to resolve workspace.";
  }
}

export class AssetAttachmentNotFoundError extends Schema.TaggedError<AssetAttachmentNotFoundError>()(
  "AssetAttachmentNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Attachment was not found.";
  }
}

export class AssetProjectFaviconResolutionError extends Schema.TaggedError<AssetProjectFaviconResolutionError>()(
  "AssetProjectFaviconResolutionError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to resolve project favicon.";
  }
}

export class AssetProjectFaviconInspectionError extends Schema.TaggedError<AssetProjectFaviconInspectionError>()(
  "AssetProjectFaviconInspectionError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to inspect the project favicon.";
  }
}

export class AssetProjectFaviconNotFoundError extends Schema.TaggedError<AssetProjectFaviconNotFoundError>()(
  "AssetProjectFaviconNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Project favicon was not found.";
  }
}

export class AssetSigningKeyLoadError extends Schema.TaggedError<AssetSigningKeyLoadError>()(
  "AssetSigningKeyLoadError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to load the asset signing key.";
  }
}

export const AssetAccessError = Schema.Union([
  AssetWorkspaceContextNotFoundError,
  AssetWorkspaceContextResolutionError,
  AssetWorkspaceRootNormalizationError,
  AssetWorkspacePathValidationError,
  AssetPreviewTypeValidationError,
  AssetWorkspaceAssetInspectionError,
  AssetWorkspaceAssetNotFoundError,
  AssetWorkspaceResolutionError,
  AssetAttachmentNotFoundError,
  AssetProjectFaviconResolutionError,
  AssetProjectFaviconInspectionError,
  AssetProjectFaviconNotFoundError,
  AssetSigningKeyLoadError,
]);
export type AssetAccessError = typeof AssetAccessError.Type;
