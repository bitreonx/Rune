import { describe, expect, it } from "vite-plus/test";

import {
  ALL_KINDS,
  _testing,
  selectViewer,
  viewerRegistry,
} from "./viewerRegistry.tsx";
import { describeFile } from "./viewerDescriptor.ts";

describe("viewerRegistry", () => {
  it("falls back to the binary viewer for any descriptor", () => {
    // The default registry only ships the binary viewer; the binary viewer
    // is the catch-all. Every FileKind routes to it for now — Plan 3
    // adds the real viewers. This test pins the contract: there is
    // always a viewer, even for empty registries.
    for (const kind of ALL_KINDS) {
      const viewer = selectViewer({
        kind,
        relativePath: "anything",
        isImage: kind === "image" || kind === "svg",
        isMarkdown: kind === "markdown",
        isBrowserPreview: kind === "browser-preview" || kind === "pdf",
        isEditable: false,
      });
      expect(viewer.id).toBeTruthy();
    }
  });

  it("binary viewer matches both unknown and binary kinds", () => {
    const binary = selectViewer({
      kind: "binary",
      relativePath: "thing.bin",
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    });
    const unknown = selectViewer({
      kind: "unknown",
      relativePath: "thing.exe",
      isImage: false,
      isMarkdown: false,
      isBrowserPreview: false,
      isEditable: false,
    });
    expect(binary.id).toBe("binary-fallback");
    expect(unknown.id).toBe("binary-fallback");
  });

  it("registry ordering: more specific viewers are matched first", () => {
    // The registry is a ReadonlyArray — the contract is that the shell
    // scans top-to-bottom. The default has an SVG viewer and the
    // binary catch-all; SVG wins the dispatch for .svg files.
    const viewer = selectViewer(
      describeFile({
        relativePath: "logo.svg",
        truncated: false,
        isPreviewSupportedInRuntime: true,
      }),
    );
    expect(viewer.id).toBe("svg");
  });

  it("falls back to binary viewer for kinds without a registered viewer", () => {
    const viewer = selectViewer(
      describeFile({
        relativePath: "foo.ts",
        truncated: false,
        isPreviewSupportedInRuntime: true,
      }),
    );
    // No text viewer yet, so the binary catch-all wins.
    expect(viewer.id).toBe("binary-fallback");
  });

  it("exposes a loading viewer for the shell's loading path", () => {
    expect(_testing.loadingViewer.id).toBe("loading");
    expect(_testing.loadingViewer.match({} as never)).toBe(false);
  });
});
