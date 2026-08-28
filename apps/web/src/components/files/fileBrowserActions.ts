import type { ProjectEntry } from "@rune/contracts";

export function relativeEntryTarget(
  item: Pick<ProjectEntry, "kind" | "path">,
  name: string,
): string {
  const parent =
    item.kind === "directory" ? item.path : item.path.slice(0, item.path.lastIndexOf("/"));
  return parent ? `${parent.replace(/[\\/]$/, "")}/${name}` : name;
}

export function deletionConfirmationMessage(item: Pick<ProjectEntry, "kind" | "path">): string {
  const suffix = item.kind === "directory" ? " and everything inside it" : "";
  return `Delete ${item.path}${suffix}?`;
}
