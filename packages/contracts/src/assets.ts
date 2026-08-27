import * as Schema from "effect/Schema";

import { NonNegativeInt, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import {
  PROVIDER_SEND_TURN_MAX_IMAGE_BYTES,
  PROVIDER_SEND_TURN_SUPPORTED_IMAGE_MIME_TYPES,
  ProjectFaviconPath,
} from "./orchestration.ts";
import {
  workspaceFileRefFrom,
  WorkspaceFileRef,
} from "./workspaceFileRef.ts";

const ASSET_PATH_MAX_LENGTH = 1024;

const isAbsolutePath = (value: string): boolean =>
  /^\//.test(value) || /^[A-Za-z]:[\\/]/.test(value);

// Compute the relative path between two absolute paths, returning the result in
// POSIX form regardless of platform. Returns null if either side is not
// absolute or if the result would escape the root.
const relativePosix = (root: string, absolute: string): string | null => {
  if (!isAbsolutePath(root) || !isAbsolutePath(absolute)) return null;
  const normRoot = root.replaceAll("\\", "/");
  const normPath = absolute.replaceAll("\\", "/");
  const rootSegments = normRoot.replace(/\/+$/, "").split("/");
  const pathSegments = normPath.split("/");
  let common = 0;
  while (
    common < rootSegments.length &&
    common < pathSegments.length &&
    rootSegments[common] === pathSegments[common]
  ) {
    common += 1;
  }
  const up = rootSegments.length - common;
  const down = pathSegments.slice(common);
  if (down.length === 0) return null;
  const rel = [...Array(up).fill(".."), ...down].join("/");
  if (rel.startsWith("/") || rel.split("/").includes("..") && up === 0) {
    return null;
  }
  // Reject results that would escape upward (e.g. ../foo or ../../foo).
  if (rel.split("/").filter((s) => s === "..").length > up) {
    return null;
  }
  return rel;
};

export const AssetResource = Schema.Union([
  Schema.TaggedStruct("workspace-file", {
    threadId: ThreadId,
    // Canonical identity for the file. When present, the server uses
    // ref.relativePath directly and ref.workspaceRoot as the canonical root —
    // never `path.relative` math. New clients should always send `ref`.
    ref: Schema.optional(WorkspaceFileRef),
    // Legacy field kept for one release. When `ref` is absent, the server
    // resolves this against the workspace root supplied by the WS handler.
    path: TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH)),
  }),
  Schema.TaggedStruct("attachment", {
    attachmentId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  }),
  Schema.TaggedStruct("project-favicon", {
    cwd: TrimmedNonEmptyString.check(Schema.isMaxLength(ASSET_PATH_MAX_LENGTH)),
    // A cache-key hint only. The server reads the authoritative path from the
    // project projection before it issues the signed URL.
    path: Schema.optional(ProjectFaviconPath),
  }),
]);
export type AssetResource = typeof AssetResource.Type;

type WorkspaceFileResource = Extract<AssetResource, { _tag: "workspace-file" }>;

/**
 * Returns the canonical WorkspaceFileRef for a workspace-file resource, or
 * null if the resource is not a workspace-file. When `ref` is present, that is
 * the source of truth. Otherwise, when the legacy `path` is absolute and a
 * fallback workspace root is supplied, a ref is synthesised by relativising
 * `path` against the root (POSIX semantics, normalising platform separators).
 * Returns null when the resource has no `ref` and no usable absolute `path`.
 */
export const extractWorkspaceFileRef = (
  resource: AssetResource,
  fallbackWorkspaceRoot?: string,
): WorkspaceFileRef | null => {
  if (resource._tag !== "workspace-file") return null;
  if (resource.ref) return resource.ref;
  if (!fallbackWorkspaceRoot) return null;
  const relative = relativePosix(fallbackWorkspaceRoot, resource.path);
  if (relative === null) return null;
  // The ref must pass WorkspaceFileRefPath validation (no traversal, no
  // leading slash, etc.). Migration fails closed if the resulting path is bad.
  try {
    Schema.decodeUnknownSync(WorkspaceFileRef)({
      workspaceId: "legacy",
      workspaceRoot: fallbackWorkspaceRoot,
      relativePath: relative,
    });
  } catch {
    return null;
  }
  return workspaceFileRefFrom({
    workspaceId: "legacy",
    workspaceRoot: fallbackWorkspaceRoot,
    relativePath: relative,
  });
};

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

export class AttachmentUploadSigningKeyError extends Schema.TaggedErrorClass<AttachmentUploadSigningKeyError>()(
  "AttachmentUploadSigningKeyError",
  {
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to load the attachment upload signing key.";
  }
}

export class AssetWorkspaceContextNotFoundError extends Schema.TaggedErrorClass<AssetWorkspaceContextNotFoundError>()(
  "AssetWorkspaceContextNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Workspace context was not found.";
  }
}

export class AssetWorkspaceContextResolutionError extends Schema.TaggedErrorClass<AssetWorkspaceContextResolutionError>()(
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

export class AssetWorkspaceRootNormalizationError extends Schema.TaggedErrorClass<AssetWorkspaceRootNormalizationError>()(
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

export class AssetWorkspacePathValidationError extends Schema.TaggedErrorClass<AssetWorkspacePathValidationError>()(
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

export class AssetPreviewTypeValidationError extends Schema.TaggedErrorClass<AssetPreviewTypeValidationError>()(
  "AssetPreviewTypeValidationError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Only browser documents and images can be previewed.";
  }
}

export class AssetWorkspaceAssetInspectionError extends Schema.TaggedErrorClass<AssetWorkspaceAssetInspectionError>()(
  "AssetWorkspaceAssetInspectionError",
  {
    resource: AssetResource,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to inspect the workspace asset.";
  }
}

export class AssetWorkspaceAssetNotFoundError extends Schema.TaggedErrorClass<AssetWorkspaceAssetNotFoundError>()(
  "AssetWorkspaceAssetNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Workspace asset was not found.";
  }
}

export class AssetWorkspaceResolutionError extends Schema.TaggedErrorClass<AssetWorkspaceResolutionError>()(
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

export class AssetAttachmentNotFoundError extends Schema.TaggedErrorClass<AssetAttachmentNotFoundError>()(
  "AssetAttachmentNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Attachment was not found.";
  }
}

export class AssetProjectFaviconResolutionError extends Schema.TaggedErrorClass<AssetProjectFaviconResolutionError>()(
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

export class AssetProjectFaviconInspectionError extends Schema.TaggedErrorClass<AssetProjectFaviconInspectionError>()(
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

export class AssetProjectFaviconNotFoundError extends Schema.TaggedErrorClass<AssetProjectFaviconNotFoundError>()(
  "AssetProjectFaviconNotFoundError",
  {
    resource: AssetResource,
  },
) {
  override get message(): string {
    return "Project favicon was not found.";
  }
}

export class AssetSigningKeyLoadError extends Schema.TaggedErrorClass<AssetSigningKeyLoadError>()(
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
