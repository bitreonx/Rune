import { describe, expect, it } from "vite-plus/test";

import { viewerKindLabel, viewerMetadataLabel } from "./viewerShell.logic.ts";

describe("viewer shell metadata", () => {
  it("uses the canonical kind label and human-readable size", () => {
    expect(viewerMetadataLabel({ kind: "svg", mime: "image/svg+xml", byteLength: 2048 })).toBe(
      "SVG · image/svg+xml · 2.0 KB",
    );
  });

  it("keeps metadata compact when the mime label is absent", () => {
    expect(viewerMetadataLabel({ kind: "pdf" })).toBe("PDF");
  });

  it("keeps every supported kind discoverable", () => {
    expect(viewerKindLabel("audio")).toBe("Audio");
    expect(viewerKindLabel("video")).toBe("Video");
    expect(viewerKindLabel("browser-preview")).toBe("Browser preview");
    expect(viewerKindLabel("truncated-text")).toBe("Text preview");
  });
});
