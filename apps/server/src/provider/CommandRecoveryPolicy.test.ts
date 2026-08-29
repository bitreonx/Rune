import { describe, expect, it } from "@effect/vitest";

import { ProcessFailureClass } from "../processRunner.ts";
import { decideCommandRecovery } from "./CommandRecoveryPolicy.ts";

describe("CommandRecoveryPolicy", () => {
  it("falls back from PowerShell 7 to Windows PowerShell", () => {
    const decision = decideCommandRecovery({
      platform: "win32",
      command: "pwsh.exe",
      args: ["-NoProfile", "-Command", "Get-ChildItem"],
      failure: ProcessFailureClass.shellNotFound,
    });
    expect(decision).toEqual({
      tag: "retry",
      command: "powershell.exe",
      args: ["-NoProfile", "-Command", "Get-ChildItem"],
      reason: "PowerShell 7 is unavailable; retrying with Windows PowerShell.",
    });
  });

  it("repairs package-manager command shims without adding shell parsing", () => {
    const decision = decideCommandRecovery({
      platform: "win32",
      command: "pnpm",
      args: ["test", "run"],
      failure: ProcessFailureClass.executableNotFound,
    });
    expect(decision).toMatchObject({ tag: "retry", command: "pnpm.cmd", args: ["test", "run"] });
  });

  it("stops an identical failing strategy after two failures", () => {
    const input = {
      platform: "win32" as const,
      command: "node",
      args: ["build.mjs"],
      cwd: "C:/repo",
      failure: ProcessFailureClass.nonzeroExit,
    };
    const failures = new Map([[JSON.stringify(["node", ["build.mjs"], "C:/repo", "nonzero-exit"]), 2]]);
    expect(decideCommandRecovery({ ...input, previousFailures: failures })).toEqual({
      tag: "stop",
      reason: "The same command strategy failed twice; change strategy instead of retrying it.",
    });
  });

  it("does not rewrite arbitrary shell programs", () => {
    expect(
      decideCommandRecovery({
        platform: "win32",
        command: "powershell.exe",
        args: ["-Command", "Get-ChildItem | Where-Object Name -like '*app.exe*'"],
        failure: ProcessFailureClass.shellParseError,
      }).tag,
    ).toBe("stop");
  });
});
