import { describe, expect, it } from "vite-plus/test";

import {
  BUNDLED_SKILL_MARKETPLACE,
  buildGitHubSkillTreeUrl,
  fetchGitHubSkillCatalog,
  isValidMarketplaceRecord,
  marketplaceSkillIdentity,
  marketplaceSourceMetadata,
  projectMarketplaceView,
  projectMarketplaceViewModel,
  projectGitHubSkillCatalog,
} from "./marketplaceRegistry";

describe("marketplaceRegistry", () => {
  it("ships a valid read-only catalog entry for the curated grill-me skill", () => {
    const grillMe = BUNDLED_SKILL_MARKETPLACE.find((entry) => entry.slug === "grill-me");
    expect(grillMe).toBeDefined();
    expect(isValidMarketplaceRecord(grillMe!)).toBe(true);
    expect(grillMe?.repository).toBe("https://github.com/mattpocock/skills");
  });

  it("matches installed skills by repository and slug, not display name alone", () => {
    const [entry] = projectMarketplaceView({
      registry: [BUNDLED_SKILL_MARKETPLACE[0]!],
      installed: [{ name: "Grill Me", repositoryUrl: "https://github.com/mattpocock/skills" }],
    });
    expect(entry?.identity).toBe(marketplaceSkillIdentity(BUNDLED_SKILL_MARKETPLACE[0]!));
    expect(entry?.status).toBe("installed");
  });

  it("reports an update only when an installed version is known and older", () => {
    const [entry] = projectMarketplaceView({
      registry: [{ ...BUNDLED_SKILL_MARKETPLACE[0]!, version: 2 }],
      installed: [
        {
          name: "grill-me",
          repositoryUrl: "https://github.com/mattpocock/skills",
          version: 1,
        },
      ],
    });
    expect(entry?.status).toBe("update");
    expect(entry?.installedVersion).toBe(1);
  });

  it("projects marketplace, installed, discover, and update collections without fake counts", () => {
    const model = projectMarketplaceViewModel({
      registry: [{ ...BUNDLED_SKILL_MARKETPLACE[0]!, version: 2 }, BUNDLED_SKILL_MARKETPLACE[1]!],
      installed: [
        {
          name: "grill-me",
          repositoryUrl: "https://github.com/mattpocock/skills",
          version: 1,
        },
      ],
    });

    expect(model.marketplace.map((entry) => entry.slug)).toEqual(["grill-me", "grilling"]);
    expect(model.discover).toHaveLength(2);
    expect(model.installed.map((entry) => entry.slug)).toEqual(["grill-me"]);
    expect(model.updates.map((entry) => entry.slug)).toEqual(["grill-me"]);
  });

  it("keeps the highest known version when providers report the same installation twice", () => {
    const [entry] = projectMarketplaceView({
      registry: [{ ...BUNDLED_SKILL_MARKETPLACE[0]!, version: 3 }],
      installed: [
        {
          name: "grill-me",
          repositoryUrl: "https://github.com/mattpocock/skills",
          version: 1,
        },
        {
          name: "Grill Me",
          repositoryUrl: "https://GITHUB.com/mattpocock/skills/",
          version: 2,
        },
      ],
    });

    expect(entry?.status).toBe("update");
    expect(entry?.installedVersion).toBe(2);
  });

  it("leaves an unversioned local report installed without inventing an update", () => {
    const [entry] = projectMarketplaceView({
      registry: [BUNDLED_SKILL_MARKETPLACE[0]!],
      installed: [{ name: "grill-me", repositoryUrl: "https://github.com/mattpocock/skills" }],
    });
    expect(entry?.status).toBe("installed");
  });

  it("projects validated GitHub Skill.md directories without inventing support or versions", () => {
    const records = projectGitHubSkillCatalog(
      {
        sha: "abc123",
        truncated: false,
        tree: [
          { path: "alpha/SKILL.md", type: "blob" },
          { path: "alpha/reference.md", type: "blob" },
          { path: "nested/beta/SKILL.md", type: "blob" },
          { path: "../unsafe/SKILL.md", type: "blob" },
          { path: "ignored/SKILL.txt", type: "blob" },
        ],
      },
      { repository: "https://github.com/example/catalog", ref: "main" },
    );
    expect(records).toEqual([
      {
        slug: "alpha",
        repository: "https://github.com/example/catalog",
        path: "alpha/SKILL.md",
        description: "GitHub skill source · alpha/SKILL.md",
        compatibility: ["unknown"],
        version: null,
        ref: "main",
        revision: "abc123",
      },
      {
        slug: "beta",
        repository: "https://github.com/example/catalog",
        path: "nested/beta/SKILL.md",
        description: "GitHub skill source · nested/beta/SKILL.md",
        compatibility: ["unknown"],
        version: null,
        ref: "main",
        revision: "abc123",
      },
    ]);
  });

  it("fetches a GitHub catalog through the tree API", async () => {
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        "https://api.github.com/repos/example/catalog/git/trees/main?recursive=1",
      );
      expect(init?.headers).toEqual({ Accept: "application/vnd.github+json" });
      return new Response(
        JSON.stringify({
          sha: "revision-1",
          truncated: false,
          tree: [{ path: "alpha/SKILL.md", type: "blob" }],
        }),
        { status: 200 },
      );
    };
    await expect(
      fetchGitHubSkillCatalog(fetcher, {
        repository: "https://github.com/example/catalog",
        ref: "main",
      }),
    ).resolves.toHaveLength(1);
  });

  it("rejects invalid GitHub catalog refs before fetching", () => {
    expect(
      buildGitHubSkillTreeUrl({
        repository: "https://github.com/example/catalog",
        ref: "../secrets",
      }),
    ).toBeNull();
  });

  it("derives GitHub author and repository labels from the source URL", () => {
    expect(marketplaceSourceMetadata("https://github.com/mattpocock/skills")).toEqual({
      provider: "GitHub",
      author: "mattpocock",
      repositoryName: "skills",
    });
  });

  it("keeps invalid sources honest instead of inventing an author", () => {
    expect(marketplaceSourceMetadata("not-a-url")).toEqual({
      provider: "Repository",
      author: "Unknown source",
      repositoryName: "not-a-url",
    });
  });
});
