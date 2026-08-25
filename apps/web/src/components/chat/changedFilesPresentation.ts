import { type TurnDiffFileChange } from "../../types";
import { summarizeTurnDiffStats } from "../../lib/turnDiffTree";

export const CHANGED_FILES_AUTO_EXPAND_FILE_LIMIT = 5;
export const CHANGED_FILES_AUTO_EXPAND_LINE_LIMIT = 200;
export const CHANGED_FILES_PREVIEW_FILE_LIMIT = 3;
export const CHANGED_FILES_PREVIEW_SCOPE_LIMIT = 4;

export interface ChangedFilesScopeSummary {
  readonly label: string;
  readonly fileCount: number;
}

function pathSegments(pathValue: string): string[] {
  return pathValue
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment.length > 0);
}

export function changedFileName(pathValue: string): string {
  return pathSegments(pathValue).at(-1) ?? pathValue;
}

function changedFileScope(pathValue: string): string {
  const segments = pathSegments(pathValue);
  return segments.length > 1 ? (segments[0] ?? "root") : "root";
}

export function shouldAutoExpandChangedFiles(
  files: ReadonlyArray<TurnDiffFileChange>,
  isLatestTurn: boolean,
): boolean {
  if (!isLatestTurn || files.length > CHANGED_FILES_AUTO_EXPAND_FILE_LIMIT) {
    return false;
  }
  const stat = summarizeTurnDiffStats(files);
  return stat.additions + stat.deletions <= CHANGED_FILES_AUTO_EXPAND_LINE_LIMIT;
}

export function summarizeChangedFileScopes(
  files: ReadonlyArray<TurnDiffFileChange>,
  limit = CHANGED_FILES_PREVIEW_SCOPE_LIMIT,
): ChangedFilesScopeSummary[] {
  const scopes = new Map<string, { fileCount: number; firstIndex: number }>();
  files.forEach((file, index) => {
    const label = changedFileScope(file.path);
    const current = scopes.get(label);
    scopes.set(label, {
      fileCount: (current?.fileCount ?? 0) + 1,
      firstIndex: current?.firstIndex ?? index,
    });
  });

  return Array.from(scopes, ([label, scope]) => ({
    label,
    fileCount: scope.fileCount,
    firstIndex: scope.firstIndex,
  }))
    .toSorted(
      (left, right) =>
        right.fileCount - left.fileCount ||
        left.firstIndex - right.firstIndex ||
        left.label.localeCompare(right.label),
    )
    .slice(0, limit)
    .map(({ label, fileCount }) => ({ label, fileCount }));
}

export function selectChangedFilePreview(
  files: ReadonlyArray<TurnDiffFileChange>,
  limit = CHANGED_FILES_PREVIEW_FILE_LIMIT,
): TurnDiffFileChange[] {
  const selected: TurnDiffFileChange[] = [];
  const selectedPaths = new Set<string>();
  const selectedScopes = new Set<string>();

  for (const file of files) {
    const scope = changedFileScope(file.path);
    if (selectedScopes.has(scope)) {
      continue;
    }
    selected.push(file);
    selectedPaths.add(file.path);
    selectedScopes.add(scope);
    if (selected.length === limit) {
      return selected;
    }
  }

  for (const file of files) {
    if (selectedPaths.has(file.path)) {
      continue;
    }
    selected.push(file);
    if (selected.length === limit) {
      break;
    }
  }

  return selected;
}

export interface WorkEntryDiffStat {
  readonly additions: number;
  readonly deletions: number;
}

/**
 * The +/− stat a work-log entry contributes within a turn's checkpoint files.
 * Null when the entry changed nothing the checkpoint tracked — the row then
 * has no diff to expand.
 */
export function summarizeWorkEntryDiffStat(
  entry: { readonly changedFiles?: ReadonlyArray<string> },
  files: ReadonlyArray<TurnDiffFileChange>,
): WorkEntryDiffStat | null {
  const changedPaths = entry.changedFiles;
  if (!changedPaths || changedPaths.length === 0) return null;

  const filesByPath = new Map(files.map((file) => [file.path, file]));
  let additions = 0;
  let deletions = 0;
  let matched = 0;
  for (const pathValue of changedPaths) {
    const file = filesByPath.get(pathValue.replaceAll("\\", "/"));
    if (!file) continue;
    matched += 1;
    additions += file.additions;
    deletions += file.deletions;
  }
  return matched === 0 ? null : { additions, deletions };
}

/**
 * The +/− stat a collapsed tool group contributes within a turn's checkpoint
 * files. Files are counted once no matter how many entries touched them —
 * the group describes the turn's change, not each entry's share.
 */
export function summarizeWorkGroupDiffStat(
  entries: ReadonlyArray<{ readonly changedFiles?: ReadonlyArray<string> }>,
  files: ReadonlyArray<TurnDiffFileChange>,
): WorkEntryDiffStat | null {
  const changedPaths = new Set<string>();
  for (const entry of entries) {
    for (const pathValue of entry.changedFiles ?? []) {
      changedPaths.add(pathValue.replaceAll("\\", "/"));
    }
  }
  if (changedPaths.size === 0) return null;

  let additions = 0;
  let deletions = 0;
  let matched = 0;
  for (const file of files) {
    if (!changedPaths.has(file.path)) continue;
    matched += 1;
    additions += file.additions;
    deletions += file.deletions;
  }
  return matched === 0 ? null : { additions, deletions };
}
