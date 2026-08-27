import { describe, expect, it } from "vite-plus/test";

import { buildExpandedImagePreview } from "./ExpandedImagePreview";

describe("buildExpandedImagePreview", () => {
  it("preserves the selected item and identifies richer media kinds", () => {
    const preview = buildExpandedImagePreview(
      [
        { id: "one", name: "cover.png", mimeType: "image/png", previewUrl: "blob:image" },
        { id: "two", name: "walkthrough.mp4", mimeType: "video/mp4", previewUrl: "blob:video" },
        { id: "three", name: "notes.pdf", mimeType: "application/pdf", previewUrl: "blob:pdf" },
      ],
      "two",
    );

    expect(preview).toMatchObject({ index: 1 });
    expect(preview?.images.map((item) => item.kind)).toEqual(["image", "video", "document"]);
  });

  it("returns null when the selected item has no preview URL", () => {
    expect(buildExpandedImagePreview([{ id: "one", name: "missing.png" }], "one")).toBeNull();
  });
});
