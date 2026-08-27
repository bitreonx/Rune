import { describe, expect, it } from "vite-plus/test";

import { extractWorkspaceFileRef } from "./assets.ts";
import { WorkspaceFileRef } from "./workspaceFileRef.ts";

const legacyResource = (input: { path: string; workspaceRoot?: string }) =>
  ({
    _tag: "workspace-file" as const,
    threadId: "thread_1" as any,
    ...input,
  });

const newResource = (ref: WorkspaceFileRef) =>
  ({
    _tag: "workspace-file" as const,
    threadId: "thread_1" as any,
    ref,
  });

describe("extractWorkspaceFileRef", () => {
  it("returns the ref directly when present on a new-shape resource", () => {
    const ref = {
      workspaceId: "ws_1",
      workspaceRoot: "D:\\workspace",
      relativePath: "apps/web/src/assets/openrouter-color.png",
    };
    const got = extractWorkspaceFileRef(newResource(ref), undefined);
    expect(got).toEqual(ref);
  });

  it("migrates a legacy absolute path under the given root to a ref", () => {
    const got = extractWorkspaceFileRef(
      legacyResource({
        path: "D:\\workspace\\apps\\web\\src\\assets\\openrouter-color.png",
        workspaceRoot: "D:\\workspace",
      }),
      "D:\\workspace",
    );
    expect(got?.workspaceRoot).toBe("D:\\workspace");
    expect(got?.relativePath).toBe("apps/web/src/assets/openrouter-color.png");
  });

  it("returns null when the legacy path escapes the root", () => {
    const got = extractWorkspaceFileRef(
      legacyResource({ path: "D:\\other\\file.png", workspaceRoot: "D:\\workspace" }),
      "D:\\workspace",
    );
    expect(got).toBeNull();
  });

  it("returns null when the legacy path traverses out via ..", () => {
    const got = extractWorkspaceFileRef(
      legacyResource({
        path: "D:\\workspace\\..\\..\\etc\\passwd",
        workspaceRoot: "D:\\workspace",
      }),
      "D:\\workspace",
    );
    expect(got).toBeNull();
  });

  it("returns null when no fallback root is supplied for a legacy resource", () => {
    const got = extractWorkspaceFileRef(
      legacyResource({ path: "D:\\workspace\\file.png" }),
      undefined,
    );
    expect(got).toBeNull();
  });

  it("returns null for non-workspace-file resources", () => {
    const got = extractWorkspaceFileRef(
      { _tag: "attachment", attachmentId: "att_1" } as any,
      "D:\\workspace",
    );
    expect(got).toBeNull();
  });
});
