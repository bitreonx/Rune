import {
  HarnessKind,
  type ProviderInstanceConfig,
  ProviderDriverKind,
  ProviderInstanceId,
  ProfileId,
  ServiceId,
  type HarnessProfileConfig,
  type ServerSettings,
} from "@rune/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@rune/contracts/settings";
import { describe, expect, it } from "vite-plus/test";

import { listProviderInstanceSlots, resolveProviderInstanceSlot } from "./providerInstanceSlots";

// A decoded settings object always carries the full default blob per driver,
// so "untouched" fixtures must copy that reference, not use a bare `{}`.
const untouchedClaudeBlob = { ...DEFAULT_UNIFIED_SETTINGS.providers.claudeAgent };
const untouchedCodexBlob = { ...DEFAULT_UNIFIED_SETTINGS.providers.codex };

const claude = ProviderDriverKind.make("claudeAgent");
const codex = ProviderDriverKind.make("codex");
const gemini = ProviderDriverKind.make("gemini");

const CLAUDE_DEFAULT_ID = ProviderInstanceId.make("claudeAgent");
const CODEX_DEFAULT_ID = ProviderInstanceId.make("codex");

function envelope(
  driver: ProviderDriverKind,
  overrides?: Partial<ProviderInstanceConfig>,
): ProviderInstanceConfig {
  return { driver, ...(overrides ?? {}) };
}

function settingsFrom(input: {
  providers?: Record<string, unknown>;
  instances?: ReadonlyArray<[string, ProviderInstanceConfig]>;
}): Pick<ServerSettings, "providerInstances" | "providers"> {
  return {
    providers: (input.providers ?? {}) as ServerSettings["providers"],
    providerInstances: Object.fromEntries(
      input.instances ?? [],
    ) as ServerSettings["providerInstances"],
  };
}

describe("resolveProviderInstanceSlot", () => {
  it("resolves a profile-backed custom instance through the same slot as legacy instances", () => {
    const instanceId = ProviderInstanceId.make("claude_work");
    const profileId = ProfileId.make("claude_work");
    const profiles: Record<ProfileId, HarnessProfileConfig> = {};
    profiles[profileId] = {
      profileId,
      harnessKind: HarnessKind.make("claudeAgent"),
      displayName: "Claude Work",
      enabled: true,
      instanceId,
      route: {
        modelServiceId: ServiceId.make("openrouter_work"),
        defaultModel: "claude-sonnet-4",
        sameModelEverywhere: true,
        roleOverrides: {},
      },
      routeVersion: 1,
    };
    const settings = {
      ...DEFAULT_UNIFIED_SETTINGS,
      harnesses: {
        ...DEFAULT_UNIFIED_SETTINGS.harnesses,
        profiles,
      },
    } as ServerSettings;

    expect(resolveProviderInstanceSlot(settings, claude, instanceId)).toMatchObject({
      instanceId,
      driver: claude,
      isDefault: false,
      isDirty: true,
      source: "profile",
    });
    expect(resolveProviderInstanceSlot(settings, claude, instanceId)?.instance).toMatchObject({
      connectionId: "openrouter_work",
      modelBindings: { main: "claude-sonnet-4" },
    });
  });

  it("prefers an explicit envelope over the legacy blob at the default id", () => {
    const settings = settingsFrom({
      providers: { claudeAgent: { enabled: false } },
      instances: [[String(CLAUDE_DEFAULT_ID), envelope(claude, { enabled: true })]],
    });
    const slot = resolveProviderInstanceSlot(settings, claude, CLAUDE_DEFAULT_ID);
    expect(slot).toMatchObject({
      instanceId: CLAUDE_DEFAULT_ID,
      driver: claude,
      isDefault: true,
      isDirty: true,
    });
    expect(slot?.instance.enabled).toBe(true);
  });

  it("synthesizes from an untouched legacy blob without marking the slot dirty", () => {
    const slot = resolveProviderInstanceSlot(
      settingsFrom({ providers: { claudeAgent: untouchedClaudeBlob } }),
      claude,
      CLAUDE_DEFAULT_ID,
    );
    expect(slot).toMatchObject({ instanceId: CLAUDE_DEFAULT_ID, isDefault: true, isDirty: false });
    const { enabled, ...config } = untouchedClaudeBlob;
    expect(slot?.instance).toEqual({ driver: claude, enabled, config });
  });

  it("marks a modified legacy blob dirty and carries its enabled flag", () => {
    const slot = resolveProviderInstanceSlot(
      settingsFrom({ providers: { codex: { enabled: false, launchArgs: "--profile x" } } }),
      codex,
      CODEX_DEFAULT_ID,
    );
    expect(slot?.isDirty).toBe(true);
    expect(slot?.instance.enabled).toBe(false);
  });

  it("returns undefined when neither an envelope nor a legacy blob exists", () => {
    expect(
      resolveProviderInstanceSlot(settingsFrom({}), claude, CLAUDE_DEFAULT_ID),
    ).toBeUndefined();
  });

  it("resolves a custom instance only through its envelope and marks it dirty", () => {
    const id = ProviderInstanceId.make("claude_openrouter");
    const settings = settingsFrom({
      instances: [[String(id), envelope(claude, { enabled: true })]],
    });
    const slot = resolveProviderInstanceSlot(settings, claude, id);
    expect(slot).toMatchObject({ instanceId: id, isDefault: false, isDirty: true });
    expect(resolveProviderInstanceSlot(settingsFrom({}), claude, id)).toBeUndefined();
  });
});

