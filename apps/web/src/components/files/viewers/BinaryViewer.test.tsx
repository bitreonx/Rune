import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { BinaryViewer } from "./BinaryViewer";

describe("BinaryViewer", () => {
  it("shows deterministic metadata and safe reveal actions", () => {
    const html = renderToStaticMarkup(
      <BinaryViewer
        contents=""
        relativePath="release/RUNE-Next.exe"
        byteLength={2048}
        mimeType="application/vnd.microsoft.portable-executable"
        modifiedAt="2026-08-29T10:52:18.000Z"
        sha256="abc123"
        onRevealInFiles={() => {}}
        onRevealInExplorer={() => {}}
        onCopyPath={() => {}}
      />,
    );

    expect(html).toContain("RUNE-Next.exe");
    expect(html).toContain("2.0 KB");
    expect(html).toContain("application/vnd.microsoft.portable-executable");
    expect(html).toContain("Modified");
    expect(html).toContain("SHA-256");
    expect(html).toContain("abc123");
    expect(html).toContain("Reveal in RUNE Files");
    expect(html).toContain("Reveal in system Explorer");
    expect(html).toContain("Copy path");
    expect(html).not.toContain("size is unavailable");
  });
});
