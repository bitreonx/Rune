import {
  canonicalSkillIdentity,
  normalizeSkillRepositoryUrl,
  normalizeSkillSlug,
} from "@rune/shared/skillsIdentity";

export type SkillMarketplaceCompatibility =
  | "unknown"
  | "rune-native"
  | "codex"
  | "claude"
  | "cursor"
  | "grok"
  | "opencode";

export const MARKETPLACE_COMPATIBILITY_LABEL: Readonly<
  Record<SkillMarketplaceCompatibility, string>
> = {
  unknown: "Unknown",
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
  /** Null means the GitHub source did not publish a semantic skill version. */
  readonly version: number | null;
  /** Branch/tag used when the source was inspected. */
  readonly ref?: string;
  /** Git tree SHA when discovered from the GitHub API. */
  readonly revision?: string;
}

export interface GitHubSkillCatalogSource {
  readonly repository: string;
  readonly ref: string;
  readonly revision?: string;
}

export const DEFAULT_GITHUB_SKILL_CATALOG_SOURCE: GitHubSkillCatalogSource = {
  repository: "https://github.com/mattpocock/skills",
  ref: "main",
};

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

function githubRepositoryPath(repository: string): string | null {
  const normalized = normalizeSkillRepositoryUrl(repository);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.length === 2 ? segments.join("/") : null;
  } catch {
    return null;
  }
}

export function buildGitHubSkillTreeUrl(source: GitHubSkillCatalogSource): string | null {
  const repositoryPath = githubRepositoryPath(source.repository);
  const ref = source.ref.trim();
  if (!repositoryPath || !ref || ref.includes("..") || ref.includes("\\")) return null;
  return `https://api.github.com/repos/${repositoryPath}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
}

interface GitHubTreeResponse {
  readonly sha?: unknown;
  readonly truncated?: unknown;
  readonly tree?: unknown;
}

interface GitHubTreeEntry {
  readonly path: string;
  readonly type: string;
}

function readGitHubTreeEntries(value: unknown): {
  sha: string | undefined;
  tree: GitHubTreeEntry[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("GitHub returned an invalid skill tree.");
  }
  const response = value as GitHubTreeResponse;
  if (response.truncated === true) throw new Error("GitHub returned a truncated skill tree.");
  if (!Array.isArray(response.tree)) throw new Error("GitHub returned no skill tree.");
  const tree: GitHubTreeEntry[] = [];
  for (const candidate of response.tree) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const entry = candidate as Record<string, unknown>;
    if (typeof entry.path !== "string" || typeof entry.type !== "string") continue;
    tree.push({ path: entry.path, type: entry.type });
  }
  return {
    sha: typeof response.sha === "string" && response.sha.length > 0 ? response.sha : undefined,
    tree,
  };
}

export function projectGitHubSkillCatalog(
  value: unknown,
  source: GitHubSkillCatalogSource,
): SkillMarketplaceRecord[] {
  const repository = githubRepositoryPath(source.repository);
  if (!repository) throw new Error("Marketplace source must be a GitHub repository URL.");
  const { sha, tree } = readGitHubTreeEntries(value);
  const records = new Map<string, SkillMarketplaceRecord>();
  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const path = entry.path.replaceAll("\\", "/");
    const segments = path.split("/");
    if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) continue;
    if (segments.at(-1)?.toLowerCase() !== "skill.md" || segments.length < 2) continue;
    const slug = normalizeSkillSlug(segments.at(-2) ?? "");
    if (!slug || slug !== segments.at(-2)) continue;
    const record: SkillMarketplaceRecord = {
      slug,
      repository: source.repository,
      path,
      description: `GitHub skill source · ${path}`,
      compatibility: ["unknown"],
      version: null,
      ref: source.ref,
      ...((source.revision ?? sha) ? { revision: source.revision ?? sha } : {}),
    };
    records.set(marketplaceSkillIdentity(record), record);
  }
  return [...records.values()]
    .filter(isValidMarketplaceRecord)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function fetchGitHubSkillCatalog(
  fetcher: typeof fetch = fetch,
  source: GitHubSkillCatalogSource = DEFAULT_GITHUB_SKILL_CATALOG_SOURCE,
): Promise<SkillMarketplaceRecord[]> {
  const url = buildGitHubSkillTreeUrl(source);
  if (!url) throw new Error("Marketplace source is not a valid GitHub repository/ref.");
  const response = await fetcher(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok)
    throw new Error(`GitHub returned HTTP ${response.status} for the skill catalog.`);
  return projectGitHubSkillCatalog(await response.json(), source);
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
    (record.version === null || (Number.isInteger(record.version) && record.version > 0)) &&
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

export function marketplaceVersionLabel(version: number | null): string {
  return version === null ? "Unknown" : `v${version}`;
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
  if (
    candidateVersion !== undefined &&
    (currentVersion === undefined || candidateVersion > currentVersion)
  ) {
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
    const identity = canonicalSkillIdentity({
      slug: skill.name,
      repositoryUrl: skill.repositoryUrl,
    });
    installedByIdentity.set(
      identity,
      selectInstalledReport(installedByIdentity.get(identity), skill),
    );
  }

  const recordsByIdentity = new Map<string, SkillMarketplaceRecord>();
  for (const record of input.registry ?? BUNDLED_SKILL_MARKETPLACE) {
    if (!isValidMarketplaceRecord(record)) continue;
    const identity = marketplaceSkillIdentity(record);
    const current = recordsByIdentity.get(identity);
    if (
      !current ||
      (record.version !== null && (current.version === null || record.version > current.version))
    ) {
      recordsByIdentity.set(identity, record);
    }
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
          installedVersion !== undefined &&
          record.version !== null &&
          installedVersion < record.version
            ? "update"
            : installed
              ? "installed"
              : "available",
      } satisfies SkillMarketplaceView;
    })
    .sort(
      (left, right) =>
        left.slug.localeCompare(right.slug) || left.identity.localeCompare(right.identity),
    );
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
