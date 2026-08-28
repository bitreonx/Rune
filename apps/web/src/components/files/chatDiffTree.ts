import type { ProjectEntry } from "@rune/contracts";

export function buildChatDiffTree(paths: ReadonlyArray<string>): ReadonlyArray<ProjectEntry> {
  const entries = new Map<string, ProjectEntry["kind"]>();
  for (const rawPath of paths) {
    const normalized = rawPath.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    if (!normalized) continue;
    const segments = normalized.split("/").filter(Boolean);
    let path = "";
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) continue;
      path = path ? `${path}/${segment}` : segment;
      entries.set(path, index === segments.length - 1 ? "file" : "directory");
    }
  }
  return [...entries.entries()]
    .map(([path, kind]) => ({ path, kind }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
