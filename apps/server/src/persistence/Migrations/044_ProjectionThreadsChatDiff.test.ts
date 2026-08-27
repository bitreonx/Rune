import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrationManifest, runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import migration from "./044_ProjectionThreadsChatDiff.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

const expectedColumns = [
  "baseline_checkpoint_ref",
  "baseline_captured_at",
  "baseline_source",
  "chat_diff_json",
  "chat_diff_through_turn_count",
  "file_ownership_json",
] as const;

layer("044_ProjectionThreadsChatDiff", (it) => {
  it.effect("adds the chat-diff columns and stays idempotent", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 43 });

      const before = yield* sql<{ readonly name: string }>`
        PRAGMA table_info(projection_threads)
      `;
      assert.deepStrictEqual(
        expectedColumns.filter((name) => before.some((column) => column.name === name)),
        [],
      );

      yield* migration;
      yield* migration;

      const after = yield* sql<{ readonly name: string }>`
        PRAGMA table_info(projection_threads)
      `;
      const names = new Set(after.map((column) => column.name));
      for (const expected of expectedColumns) {
        assert.isTrue(names.has(expected));
      }
    }),
  );

  it.effect("backfills ready checkpoint aggregates for existing threads", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 43 });

      yield* sql`
        INSERT INTO projection_threads (
          thread_id,
          project_id,
          title,
          model_selection_json,
          runtime_mode,
          interaction_mode,
          branch,
          worktree_path,
          latest_turn_id,
          created_at,
          updated_at,
          archived_at,
          latest_user_message_at,
          pending_approval_count,
          pending_user_input_count,
          has_actionable_proposed_plan,
          deleted_at
        )
        VALUES
          (
            'thread-with-ready-checkpoints',
            'project-1',
            'Ready checkpoints',
            '{"provider":"codex","model":"gpt-5"}',
            'full-access',
            'default',
            NULL,
            NULL,
            'turn-3',
            '2026-08-27T00:00:00.000Z',
            '2026-08-27T00:03:00.000Z',
            NULL,
            NULL,
            0,
            0,
            0,
            NULL
          ),
          (
            'thread-without-ready-checkpoints',
            'project-1',
            'No ready checkpoints',
            '{"provider":"codex","model":"gpt-5"}',
            'full-access',
            'default',
            NULL,
            NULL,
            NULL,
            '2026-08-27T00:00:00.000Z',
            '2026-08-27T00:00:00.000Z',
            NULL,
            NULL,
            0,
            0,
            0,
            NULL
          )
      `;

      const firstReadyFiles = JSON.stringify([
        { path: "z.ts", kind: "modified", additions: 2, deletions: 1 },
        { path: "a.ts", kind: "added", additions: 5, deletions: 0 },
      ]);
      const secondReadyFiles = JSON.stringify([
        { path: "z.ts", kind: "deleted", additions: 3, deletions: 4 },
      ]);
      const missingFiles = JSON.stringify([
        { path: "ignored.ts", kind: "modified", additions: 99, deletions: 99 },
      ]);

      yield* sql`
        INSERT INTO projection_turns (
          thread_id,
          turn_id,
          state,
          requested_at,
          completed_at,
          checkpoint_turn_count,
          checkpoint_ref,
          checkpoint_status,
          checkpoint_files_json
        )
        VALUES
          (
            'thread-with-ready-checkpoints',
            'turn-1',
            'completed',
            '2026-08-27T00:01:00.000Z',
            '2026-08-27T00:01:00.000Z',
            1,
            'refs/rune/checkpoints/thread/turn/1',
            'ready',
            ${firstReadyFiles}
          ),
          (
            'thread-with-ready-checkpoints',
            'turn-2',
            'completed',
            '2026-08-27T00:02:00.000Z',
            '2026-08-27T00:02:00.000Z',
            2,
            'refs/rune/checkpoints/thread/turn/2',
            'ready',
            ${secondReadyFiles}
          ),
          (
            'thread-with-ready-checkpoints',
            'turn-3',
            'completed',
            '2026-08-27T00:03:00.000Z',
            '2026-08-27T00:03:00.000Z',
            3,
            'refs/rune/checkpoints/thread/turn/3',
            'missing',
            ${missingFiles}
          )
      `;

      yield* migration;

      const rows = yield* sql<{
        readonly threadId: string;
        readonly baselineCheckpointRef: string | null;
        readonly baselineCapturedAt: string | null;
        readonly baselineSource: string | null;
        readonly chatDiffJson: string;
        readonly chatDiffThroughTurnCount: number;
        readonly fileOwnershipJson: string;
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

      assert.deepStrictEqual(
        rows.map((row) => ({
          ...row,
          chatDiffJson: JSON.parse(row.chatDiffJson),
          fileOwnershipJson: JSON.parse(row.fileOwnershipJson),
        })),
        [
          {
            threadId: "thread-with-ready-checkpoints",
            baselineCheckpointRef: null,
            baselineCapturedAt: null,
            baselineSource: null,
            chatDiffJson: [
              { path: "a.ts", kind: "added", additions: 5, deletions: 0 },
              { path: "z.ts", kind: "modified", additions: 5, deletions: 5 },
            ],
            chatDiffThroughTurnCount: 2,
            fileOwnershipJson: [
              {
                path: "a.ts",
                owners: [
                  {
                    threadId: "thread-with-ready-checkpoints",
                    throughTurnCount: 1,
                    additions: 5,
                    deletions: 0,
                  },
                ],
              },
              {
                path: "z.ts",
                owners: [
                  {
                    threadId: "thread-with-ready-checkpoints",
                    throughTurnCount: 2,
                    additions: 5,
                    deletions: 5,
                  },
                ],
              },
            ],
          },
          {
            threadId: "thread-without-ready-checkpoints",
            baselineCheckpointRef: null,
            baselineCapturedAt: null,
            baselineSource: null,
            chatDiffJson: [],
            chatDiffThroughTurnCount: 0,
            fileOwnershipJson: [],
          },
        ],
      );
    }),
  );

  it.effect("registers migration 44 in numeric order", () =>
    Effect.sync(() => {
      assert.deepStrictEqual(migrationManifest.at(-1), [44, "ProjectionThreadsChatDiff"]);
    }),
  );
});
