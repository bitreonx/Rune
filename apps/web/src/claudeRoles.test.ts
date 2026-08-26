import type { ProviderInstanceEnvironmentVariable } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildClaudeRoleEnvironment,
  CLAUDE_ROLE_ENVIRONMENT_VARIABLE_NAMES,
  readClaudeRoleModels,
} from "./claudeRoles";

function variable(
  name: string,
  value: string,
  overrides?: Partial<ProviderInstanceEnvironmentVariable>,
): ProviderInstanceEnvironmentVariable {
  return { name, value, sensitive: false, ...(overrides ?? {}) };
}

describe("readClaudeRoleModels", () => {
  it("reads pinned roles from their environment variables", () => {
    const roles = readClaudeRoleModels([
      variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "anthropic/opus-4"),
      variable("ANTHROPIC_DEFAULT_SONNET_MODEL", "openrouter/z-ai/glm-4.6"),
      variable("ANTHROPIC_DEFAULT_HAIKU_MODEL", "anthropic/haiku-4"),
      variable("ANTHROPIC_SMALL_FAST_MODEL", "anthropic/haiku-4"),
    ]);
    expect(roles).toEqual({
      opus: "anthropic/opus-4",
      sonnet: "openrouter/z-ai/glm-4.6",
      haiku: "anthropic/haiku-4",
    });
  });

  it("treats empty values as unset", () => {
    const roles = readClaudeRoleModels([
      variable("ANTHROPIC_DEFAULT_OPUS_MODEL", ""),
      variable("ANTHROPIC_DEFAULT_SONNET_MODEL", "anthropic/sonnet-4"),
    ]);
    expect(roles).toEqual({ sonnet: "anthropic/sonnet-4" });
  });
});

describe("buildClaudeRoleEnvironment", () => {
  it("round-trips variables it does not manage", () => {
    const next = buildClaudeRoleEnvironment(
      [variable("ANTHROPIC_BASE_URL", "https://openrouter.ai/api"), variable("FOO", "bar")],
      { opus: "anthropic/opus-4" },
    );
    expect(next).toContainEqual(variable("ANTHROPIC_BASE_URL", "https://openrouter.ai/api"));
    expect(next).toContainEqual(variable("FOO", "bar"));
    expect(next).toContainEqual(variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "anthropic/opus-4"));
  });

  it("overwrites an existing pin and clears one via empty string", () => {
    const next = buildClaudeRoleEnvironment(
      [
        variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "old/opus"),
        variable("ANTHROPIC_DEFAULT_SONNET_MODEL", "old/sonnet"),
      ],
      { opus: "new/opus", sonnet: "" },
    );
    expect(next).toContainEqual(variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "new/opus"));
    expect(next.find((entry) => entry.name === "ANTHROPIC_DEFAULT_SONNET_MODEL")).toBeUndefined();
  });

  it("mirrors the haiku pin onto ANTHROPIC_SMALL_FAST_MODEL, clearing both together", () => {
    const pinned = buildClaudeRoleEnvironment([], { haiku: "anthropic/haiku-4" });
    expect(pinned).toContainEqual(variable("ANTHROPIC_DEFAULT_HAIKU_MODEL", "anthropic/haiku-4"));
    expect(pinned).toContainEqual(variable("ANTHROPIC_SMALL_FAST_MODEL", "anthropic/haiku-4"));

    const cleared = buildClaudeRoleEnvironment(pinned, { haiku: "" });
    expect(cleared.find((entry) => entry.name === "ANTHROPIC_DEFAULT_HAIKU_MODEL")).toBeUndefined();
    expect(cleared.find((entry) => entry.name === "ANTHROPIC_SMALL_FAST_MODEL")).toBeUndefined();
  });

  it("preserves a redacted stored pin when the role is left untouched", () => {
    const redacted = variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "", { valueRedacted: true });
    const next = buildClaudeRoleEnvironment([redacted], { sonnet: "anthropic/sonnet-4" });
    expect(next).toContainEqual(redacted);
    expect(next).toContainEqual(variable("ANTHROPIC_DEFAULT_SONNET_MODEL", "anthropic/sonnet-4"));
  });

  it("replaces a redacted stored pin with freshly written plaintext", () => {
    const redacted = variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "", { valueRedacted: true });
    const next = buildClaudeRoleEnvironment([redacted], { opus: "fresh/opus" });
    expect(next).toContainEqual(variable("ANTHROPIC_DEFAULT_OPUS_MODEL", "fresh/opus"));
  });

  it("preserves redacted unrelated secrets byte-for-byte", () => {
    const secret = variable("MY_OTHER_SECRET", "", { sensitive: true, valueRedacted: true });
    expect(buildClaudeRoleEnvironment([secret], {})).toContainEqual(secret);
  });

  it("manages exactly the documented variable names", () => {
    expect(CLAUDE_ROLE_ENVIRONMENT_VARIABLE_NAMES).toEqual([
      "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      "ANTHROPIC_SMALL_FAST_MODEL",
    ]);
  });
});
