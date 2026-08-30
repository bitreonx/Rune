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
  /** The installed version is only present when the provider reported one. */
  readonly installedVersion?: number;
}

export interface SkillMarketplaceViewModel {
  /** All marketplace records, including their truthful installed state. */
  readonly marketplace: ReadonlyArray<SkillMarketplaceView>;
  /** Marketplace records currently installed in the selected project. */
  readonly installed: ReadonlyArray<SkillMarketplaceView>;
  /** The discover/marketplace tab intentionally keeps installed badges visible. */
  readonly discover: ReadonlyArray<SkillMarketplaceView>;
  /** Records with a known, older installed version. */
  readonly updates: ReadonlyArray<SkillMarketplaceView>;
}

type InstalledMarketplaceSkill = {
  readonly name: string;
  readonly repositoryUrl?: string;
  readonly version?: number;
};

function knownInstalledVersion(skill: InstalledMarketplaceSkill): number | undefined {
  return Number.isInteger(skill.version) && skill.version > 0 ? skill.version : undefined;
}

function selectInstalledReport(
  current: InstalledMarketplaceSkill | undefined,
  candidate: InstalledMarketplaceSkill,
): InstalledMarketplaceSkill {
  if (!current) return candidate;
  const currentVersion = knownInstalledVersion(current);
  const candidateVersion = knownInstalledVersion(candidate);
  if (candidateVersion !== undefined && (currentVersion === undefined || candidateVersion > currentVersion)) {
    return candidate;
  }
  return current;
}

export function projectMarketplaceView(input: {
  readonly registry?: ReadonlyArray<SkillMarketplaceRecord>;
  readonly installed: ReadonlyArray<InstalledMarketplaceSkill>;
}): SkillMarketplaceView[] {
  const installedByIdentity = new Map<string, InstalledMarketplaceSkill>();
  for (const skill of input.installed) {
    const identity = canonicalSkillIdentity({ slug: skill.name, repositoryUrl: skill.repositoryUrl });
    installedByIdentity.set(identity, selectInstalledReport(installedByIdentity.get(identity), skill));
  }

  const recordsByIdentity = new Map<string, SkillMarketplaceRecord>();
  for (const record of input.registry ?? BUNDLED_SKILL_MARKETPLACE) {
    if (!isValidMarketplaceRecord(record)) continue;
    const identity = marketplaceSkillIdentity(record);
    const current = recordsByIdentity.get(identity);
    if (!current || record.version > current.version) recordsByIdentity.set(identity, record);
  }

  return [...recordsByIdentity.entries()]
    .map(([identity, record]) => {
      const installed = installedByIdentity.get(identity);
      const installedVersion = installed ? knownInstalledVersion(installed) : undefined;
      return {
        ...record,
        identity,
        ...(installedVersion !== undefined ? { installedVersion } : {}),
        status:
          installedVersion !== undefined && installedVersion < record.version
            ? "update"
            : installed
              ? "installed"
              : "available",
      } satisfies SkillMarketplaceView;
    })
    .sort((left, right) => left.slug.localeCompare(right.slug) || left.identity.localeCompare(right.identity));
}

export function projectMarketplaceViewModel(input: {
  readonly registry?: ReadonlyArray<SkillMarketplaceRecord>;
  readonly installed: ReadonlyArray<InstalledMarketplaceSkill>;
}): SkillMarketplaceViewModel {
  const marketplace = projectMarketplaceView(input);
  return {
    marketplace,
    installed: marketplace.filter((entry) => entry.status !== "available"),
    discover: marketplace,
    updates: marketplace.filter((entry) => entry.status === "update"),
  };
}
