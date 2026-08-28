import {
  OrchestrationCheckpointFile,
  OrchestrationFileOwnership,
  OrchestrationThreadBaseline,
  ThreadId,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";

const ChatDiffJson = Schema.fromJsonString(Schema.Array(OrchestrationCheckpointFile));
const FileOwnershipJson = Schema.fromJsonString(Schema.Array(OrchestrationFileOwnership));
const decodeChatDiffJson = Schema.decodeUnknownSync(ChatDiffJson);
const decodeFileOwnershipJson = Schema.decodeUnknownSync(FileOwnershipJson);
const decodeBaseline = Schema.decodeUnknownSync(OrchestrationThreadBaseline);
const encodeChatDiffJson = Schema.encodeSync(ChatDiffJson);
const encodeFileOwnershipJson = Schema.encodeSync(FileOwnershipJson);

const isValidJsonValue = (decode: (input: unknown) => unknown, encoded: string | null): boolean => {
  if (encoded === null) return false;
  try {
    decode(encoded);
    return true;
  } catch {
    return false;
  }
};

const isNonNegativeInteger = (value: number | null): boolean =>
  value !== null && Number.isInteger(value) && value >= 0;

const parseCheckpointFiles = (
  encoded: string,
): {
  readonly files: ReadonlyArray<Schema.Schema.Type<typeof OrchestrationCheckpointFile>>;
  readonly valid: boolean;
} => {
  try {
    return { files: decodeChatDiffJson(encoded), valid: true };
  } catch {
    return { files: [], valid: false };
  }
};

const isValidBaseline = (row: {
  readonly baselineCheckpointRef: string | null;
  readonly baselineCapturedAt: string | null;
  readonly baselineSource: string | null;
}): boolean => {
  const values = [row.baselineCheckpointRef, row.baselineCapturedAt, row.baselineSource];
  if (values.every((value) => value === null)) return true;
  if (values.some((value) => value === null)) return false;
  try {
    decodeBaseline({
      checkpointRef: row.baselineCheckpointRef,
      capturedAt: row.baselineCapturedAt,
      source: row.baselineSource,
    });
    return true;
  } catch {
    return false;
  }
};

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const threads = yield* sql<{
    readonly threadId: string;
    readonly baselineCheckpointRef: string | null;
    readonly baselineCapturedAt: string | null;
    readonly baselineSource: string | null;
    readonly chatDiffJson: string | null;
    readonly chatDiffThroughTurnCount: number | null;
    readonly fileOwnershipJson: string | null;
  }>`
    SELECT
      thread_id AS "threadId",
      baseline_checkpoint_ref AS "baselineCheckpointRef",
      baseline_captured_at AS "baselineCapturedAt",
      baseline_source AS "baselineSource",
      chat_diff_json AS "chatDiffJson",
      chat_diff_through_turn_count AS "chatDiffThroughTurnCount",
      file_ownership_json AS "fileOwnershipJson"
    FROM projection_threads
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
    if (existing === undefined) checkpointsByThread.set(checkpoint.threadId, [checkpoint]);
    else existing.push(checkpoint);
  }

  for (const thread of threads) {
    const needsScopedChangeBackfill =
      !isValidJsonValue(decodeChatDiffJson, thread.chatDiffJson) ||
      !isNonNegativeInteger(thread.chatDiffThroughTurnCount) ||
      !isValidJsonValue(decodeFileOwnershipJson, thread.fileOwnershipJson);

    if (needsScopedChangeBackfill) {
      const byPath = new Map<
        string,
        { readonly kind: string; additions: number; deletions: number; throughTurnCount: number }
      >();
      let throughTurnCount = 0;

      for (const checkpoint of checkpointsByThread.get(thread.threadId) ?? []) {
        throughTurnCount = Math.max(throughTurnCount, checkpoint.checkpointTurnCount);
        const parsedCheckpoint = parseCheckpointFiles(checkpoint.checkpointFilesJson);
        if (!parsedCheckpoint.valid) {
          yield* Effect.logWarning(
            "Skipped malformed persisted checkpoint files during backfill.",
            {
              field: "checkpointFiles",
              threadId: thread.threadId,
              checkpointTurnCount: checkpoint.checkpointTurnCount,
            },
          );
        }
        for (const file of parsedCheckpoint.files) {
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
      const chatDiffJson = encodeChatDiffJson(
        sortedEntries.map(([path, aggregate]) => ({
          path,
          kind: aggregate.kind,
          additions: aggregate.additions,
          deletions: aggregate.deletions,
        })),
      );
      const fileOwnershipJson = encodeFileOwnershipJson(
        sortedEntries.map(([path, aggregate]) => ({
          path,
          owners: [
            {
              threadId: ThreadId.make(thread.threadId),
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
      yield* Effect.logWarning("Repaired invalid persisted thread scoped changes.", {
        threadId: thread.threadId,
      });
    }

    if (!isValidBaseline(thread)) {
      yield* sql`
        UPDATE projection_threads
        SET
          baseline_checkpoint_ref = NULL,
          baseline_captured_at = NULL,
          baseline_source = NULL
        WHERE thread_id = ${thread.threadId}
      `;
      yield* Effect.logWarning("Cleared incomplete persisted thread baseline.", {
        threadId: thread.threadId,
      });
    }
  }
});
