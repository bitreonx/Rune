import { describe, expect, it } from "vite-plus/test";

import { formatWorkspaceRelativePath, resolveWorkspaceRelativePath } from "./filePathDisplay";

describe("formatWorkspaceRelativePath", () => {
  it("formats absolute workspace paths from the workspace root", () => {
    expect(
      formatWorkspaceRelativePath(
        "C:/Users/mike/dev-stuff/rune/apps/web/src/session-logic.ts:501",
        "C:/Users/mike/dev-stuff/rune",
      ),
    ).toBe("rune/apps/web/src/session-logic.ts:501");
  });

  it("prefixes relative paths with the workspace root label", () => {
    expect(
      formatWorkspaceRelativePath(
        "apps/web/src/session-logic.ts:501",
        "C:/Users/mike/dev-stuff/rune",
      ),
    ).toBe("rune/apps/web/src/session-logic.ts:501");
  });

  it("keeps paths already rooted at the workspace label stable", () => {
    expect(
      formatWorkspaceRelativePath(
        "rune/apps/web/src/session-logic.ts:501",
        "C:/Users/mike/dev-stuff/rune",
      ),
    ).toBe("rune/apps/web/src/session-logic.ts:501");
  });

  it("preserves columns when present", () => {
    expect(
      formatWorkspaceRelativePath(
        "/C:/Users/mike/dev-stuff/rune/apps/web/src/session-logic.ts:501:9",
        "C:/Users/mike/dev-stuff/rune",
      ),
    ).toBe("rune/apps/web/src/session-logic.ts:501:9");
  });
});

describe("resolveWorkspaceRelativePath", () => {
  it("turns an absolute workspace path into the path the file explorer expects", () => {
    expect(
      resolveWorkspaceRelativePath(
        "C:/Users/mike/dev-stuff/rune/apps/web/src/session-logic.ts",
        "C:/Users/mike/dev-stuff/rune",
      ),
    ).toBe("apps/web/src/session-logic.ts");
  });

  it("keeps an existing workspace-relative path unchanged", () => {
    expect(
      resolveWorkspaceRelativePath(
        "apps/web/src/session-logic.ts",
        "C:/Users/mike/dev-stuff/rune",
      ),
    ).toBe("apps/web/src/session-logic.ts");
  });
});
