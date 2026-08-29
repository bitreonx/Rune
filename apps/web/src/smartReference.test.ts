import { describe, expect, it } from "vite-plus/test";

import { classifySmartReference } from "./smartReference";

const cwd = "D:/Apps/Rune";

describe("classifySmartReference", () => {
  it("classifies workspace files and preserves line metadata", () => {
    const reference = classifySmartReference({
      href: "apps/web/src/components/ChatComposer.tsx:420",
      cwd,
    });

    expect(reference).toMatchObject({
      kind: "workspace-file",
      unsafeToAutoExecute: false,
      file: {
        workspaceRelativePath: "apps/web/src/components/ChatComposer.tsx",
        line: 420,
      },
    });
  });

  it("treats executable artifacts as reveal-only workspace files", () => {
    const reference = classifySmartReference({ href: "release/RUNE-Setup-0.5.1.exe", cwd });

    expect(reference).toMatchObject({
      kind: "workspace-file",
      unsafeToAutoExecute: true,
      file: { workspaceRelativePath: "release/RUNE-Setup-0.5.1.exe" },
    });
  });

  it("classifies GitHub pull requests, issues, and commits separately", () => {
    expect(
      classifySmartReference({ href: "https://github.com/bitreonx/Rune/pull/142" }),
    ).toMatchObject({ kind: "change-request", provider: "github", number: 142 });
    expect(
      classifySmartReference({ href: "https://github.com/bitreonx/Rune/issues/51" }),
    ).toMatchObject({ kind: "issue", provider: "github", number: 51 });
    expect(
      classifySmartReference({ href: "https://github.com/bitreonx/Rune/commit/abcdef1234567" }),
    ).toMatchObject({ kind: "commit", provider: "github", sha: "abcdef1234567" });
  });

  it("classifies GitLab merge requests and leaves ordinary URLs external", () => {
    expect(
      classifySmartReference({ href: "https://gitlab.com/group/subgroup/rune/-/merge_requests/9" }),
    ).toMatchObject({ kind: "change-request", provider: "gitlab", number: 9 });
    expect(classifySmartReference({ href: "https://example.com" })).toMatchObject({
      kind: "external-url",
      url: "https://example.com/",
    });
  });

  it("does not turn ambiguous identifiers into file references", () => {
    expect(classifySmartReference({ text: "node.meta", cwd })).toBeNull();
    expect(classifySmartReference({ text: "origin/main", cwd })).toBeNull();
    expect(classifySmartReference({ text: "release/RUNE-Setup-0.5.1.exe", cwd })).toMatchObject({
      kind: "workspace-file",
    });
  });
});
