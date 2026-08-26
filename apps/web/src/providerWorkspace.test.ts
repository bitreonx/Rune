import { ProviderDriverKind, ProviderInstanceId } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import { groupProviderWorkspaceEntries, buildProviderWorkspaceEntries } from "./providerWorkspace";

describe("provider workspace grouping", () => {
  it("keeps subscriptions and API connections in separate groups", () => {
    const entries = buildProviderWorkspaceEntries({
      configs: {
        [ProviderInstanceId.make("codex_work")]: {
          driver: ProviderDriverKind.make("codex"),
          displayName: "Work Codex",
        },
        [ProviderInstanceId.make("openrouter_main")]: {
          driver: ProviderDriverKind.make("openrouter"),
          displayName: "OpenRouter",
          config: { baseUrl: "https://openrouter.ai/api/v1" },
        },
      },
      snapshots: [],
    });
    const groups = groupProviderWorkspaceEntries(entries);
    expect(groups.subscriptions.map((entry) => entry.instanceId)).toEqual(["codex_work"]);
    expect(groups.api.map((entry) => entry.instanceId)).toEqual(["openrouter_main"]);
  });

  it("uses snapshot models for instances discovered by the server", () => {
    const id = ProviderInstanceId.make("codex");
    const entries = buildProviderWorkspaceEntries({
      snapshots: [
        {
          instanceId: id,
          driver: ProviderDriverKind.make("codex"),
          enabled: true,
          installed: true,
          version: null,
          status: "ready",
          auth: { status: "authenticated" },
          checkedAt: "2026-08-25T00:00:00.000Z",
          models: [
            { slug: "gpt-5", name: "GPT-5", isCustom: false, isDefault: true, capabilities: null },
          ],
          slashCommands: [],
          skills: [],
        },
      ],
    });
    expect(entries[0]).toMatchObject({ instanceId: id, modelCount: 1, defaultModel: "gpt-5" });
  });
});
