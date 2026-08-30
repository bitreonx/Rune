import { normalizeSkillRepositoryUrl } from "@rune/shared/skillsIdentity";

import { isValidMarketplaceRecord, type SkillMarketplaceRecord } from "./marketplaceRegistry";

const MAX_SKILL_BODY_BYTES = 256 * 1024;
const MAX_SKILL_FILES = 64;
const MAX_SKILL_TOTAL_BYTES = 2 * 1024 * 1024;

export interface MarketplaceSkillFile {
  readonly relativePath: string;
  readonly contents: string | MarketplaceSkillBinaryContents;
}

export interface MarketplaceSkillBinaryContents {
  readonly encoding: "base64";
  readonly data: string;
}

interface GitHubTreeFile {
  readonly path: string;
  readonly type: string;
}

function normalizedGitHubRepositoryPath(repository: string): string | null {
  const normalized = normalizeSkillRepositoryUrl(repository);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.hostname.toLowerCase() !== "github.com") return null;
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
  const ref = (record.ref ?? "main").trim();
  if (
    !repositoryPath ||
    !isSafeRelativePath(relativePath) ||
    !ref ||
    ref.includes("..") ||
    ref.includes("\\")
  ) {
    return null;
  }
  return (
    "https://raw.githubusercontent.com/" +
    repositoryPath +
    "/" +
    encodeURIComponent(ref) +
    "/" +
    relativePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")
  );
}

export function buildMarketplaceTreeUrl(record: SkillMarketplaceRecord): string | null {
  if (!isValidMarketplaceRecord(record)) return null;
  const repositoryPath = normalizedGitHubRepositoryPath(record.repository);
  const ref = (record.ref ?? "main").trim();
  if (!repositoryPath || !ref || ref.includes("..") || ref.includes("\\")) return null;
  return (
    "https://api.github.com/repos/" +
    repositoryPath +
    "/git/trees/" +
    encodeURIComponent(ref) +
    "?recursive=1"
  );
}

function isSafeRelativePath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/")) return false;
  const segments = normalized.split("/");
  return !segments.some((segment) => segment === "" || segment === "." || segment === "..");
}

function skillDirectory(record: SkillMarketplaceRecord): string | null {
  const path = record.path.trim().replaceAll("\\", "/");
  if (!isSafeRelativePath(path)) return null;
  const segments = path.split("/");
  if (segments.length < 2 || segments.at(-1)?.toLowerCase() !== "skill.md") return null;
  return segments.slice(0, -1).join("/");
}

function parseGitHubTree(value: unknown): GitHubTreeFile[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("GitHub returned an invalid skill tree.");
  }
  const response = value as { readonly truncated?: unknown; readonly tree?: unknown };
  if (response.truncated === true) throw new Error("GitHub returned a truncated skill tree.");
  if (!Array.isArray(response.tree)) throw new Error("GitHub returned no skill tree.");
  return response.tree.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const entry = candidate as Record<string, unknown>;
    return typeof entry.path === "string" && typeof entry.type === "string"
      ? [{ path: entry.path.replaceAll("\\", "/"), type: entry.type }]
      : [];
  });
}

function treeFilesForSkill(record: SkillMarketplaceRecord, tree: GitHubTreeFile[]): string[] {
  const root = skillDirectory(record);
  if (!root) throw new Error("This marketplace record has an unsafe skill path.");
  const prefix = root + "/";
  const files = tree
    .filter((entry) => entry.type === "blob" && entry.path.startsWith(prefix))
    .map((entry) => entry.path)
    .filter(isSafeRelativePath);
  const skillPath = record.path.trim().replaceAll("\\", "/");
  if (files.length === 0 || !files.some((path) => path.toLowerCase() === skillPath.toLowerCase())) {
    throw new Error("GitHub did not return the skill body.");
  }
  if (files.length > MAX_SKILL_FILES) {
    throw new Error("The skill contains too many files for a safe install.");
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function buildMarketplaceRawFileUrl(record: SkillMarketplaceRecord, path: string): string | null {
  return buildMarketplaceRawSkillUrl({ ...record, path });
}

const TEXT_SKILL_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".env",
  ".gitignore",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

function isTextSkillFile(path: string, contentType: string | null): boolean {
  if (!contentType) return isTextSkillPath(path);
  const mediaType = contentType.split(";")[0]!.trim().toLowerCase();
  if (mediaType.startsWith("text/")) return true;
  if (
    mediaType === "application/json" ||
    mediaType === "application/javascript" ||
    mediaType === "application/typescript" ||
    mediaType === "application/xml" ||
    mediaType === "application/yaml" ||
    mediaType === "application/x-yaml"
  ) {
    return true;
  }
  return isTextSkillPath(path) && mediaType === "application/octet-stream";
}

function isTextSkillPath(path: string): boolean {
  const normalized = path.toLowerCase().replaceAll("\\", "/");
  const basename = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (basename === ".env" || basename === ".gitignore") return true;
  const extension = basename.includes(".") ? basename.slice(basename.lastIndexOf(".")) : "";
  return TEXT_SKILL_FILE_EXTENSIONS.has(extension);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return globalThis.btoa(binary);
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

export async function fetchMarketplaceSkillFiles(
  record: SkillMarketplaceRecord,
  fetcher: typeof fetch = fetch,
): Promise<MarketplaceSkillFile[]> {
  const treeUrl = buildMarketplaceTreeUrl(record);
  if (!treeUrl) throw new Error("This marketplace record is not a valid GitHub skill source.");
  const treeResponse = await fetcher(treeUrl, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!treeResponse.ok) {
    throw new Error("GitHub returned HTTP " + treeResponse.status + " for the skill tree.");
  }
  const files = treeFilesForSkill(record, parseGitHubTree(await treeResponse.json()));
  let totalBytes = 0;
  const results: MarketplaceSkillFile[] = [];
  const root = skillDirectory(record)!;

  for (const path of files) {
    const url = buildMarketplaceRawFileUrl(record, path);
    if (!url) throw new Error("GitHub returned an unsafe skill file path.");
    const response = await fetcher(url, { headers: { Accept: "text/plain" } });
    if (!response.ok) {
      throw new Error("GitHub returned HTTP " + response.status + " for " + path + ".");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_SKILL_BODY_BYTES) {
      throw new Error("A skill file is larger than RUNE's safe install limit.");
    }
    const contentType = response.headers.get("content-type");
    const contents = isTextSkillFile(path, contentType)
      ? await response.text()
      : {
          encoding: "base64" as const,
          data: bytesToBase64(new Uint8Array(await response.arrayBuffer())),
        };
    const bytes =
      typeof contents === "string"
        ? new TextEncoder().encode(contents).byteLength
        : Math.floor((contents.data.length * 3) / 4) -
          (contents.data.endsWith("==") ? 2 : contents.data.endsWith("=") ? 1 : 0);
    if (
      path.toLowerCase() === record.path.trim().replaceAll("\\", "/").toLowerCase() &&
      (typeof contents !== "string" || !contents.trim())
    ) {
      throw new Error("GitHub returned an empty skill body.");
    }
    if (bytes > MAX_SKILL_BODY_BYTES) {
      throw new Error("A skill file is larger than RUNE's safe install limit.");
    }
    totalBytes += bytes;
    if (totalBytes > MAX_SKILL_TOTAL_BYTES) {
      throw new Error("The skill is larger than RUNE's safe install limit.");
    }
    results.push({
      relativePath: path.slice(root.length + 1),
      contents,
    });
  }
  return results;
}
