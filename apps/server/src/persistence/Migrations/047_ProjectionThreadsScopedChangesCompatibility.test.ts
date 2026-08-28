// @effect-diagnostics nodeBuiltinImport:off - This test reopens a real SQLite file to prove restart persistence.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrationManifest, runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import migration from "./047_ProjectionThreadsScopedChangesCompatibility.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("047_ProjectionThreadsScopedChangesCompatibility", (it) => {
  it.effect("repairs malformed scoped changes and incomplete baselines", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 46 });

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
          baseline_checkpoint_ref,
          baseline_captured_at,
          baseline_source,
          chat_diff_json,
          chat_diff_through_turn_count,
          file_ownership_json,
          created_at,
          updated_at,
          archived_at,
          latest_user_message_at,
          pending_approval_count,
          pending_user_input_count,
          has_actionable_proposed_plan,
          deleted_at
        )
        VALUES (
          'thread-malformed-scoped-changes',
          'project-1',
          'Malformed scoped changes',
          '{"provider":"codex","model":"gpt-5"}',
          'full-access',
          'default',
          NULL,
          NULL,
          'turn-1',
          'refs/rune/checkpoints/thread-malformed/base',
          NULL,
          'invalid-source',
          '{',
          -1,
          'null',
          '2026-08-28T00:00:00.000Z',
          '2026-08-28T00:00:01.000Z',
          NULL,
          NULL,
          0,
          0,
          0,
          NULL
        )
      `;
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
        VALUES (
          'thread-malformed-scoped-changes',
          'turn-1',
          'completed',
          '2026-08-28T00:00:01.000Z',
          '2026-08-28T00:00:01.000Z',
          1,
          'refs/rune/checkpoints/thread-malformed/1',
          'ready',
          '[{"path":"src/recovered.ts","kind":"added","additions":2,"deletions":0}]'
        )
      `;
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
        VALUES (
          'thread-malformed-scoped-changes',
          'turn-2',
          'completed',
          '2026-08-28T00:00:02.000Z',
          '2026-08-28T00:00:02.000Z',
          2,
          'refs/rune/checkpoints/thread-malformed/2',
          'ready',
          '{malformed-checkpoint-json'
        )
      `;

      yield* migration;

      const rows = yield* sql<{
        readonly baselineCheckpointRef: string | null;
        readonly baselineCapturedAt: string | null;
        readonly baselineSource: string | null;
        readonly chatDiffJson: string;
        readonly chatDiffThroughTurnCount: number;
        readonly fileOwnershipJson: string;
      }>`
        SELECT
          baseline_checkpoint_ref AS "baselineCheckpointRef",
          baseline_captured_at AS "baselineCapturedAt",
          baseline_source AS "baselineSource",
          chat_diff_json AS "chatDiffJson",
          chat_diff_through_turn_count AS "chatDiffThroughTurnCount",
          file_ownership_json AS "fileOwnershipJson"
        FROM projection_threads
        WHERE thread_id = 'thread-malformed-scoped-changes'
      `;

      assert.deepStrictEqual(rows, [
        {
          baselineCheckpointRef: null,
          baselineCapturedAt: null,
          baselineSource: null,
          chatDiffJson: '[{"path":"src/recovered.ts","kind":"added","additions":2,"deletions":0}]',
          chatDiffThroughTurnCount: 2,
          fileOwnershipJson:
            '[{"path":"src/recovered.ts","owners":[{"threadId":"thread-malformed-scoped-changes","throughTurnCount":1,"additions":2,"deletions":0}]}]',
        },
      ]);

      yield* migration;
      assert.deepStrictEqual(
        migrationManifest.find(([id]) => id === 47),
        [47, "ProjectionThreadsScopedChangesCompatibility"],
      );
    }),
  );

  it.effect("keeps repaired scoped state after reopening the SQLite database", () => {
    const tempDir = NodeFS.mkdtempSync(
      NodePath.join(NodeOS.tmpdir(), "rune-scoped-state-restart-"),
    );
    const dbPath = NodePath.join(tempDir, "state.sqlite");

    return Effect.gen(function* () {
      yield* Effect.scoped(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* runMigrations({ toMigrationInclusive: 46 });
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
              baseline_checkpoint_ref,
              baseline_captured_at,
              baseline_source,
              chat_diff_json,
              chat_diff_through_turn_count,
              file_ownership_json,
              created_at,
              updated_at,
              archived_at,
              latest_user_message_at,
              pending_approval_count,
              pending_user_input_count,
              has_actionable_proposed_plan,
              deleted_at
            )
            VALUES (
              'thread-restart-compatibility',
              'project-1',
              'Restart compatibility',
              '{"provider":"codex","model":"gpt-5"}',
              'full-access',
              'default',
              NULL,
              NULL,
              NULL,
              'legacy-baseline-ref',
              NULL,
              'invalid-source',
              '{',
              -1,
              'null',
              '2026-08-28T00:00:00.000Z',
              '2026-08-28T00:00:01.000Z',
              NULL,
              NULL,
              0,
              0,
              0,
              NULL
            )
          `;
          yield* runMigrations();
        }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: dbPath }))),
      );

      const rows = yield* Effect.scoped(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          return yield* sql<{
            readonly baselineCheckpointRef: string | null;
            readonly baselineCapturedAt: string | null;
            readonly baselineSource: string | null;
            readonly chatDiffJson: string | null;
            readonly chatDiffThroughTurnCount: number | null;
            readonly fileOwnershipJson: string | null;
          }>`
            SELECT
              baseline_checkpoint_ref AS "baselineCheckpointRef",
              baseline_captured_at AS "baselineCapturedAt",
              baseline_source AS "baselineSource",
              chat_diff_json AS "chatDiffJson",
              chat_diff_through_turn_count AS "chatDiffThroughTurnCount",
              file_ownership_json AS "fileOwnershipJson"
            FROM projection_threads
            WHERE thread_id = 'thread-restart-compatibility'
          `;
        }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: dbPath }))),
      );

      assert.deepStrictEqual(rows, [
        {
          baselineCheckpointRef: null,
          baselineCapturedAt: null,
          baselineSource: null,
          chatDiffJson: "[]",
          chatDiffThroughTurnCount: 0,
          fileOwnershipJson: "[]",
        },
      ]);
    }).pipe(
      Effect.ensuring(Effect.sync(() => NodeFS.rmSync(tempDir, { recursive: true, force: true }))),
    );
  });
});
