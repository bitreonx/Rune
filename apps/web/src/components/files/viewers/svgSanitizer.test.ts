import { describe, expect, it } from "vite-plus/test";

import { sanitizeSvg } from "./svgSanitizer.ts";

describe("sanitizeSvg", () => {
  it("strips <script> tags", () => {
    const result = sanitizeSvg("<svg><script>alert(1)</script></svg>");
    expect(result.sanitized).toBe("<svg></svg>");
    expect(result.droppedScripts).toBe(1);
  });

  it("strips self-closing <script> tags", () => {
    const result = sanitizeSvg('<svg><script src="evil.js" /></svg>');
    expect(result.droppedScripts).toBe(1);
    expect(result.sanitized).toBe("<svg></svg>");
  });

  it("counts paired and self-closing scripts together", () => {
    const result = sanitizeSvg(
      '<svg><script>alert(1)</script><script src="x.js" /></svg>',
    );
    expect(result.droppedScripts).toBe(2);
  });

  it("strips on* event handler attributes", () => {
    const result = sanitizeSvg('<svg><a href="x" onclick="alert(1)">link</a></svg>');
    expect(result.sanitized).not.toContain("onclick");
    expect(result.droppedEventHandlers).toBe(1);
  });

  it("strips javascript: URLs from href/src/xlink:href", () => {
    const result = sanitizeSvg("<svg><a href=\"javascript:alert(1)\">x</a></svg>");
    expect(result.sanitized).not.toContain("javascript:");
    expect(result.droppedJavascriptUrls).toBe(1);
  });

  it("preserves safe data: image URLs", () => {
    const result = sanitizeSvg(
      '<svg><image href="data:image/png;base64,AAAA" /></svg>',
    );
    expect(result.sanitized).toContain("data:image/png");
    expect(result.droppedDataUrls).toBe(0);
  });

  it("strips non-image data: URLs", () => {
    const result = sanitizeSvg(
      '<svg><a href="data:text/html,<script>alert(1)</script>">x</a></svg>',
    );
    expect(result.sanitized).not.toContain("data:text/html");
    expect(result.droppedDataUrls).toBe(1);
  });

  it("strips <foreignObject> entirely", () => {
    const result = sanitizeSvg(
      "<svg><foreignObject><div onclick='alert(1)'>x</div></foreignObject></svg>",
    );
    expect(result.sanitized).not.toContain("foreignObject");
    expect(result.droppedForeignObjects).toBe(1);
  });

  it("is a no-op on already-clean SVG", () => {
    const input = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>';
    const result = sanitizeSvg(input);
    expect(result.sanitized).toBe(input);
    expect(result.droppedScripts).toBe(0);
    expect(result.droppedEventHandlers).toBe(0);
    expect(result.droppedJavascriptUrls).toBe(0);
  });
});
