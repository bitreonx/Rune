/**
 * Provider-neutral identity for a discovered skill.
 *
 * A display name is not an identity: two repositories can publish a skill
 * with the same slug, while the same repository can be reported by several
 * harnesses. Keep this helper free of filesystem and UI concerns so the
 * server registry and every client use the same rule.
 */

export function normalizeSkillSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Return a stable HTTPS/HTTP repository identity, or null for untrusted metadata. */
export function normalizeSkillRepositoryUrl(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;

  const scpStyle = /^git@([^:]+):(.+)$/u.exec(raw);
  const candidate = scpStyle ? `https://${scpStyle[1]}/${scpStyle[2]}` : raw;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const pathname = url.pathname
      .replace(/\/+/gu, "/")
      .replace(/\.git$/iu, "")
      .replace(/\/+$/u, "");
    if (!pathname || pathname === "/") return null;
    return `${url.protocol}//${url.hostname.toLocaleLowerCase()}${pathname.toLocaleLowerCase()}`;
  } catch {
    return null;
  }
}

export function canonicalSkillIdentity(input: {
  readonly slug: string;
  readonly repositoryUrl?: string | null;
}): string {
  const slug = normalizeSkillSlug(input.slug) || "unnamed";
  const repository = normalizeSkillRepositoryUrl(input.repositoryUrl);
  return repository ? `repository:${repository}#${slug}` : `slug:${slug}`;
}