describe("listProviderInstanceSlots", () => {
  it("lists each driver's default before its customs, in the given driver order", () => {
    const customClaude = ProviderInstanceId.make("claude_openrouter");
    const customCodex = ProviderInstanceId.make("codex_work");
    const settings = settingsFrom({
      providers: { codex: {}, claudeAgent: {} },
      instances: [
        [String(customCodex), envelope(codex)],
        [String(customClaude), envelope(claude)],
      ],
    });
    const slots = listProviderInstanceSlots(settings, [claude, codex]);
    expect(slots.map((slot) => String(slot.instanceId))).toEqual([
      "claudeAgent",
      "claude_openrouter",
      "codex",
      "codex_work",
    ]);
    expect(slots.map((slot) => slot.isDefault)).toEqual([true, false, true, false]);
  });

  it("keeps a driver's customs even when its default slot has nothing to show", () => {
    const customClaude = ProviderInstanceId.make("claude_openrouter");
    const slots = listProviderInstanceSlots(
      settingsFrom({ instances: [[String(customClaude), envelope(claude)]] }),
      [claude],
    );
    expect(slots.map((slot) => String(slot.instanceId))).toEqual(["claude_openrouter"]);
  });

  it("appends unlisted-driver instances last, marked not-default", () => {
    const customGemini = ProviderInstanceId.make("gemini_fork");
    const slots = listProviderInstanceSlots(
      settingsFrom({
        providers: { codex: untouchedCodexBlob },
        instances: [[String(customGemini), envelope(gemini)]],
      }),
      [codex],
    );
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ isDefault: true, isDirty: false });
    expect(slots[1]).toMatchObject({ instanceId: customGemini, isDefault: false });
  });

  it("can scope a family switcher to its requested drivers", () => {
    const customGemini = ProviderInstanceId.make("gemini_fork");
    const slots = listProviderInstanceSlots(
      settingsFrom({
        providers: { codex: untouchedCodexBlob },
        instances: [[String(customGemini), envelope(gemini)]],
      }),
      [codex],
      { includeUnlistedDrivers: false },
    );

    expect(slots.map((slot) => String(slot.instanceId))).toEqual(["codex"]);
  });

  it("without a drivers argument discovers legacy drivers first, then envelope-only ones", () => {
    const customGemini = ProviderInstanceId.make("gemini_fork");
    const slots = listProviderInstanceSlots(
      settingsFrom({
        providers: { claudeAgent: untouchedClaudeBlob, codex: untouchedCodexBlob },
        instances: [[String(customGemini), envelope(gemini)]],
      }),
    );
    expect(slots.map((slot) => String(slot.instanceId))).toEqual([
      "claudeAgent",
      "codex",
      "gemini_fork",
    ]);
  });
});
