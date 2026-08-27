import { describe, expect, it } from "vite-plus/test";

import { describeFile } from "./viewerDescriptor.ts";

describe("describeFile", () => {
  it("classifies images", () => {
    const d = describeFile({
      relativePath: "apps/web/src/assets/openrouter-color.png",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("image");
    expect(d.isImage).toBe(true);
    expect(d.isEditable).toBe(false);
  });

  it("classifies markdown", () => {
    const d = describeFile({
      relativePath: "README.md",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("markdown");
    expect(d.isMarkdown).toBe(true);
    expect(d.isEditable).toBe(true);
  });

  it("classifies mdx as markdown", () => {
    const d = describeFile({
      relativePath: "docs/foo.mdx",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("markdown");
  });

  it("classifies html as browser-preview when the runtime supports it", () => {
    const d = describeFile({
      relativePath: "public/index.html",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("browser-preview");
    expect(d.isBrowserPreview).toBe(true);
  });

  it("classifies html as text when the runtime does not support in-panel previews", () => {
    const d = describeFile({
      relativePath: "public/index.html",
      truncated: false,
      isPreviewSupportedInRuntime: false,
    });
    expect(d.kind).toBe("text");
  });

  it("classifies pdf as pdf when the runtime supports it", () => {
    const d = describeFile({
      relativePath: "docs/spec.pdf",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("pdf");
  });

  it("classifies svg as svg", () => {
    const d = describeFile({
      relativePath: "apps/web/src/logo.svg",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("svg");
    expect(d.isImage).toBe(true);
  });

  it("classifies json as json (not text)", () => {
    const d = describeFile({
      relativePath: "package.json",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("json");
  });

  it("classifies TypeScript as text", () => {
    const d = describeFile({
      relativePath: "apps/web/src/index.ts",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("text");
    expect(d.isEditable).toBe(true);
  });

  it("classifies files without an extension as text (Dockerfile)", () => {
    const d = describeFile({
      relativePath: "Dockerfile",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("text");
  });

  it("classifies dotfiles like .gitignore as text", () => {
    const d = describeFile({
      relativePath: ".gitignore",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("text");
  });

  it("classifies unknown binary as unknown", () => {
    const d = describeFile({
      relativePath: "release/rune.exe",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("unknown");
    expect(d.isEditable).toBe(false);
  });

  it("truncated files always become truncated-text", () => {
    const d = describeFile({
      relativePath: "apps/web/src/assets/big.png",
      truncated: true,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("truncated-text");
    expect(d.isEditable).toBe(false);
  });

  it("matches extensions case-insensitively", () => {
    const d = describeFile({
      relativePath: "apps/web/src/INDEX.MD",
      truncated: false,
      isPreviewSupportedInRuntime: true,
    });
    expect(d.kind).toBe("markdown");
  });
});
