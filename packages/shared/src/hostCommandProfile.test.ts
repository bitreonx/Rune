import { describe, expect, it } from "@effect/vitest";

import { getHostCommandProfile } from "./hostCommandProfile.ts";

describe("getHostCommandProfile", () => {
  it("uses PowerShell and Windows executable wrappers on Windows", () => {
    expect(getHostCommandProfile("win32")).toEqual({
      platform: "win32",
      preferredShellDialect: "powershell",
      shellExecutable: "pwsh.exe",
      packageManagerExecutable: { pnpm: "pnpm.cmd", npm: "npm.cmd", npx: "npx.cmd" },
      pathSeparator: "\\",
    });
  });

  it("uses POSIX commands and paths on macOS/Linux", () => {
    expect(getHostCommandProfile("darwin")).toMatchObject({
      platform: "darwin",
      preferredShellDialect: "bash",
      packageManagerExecutable: { pnpm: "pnpm", npm: "npm", npx: "npx" },
      pathSeparator: "/",
    });
    expect(getHostCommandProfile("linux").preferredShellDialect).toBe("bash");
  });

  it("does not allow unknown model-supplied platform values to invent a shell", () => {
    expect(getHostCommandProfile("freebsd" as NodeJS.Platform).preferredShellDialect).toBe("bash");
  });
});
