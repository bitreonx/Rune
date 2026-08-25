import { describe, expect, it } from "vite-plus/test";

import { compileSystemPrompt, defaultIdentity, hashPrompt } from "./ApiPrompt.ts";

describe("ApiPrompt", () => {
  it("orders sections stable-prefix-first and omits missing optionals", () => {
    const full = compileSystemPrompt({
      identity: "I",
      toolGuidance: "T",
      workspaceInstructions: "W",
    });
    expect(full).toBe("I\n\nT\n\nW");
    expect(compileSystemPrompt({ identity: "I", toolGuidance: "T" })).toBe("I\n\nT");
  });

  it("hashes deterministically", () => {
    expect(hashPrompt("abc")).toBe(hashPrompt("abc"));
    expect(hashPrompt("abc")).not.toBe(hashPrompt("abd"));
    expect(hashPrompt(defaultIdentity)).toMatch(/^[0-9a-f]{16}$/);
  });
});
