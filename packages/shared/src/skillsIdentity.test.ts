import { describe, expect, it } from "vite-plus/test";

import {
  canonicalSkillIdentity,
  normalizeSkillRepositoryUrl,
  normalizeSkillSlug,
} from "./skillsIdentity.ts";

describe("skillsIdentity", () => {
  it("normalizes equivalent repository URLs", () => {
    expect(normalizeSkillRepositoryUrl("git@GitHub.com:Acme/Review.git")).toBe(
      "https://github.com/acme/review",
    );
    expect(normalizeSkillRepositoryUrl("https://GITHUB.com/acme/review/")).toBe(
      "https://github.com/acme/review",
    );
  });

  it("falls back to a stable slug identity when provenance is absent", () => {
    expect(normalizeSkillSlug(" Review / Follow Up ")).toBe("review-follow-up");
    expect(canonicalSkillIdentity({ slug: "Review Me" })).toBe("slug:review-me");
  });

  it("does not collapse same-named skills from different repositories", () => {
    expect(
      canonicalSkillIdentity({ slug: "review", repositoryUrl: "https://github.com/acme/one" }),
    ).not.toBe(
      canonicalSkillIdentity({ slug: "review", repositoryUrl: "https://github.com/acme/two" }),
    );
  });

  it("rejects non-web repository metadata", () => {
    expect(normalizeSkillRepositoryUrl("file:///workspace/skill")).toBeNull();
    expect(normalizeSkillRepositoryUrl("not a URL")).toBeNull();
  });
});
