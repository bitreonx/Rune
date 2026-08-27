import type {
  OrchestrationChatDiff,
  OrchestrationCheckpointFile,
  OrchestrationCheckpointSummary,
  OrchestrationFileOwnership,
  ThreadId,
} from "@rune/contracts";

interface MutableFileEntry {
  additions: number;
  deletions: number;
  throughTurnCount: number;
  kind: string;
}

export interface ChatDiffAggregate {
  readonly chatDiff: OrchestrationChatDiff;
  readonly fileOwnership: ReadonlyArray<OrchestrationFileOwnership>;
}

export const aggregateChatDiff = (
  checkpoints: ReadonlyArray<OrchestrationCheckpointSummary>,
  threadId: ThreadId,
  now: string,
): ChatDiffAggregate => {
  const byPath = new Map<string, MutableFileEntry>();
  let throughTurnCount = 0;

  for (const checkpoint of checkpoints) {
    if (checkpoint.status !== "ready") continue;
    throughTurnCount = Math.max(throughTurnCount, checkpoint.checkpointTurnCount);

    for (const file of checkpoint.files) {
      const existing = byPath.get(file.path);
      if (existing === undefined) {
        byPath.set(file.path, {
          additions: file.additions,
          deletions: file.deletions,
          throughTurnCount: checkpoint.checkpointTurnCount,
          kind: file.kind,
        });
      } else {
        existing.additions += file.additions;
        existing.deletions += file.deletions;
        existing.throughTurnCount = Math.max(
          existing.throughTurnCount,
          checkpoint.checkpointTurnCount,
        );
      }
    }
  }

  const sortedEntries = [...byPath.entries()].toSorted(([left], [right]) =>
    left.localeCompare(right),
  );
  const files: ReadonlyArray<OrchestrationCheckpointFile> = sortedEntries.map(([path, entry]) => ({
    path,
    kind: entry.kind,
    additions: entry.additions,
    deletions: entry.deletions,
  }));
  const fileOwnership: ReadonlyArray<OrchestrationFileOwnership> = sortedEntries.map(
    ([path, entry]) => ({
      path,
      owners: [
        {
          threadId,
          throughTurnCount: entry.throughTurnCount,
          additions: entry.additions,
          deletions: entry.deletions,
        },
      ],
    }),
  );

  return {
    chatDiff: { files, computedAt: now, throughTurnCount },
    fileOwnership,
  };
};
