import { normalizeSkillRepositoryUrl } from "@rune/shared/skillsIdentity";

import { isValidMarketplaceRecord, type SkillMarketplaceRecord } from "./marketplaceRegistry";

const MAX_SKILL_BODY_BYTES = 256 * 1024;

function normalizedGitHubRepositoryPath(repository: string): string | null {
  const normalized = normalizeSkillRepositoryUrl(repository);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.hostname !== "github.com") return null;
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.length === 2 ? segments.join("/") : null;
  } catch {
    return null;
  }
}

export function buildMarketplaceRawSkillUrl(record: SkillMarketplaceRecord): string | null {
  if (!isValidMarketplaceRecord(record)) return null;
  const repositoryPath = normalizedGitHubRepositoryPath(record.repository);
  const relativePath = record.path.trim().replaceAll("\\", "/");
  if (
    !repositoryPath ||
    !relativePath ||
    relativePath.startsWith("/") ||
    relativePath.includes("..")
  ) {
    return null;
  }
  return `https://raw.githubusercontent.com/${repositoryPath}/main/${relativePath}`;
}

export async function fetchMarketplaceSkillBody(
  record: SkillMarketplaceRecord,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const url = buildMarketplaceRawSkillUrl(record);
  if (!url) throw new Error("This marketplace record is not a valid GitHub skill source.");
  const response = await fetcher(url, { headers: { Accept: "text/markdown" } });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status} for this skill.`);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_SKILL_BODY_BYTES) {
    throw new Error("The skill body is larger than RUNE's safe install limit.");
  }
  const body = await response.text();
  if (!body.trim()) throw new Error("GitHub returned an empty skill body.");
  if (new TextEncoder().encode(body).byteLength > MAX_SKILL_BODY_BYTES) {
    throw new Error("The skill body is larger than RUNE's safe install limit.");
  }
  return body;
}
