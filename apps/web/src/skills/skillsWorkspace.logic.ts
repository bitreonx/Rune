import type {
  EnvironmentId,
  ProviderInstanceId,
  ServerProvider,
  ServerProviderSkill,
} from "@rune/contracts";
import {
  formatProviderSkillDisplayName,
  resolveProviderSkillSourceKind,
  type ProviderSkillSourceKind,
} from "@rune/client-runtime/providerSkills";

import { deriveProviderInstanceEntries } from "../providerInstances";
import { scoreProviderSkill } from "../providerSkillSearch";

export type SkillWorkspaceSourceFilter = "all" | ProviderSkillSourceKind;

export interface SkillWorkspaceSource {
  readonly providerInstanceId: ProviderInstanceId;
  readonly providerDisplayName: string;
  readonly driver: ServerProvider["driver"];
  readonly skill: ServerProviderSkill;
  readonly scope: string;
  readonly sourceKind: ProviderSkillSourceKind;
  readonly safePath: string;
  readonly repositoryUrl?: string;
}

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
  readonly repositoryUrl?: string;
  readonly sources: ReadonlyArray<SkillWorkspaceSource>;
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

/** Stable UI identity used when providers report the same skill with different paths. */
export function normalizeSkillIdentity(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Keep the useful tail of a path without leaking an entire host filesystem path. */
export function safeSkillPath(pathValue: string): string {
  const segments = normalizePath(pathValue).split("/").filter(Boolean);
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

function compareSources(a: SkillWorkspaceSource, b: SkillWorkspaceSource): number {
  return (
    SOURCE_ORDER[a.sourceKind] - SOURCE_ORDER[b.sourceKind] ||
    Number(b.skill.enabled) - Number(a.skill.enabled) ||
    a.providerDisplayName.localeCompare(b.providerDisplayName) ||
    a.safePath.localeCompare(b.safePath)
  );
}

export function buildSkillWorkspaceEntries(input: {
  readonly environmentId: EnvironmentId;
  readonly providers: ReadonlyArray<ServerProvider>;
}): SkillWorkspaceEntry[] {
  const providerEntries = new Map(
    deriveProviderInstanceEntries(input.providers).map((entry) => [entry.instanceId, entry]),
  );
  const grouped = new Map<string, SkillWorkspaceSource[]>();

  for (const provider of input.providers) {
    const providerEntry = providerEntries.get(provider.instanceId);
    const providerDisplayName =
      providerEntry?.displayName ?? provider.displayName ?? provider.driver;
    for (const skill of provider.skills) {
      const sourceKind = resolveProviderSkillSourceKind(skill);
      const identity = normalizeSkillIdentity(skill.name);
      const source: SkillWorkspaceSource = {
        providerInstanceId: provider.instanceId,
        providerDisplayName,
        driver: provider.driver,
        skill,
        scope: skill.scope?.trim() || sourceKind,
        sourceKind,
        safePath: safeSkillPath(skill.path),
        ...(skill.repositoryUrl ? { repositoryUrl: skill.repositoryUrl } : {}),
      };
      const sources = grouped.get(identity);
      if (sources) sources.push(source);
      else grouped.set(identity, [source]);
    }
  }

  const entries = [...grouped.entries()].map(([identity, unsortedSources]) => {
    const sources = [...unsortedSources].sort(compareSources);
    const primary = sources[0];
    if (!primary) throw new Error("Skill group cannot be empty");
    const skill = primary.skill;
    return {
      key: `${input.environmentId}:skill:${identity}`,
      environmentId: input.environmentId,
      providerInstanceId: primary.providerInstanceId,
      providerDisplayName: primary.providerDisplayName,
      driver: primary.driver,
      skill,
      name: skill.name,
      displayName: formatProviderSkillDisplayName(skill),
      description:
        skill.shortDescription?.trim() || skill.description?.trim() || "No description provided.",
      scope: primary.scope,
      sourceKind: primary.sourceKind,
      safePath: primary.safePath,
      ...(primary.repositoryUrl ? { repositoryUrl: primary.repositoryUrl } : {}),
      sources,
    } satisfies SkillWorkspaceEntry;
  });

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
    .filter(
      (item): item is { entry: SkillWorkspaceEntry; score: number; index: number } =>
        item.score !== null,
    )
    .sort((a, b) => a.score - b.score || compareEntries(a.entry, b.entry) || a.index - b.index)
    .map((item) => item.entry);
}
