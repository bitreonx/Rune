/**
 * Curated metadata for the upstream Matt Pocock engineering pack.
 *
 * Skill bodies stay in the user's installed checkout. This file deliberately
 * contains only the source, license, installer command, and RUNE adaptations.
 */
export const MATT_POCOCK_SKILLS = [
  { name: "grilling", adaptation: "structured-asker" },
  { name: "grill-me", dependencies: ["grilling"], adaptation: "structured-asker" },
  {
    name: "grill-with-docs",
    dependencies: ["grilling", "domain-modeling"],
    adaptation: "decision-ledger",
  },
  { name: "domain-modeling", adaptation: "decision-ledger" },
  { name: "to-spec", adaptation: "settled-decisions" },
  { name: "to-tickets", adaptation: "vertical-slices" },
  { name: "implement", adaptation: "durable-gates" },
  { name: "tdd", adaptation: "durable-gates" },
  { name: "code-review", adaptation: "spec-and-standards" },
  { name: "diagnosing-bugs", adaptation: "verification" },
  { name: "wayfinder", adaptation: "discovery-map" },
  { name: "prototype", adaptation: "isolated-prototype" },
  { name: "research", adaptation: "evidence-first" },
  { name: "codebase-design", adaptation: "architecture" },
  { name: "handoff", adaptation: "structured-handoff" },
] as const;

export type MattPocockSkillName = (typeof MATT_POCOCK_SKILLS)[number]["name"];

export const MATT_POCOCK_PACK = {
  source: "https://github.com/mattpocock/skills",
  license: "MIT",
  installer: "npx skills add mattpocock/skills --skill=<skill-name>",
  skills: MATT_POCOCK_SKILLS,
} as const;

const metadataByName = new Map(MATT_POCOCK_SKILLS.map((skill) => [skill.name, skill]));

export function getMattPocockMetadata(name: string) {
  return metadataByName.get(name.trim().toLowerCase() as MattPocockSkillName);
}
