import { describe, expect, it } from "vite-plus/test";

import {
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderInstanceConfig,
} from "@rune/contracts";

import { compileProviderInstanceRuntime } from "./ProviderInstanceRuntime.ts";

const instanceId = ProviderInstanceId.make("claude_openrouter");
const driver = ProviderDriverKind.make("claudeAgent");

const managedEntry: ProviderInstanceConfig = {
  driver,
  connectionId: "openrouter_main",
  authMode: "rune-managed",
  runtimeHomePolicy: "isolated",
  modelProfileId: "claude-openrouter-default",
  environment: [
    { name: "ANTHROPIC_BASE_URL", value: "https://wrong.example/api", sensitive: false },
  ],
  config: {},
};

describe("compileProviderInstanceRuntime", () => {
  it("applies managed precedence, scrubs inherited routing, and pins isolation", () => {
    const runtime = compileProviderInstanceRuntime({
      instanceId,
      driver,
      entry: managedEntry,
      baseEnvironment: {
        // Windows exposes drive pseudo-variables in ProcessEnv. They must be
        // retained for launch but omitted from the manifest name contract.
        "=C:": "C:\\work",
        ANTHROPIC_API_KEY: "native-key",
        ANTHROPIC_BASE_URL: "https://native.example",
        PATH: "native-path",
      },
      serviceEnvironment: [
        { name: "ANTHROPIC_BASE_URL", value: "https://service.example", sensitive: false },
        { name: "PATH", value: "service-path", sensitive: false },
      ],
      mandatoryEnvironment: [
        { name: "ANTHROPIC_BASE_URL", value: "https://mandatory.example", sensitive: false },
      ],
      generatedAt: "2026-08-28T00:00:00.000Z",
      isolatedHomeRoot: "D:\\rune-managed",
      modelBindings: { main: "openrouter/primary" },
    });

    expect(runtime.environment.ANTHROPIC_API_KEY).toBe("");
    expect(runtime.environment.ANTHROPIC_BASE_URL).toBe("https://mandatory.example");
    expect(runtime.environment.PATH).toBe("service-path");
    expect(runtime.environment["=C:"]).toBe("C:\\work");
    expect(runtime.environment.CLAUDE_CONFIG_DIR).toBe("D:\\rune-managed\\claude_openrouter");
    expect(runtime.manifest.configHome).toBe("D:\\rune-managed\\claude_openrouter");
    expect(runtime.manifest.modelProfileId).toBe("claude-openrouter-default");
    expect(runtime.manifest.modelBindings).toEqual({ main: "openrouter/primary" });
    expect(runtime.manifest.environmentKeys).not.toContain("=C:");
    expect(JSON.stringify(runtime.manifest)).not.toContain("native-key");
  });

  it("preserves native environment behavior when the instance is native", () => {
    const runtime = compileProviderInstanceRuntime({
      instanceId: ProviderInstanceId.make("claude_native"),
      driver,
      entry: {
        driver,
        authMode: "native",
        runtimeHomePolicy: "native",
        environment: [],
        config: {},
      },
      baseEnvironment: {
        ANTHROPIC_API_KEY: "native-key",
        ANTHROPIC_BASE_URL: "https://native.example",
      },
      generatedAt: "2026-08-28T00:00:00.000Z",
    });

    expect(runtime.environment.ANTHROPIC_API_KEY).toBe("native-key");
    expect(runtime.environment.ANTHROPIC_BASE_URL).toBe("https://native.example");
    expect(runtime.manifest.credentialSource).toBe("native");
  });
});
