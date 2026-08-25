import type { EnvironmentId, ProviderInstanceId, ServerProvider } from "@t3tools/contracts";
import { formatProviderSkillDisplayName, resolveProviderSkillSourceKind } from "@t3tools/client-runtime/providerSkills";

import { deriveProviderInstanceEntries } from "../providerInstances";

export type PluginScope = "project" | "user";
export type PluginState = "enabled" | "disabled";

export interface PluginWorkspaceEntry {
  readonly key: string;
  readonly id: string;
  readonly name: string;
  readonly environmentId: EnvironmentId;
  readonly providerInstanceId: ProviderInstanceId;
  readonly providerDisplayName: string;
  readonly scope: PluginScope;
  readonly state: PluginState;
  readonly capabilities: ReadonlyArray<"skills">;
  readonly skillNames: ReadonlyArray<string>;
  readonly safePath: string;
}

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
}

function pluginIdFromSkillPath(pathValue: string): string | null {
  const segments = normalizePath(pathValue).split("/").filter(Boolean);
  const pluginIndex = segments.findIndex((segment) => segment === "plugins");
  return pluginIndex >= 0 && segments[pluginIndex + 1]
    ? segments[pluginIndex + 1]!
    : null;
}

function scopeFromSkill(skill: ServerProvider["skills"][number]): PluginScope {
  const explicitScope = skill.scope?.trim().toLowerCase();
  if (explicitScope === "project" || explicitScope === "workspace" || explicitScope === "local") {
    return "project";
  }
  if (explicitScope === "repo" || explicitScope === "repository") {
    return "project";
  }
  if (explicitScope === "user" || explicitScope === "personal" || explicitScope === "global") {
    return "user";
  }
  return resolveProviderSkillSourceKind(skill) === "project" ? "project" : "user";
}

function safePath(pathValue: string): string {
  const segments = normalizePath(pathValue).split("/").filter(Boolean);
  return segments.length <= 3 ? segments.join("/") : `…/${segments.slice(-3).join("/")}`;
}

export function buildPluginWorkspaceEntries(input: {
  readonly environmentId: EnvironmentId;
  readonly providers: ReadonlyArray<ServerProvider>;
}): PluginWorkspaceEntry[] {
  const providerEntries = new Map(
    deriveProviderInstanceEntries(input.providers).map((entry) => [entry.instanceId, entry]),
  );
  const aggregate = new Map<string, PluginWorkspaceEntry>();

  for (const provider of input.providers) {
    const providerDisplayName =
      providerEntries.get(provider.instanceId)?.displayName ?? provider.displayName ?? provider.driver;
    for (const skill of provider.skills) {
      const id = pluginIdFromSkillPath(skill.path);
      if (!id) continue;
      const scope = scopeFromSkill(skill);
      const key = `${input.environmentId}:${provider.instanceId}:${scope}:${id}`;
      const previous = aggregate.get(key);
      if (previous) {
        aggregate.set(key, {
          ...previous,
          state: previous.state === "enabled" || skill.enabled ? "enabled" : "disabled",
          skillNames: [...new Set([...previous.skillNames, formatProviderSkillDisplayName(skill)])],
        });
        continue;
      }
      aggregate.set(key, {
        key,
        id,
        name: id
          .split(/[-_]/u)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        environmentId: input.environmentId,
        providerInstanceId: provider.instanceId,
        providerDisplayName,
        scope,
        state: skill.enabled ? "enabled" : "disabled",
        capabilities: ["skills"],
        skillNames: [formatProviderSkillDisplayName(skill)],
        safePath: safePath(skill.path),
      });
    }
  }

  return [...aggregate.values()].sort(
    (a, b) => a.scope.localeCompare(b.scope) || a.name.localeCompare(b.name) || a.key.localeCompare(b.key),
  );
}

export function groupPluginsByScope(entries: ReadonlyArray<PluginWorkspaceEntry>): {
  readonly project: PluginWorkspaceEntry[];
  readonly user: PluginWorkspaceEntry[];
} {
  return {
    project: entries.filter((entry) => entry.scope === "project"),
    user: entries.filter((entry) => entry.scope === "user"),
  };
}

export function resolvePluginActionState(entry: Pick<PluginWorkspaceEntry, "state" | "capabilities">): "ready" | "review" | "enable" {
  if (entry.state === "disabled") return "enable";
  return entry.capabilities.some((capability) => capability !== "skills") ? "review" : "ready";
}
