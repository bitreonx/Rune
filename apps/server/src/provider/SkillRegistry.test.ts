import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import type { SkillCandidate } from "./SkillRegistry.ts";
import { makeSkillRegistry } from "./SkillRegistry.ts";
import { getMattPocockMetadata, MATT_POCOCK_PACK } from "./mattPocockPack.ts";

const candidateDefaults = {
  description: "Test skill",
  source: "local-filesystem",
  sourceAdapter: "test",
  scope: "project" as const,
  explicitOnly: false,
  aliases: [],
  requiredTools: [],
  optionalTools: [],
  references: [],
  scripts: [],
  assets: [],
  compatibility: [],
  dependencies: [],
};

function candidate(
  sourcePath: string,
  name: string,
  body: string,
  extra: Partial<SkillCandidate> = {},
): SkillCandidate {
  return {
    ...candidateDefaults,
    slug: name.toLocaleLowerCase(),
    name,
    sourcePath,
    contentHash: NodeCrypto.createHash("sha256").update(body).digest("hex"),
    ...extra,
  };
}

async function withTempProject<T>(run: (projectCwd: string) => Promise<T>): Promise<T> {
  const directory = await NodeFS.mkdtemp(NodePath.join(NodeOS.tmpdir(), "rune-skill-registry-"));
  try {
    return await run(directory);
  } finally {
    await NodeFS.rm(directory, { recursive: true, force: true });
  }
}

