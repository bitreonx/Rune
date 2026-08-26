import { describe, expect, it } from "vite-plus/test";
import { ProviderDriverKind, ProviderInstanceId, type ServerProvider } from "@rune/contracts";

import { buildPluginWorkspaceEntries, groupPluginsByScope, resolvePluginActionState } from "./pluginsWorkspace.logic";

function provider(): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make("codex"),
    driver: ProviderDriverKind.make("codex"),
    displayName: "Codex",
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-08-25T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [
      { name: "review", path: "/repo/.agents/plugins/superpowers/skills/review/SKILL.md", scope: "project", enabled: true },
      { name: "brainstorm", path: "/home/.codex/plugins/superpowers/skills/brainstorm/SKILL.md", scope: "user", enabled: true },
    ],
  };
}

describe("pluginsWorkspace.logic", () => {
  it("projects plugin roots into project and user scopes", () => {
    const entries = buildPluginWorkspaceEntries({ environmentId: "env-a" as never, providers: [provider()] });
    expect(groupPluginsByScope(entries).project.map((entry) => entry.id)).toEqual(["superpowers"]);
    expect(groupPluginsByScope(entries).user.map((entry) => entry.id)).toEqual(["superpowers"]);
  });

  it("keeps disabled plugins out of the ready state", () => {
    expect(resolvePluginActionState({ state: "disabled", capabilities: ["skills"] })).toBe("enable");
    expect(resolvePluginActionState({ state: "enabled", capabilities: ["skills"] })).toBe("ready");
  });
});

