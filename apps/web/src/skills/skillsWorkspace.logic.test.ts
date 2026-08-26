import { describe, expect, it } from "vite-plus/test";
import { ProviderDriverKind, ProviderInstanceId, type ServerProvider } from "@rune/contracts";

import {
  buildSkillWorkspaceEntries,
  filterSkillWorkspaceEntries,
  safeSkillPath,
} from "./skillsWorkspace.logic";

function provider(skills: ServerProvider["skills"]): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make("codex_work"),
    driver: ProviderDriverKind.make("codex"),
    displayName: "Codex Work",
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-08-25T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills,
  };
}

describe("skillsWorkspace.logic", () => {
  it("projects provider skills with safe source metadata", () => {
    const entries = buildSkillWorkspaceEntries({
      environmentId: "env-a" as never,
      providers: [
        provider([
          {
            name: "review-ui",
            path: "C:\\Users\\maria\\.agents\\skills\\review-ui\\SKILL.md",
            scope: "project",
            enabled: true,
          },
        ]),
      ],
    });

    expect(entries[0]).toMatchObject({
      name: "review-ui",
      displayName: "Review Ui",
      sourceKind: "project",
      scope: "project",
      safePath: "…/skills/review-ui/SKILL.md",
    });
  });

  it("keeps provider and path identity when filtering results", () => {
    const entries = buildSkillWorkspaceEntries({
      environmentId: "env-a" as never,
      providers: [
        provider([
          { name: "review", path: "/repo/.agents/skills/review/SKILL.md", scope: "project", enabled: true },
          { name: "ship", path: "/repo/.agents/skills/ship/SKILL.md", scope: "repo", enabled: true },
        ]),
      ],
    });

    expect(filterSkillWorkspaceEntries(entries, "review").map((entry) => entry.name)).toEqual(["review"]);
    expect(filterSkillWorkspaceEntries(entries, "", "repo").map((entry) => entry.name)).toEqual(["ship"]);
  });

  it("does not expose the host prefix in a displayed path", () => {
    expect(safeSkillPath("D:\\Apps\\Rune\\.agents\\skills\\design\\SKILL.md")).toBe(
      "…/skills/design/SKILL.md",
    );
  });
});
