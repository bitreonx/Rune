export interface ExpandedImageItem {
  src: string;
  name: string;
  mimeType?: string;
  downloadUrl?: string;
  kind?: "image" | "video" | "audio" | "document";
}

export interface ExpandedImagePreview {
  images: ExpandedImageItem[];
  index: number;
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
