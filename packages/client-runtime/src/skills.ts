import type { SkillGetBodyInput, SkillId, SkillRegistrySkill } from "@rune/contracts";
import { WS_METHODS } from "@rune/contracts";

import { request } from "./rpc/client.ts";

/** Provider-neutral registry reads used by web, desktop, and mobile clients. */
export const listSkills = () => request(WS_METHODS.skillsList, {});

export const refreshSkills = () => request(WS_METHODS.skillsRefresh, {});

export const getSkillBody = (input: SkillGetBodyInput) => request(WS_METHODS.skillsGetBody, input);

/** Defensive client projection: registry identity, not display name, is canonical. */
export function dedupeSkillRegistrySkills(
  skills: ReadonlyArray<SkillRegistrySkill>,
): SkillRegistrySkill[] {
  const seen = new Set<SkillId>();
  return skills.filter((skill) => {
    if (seen.has(skill.id)) return false;
    seen.add(skill.id);
    return true;
  });
}

export function getAutoInvocableSkills(
  skills: ReadonlyArray<SkillRegistrySkill>,
): SkillRegistrySkill[] {
  return dedupeSkillRegistrySkills(skills).filter((skill) => skill.enabled && !skill.explicitOnly);
}
