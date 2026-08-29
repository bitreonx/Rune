import type {
  ServerProviderSkill,
  ServerProviderSlashCommand,
  SkillRegistrySkill,
} from "@rune/contracts";
import {
  canonicalSkillIdentity,
  normalizeSkillRepositoryUrl,
  normalizeSkillSlug,
} from "@rune/shared/skillsIdentity";

export type ProviderSkillSourceKind = "app" | "repo" | "project" | "personal" | "system" | "other";

export function getProviderSkillIdentity(
  skill: Pick<ServerProviderSkill, "name" | "repositoryUrl">,
): string {
  return canonicalSkillIdentity({ slug: skill.name, repositoryUrl: skill.repositoryUrl });
}

export { normalizeSkillRepositoryUrl, normalizeSkillSlug };

function titleCaseWords(value: string): string {
  const words: string[] = [];
  for (const segment of value.split(/[\s:_-]+/)) {
    if (segment.length === 0) continue;
    words.push(segment.charAt(0).toUpperCase() + segment.slice(1));
  }
  return words.join(" ");
}

function normalizePathSeparators(pathValue: string): string {
  return pathValue.replaceAll("\\", "/");
}

export function formatProviderSkillDisplayName(
  skill: Pick<ServerProviderSkill, "name" | "displayName">,
): string {
  const displayName = skill.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  return titleCaseWords(skill.name);
}

export function formatRegistrySkillDisplayName(
  skill: Pick<SkillRegistrySkill, "name" | "slug">,
): string {
  return titleCaseWords(skill.name.trim() || skill.slug);
}

export function dedupeProviderSkills(
  skills: ReadonlyArray<ServerProviderSkill>,
): ServerProviderSkill[] {
  const unique = new Map<string, { skill: ServerProviderSkill; index: number }>();
  for (const [index, skill] of skills.entries()) {
    if (!skill.enabled) continue;
    const key = getProviderSkillIdentity(skill);
    const existing = unique.get(key);
    if (!existing || providerSkillPriority(skill) < providerSkillPriority(existing.skill)) {
      unique.set(key, { skill, index });
    }
  }
  return [...unique.values()]
    .sort((left, right) => left.index - right.index)
    .map(({ skill }) => skill);
}

function providerSkillPriority(skill: Pick<ServerProviderSkill, "path" | "scope">): number {
  const sourceKind = resolveProviderSkillSourceKind(skill);
  return { project: 0, repo: 1, personal: 2, app: 3, system: 4, other: 5 }[sourceKind];
}

export function getProviderSkillsForSlashMenu(
  skills: ReadonlyArray<ServerProviderSkill>,
  showSkillsInSlashMenu: boolean,
): ServerProviderSkill[] {
  return showSkillsInSlashMenu ? dedupeProviderSkills(skills) : [];
}

export function getProviderSlashCommandsForSlashMenu(
  slashCommands: ReadonlyArray<ServerProviderSlashCommand>,
  visibleSkills: ReadonlyArray<ServerProviderSkill>,
): ServerProviderSlashCommand[] {
  const skillNames = new Set(visibleSkills.map((skill) => skill.name.trim().toLowerCase()));
  return slashCommands.filter((command) => !skillNames.has(command.name.trim().toLowerCase()));
}

export function resolveProviderSkillSourceKind(
  skill: Pick<ServerProviderSkill, "path" | "scope">,
): ProviderSkillSourceKind {
  const normalizedPath = normalizePathSeparators(skill.path);
  if (normalizedPath.includes("/.codex/plugins/") || normalizedPath.includes("/.agents/plugins/")) {
    return "app";
  }

  const normalizedScope = skill.scope?.trim().toLowerCase();
  switch (normalizedScope) {
    case "repo":
    case "repository":
      return "repo";
    case "project":
    case "workspace":
    case "local":
      return "project";
    case "user":
    case "personal":
      return "personal";
    case "system":
      return "system";
    case undefined:
    case "":
      return "other";
    default:
      return "other";
  }
}
