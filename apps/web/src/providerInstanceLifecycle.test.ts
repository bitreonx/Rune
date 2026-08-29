import { ProviderDriverKind, ProviderInstanceId } from "@rune/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@rune/contracts/settings";
import { describe, expect, it } from "vite-plus/test";

import {
  buildProviderInstanceRemovalPatch,
  buildProviderInstanceResetPatch,
} from "./providerInstanceLifecycle";

describe("buildProviderInstanceRemovalPatch", () => {
  it("removes the profile-backed instance and every saved selection that references it", () => {
    const instanceId = ProviderInstanceId.make("claude_work");
    const patch = buildProviderInstanceRemovalPatch({
      settings: {
        ...DEFAULT_UNIFIED_SETTINGS,
        providerInstances: {
          [instanceId]: { driver: ProviderDriverKind.make("claudeAgent"), enabled: true },
        },
        providerModelPreferences: {
          [instanceId]: { hiddenModels: ["hidden"], modelOrder: ["preferred"] },
        },
        favorites: [
          { provider: instanceId, model: "favorite" },
          { provider: ProviderInstanceId.make("codex"), model: "keep" },
        ],
        textGenerationModelSelection: { instanceId, model: "favorite" },
        sourceControlWriterModelSelection: { instanceId, model: "favorite" },
        harnesses: {
          ...DEFAULT_UNIFIED_SETTINGS.harnesses,
          profiles: {
            claude_work: {
              profileId: "claude_work",
              harnessKind: "claudeAgent",
              displayName: "Claude Work",
              enabled: true,
              instanceId,
              route: {
                modelServiceId: "native",
                defaultModel: "claude-sonnet-4",
                sameModelEverywhere: true,
                roleOverrides: {},
              },
              routeVersion: 1,
            },
          },
        },
      },
      instanceId,
    });

    expect(patch.providerInstances?.[instanceId]).toBeUndefined();
    expect(patch.providerModelPreferences?.[instanceId]).toBeUndefined();
    expect(patch.favorites).toEqual([{ provider: ProviderInstanceId.make("codex"), model: "keep" }]);
    expect(patch.textGenerationModelSelection).toEqual(
      DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection,
    );
    expect(patch.sourceControlWriterModelSelection).toBeNull();
    expect(patch.harnesses?.profiles?.claude_work).toBeUndefined();
  });
});

describe("buildProviderInstanceResetPatch", () => {
  it("restores a built-in slot instead of leaving a deleted default behind", () => {
    const instanceId = ProviderInstanceId.make("claudeAgent");
    const driver = ProviderDriverKind.make("claudeAgent");
    const patch = buildProviderInstanceResetPatch({
      settings: {
        ...DEFAULT_UNIFIED_SETTINGS,
        providerInstances: {
          [instanceId]: { driver, enabled: false, displayName: "Changed" },
        },
        providerModelPreferences: {
          [instanceId]: { hiddenModels: ["hidden"], modelOrder: ["preferred"] },
        },
        favorites: [{ provider: instanceId, model: "favorite" }],
      },
      instanceId,
      driver,
    });

    expect(patch.providers?.claudeAgent).toEqual(DEFAULT_UNIFIED_SETTINGS.providers.claudeAgent);
    expect(patch.providerInstances?.[instanceId]).toBeUndefined();
    expect(patch.providerModelPreferences?.[instanceId]).toBeUndefined();
    expect(patch.favorites).toEqual([]);
  });
});
