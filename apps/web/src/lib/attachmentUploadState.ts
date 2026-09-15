import type { EnvironmentId } from "@rune/contracts";

export type ReadyAttachmentUpload = {
  readonly status: "ready";
  readonly environmentId: EnvironmentId;
  readonly attachmentId: string;
};

export type AttachmentUploadState =
  | {
      readonly status: "uploading";
      readonly environmentId: EnvironmentId;
      readonly progress: number;
      readonly previous?: ReadyAttachmentUpload;
    }
  | ReadyAttachmentUpload
  | {
      readonly status: "failed";
      readonly environmentId: EnvironmentId;
      readonly reason: string;
      readonly attachmentId?: string;
      readonly previous?: ReadyAttachmentUpload;
    };

export function attachmentUploadBlockReason(input: {
  /**
   * Kept as an alias for the original image-only caller. New callers should
   * pass attachmentIds so the same gate protects generic file uploads.
   */
  readonly imageIds?: ReadonlyArray<string>;
  readonly attachmentIds?: ReadonlyArray<string>;
  readonly uploadsByImageId: Readonly<Record<string, AttachmentUploadState>>;
  readonly environmentId: EnvironmentId;
  readonly attachmentLabel?: string;
}): string | null {
  const attachmentIds = input.attachmentIds ?? input.imageIds ?? [];
  const label = input.attachmentLabel ?? (input.attachmentIds ? "attachment" : "image");
  let pending = 0;
  let failed = 0;

  for (const attachmentId of attachmentIds) {
    const upload = input.uploadsByImageId[attachmentId];
    if (upload?.status === "failed" && upload.environmentId === input.environmentId) {
      failed += 1;
    } else if (upload?.status !== "ready" || upload.environmentId !== input.environmentId) {
      pending += 1;
    }
  }

  if (failed > 0) {
    return failed === 1
      ? `Retry or remove the failed ${label}`
      : `Retry or remove the failed ${label}s`;
  }
  if (pending > 0) {
    const displayLabel = label[0]?.toUpperCase() + label.slice(1);
    return pending === 1 ? `${displayLabel} still uploading` : `${displayLabel}s still uploading`;
  }
  return null;
}

export function formatAttachmentUploadProgress(progress: number): string {
  const bounded = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return `${Math.floor(bounded * 100)}%`;
}
