import { describe, expect, it } from "vite-plus/test";

import {
  BUNDLED_SKILL_MARKETPLACE,
  isValidMarketplaceRecord,
  marketplaceSkillIdentity,
  marketplaceSourceMetadata,
  projectMarketplaceView,
  projectMarketplaceViewModel,
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
      registry: [
        { ...BUNDLED_SKILL_MARKETPLACE[0]!, version: 2 },
        BUNDLED_SKILL_MARKETPLACE[1]!,
      ],
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
