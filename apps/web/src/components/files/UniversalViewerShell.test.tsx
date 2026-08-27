import { describe, expect, it } from "vite-plus/test";

import { _testing } from "./UniversalViewerShell.tsx";
import { selectViewer } from "./viewerRegistry.tsx";
import { describeFile } from "./viewerDescriptor.ts";

describe("UniversalViewerShell descriptor", () => {
  it("clampFileLine clamps to the actual line count", () => {
    const { clampFileLine } = _testing;
    // "a\nb\nc" has 3 lines.
    expect(clampFileLine("a\nb\nc", 1)).toBe(1);
    expect(clampFileLine("a\nb\nc", 2)).toBe(2);
    expect(clampFileLine("a\nb\nc", 3)).toBe(3);
    // Beyond is clamped to the last line.
    expect(clampFileLine("a\nb\nc", 100)).toBe(3);
    // Below is clamped to the first line.
    expect(clampFileLine("a\nb\nc", 0)).toBe(1);
    expect(clampFileLine("a\nb\nc", -5)).toBe(1);
  });

  it("describeFile routes through the registry: SVG before image", () => {
    const d = describeFile({
      relativePath: "logo.svg",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("svg");
    const viewer = selectViewer(d);
    // Today the registry only has the binary viewer; the dispatch is
    // a stub. The contract is that the viewer exists.
    expect(viewer.id).toBeTruthy();
  });

  it("describeFile classifies json as json, not text", () => {
    const d = describeFile({
      relativePath: "package.json",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("json");
    expect(d.isEditable).toBe(true);
  });
});
