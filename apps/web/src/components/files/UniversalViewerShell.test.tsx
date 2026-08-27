import { describe, expect, it } from "vite-plus/test";

import { clampFileLine } from "./fileClampLine.ts";
import { selectViewer } from "./viewerRegistry.tsx";
import { describeFile } from "./viewerDescriptor.ts";

describe("clampFileLine", () => {
  it("clamps to the actual line count", () => {
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
});

describe("UniversalViewerShell dispatch", () => {
  it("routes SVG before image via the registry", () => {
    const d = describeFile({
      relativePath: "logo.svg",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("svg");
    expect(selectViewer(d).id).toBe("svg");
  });

  it("classifies json as json, not text", () => {
    const d = describeFile({
      relativePath: "package.json",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("json");
    expect(d.isEditable).toBe(true);
  });
});
