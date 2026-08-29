import type { WorkspaceFileRef } from "@rune/contracts";

export type FileTreeInlineEdit =
  | {
      readonly type: "create-file";
      readonly parentRef: WorkspaceFileRef | null;
      readonly placeholderPath: string;
      readonly value: string;
    }
  | {
      readonly type: "create-folder";
      readonly parentRef: WorkspaceFileRef | null;
      readonly placeholderPath: string;
      readonly value: string;
    }
  | {
      readonly type: "rename";
      readonly ref: WorkspaceFileRef;
      readonly sourcePath: string;
      readonly originalName: string;
      readonly value: string;
      readonly isFolder: boolean;
    };

export function inlineNameSelection(input: { readonly name: string; readonly isFolder: boolean }): {
  readonly start: number;
  readonly end: number;
} {
  if (input.isFolder) return { start: 0, end: input.name.length };
  const extensionIndex = input.name.lastIndexOf(".");
  return {
    start: 0,
    end: extensionIndex > 0 ? extensionIndex : input.name.length,
  };
}

export function inlineEditNameError(value: string): string | null {
  const name = value.trim();
  if (name.length === 0) return "Name cannot be empty.";
  if (name === "." || name === "..") return "Name must identify a workspace entry.";
  if (name.includes("/") || name.includes("\\")) return "Name cannot include a path separator.";
  if (name.includes("\u0000")) return "Name cannot include a NUL character.";
  return null;
}

export function inlinePlaceholderPath(input: {
  readonly parentPath: string;
  readonly name: string;
  readonly isFolder: boolean;
  readonly existingPaths: ReadonlySet<string>;
}): string {
  const parent = input.parentPath.replace(/[\\/]$/, "");
  const join = (name: string) => (parent.length > 0 ? `${parent}/${name}` : name);
  let candidate = input.name;
  let suffix = 1;
  while (
    input.existingPaths.has(join(candidate)) ||
    input.existingPaths.has(`${join(candidate)}/`)
  ) {
    candidate = `${input.name}-${suffix}`;
    suffix += 1;
  }
  const result = join(candidate);
  return input.isFolder ? `${result}/` : result;
}

export function relativeEntryParentPath(path: string): string {
  const normalized = path.replace(/[\\/]$/, "");
  const separator = normalized.lastIndexOf("/");
  return separator < 0 ? "" : normalized.slice(0, separator);
}

export function relativeEntryName(path: string): string {
  const normalized = path.replace(/[\\/]$/, "");
  return normalized.slice(normalized.lastIndexOf("/") + 1);
}
