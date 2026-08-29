import { describe, expect, it } from "vite-plus/test";

import { commandIntentGuidance, selectCommandIntent } from "./CommandIntentPolicy.ts";

describe("CommandIntentPolicy", () => {
  it("routes artifact discovery to structured file search", () => {
    expect(selectCommandIntent({ request: "find the desktop app.exe artifact" })).toMatchObject({
      intent: "file-lookup",
      tool: "rune_operation.findFiles",
    });
  });

  it("routes known executables to argv-safe process execution", () => {
    expect(selectCommandIntent({ request: "run pnpm test for the focused file", platform: "win32" })).toMatchObject({
      intent: "known-executable",
      tool: "rune_operation.runProcess",
    });
  });

  it("keeps shell grammar as the explicit escape hatch", () => {
    expect(selectCommandIntent({ request: "pipe the output through sort and redirect it" })).toMatchObject({
      intent: "shell-grammar",
      tool: "shell",
    });
  });

  it("includes compact host facts without exposing credentials or paths", () => {
    const guidance = commandIntentGuidance("win32");
    expect(guidance).toContain("Host: Windows.");
    expect(guidance).toContain("Preferred shell dialect: powershell.");
    expect(guidance).not.toContain("API_KEY");
    expect(guidance).not.toContain("C:\\Users");
  });
});
