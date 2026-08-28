import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { SkillRegistryError, SkillRegistrySnapshot, WS_METHODS } from "./index.ts";

const decodeSnapshot = Schema.decodeUnknownSync(SkillRegistrySnapshot);

describe("Skill Registry contract", () => {
  it("keeps bodies and source paths off the registry summary", () => {
    const snapshot = decodeSnapshot({
      version: 1,
      skills: [
        {
          id: "abc123:grill-me",
          slug: "grill-me",
          name: "grill-me",
          description: "Clarify decisions before implementation.",
          version: 1,
          source: "https://github.com/mattpocock/skills",
          sourceAdapter: "filesystem:.agents/skills",
          scope: "project",
          explicitOnly: true,
          aliases: ["grill"],
          requiredTools: ["ask_user"],
          optionalTools: [],
          references: ["docs"],
          scripts: [],
          assets: [],
          license: "MIT",
          compatibility: ["codex", "claude"],
          dependencies: ["grilling"],
          contentHash: "abc123",
          enabled: true,
          lastUsedAt: null,
        },
      ],
    });

    expect(snapshot.skills[0]?.name).toBe("grill-me");
    expect("body" in snapshot.skills[0]!).toBe(false);
    expect("sourcePath" in snapshot.skills[0]!).toBe(false);
  });

  it("exposes stable provider-neutral RPC names and typed errors", () => {
    expect(WS_METHODS.skillsList).toBe("skills.list");
    expect(WS_METHODS.skillsRefresh).toBe("skills.refresh");
    expect(WS_METHODS.skillsGetBody).toBe("skills.getBody");
    expect(
      Schema.decodeUnknownSync(SkillRegistryError)({
        _tag: "SkillRegistryError",
        kind: "invalid-source",
        message: "Source is outside the allowed skill roots.",
      }).kind,
    ).toBe("invalid-source");
  });
});
