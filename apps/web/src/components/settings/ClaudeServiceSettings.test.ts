import { describe, expect, it } from "vite-plus/test";

import {
  buildClaudeServiceEnvironment,
  readClaudeServiceEnvironment,
  type ClaudeServiceEnvironmentDraft,
} from "./ClaudeServiceSettings";

describe("Claude service environment", () => {
  it("reads OpenRouter routing and preserves a redacted API key", () => {
    expect(
      readClaudeServiceEnvironment([
        {
          name: "ANTHROPIC_BASE_URL",
          value: "https://openrouter.ai/api",
          sensitive: false,
        },
        {
          name: "ANTHROPIC_AUTH_TOKEN",
          value: "",
          sensitive: true,
          valueRedacted: true,
        },
        { name: "ANTHROPIC_API_KEY", value: "", sensitive: true },
      ]),
    ).toEqual({
      service: "openrouter",
      baseUrl: "https://openrouter.ai/api",
      apiKey: "",
      apiKeyStored: true,
    });
  });

  it("writes OpenRouter variables without dropping unrelated variables", () => {
    const draft: ClaudeServiceEnvironmentDraft = {
      service: "openrouter",
      baseUrl: "https://openrouter.ai/api",
      apiKey: "",
      apiKeyStored: true,
    };

    expect(
      buildClaudeServiceEnvironment(
        [
          { name: "PATH_HINT", value: "keep-me", sensitive: false },
          {
            name: "ANTHROPIC_AUTH_TOKEN",
            value: "",
            sensitive: true,
            valueRedacted: true,
          },
          { name: "ANTHROPIC_API_KEY", value: "", sensitive: true },
        ],
        draft,
      ),
    ).toEqual([
      { name: "PATH_HINT", value: "keep-me", sensitive: false },
      {
        name: "ANTHROPIC_BASE_URL",
        value: "https://openrouter.ai/api",
        sensitive: false,
      },
      {
        name: "ANTHROPIC_AUTH_TOKEN",
        value: "",
        sensitive: true,
        valueRedacted: true,
      },
      { name: "ANTHROPIC_API_KEY", value: "", sensitive: true },
    ]);
  });

  it("switches to a custom compatible service and replaces the stored token", () => {
    const draft: ClaudeServiceEnvironmentDraft = {
      service: "custom",
      baseUrl: "https://gateway.example.test/anthropic",
      apiKey: "new-token",
      apiKeyStored: true,
    };

    expect(
      buildClaudeServiceEnvironment(
        [
          {
            name: "ANTHROPIC_BASE_URL",
            value: "https://openrouter.ai/api",
            sensitive: false,
          },
          {
            name: "ANTHROPIC_AUTH_TOKEN",
            value: "",
            sensitive: true,
            valueRedacted: true,
          },
          { name: "ANTHROPIC_API_KEY", value: "", sensitive: true },
        ],
        draft,
      ),
    ).toEqual([
      {
        name: "ANTHROPIC_BASE_URL",
        value: "https://gateway.example.test/anthropic",
        sensitive: false,
      },
      { name: "ANTHROPIC_AUTH_TOKEN", value: "new-token", sensitive: true },
      { name: "ANTHROPIC_API_KEY", value: "", sensitive: true },
    ]);
  });
});
