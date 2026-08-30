import { describe, expect, it, vi } from "vite-plus/test";

import { BUNDLED_SKILL_MARKETPLACE } from "./marketplaceRegistry";
import {
  buildMarketplaceRawSkillUrl,
  buildMarketplaceTreeUrl,
  fetchMarketplaceSkillBody,
  fetchMarketplaceSkillFiles,
} from "./marketplaceInstaller";

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

  it("uses the catalog ref and discovers the complete skill directory before install", async () => {
    const record = { ...BUNDLED_SKILL_MARKETPLACE[0]!, ref: "release/v2" };
    expect(buildMarketplaceTreeUrl(record)).toBe(
      "https://api.github.com/repos/mattpocock/skills/git/trees/release%2Fv2?recursive=1",
    );
    expect(buildMarketplaceRawSkillUrl(record)).toBe(
      "https://raw.githubusercontent.com/mattpocock/skills/release%2Fv2/grill-me/SKILL.md",
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sha: "tree-sha",
            truncated: false,
            tree: [
              { path: "grill-me/SKILL.md", type: "blob" },
              { path: "grill-me/README.md", type: "blob" },
              { path: "other/SKILL.md", type: "blob" },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("skill instructions", { status: 200 }))
      .mockResolvedValueOnce(new Response("# Grill me", { status: 200 }));

    await expect(fetchMarketplaceSkillFiles(record, fetcher)).resolves.toEqual([
      { relativePath: "README.md", contents: "skill instructions" },
      { relativePath: "SKILL.md", contents: "# Grill me" },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects a truncated GitHub tree before fetching or writing files", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ truncated: true, tree: [] }), { status: 200 }),
      );
    await expect(
      fetchMarketplaceSkillFiles(BUNDLED_SKILL_MARKETPLACE[0]!, fetcher),
    ).rejects.toThrow("truncated");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects binary files instead of decoding and writing them as text", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            truncated: false,
            tree: [
              { path: "grill-me/SKILL.md", type: "blob" },
              { path: "grill-me/logo.exe", type: "blob" },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("instructions", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("binary", {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        }),
      );

    await expect(
      fetchMarketplaceSkillFiles(BUNDLED_SKILL_MARKETPLACE[0]!, fetcher),
    ).rejects.toThrow("unsupported binary");
  });

  it("rejects untrusted paths before making a network request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const record = { ...BUNDLED_SKILL_MARKETPLACE[0]!, path: "../secrets/SKILL.md" };
    expect(buildMarketplaceRawSkillUrl(record)).toBeNull();
    await expect(fetchMarketplaceSkillBody(record, fetcher)).rejects.toThrow("valid GitHub");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
