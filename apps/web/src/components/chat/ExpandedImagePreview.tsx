import type { SnapShotSource } from "@rune/contracts";

import type { ComposerFileAttachment } from "../../composerDraftStore";
import { type ChatImageAttachment, isVideoAttachment } from "../../types";
import type {
  AssetCreateUrlResult,
  AssetResource,
  ChatFileAttachment,
  EnvironmentId,
  ScopedThreadRef,
} from "@rune/contracts";
import { videoMimeType } from "@rune/shared/video";
import { resolveMediaSource } from "@rune/client-runtime/media-source";
import { resolveAssetUrl } from "@rune/client-runtime/state/assets";
import {
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@rune/client-runtime/state/runtime";
import { resolveExternalWebLinkHost } from "./externalLinkContextMenu";
import type { MediaActionSource } from "../media/MediaActions";
import { resolveProtocolRelativeMediaUrl } from "../media/mediaContent";

export interface ExpandedImageItem {
  /** A loadable URL, or null when the dialog must mint one from `asset` first. */
  src: string | null;
  name: string;
  mimeType?: string;
  downloadUrl?: string;
  kind?: "image" | "video" | "audio" | "document";
}

export interface ExpandedImagePreview {
  images: ExpandedImageItem[];
  index: number;
}

export function buildAttachmentVideoAsset(
  environmentId: EnvironmentId,
  attachment: ChatFileAttachment,
): NonNullable<MediaActionSource["asset"]> {
  return {
    environmentId,
    resource: {
      _tag: "attachment" as const,
      attachmentId: attachment.id,
      fileName: attachment.name,
      mimeType: videoMimeType(attachment) ?? attachment.mimeType,
    },
  };
}

function previewKind(mimeType: string | undefined, name: string): ExpandedImageItem["kind"] {
  const normalizedMimeType = mimeType?.toLowerCase() ?? "";
  if (normalizedMimeType.startsWith("video/")) return "video";
  if (normalizedMimeType.startsWith("audio/")) return "audio";
  if (normalizedMimeType.startsWith("image/")) return "image";
  if (/\.(?:pdf|txt|md|json|csv|log|ts|tsx|js|jsx|css|html)$/i.test(name)) return "document";
  return "image";
}

export function buildExpandedImagePreview(
  images: ReadonlyArray<{
    id: string;
    name: string;
    previewUrl?: string;
    mimeType?: string;
  }>,
  selectedImageId: string,
): ExpandedImagePreview | null {
  const selected = images.find((image) => image.id === selectedImageId);
  if (selected?.type === "file" && selected.file && isVideoAttachment(selected)) {
    return {
      images: [{ src: URL.createObjectURL(selected.file), name: selected.name, type: "video" }],
      index: 0,
    };
  }
  const previewableImages = images.flatMap((image) =>
    image.previewUrl
      ? [
          {
            id: image.id,
            src: image.previewUrl,
            name: image.name,
            mimeType: image.mimeType,
            kind: previewKind(image.mimeType, image.name),
          },
        ]
      : [],
  );
  if (previewableImages.length === 0) {
    return null;
  }
  const selectedIndex = previewableImages.findIndex((image) => image.id === selectedImageId);
  if (selectedIndex < 0) {
    return null;
  }
  return {
    images: previewableImages.map((image) => ({
      src: image.src,
      name: image.name,
      ...(image.mimeType ? { mimeType: image.mimeType } : {}),
      ...(image.kind ? { kind: image.kind } : {}),
    })),
    index: selectedIndex,
  };
}
