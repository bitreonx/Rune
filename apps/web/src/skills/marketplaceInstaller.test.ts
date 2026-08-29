import { describe, expect, it, vi } from "vite-plus/test";

import { BUNDLED_SKILL_MARKETPLACE } from "./marketplaceRegistry";
import { buildMarketplaceRawSkillUrl, fetchMarketplaceSkillBody } from "./marketplaceInstaller";

describe("marketplaceInstaller", () => {
  it("derives a fixed GitHub raw URL from trusted catalog metadata", () => {
    expect(buildMarketplaceRawSkillUrl(BUNDLED_SKILL_MARKETPLACE[0]!)).toBe(
      "https://raw.githubusercontent.com/mattpocock/skills/main/grill-me/SKILL.md",
    );
  });

  it("fetches content without executing it and enforces the body limit", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("---\nname: grill-me\n---\nAsk questions.", {
        status: 200,
        headers: { "content-length": "35" },
      }),
    );
    await expect(
      fetchMarketplaceSkillBody(BUNDLED_SKILL_MARKETPLACE[0]!, fetcher),
    ).resolves.toContain("Ask questions.");
    expect(fetcher).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/mattpocock/skills/main/grill-me/SKILL.md",
      { headers: { Accept: "text/markdown" } },
    );
  });

  it("rejects untrusted paths before making a network request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const record = { ...BUNDLED_SKILL_MARKETPLACE[0]!, path: "../secrets/SKILL.md" };
    expect(buildMarketplaceRawSkillUrl(record)).toBeNull();
    await expect(fetchMarketplaceSkillBody(record, fetcher)).rejects.toThrow("valid GitHub");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
