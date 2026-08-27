import { describe, expect, it } from "vite-plus/test";

import { buildWorkspaceFileRef } from "./filePreviewWorkspaceRef.ts";

describe("buildWorkspaceFileRef", () => {
  it("returns a ref when the environment is bound to a workspace", () => {
    const ref = buildWorkspaceFileRef({
      environmentId: "env_1",
      cwd: "D:\\workspace",
      projectWorkspaceRoot: "D:\\workspace",
      projectId: "proj_1",
      relativePath: "apps/web/src/assets/openrouter-color.png",
    });
    expect(ref?.relativePath).toBe("apps/web/src/assets/openrouter-color.png");
    expect(ref?.workspaceRoot).toBe("D:\\workspace");
  });

  it("rejects relative paths that contain backslashes", () => {
    expect(() =>
      buildWorkspaceFileRef({
        environmentId: "env_1",
        cwd: "D:\\workspace",
        projectWorkspaceRoot: "D:\\workspace",
        projectId: "proj_1",
        relativePath: "apps\\web\\src\\file.png",
      }),
    ).toThrow();
  });

  it("returns null when no workspace root is bound", () => {
    expect(
      buildWorkspaceFileRef({
        environmentId: "env_1",
        cwd: undefined,
        projectWorkspaceRoot: undefined,
        projectId: undefined,
        relativePath: "apps/web/src/assets/openrouter-color.png",
      }),
    ).toBeNull();
  });

  it("falls back to projectWorkspaceRoot when cwd is absent", () => {
    const ref = buildWorkspaceFileRef({
      environmentId: "env_1",
      cwd: undefined,
      projectWorkspaceRoot: "D:\\workspace",
      projectId: "proj_1",
      relativePath: "apps/web/README.md",
    });
    expect(ref?.workspaceRoot).toBe("D:\\workspace");
  });

  it("falls back to environmentId for workspaceId when projectId is absent", () => {
    const ref = buildWorkspaceFileRef({
      environmentId: "env_1",
      cwd: "D:\\workspace",
      projectWorkspaceRoot: "D:\\workspace",
      projectId: undefined,
      relativePath: "apps/web/README.md",
    });
    expect(ref?.workspaceId).toBe("env_1");
  });
});
