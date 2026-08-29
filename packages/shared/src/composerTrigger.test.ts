import { describe, expect, it } from "vite-plus/test";

import {
  detectComposerTrigger,
  parseStandaloneComposerSlashCommand,
  serializeComposerFileLink,
  serializeComposerMentionPath,
} from "./composerTrigger.ts";

describe("detectComposerTrigger", () => {
  it("detects slash commands inside natural-language prompts", () => {
    const text = "make a new usage page and use /grillme";
    expect(detectComposerTrigger(text, text.length)).toEqual({
      kind: "slash-command",
      query: "grillme",
      rangeStart: 30,
      rangeEnd: text.length,
    });
    expect(detectComposerTrigger("make a new usage page and use\n/grillme", 38)).toEqual({
      kind: "slash-command",
      query: "grillme",
      rangeStart: 30,
      rangeEnd: 38,
    });
  });

  it("does not trigger inside URLs, paths, markdown links, or code spans", () => {
    expect(detectComposerTrigger("open https://example.com/a/b", 29)).toBeNull();
    expect(detectComposerTrigger("open docs/a/b", 13)).toBeNull();
    expect(detectComposerTrigger("open [the link](/grillme)", 26)).toBeNull();
    expect(detectComposerTrigger("run `/grillme`", 13)).toBeNull();
  });
});

describe("parseStandaloneComposerSlashCommand", () => {
  it("uses the canonical command registry for every user-facing command", () => {
    expect(parseStandaloneComposerSlashCommand("/build")).toBe("build");
    expect(parseStandaloneComposerSlashCommand("/review")).toBe("review");
    expect(parseStandaloneComposerSlashCommand("/grill-me")).toBeNull();
    expect(parseStandaloneComposerSlashCommand("/model")).toBeNull();
  });

  it("requires a standalone command instead of consuming provider prose", () => {
    expect(parseStandaloneComposerSlashCommand("/build now")).toBeNull();
    expect(parseStandaloneComposerSlashCommand("not a command")).toBeNull();
  });
});

describe("serializeComposerMentionPath", () => {
  it("keeps simple mention paths unquoted", () => {
    expect(serializeComposerMentionPath("src/index.ts")).toBe("src/index.ts");
  });

  it("quotes mention paths containing whitespace", () => {
    expect(serializeComposerMentionPath("docs/My File.md")).toBe('"docs/My File.md"');
  });

  it("escapes quoted mention path content", () => {
    expect(serializeComposerMentionPath('docs/My "File".md')).toBe('"docs/My \\"File\\".md"');
  });
});

describe("serializeComposerFileLink", () => {
  it("uses the basename as the markdown label", () => {
    expect(serializeComposerFileLink("path/to/package.json")).toBe(
      "[package.json](path/to/package.json)",
    );
  });

  it("encodes markdown-sensitive destination characters", () => {
    expect(serializeComposerFileLink("docs/My File (draft).md")).toBe(
      "[My File (draft).md](docs/My%20File%20%28draft%29.md)",
    );
  });

  it("supports windows paths", () => {
    expect(serializeComposerFileLink("C:\\repo\\src\\index.ts")).toBe(
      "[index.ts](C:%5Crepo%5Csrc%5Cindex.ts)",
    );
  });

  it("preserves paths that legitimately start with an at sign", () => {
    expect(serializeComposerFileLink("@scope/package.json")).toBe(
      "[package.json](@scope/package.json)",
    );
  });
});
