import { describe, expect, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import { RuneCommandOperation, RuneShellCommand } from "./command.ts";

describe("RuneCommandOperation", () => {
  it("accepts structured repository operations without shell text", () => {
    const decode = Schema.decodeUnknownSync(RuneCommandOperation);

    expect(
      decode({
        kind: "runProcess",
        executable: "rg",
        args: ["--files", "packages"],
        cwd: "C:/repo",
      }),
    ).toEqual({
      kind: "runProcess",
      executable: "rg",
      args: ["--files", "packages"],
      cwd: "C:/repo",
    });
  });

  it("rejects shell syntax in an operation discriminant", () => {
    const decode = Schema.decodeUnknownSync(RuneCommandOperation);

    expect(() =>
      decode({
        kind: "runProcess",
        executable: "rg | powershell",
        args: [],
        cwd: "C:/repo",
      }),
    ).toThrow();
  });
});

describe("RuneShellCommand", () => {
  it("keeps arbitrary shell execution explicit and dialect-labelled", () => {
    const decode = Schema.decodeUnknownSync(RuneShellCommand);

    expect(decode({ dialect: "powershell", command: "Get-ChildItem", cwd: "C:/repo" })).toEqual({
      dialect: "powershell",
      command: "Get-ChildItem",
      cwd: "C:/repo",
    });
  });
});
