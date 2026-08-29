import {
  canonicalSkillIdentity,
  normalizeSkillRepositoryUrl,
  normalizeSkillSlug,
} from "@rune/shared/skillsIdentity";

export type SkillMarketplaceCompatibility =
  | "rune-native"
  | "codex"
  | "claude"
  | "cursor"
  | "grok"
  | "opencode";

export const MARKETPLACE_COMPATIBILITY_LABEL: Readonly<
  Record<SkillMarketplaceCompatibility, string>
> = {
  "rune-native": "RUNE Native",
  codex: "Codex",
  claude: "Claude Code",
  cursor: "Cursor",
  grok: "Grok",
  opencode: "OpenCode",
};

export interface SkillMarketplaceRecord {
  readonly slug: string;
  readonly repository: string;
  readonly path: string;
  readonly description: string;
  readonly compatibility: ReadonlyArray<SkillMarketplaceCompatibility>;
  readonly version: number;
}

export interface SkillMarketplaceSourceMetadata {
  readonly provider: "GitHub" | "Repository";
  readonly author: string;
  readonly repositoryName: string;
}

/**
 * Bundled discovery data is intentionally read-only. Browsing this list never
 * fetches or executes a remote script; installation is a separate, explicit
 * server operation.
 */
export const BUNDLED_SKILL_MARKETPLACE: ReadonlyArray<SkillMarketplaceRecord> = [
  {
    slug: "grill-me",
    repository: "https://github.com/mattpocock/skills",
    path: "grill-me/SKILL.md",
    description: "Turn vague requests into a short sequence of clear decisions.",
    compatibility: ["rune-native", "codex", "claude", "opencode"],
    version: 1,
  },
  {
    slug: "grilling",
    repository: "https://github.com/mattpocock/skills",
    path: "grilling/SKILL.md",
    description: "Ask focused questions before implementation begins.",
    compatibility: ["rune-native", "codex", "claude", "opencode"],
    version: 1,
  },
] as const;

export function marketplaceSkillIdentity(
  record: Pick<SkillMarketplaceRecord, "slug" | "repository">,
): string {
  return canonicalSkillIdentity({ slug: record.slug, repositoryUrl: record.repository });
}

/**
 * Derive display metadata from the canonical source URL without inventing
 * popularity, ownership, or other registry data that the source did not
 * provide. Invalid URLs deliberately fall back to an honest generic label.
 */
export function marketplaceSourceMetadata(repository: string): SkillMarketplaceSourceMetadata {
  try {
    const url = new URL(repository);
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.hostname.toLowerCase() === "github.com" && segments.length >= 2) {
      return {
        provider: "GitHub",
        author: segments[0]!,
        repositoryName: segments[1]!.replace(/\.git$/u, ""),
      };
    }
    return {
      provider: "Repository",
      author: url.hostname,
      repositoryName: segments.at(-1)?.replace(/\.git$/u, "") || url.hostname,
    };
  } catch {
    return { provider: "Repository", author: "Unknown source", repositoryName: repository };
  }
}

export function isValidMarketplaceRecord(record: SkillMarketplaceRecord): boolean {
  return (
    normalizeSkillSlug(record.slug) === record.slug &&
    normalizeSkillRepositoryUrl(record.repository) !== null &&
    record.path.trim().length > 0 &&
    record.description.trim().length > 0 &&
    Number.isInteger(record.version) &&
    record.version > 0 &&
    record.compatibility.length > 0
  );
}

export type SkillMarketplaceStatus = "available" | "installed" | "update";

export interface SkillMarketplaceView extends SkillMarketplaceRecord {
  readonly identity: string;
  readonly status: SkillMarketplaceStatus;
}

export function projectMarketplaceView(input: {
  readonly registry?: ReadonlyArray<SkillMarketplaceRecord>;
  readonly installed: ReadonlyArray<{
    readonly name: string;
    readonly repositoryUrl?: string;
    readonly version?: number;
  }>;
}): SkillMarketplaceView[] {
  const installedByIdentity = new Map(
    input.installed.map((skill) => [
      canonicalSkillIdentity({ slug: skill.name, repositoryUrl: skill.repositoryUrl }),
      skill,
    ]),
  );
  return (input.registry ?? BUNDLED_SKILL_MARKETPLACE)
    .filter(isValidMarketplaceRecord)
    .map((record) => {
      const identity = marketplaceSkillIdentity(record);
      const installed = installedByIdentity.get(identity);
      return {
        ...record,
        identity,
        status:
          installed?.version !== undefined && installed.version < record.version
            ? "update"
            : installed
              ? "installed"
              : "available",
      } satisfies SkillMarketplaceView;
    });
}
