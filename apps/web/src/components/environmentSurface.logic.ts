import type { VcsStatusResult } from "@rune/contracts";

export interface EnvironmentChangeSummary {
  readonly files: number;
  readonly additions: number;
  readonly deletions: number;
}

export function hasEnvironmentChanges(summary: EnvironmentChangeSummary): boolean {
  return summary.files > 0 || summary.additions > 0 || summary.deletions > 0;
}

export function summarizeEnvironmentChanges(input: {
  readonly chatDiff?: ReadonlyArray<{
    readonly path: string;
    readonly insertions?: number;
    readonly deletions?: number;
  }> | null;
  readonly gitStatus?: Pick<VcsStatusResult, "workingTree"> | null;
}): EnvironmentChangeSummary {
  if (input.chatDiff !== null && input.chatDiff !== undefined) {
    return {
      files: input.chatDiff.length,
      additions: input.chatDiff.reduce((total, file) => total + (file.insertions ?? 0), 0),
      deletions: input.chatDiff.reduce((total, file) => total + (file.deletions ?? 0), 0),
    };
  }
  return {
    files: input.gitStatus?.workingTree.files.length ?? 0,
    additions: input.gitStatus?.workingTree.insertions ?? 0,
    deletions: input.gitStatus?.workingTree.deletions ?? 0,
  };
}

export function formatChangeSummary(summary: EnvironmentChangeSummary): string {
  return `${summary.files} ${summary.files === 1 ? "file" : "files"} · +${summary.additions} −${summary.deletions}`;
}
