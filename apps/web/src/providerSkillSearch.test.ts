import { describe, expect, it } from "vite-plus/test";

import type { ServerProviderSkill } from "@rune/contracts";

import { providerSkillMenuItemId, searchProviderSkills } from "./providerSkillSearch";

function makeSkill(input: Partial<ServerProviderSkill> & Pick<ServerProviderSkill, "name">) {
  return {
    path: `/tmp/${input.name}/SKILL.md`,
    enabled: true,
    ...input,
  } satisfies ServerProviderSkill;
}

describe("searchProviderSkills", () => {
  it("gives same-named skills distinct menu ids when repositories differ", () => {
    const first = makeSkill({
      name: "review",
      repositoryUrl: "https://github.com/acme/first-review",
    });
    const second = makeSkill({
      name: "review",
      repositoryUrl: "https://github.com/acme/second-review",
    });

    expect(providerSkillMenuItemId("codex", first)).not.toBe(
      providerSkillMenuItemId("codex", second),
    );
  });

  it("moves exact ui matches ahead of broader ui matches", () => {
    const skills = [
      makeSkill({
        name: "agent-browser",
        displayName: "Agent Browser",
        shortDescription: "Browser automation CLI for AI agents",
      }),
      makeSkill({
        name: "building-native-ui",
        displayName: "Building Native Ui",
        shortDescription: "Complete guide for building beautiful apps with Expo Router",
      }),
      makeSkill({
        name: "ui",
        displayName: "Ui",
        shortDescription: "Explore, build, and refine UI.",
      }),
    ];

    expect(searchProviderSkills(skills, "ui").map((skill) => skill.name)).toEqual([
      "ui",
      "building-native-ui",
    ]);
  });

  it("uses fuzzy ranking for abbreviated queries", () => {
    const skills = [
      makeSkill({ name: "gh-fix-ci", displayName: "Gh Fix Ci" }),
      makeSkill({ name: "github", displayName: "Github" }),
      makeSkill({ name: "agent-browser", displayName: "Agent Browser" }),
    ];

    expect(searchProviderSkills(skills, "gfc").map((skill) => skill.name)).toEqual(["gh-fix-ci"]);
  });

  it("omits disabled skills from results", () => {
    const skills = [
      makeSkill({ name: "ui", displayName: "Ui", enabled: false }),
      makeSkill({ name: "frontend-design", displayName: "Frontend Design" }),
    ];

    expect(searchProviderSkills(skills, "ui").map((skill) => skill.name)).toEqual([]);
  });

  it("returns every enabled skill for an empty query", () => {
    const skills = [
      makeSkill({ name: "unslop" }),
      makeSkill({ name: "browser" }),
      makeSkill({ name: "disabled", enabled: false }),
    ];

    expect(searchProviderSkills(skills, "").map((skill) => skill.name)).toEqual([
      "unslop",
      "browser",
    ]);
  });
});
