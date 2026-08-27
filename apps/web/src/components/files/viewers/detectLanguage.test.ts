import { describe, expect, it } from "vite-plus/test";

import { detectLanguage } from "./detectLanguage.ts";

describe("detectLanguage", () => {
  it("maps TypeScript extensions", () => {
    expect(detectLanguage("foo.ts")).toBe("typescript");
    expect(detectLanguage("foo.tsx")).toBe("tsx");
  });

  it("maps JavaScript and JSON", () => {
    expect(detectLanguage("foo.js")).toBe("javascript");
    expect(detectLanguage("foo.mjs")).toBe("javascript");
    expect(detectLanguage("foo.cjs")).toBe("javascript");
    expect(detectLanguage("package.json")).toBe("json");
  });

  it("maps file names without extensions", () => {
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
    expect(detectLanguage("Makefile")).toBe("makefile");
  });

  it("matches extensions case-insensitively", () => {
    expect(detectLanguage("FOO.TS")).toBe("typescript");
  });

  it("falls back to plaintext for unknown extensions", () => {
    expect(detectLanguage("README")).toBe("plaintext");
    expect(detectLanguage("foo.unknownext")).toBe("plaintext");
  });

  it("handles dotfiles like .env", () => {
    expect(detectLanguage(".env")).toBe("ini");
  });
});
