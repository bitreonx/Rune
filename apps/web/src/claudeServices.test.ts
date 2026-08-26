import { ProviderDriverKind, ProviderInstanceId } from "@rune/contracts";
import type { ServerProvider } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import { OPENROUTER_LOGO_URL, resolveClaudeInstanceService } from "./claudeServices";
import {
  applyProviderInstanceSettings,
  deriveProviderInstanceEntries,
  instanceBadgePresentation,
  type ProviderInstanceEntry,
} from "./providerInstances";

const claudeDriver = ProviderDriverKind.make("claudeAgent");
const codexDriver = ProviderDriverKind.make("codex");

function claudeServiceConfig(environment: ReadonlyArray<{ name: string; value: string }>) {
  return {
    driver: claudeDriver,
    enabled: true,
    ...(environment.length > 0
      ? {
          environment: environment.map((variable) => ({ ...variable, sensitive: false })),
        }
      : {}),
  };
}

function provider(input: {
  provider: ProviderDriverKind;
  instanceId: string;
  enabled?: boolean;
  displayName?: string;
  accentColor?: string;
}): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(input.instanceId),
    driver: input.provider,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    enabled: input.enabled ?? true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-01-01T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
  };
}

function entriesWithService(
  snapshot: ServerProvider,
  config: ReturnType<typeof claudeServiceConfig> | undefined,
): ReadonlyArray<ProviderInstanceEntry> {
  const entries = deriveProviderInstanceEntries([snapshot]);
  return applyProviderInstanceSettings(entries, {
    providerInstances: config
      ? { [ProviderInstanceId.make(String(snapshot.instanceId))]: config }
      : {},
    providers: {} as never,
  });
}

describe("resolveClaudeInstanceService", () => {
  it("detects OpenRouter base URLs regardless of case or trailing slash", () => {
    for (const url of [
      "https://openrouter.ai/api",
      "https://openrouter.ai/api/",
      "HTTPS://OpenRouter.AI/API/",
      " https://openrouter.ai/api ",
    ]) {
      expect(
        resolveClaudeInstanceService(claudeServiceConfig([{ name: "ANTHROPIC_BASE_URL", value: url }])),
      ).toBe("openrouter");
    }
  });

  it("classifies other base URLs as custom gateways", () => {
    expect(
      resolveClaudeInstanceService(
        claudeServiceConfig([{ name: "ANTHROPIC_BASE_URL", value: "https://gateway.example.com/v1" }]),
      ),
    ).toBe("gateway");
  });

  it("classifies an auth token without a base URL as a gateway", () => {
    expect(
      resolveClaudeInstanceService(claudeServiceConfig([{ name: "ANTHROPIC_AUTH_TOKEN", value: "sk-or-x" }])),
    ).toBe("gateway");
  });

  it("returns undefined for plain Anthropic configuration", () => {
    expect(resolveClaudeInstanceService(claudeServiceConfig([]))).toBeUndefined();
    expect(resolveClaudeInstanceService(undefined)).toBeUndefined();
  });

  it("returns undefined for non-claude drivers", () => {
    expect(
      resolveClaudeInstanceService({
        driver: codexDriver,
        environment: [{ name: "ANTHROPIC_BASE_URL", value: "https://openrouter.ai/api", sensitive: false }],
      }),
    ).toBeUndefined();
  });
});

describe("instanceBadgePresentation", () => {
  it("shows the OpenRouter logo for openrouter-backed instances", () => {
    const [entry] = entriesWithService(
      provider({ provider: claudeDriver, instanceId: "claude_openrouter" }),
      claudeServiceConfig([{ name: "ANTHROPIC_BASE_URL", value: "https://openrouter.ai/api" }]),
    );
    expect(entry?.serviceBadge).toBe("openrouter");
    expect(instanceBadgePresentation(entry!, [])).toEqual({
      show: true,
      content: "logo",
      logoUrl: OPENROUTER_LOGO_URL,
    });
  });

  it("falls back to initials for gateways that qualify for any badge", () => {
    const entry = deriveProviderInstanceEntries([
      provider({
        provider: claudeDriver,
        instanceId: "claude_gateway",
        accentColor: "#2563eb",
      }),
    ])[0]!;
    const overlaid = applyProviderInstanceSettings([entry], {
      providerInstances: {
        [ProviderInstanceId.make("claude_gateway")]: claudeServiceConfig([
          { name: "ANTHROPIC_BASE_URL", value: "https://gateway.example.com" },
        ]),
      },
      providers: {} as never,
    })[0]!;
    expect(overlaid.serviceBadge).toBe("gateway");
    expect(instanceBadgePresentation(overlaid, [overlaid])).toEqual({
      show: true,
      content: "initials",
    });
  });

  it("keeps plain instances on the existing initials decision", () => {
    const single = deriveProviderInstanceEntries([
      provider({ provider: claudeDriver, instanceId: "claudeAgent" }),
    ])[0]!;
    expect(instanceBadgePresentation(single, [single])).toEqual({ show: false, content: "initials" });

    const accented = deriveProviderInstanceEntries([
      provider({
        provider: claudeDriver,
        instanceId: "claudeAgent",
        accentColor: "#16a34a",
      }),
    ])[0]!;
    expect(instanceBadgePresentation(accented, [accented])).toEqual({
      show: true,
      content: "initials",
    });
  });
});
