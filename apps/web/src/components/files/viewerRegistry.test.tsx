import { describe, expect, it } from "vite-plus/test";

import type { FileKind } from "./viewerDescriptor.ts";
import { ALL_KINDS, selectViewerId } from "./viewerRegistry.logic.ts";
import { describeFile } from "./viewerDescriptor.ts";

describe("viewerRegistry", () => {
  it("falls back to the binary viewer for any descriptor", () => {
    // The default registry only ships the binary viewer; the binary viewer
    // is the catch-all. Every FileKind routes to it for now — Plan 3
    // adds the real viewers. This test pins the contract: there is
    // always a viewer, even for empty registries.
    for (const kind of ALL_KINDS) {
      const viewerId = selectViewerId({
        kind,
        relativePath: "anything",
        isImage: kind === "image" || kind === "svg",
        isMarkdown: kind === "markdown",
        isBrowserPreview: kind === "browser-preview" || kind === "pdf",
        isEditable: false,
      });
      expect(viewerId).toBeTruthy();
    }
  });

  it("binary viewer matches both unknown and binary kinds", () => {
    const binary = selectViewerId({
      kind: "binary",
      relativePath: "thing.bin",
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    });
    const unknown = selectViewerId({
      kind: "unknown",
      relativePath: "thing.exe",
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    });
    expect(binary).toBe("binary-fallback");
    expect(unknown).toBe("binary-fallback");
  });

  it("registry ordering: more specific viewers are matched first", () => {
    // The registry is a ReadonlyArray — the contract is that the shell
    // scans top-to-bottom. The default has an SVG viewer and the
    // binary catch-all; SVG wins the dispatch for .svg files.
    const viewer = selectViewerId(
      describeFile({
        relativePath: "logo.svg",
        truncated: false,
        isPreviewSupportedInRuntime: true,
      }),
    );
    expect(viewer).toBe("svg");
  });

  it("routes kind: 'text' to the code viewer", () => {
    const viewer = selectViewerId(
      describeFile({
        relativePath: "foo.ts",
        truncated: false,
        isPreviewSupportedInRuntime: true,
      }),
    );
    expect(viewer).toBe("code");
  });

  it("falls back to binary viewer for kinds without a registered viewer", () => {
    const viewer = selectViewerId(
      describeFile({
        relativePath: "release/rune.exe",
        truncated: false,
        isPreviewSupportedInRuntime: true,
      }),
    );
    expect(viewer).toBe("binary-fallback");
  });

  it("routes media and structured preview kinds to their dedicated viewers", () => {
    const descriptor = (kind: FileKind) => ({
      kind,
      relativePath: `fixture.${kind}`,
      isImage: kind === "image" || kind === "svg",
      isMarkdown: kind === "markdown",
      isBrowserPreview: kind === "browser-preview" || kind === "pdf",
      isEditable: false,
    });
    expect(selectViewerId(descriptor("audio"))).toBe("media");
    expect(selectViewerId(descriptor("video"))).toBe("media");
    expect(selectViewerId(descriptor("pdf"))).toBe("pdf");
    expect(selectViewerId(descriptor("browser-preview"))).toBe("browser-preview");
    expect(selectViewerId(descriptor("truncated-text"))).toBe("truncated-text");
    expect(selectViewerId(descriptor("code"))).toBe("code");
  });
});
