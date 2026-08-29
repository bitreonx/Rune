import { describe, expect, it } from "vite-plus/test";

import {
  inlineEditNameError,
  inlineNameSelection,
  inlinePlaceholderPath,
  relativeEntryName,
  relativeEntryParentPath,
} from "./fileTreeInlineEdit";

describe("file tree inline edit", () => {
  it("selects the filename stem while preserving special names", () => {
    expect(inlineNameSelection({ name: "ProviderPage.tsx", isFolder: false })).toEqual({
      start: 0,
      end: 12,
    });
    expect(inlineNameSelection({ name: ".env", isFolder: false })).toEqual({ start: 0, end: 4 });
    expect(inlineNameSelection({ name: "Dockerfile", isFolder: false })).toEqual({
      start: 0,
      end: 10,
    });
    expect(inlineNameSelection({ name: "components", isFolder: true })).toEqual({
      start: 0,
      end: 10,
    });
  });

  it("rejects names that could escape or address more than one entry", () => {
    expect(inlineEditNameError("")).toBe("Name cannot be empty.");
    expect(inlineEditNameError("../secrets")).toContain("path separator");
    expect(inlineEditNameError("ok.txt")).toBeNull();
  });

  it("chooses a non-colliding temporary path under the selected parent", () => {
    expect(
      inlinePlaceholderPath({
        parentPath: "apps/web",
        name: "untitled",
        isFolder: false,
        existingPaths: new Set(["apps/web/untitled", "apps/web/untitled-1"]),
      }),
    ).toBe("apps/web/untitled-2");
    expect(relativeEntryParentPath("apps/web/ProviderPage.tsx")).toBe("apps/web");
    expect(relativeEntryName("apps/web/components/")).toBe("components");
  });
});