describe("SkillRegistry", () => {
  it.effect("deduplicates the same skill identity across compatibility roots", () =>
    Effect.promise(() =>
      withTempProject(async (projectCwd) => {
        const body = "# Same skill\nUse evidence.";
        const firstPath = NodePath.join(projectCwd, ".agents", "skills", "review", "SKILL.md");
        const secondPath = NodePath.join(projectCwd, ".claude", "skills", "review", "SKILL.md");
        await NodeFS.mkdir(NodePath.dirname(firstPath), { recursive: true });
        await NodeFS.mkdir(NodePath.dirname(secondPath), { recursive: true });
        await NodeFS.writeFile(firstPath, body);
        await NodeFS.writeFile(secondPath, body);
        const registry = makeSkillRegistry({
          projectCwd,
          adapters: [
            {
              id: "agents",
              discover: Effect.succeed([
                candidate(firstPath, "review", body, { sourceAdapter: "agents" }),
              ]),
            },
            {
              id: "claude",
              discover: Effect.succeed([
                candidate(secondPath, "review", body, { sourceAdapter: "claude" }),
              ]),
            },
          ],
        });

        const snapshot = await Effect.runPromise(registry.refresh);
        expect(snapshot.skills).toHaveLength(1);
        expect(snapshot.skills[0]?.contentHash).toBe(
          NodeCrypto.createHash("sha256").update(body).digest("hex"),
        );
      }),
    ),
  );

  it.effect("keeps same slugs from different repositories distinct", () =>
    Effect.promise(() =>
      withTempProject(async (projectCwd) => {
        const first = candidate(NodePath.join(projectCwd, "first", "SKILL.md"), "review", "one", {
          repositoryUrl: "https://github.com/acme/first-review",
        });
        const second = candidate(NodePath.join(projectCwd, "second", "SKILL.md"), "review", "two", {
          repositoryUrl: "https://github.com/acme/second-review",
        });
        const registry = makeSkillRegistry({
          projectCwd,
          adapters: [{ id: "test", discover: Effect.succeed([first, second]) }],
        });

        const snapshot = await Effect.runPromise(registry.refresh);
        expect(snapshot.skills).toHaveLength(2);
        expect(new Set(snapshot.skills.map((skill) => skill.id)).size).toBe(2);
      }),
    ),
  );

  it.effect("uses the project source as the execution winner and keeps availability", () =>
    Effect.promise(() =>
      withTempProject(async (projectCwd) => {
        const personal = candidate(
          "/home/user/.codex/skills/review/SKILL.md",
          "review",
          "personal",
          {
            sourceAdapter: "filesystem:user:.codex/skills",
            scope: "personal",
          },
        );
        const project = candidate("/repo/.agents/skills/review/SKILL.md", "review", "project", {
          sourceAdapter: "filesystem:.agents/skills",
          scope: "project",
        });
        const registry = makeSkillRegistry({
          projectCwd,
          adapters: [{ id: "test", discover: Effect.succeed([personal, project]) }],
        });

        const snapshot = await Effect.runPromise(registry.refresh);
        expect(snapshot.skills).toHaveLength(1);
        expect(snapshot.skills[0]).toMatchObject({
          contentHash: project.contentHash,
          sourceAdapter: project.sourceAdapter,
        });
        expect(snapshot.skills[0]?.compatibility).toEqual(
          expect.arrayContaining([personal.sourceAdapter, project.sourceAdapter]),
        );
      }),
    ),
  );

  it.effect("loads the body lazily, caches it, and rejects escaped sources", () =>
    Effect.promise(() =>
      withTempProject(async (projectCwd) => {
        const sourcePath = NodePath.join(projectCwd, ".agents", "skills", "lazy", "SKILL.md");
        await NodeFS.mkdir(NodePath.dirname(sourcePath), { recursive: true });
        await NodeFS.writeFile(sourcePath, "# Lazy body");
        const registry = makeSkillRegistry({
          projectCwd,
          adapters: [
            {
              id: "test",
              discover: Effect.succeed([candidate(sourcePath, "lazy", "# Lazy body")]),
            },
          ],
        });
        const snapshot = await Effect.runPromise(registry.refresh);
        const id = snapshot.skills[0]!.id;
        const first = await Effect.runPromise(registry.getBody(id));
        const second = await Effect.runPromise(registry.getBody(id));
        expect(first.body).toBe("# Lazy body");
        expect(second).toEqual(first);

        const escapedPath = NodePath.join(NodeOS.tmpdir(), "rune-escaped-skill.md");
        await NodeFS.writeFile(escapedPath, "# Escaped");
        const escapedRegistry = makeSkillRegistry({
          projectCwd,
          adapters: [
            {
              id: "test",
              discover: Effect.succeed([candidate(escapedPath, "escaped", "# Escaped")]),
            },
          ],
        });
        const escapedSnapshot = await Effect.runPromise(escapedRegistry.refresh);
        const error = await Effect.runPromise(
          escapedRegistry.getBody(escapedSnapshot.skills[0]!.id).pipe(Effect.flip),
        );
        expect(error.kind).toBe("invalid-source");
        await NodeFS.rm(escapedPath, { force: true });
      }),
    ),
  );

  it.effect("keeps the execution bridge one-way and injects equal bodies once", () =>
    Effect.promise(() =>
      withTempProject(async (projectCwd) => {
        const body = "# Shared body";
        const firstPath = NodePath.join(projectCwd, ".agents", "skills", "first", "SKILL.md");
        const secondPath = NodePath.join(projectCwd, ".codex", "skills", "second", "SKILL.md");
        await NodeFS.mkdir(NodePath.dirname(firstPath), { recursive: true });
        await NodeFS.mkdir(NodePath.dirname(secondPath), { recursive: true });
        await NodeFS.writeFile(firstPath, body);
        await NodeFS.writeFile(secondPath, body);
        const registry = makeSkillRegistry({
          projectCwd,
          adapters: [
            {
              id: "test",
              discover: Effect.succeed([
                candidate(firstPath, "first", body),
                candidate(secondPath, "second", body),
              ]),
            },
          ],
        });
        const snapshot = await Effect.runPromise(registry.refresh);
        const projection = await Effect.runPromise(
          registry.bridge.compile({
            skillIds: snapshot.skills.map((skill) => skill.id),
            provider: "claude",
            platformCapabilities: ["structured-asker"],
          }),
        );
        expect(projection.skills).toHaveLength(1);
        expect(projection.compiledPrompt.match(/# Shared body/g)).toHaveLength(1);
        expect(projection.compiledPrompt).toContain("Provider dialect: claude");
      }),
    ),
  );

  it("records the curated Matt Pocock pack without vendoring bodies", () => {
    expect(MATT_POCOCK_PACK.license).toBe("MIT");
    expect(MATT_POCOCK_PACK.installer).toContain("npx skills add mattpocock/skills");
    expect(getMattPocockMetadata("grill-me")).toMatchObject({ dependencies: ["grilling"] });
    expect(getMattPocockMetadata("grill-with-docs")).toMatchObject({
      dependencies: ["grilling", "domain-modeling"],
    });
  });
});
