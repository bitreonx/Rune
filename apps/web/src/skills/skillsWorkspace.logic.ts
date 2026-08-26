import type { EnvironmentId, ProviderInstanceId, ServerProvider, ServerProviderSkill } from "@rune/contracts";
import {
  formatProviderSkillDisplayName,
  resolveProviderSkillSourceKind,
  type ProviderSkillSourceKind,
} from "@rune/client-runtime/providerSkills";

import { deriveProviderInstanceEntries } from "../providerInstances";
import { scoreProviderSkill } from "../providerSkillSearch";

export type SkillWorkspaceSourceFilter = "all" | ProviderSkillSourceKind;

export interface SkillWorkspaceEntry {
  readonly key: string;
  readonly environmentId: EnvironmentId;
  readonly providerInstanceId: ProviderInstanceId;
  readonly providerDisplayName: string;
  readonly driver: ServerProvider["driver"];
  readonly skill: ServerProviderSkill;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly scope: string;
  readonly sourceKind: ProviderSkillSourceKind;
  readonly safePath: string;
}

const SOURCE_ORDER: Readonly<Record<ProviderSkillSourceKind, number>> = {
  project: 0,
  repo: 1,
  personal: 2,
  app: 3,
  system: 4,
  other: 5,
};

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
}

/** Keep the useful tail of a path without leaking an entire host filesystem path. */
export function safeSkillPath(pathValue: string): string {
  const segments = normalizePath(pathValue)
    .split("/")
    .filter(Boolean);
  if (segments.length <= 3) return segments.join("/");
  return `…/${segments.slice(-3).join("/")}`;
}

function compareEntries(a: SkillWorkspaceEntry, b: SkillWorkspaceEntry): number {
  return (
    SOURCE_ORDER[a.sourceKind] - SOURCE_ORDER[b.sourceKind] ||
    a.displayName.localeCompare(b.displayName) ||
    a.providerDisplayName.localeCompare(b.providerDisplayName) ||
    a.key.localeCompare(b.key)
  );
}

export function buildSkillWorkspaceEntries(input: {
  readonly environmentId: EnvironmentId;
  readonly providers: ReadonlyArray<ServerProvider>;
}): SkillWorkspaceEntry[] {
  const providerEntries = new Map(
    deriveProviderInstanceEntries(input.providers).map((entry) => [entry.instanceId, entry]),
  );
  const entries: SkillWorkspaceEntry[] = [];
  const seen = new Set<string>();

  for (const provider of input.providers) {
    const providerEntry = providerEntries.get(provider.instanceId);
    const providerDisplayName = providerEntry?.displayName ?? provider.displayName ?? provider.driver;
    for (const skill of provider.skills) {
      const sourceKind = resolveProviderSkillSourceKind(skill);
      const key = `${input.environmentId}:${provider.instanceId}:${skill.name}:${skill.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        key,
        environmentId: input.environmentId,
        providerInstanceId: provider.instanceId,
        providerDisplayName,
        driver: provider.driver,
        skill,
        name: skill.name,
        displayName: formatProviderSkillDisplayName(skill),
        description:
          skill.shortDescription?.trim() || skill.description?.trim() || "No description provided.",
        scope: skill.scope?.trim() || sourceKind,
        sourceKind,
        safePath: safeSkillPath(skill.path),
      });
    }
  }

  return entries.sort(compareEntries);
}

export function filterSkillWorkspaceEntries(
  entries: ReadonlyArray<SkillWorkspaceEntry>,
  query: string,
  sourceFilter: SkillWorkspaceSourceFilter = "all",
): SkillWorkspaceEntry[] {
  const filtered = entries.filter(
    (entry) => sourceFilter === "all" || entry.sourceKind === sourceFilter,
  );
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [...filtered];

  return filtered
    .map((entry, index) => ({
      entry,
      score: scoreProviderSkill(entry.skill, normalizedQuery),
      index,
    }))
    .filter((item): item is { entry: SkillWorkspaceEntry; score: number; index: number } => item.score !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        compareEntries(a.entry, b.entry) ||
        a.index - b.index,
    )
    .map((item) => item.entry);
}

