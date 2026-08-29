import {
  PROVIDER_SEND_TURN_MAX_IMAGE_BYTES,
  isProviderSendTurnSupportedImageMimeType,
  type DesktopBridge,
} from "@rune/contracts";
import type { ModelMediaSupport } from "@rune/shared/model";

/**
 * Why a picked file did not go through the binary upload pipeline. The
 * composer turns these into user-facing copy; the codes stay machine-owned so
 * desktop/web can word them differently.
 */
export type PickedAttachmentFallback =
  | "binary-upload-unsupported"
  | "image-too-large"
  | "model-lacks-image-input"
  | "uploads-unavailable";

export type PickedAttachmentRoute =
  | { readonly kind: "upload-image" }
  | {
      readonly kind: "path-reference";
      readonly why: PickedAttachmentFallback;
    }
  | {
      readonly kind: "blocked";
      readonly why: PickedAttachmentFallback | "no-local-path";
    };

export interface PickedAttachmentInput {
  readonly mimeType: string;
  readonly sizeBytes: number;
  /** Absolute filesystem path, resolvable on the desktop shell only. */
  readonly absolutePath: string | null;
  /** The classifier only needs image support; the remaining fields are kept
   * optional so older callers can continue passing the pre-document shape. */
  readonly modelSupport: Pick<ModelMediaSupport, "image"> &
    Partial<Pick<ModelMediaSupport, "audio" | "video" | "pdf" | "folder">>;
  readonly supportsUploads: boolean;
}

/**
 * Route one picked file to how the composer will attach it: upload as image
 * content, share as a path reference for the agent to read from disk, or
 * block with a reason. Path references always win over a hard block when a
 * path is resolvable, so desktop never dead-ends on an unsupported file.
 */
export function classifyPickedAttachment(input: PickedAttachmentInput): PickedAttachmentRoute {
  const isImage = isProviderSendTurnSupportedImageMimeType(input.mimeType);
  const uploadableImage =
    isImage &&
    input.supportsUploads &&
    input.sizeBytes <= PROVIDER_SEND_TURN_MAX_IMAGE_BYTES &&
    input.modelSupport.image === true;
  if (uploadableImage) {
    return { kind: "upload-image" };
  }

  let why: PickedAttachmentFallback;
  if (!isImage) {
    why = input.supportsUploads ? "binary-upload-unsupported" : "uploads-unavailable";
  } else if (input.sizeBytes > PROVIDER_SEND_TURN_MAX_IMAGE_BYTES) {
    why = "image-too-large";
  } else if (input.modelSupport.image !== true) {
    why = "model-lacks-image-input";
  } else {
    why = "uploads-unavailable";
  }

  // Without a resolvable path nothing can be sent, but keep "too large"
  // specific — shrinking the image is an action the user can still take.
  // Every other web block is really "we cannot reach your local files".
  return input.absolutePath
    ? { kind: "path-reference", why }
    : { kind: "blocked", why: why === "image-too-large" ? "image-too-large" : "no-local-path" };
}

/**
 * A desktop folder pick surfaces as its contained files; recover the one
 * folder path from the first file's absolute path. Returns null when no path
 * carries a directory segment (web picks, bare filenames).
 */
export function deriveFolderPathFromPickedFiles(
  absolutePaths: ReadonlyArray<string>,
): string | null {
  const first = absolutePaths[0];
  if (!first) {
    return null;
  }
  const separator = Math.max(first.lastIndexOf("/"), first.lastIndexOf("\\"));
  if (separator <= 0) {
    return null;
  }
  return first.slice(0, separator);
}

/**
 * Absolute path for a picked file, resolved by the desktop shell
 * (webUtils.getPathForFile). Browsers cannot know local paths, so web picks
 * always resolve to null.
 */
export function resolvePickedFileAbsolutePath(file: File): string | null {
  // The preload bridge lands on the renderer's global scope, which is the
  // same object as `window`; read it through globalThis so non-DOM
  // environments (tests) behave identically.
  const bridge = (globalThis as { desktopBridge?: DesktopBridge }).desktopBridge;
  if (!bridge?.getPathForFile) {
    return null;
  }
  try {
    return bridge.getPathForFile(file);
  } catch {
    return null;
  }
}
