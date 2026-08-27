import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

interface CheckpointFile {
  readonly path: string;
  readonly kind: string;
  readonly additions: number;
  readonly deletions: number;
}

interface MutableFileAggregate {
  additions: number;
  deletions: number;
  throughTurnCount: number;
  readonly kind: string;
}

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const parseCheckpointFiles = (encoded: string): ReadonlyArray<CheckpointFile> => {
  const parsed: unknown = JSON.parse(encoded);
  if (!Array.isArray(parsed)) {
    throw new Error("projection_turns.checkpoint_files_json must contain an array");
  }

  return parsed.map((file) => {
    if (
      typeof file !== "object" ||
      file === null ||
      !("path" in file) ||
      typeof file.path !== "string" ||
      !("kind" in file) ||
      typeof file.kind !== "string" ||
      !("additions" in file) ||
      !isNonNegativeInteger(file.additions) ||
      !("deletions" in file) ||
      !isNonNegativeInteger(file.deletions)
    ) {
      throw new Error("projection_turns.checkpoint_files_json contains an invalid file entry");
    }

    return {
      path: file.path,
      kind: file.kind,
      additions: file.additions,
      deletions: file.deletions,
    };
  });
};

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`
    PRAGMA table_info(projection_threads)
  `;
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("baseline_checkpoint_ref")) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN baseline_checkpoint_ref TEXT NULL
    `;
  }
  if (!columnNames.has("baseline_captured_at")) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN baseline_captured_at TEXT NULL
    `;
  }
  if (!columnNames.has("baseline_source")) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN baseline_source TEXT NULL
    `;
  }
  if (!columnNames.has("chat_diff_json")) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN chat_diff_json TEXT NULL
    `;
  }
  if (!columnNames.has("chat_diff_through_turn_count")) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN chat_diff_through_turn_count INTEGER NULL
    `;
  }
  if (!columnNames.has("file_ownership_json")) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN file_ownership_json TEXT NULL
    `;
  }

  const threads = yield* sql<{ readonly threadId: string }>`
    SELECT thread_id AS "threadId"
    FROM projection_threads
    WHERE chat_diff_json IS NULL
       OR chat_diff_through_turn_count IS NULL
       OR file_ownership_json IS NULL
    ORDER BY thread_id ASC
  `;
  const readyCheckpoints = yield* sql<{
    readonly threadId: string;
    readonly checkpointTurnCount: number;
    readonly checkpointFilesJson: string;
  }>`
    SELECT
      thread_id AS "threadId",
      checkpoint_turn_count AS "checkpointTurnCount",
      checkpoint_files_json AS "checkpointFilesJson"
    FROM projection_turns
    WHERE checkpoint_status = 'ready'
      AND checkpoint_turn_count IS NOT NULL
    ORDER BY thread_id ASC, checkpoint_turn_count ASC, row_id ASC
  `;

  const checkpointsByThread = new Map<string, Array<(typeof readyCheckpoints)[number]>>();
  for (const checkpoint of readyCheckpoints) {
    const existing = checkpointsByThread.get(checkpoint.threadId);
    if (existing === undefined) {
      checkpointsByThread.set(checkpoint.threadId, [checkpoint]);
    } else {
      existing.push(checkpoint);
    }
  }

  for (const thread of threads) {
    const byPath = new Map<string, MutableFileAggregate>();
    let throughTurnCount = 0;

    for (const checkpoint of checkpointsByThread.get(thread.threadId) ?? []) {
      throughTurnCount = Math.max(throughTurnCount, checkpoint.checkpointTurnCount);
      for (const file of parseCheckpointFiles(checkpoint.checkpointFilesJson)) {
        const existing = byPath.get(file.path);
        if (existing === undefined) {
          byPath.set(file.path, {
            kind: file.kind,
            additions: file.additions,
            deletions: file.deletions,
            throughTurnCount: checkpoint.checkpointTurnCount,
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
    const chatDiffJson = JSON.stringify(
      sortedEntries.map(([path, aggregate]) => ({
        path,
        kind: aggregate.kind,
        additions: aggregate.additions,
        deletions: aggregate.deletions,
      })),
    );
    const fileOwnershipJson = JSON.stringify(
      sortedEntries.map(([path, aggregate]) => ({
        path,
        owners: [
          {
            threadId: thread.threadId,
            throughTurnCount: aggregate.throughTurnCount,
            additions: aggregate.additions,
            deletions: aggregate.deletions,
          },
        ],
      })),
    );

    yield* sql`
      UPDATE projection_threads
      SET
        chat_diff_json = ${chatDiffJson},
        chat_diff_through_turn_count = ${throughTurnCount},
        file_ownership_json = ${fileOwnershipJson}
      WHERE thread_id = ${thread.threadId}
    `;
  }

  // Existing baseline refs are recovered lazily because the migration has no exact
  // baseline timestamp or source value from which to form a complete baseline.
});
