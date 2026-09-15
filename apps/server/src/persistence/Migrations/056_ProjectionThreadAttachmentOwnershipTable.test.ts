import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("056_ProjectionThreadAttachmentOwnershipTable", (it) => {
  it.effect("upgrades an installation that already recorded migration 055", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 55 });

      yield* sql`
        INSERT INTO projection_thread_messages (
          message_id,
          thread_id,
          turn_id,
          role,
          text,
          attachments_json,
          is_streaming,
          created_at,
          updated_at
        ) VALUES (
          'message-ownership-backfill',
          'thread-ownership-backfill',
          NULL,
          'user',
          'historical attachments',
          ${JSON.stringify([
            {
              type: "image",
              id: "thread-ownership-backfill-00000000-0000-4000-8000-000000000001",
              name: "old.png",
              mimeType: "image/png",
              sizeBytes: 4,
            },
            {
              type: "file",
              kind: "file",
              id: "thread-ownership-backfill-00000000-0000-4000-8000-000000000002",
              name: "old.mp4",
              mimeType: "video/mp4",
              sizeBytes: 4,
            },
            { type: "thread-mention", threadId: "other-thread", title: "Other" },
          ])},
          0,
          '2026-08-30T00:00:00.000Z',
          '2026-08-30T00:00:00.000Z'
        )
      `;

      yield* sql`
        INSERT INTO projection_thread_messages (
          message_id,
          thread_id,
          turn_id,
          role,
          text,
          attachments_json,
          is_streaming,
          created_at,
          updated_at
        ) VALUES (
          'message-ownership-duplicate',
          'other-thread',
          NULL,
          'user',
          'duplicate historical attachment',
          ${JSON.stringify([
            {
              type: "image",
              id: "thread-ownership-backfill-00000000-0000-4000-8000-000000000001",
              name: "same-id.png",
              mimeType: "image/png",
              sizeBytes: 4,
            },
          ])},
          0,
          '2026-08-30T00:00:01.000Z',
          '2026-08-30T00:00:01.000Z'
        )
      `;

      yield* runMigrations();
      yield* runMigrations();

      const rows = yield* sql<{ readonly attachmentsJson: string }>`
        SELECT attachments_json AS "attachmentsJson"
        FROM projection_thread_messages
        WHERE message_id = 'message-ownership-backfill'
      `;
      assert.deepStrictEqual(JSON.parse(rows[0]!.attachmentsJson), [
        {
          type: "image",
          id: "thread-ownership-backfill-00000000-0000-4000-8000-000000000001",
          name: "old.png",
          mimeType: "image/png",
          sizeBytes: 4,
          ownerThreadId: "thread-ownership-backfill",
        },
        {
          type: "file",
          kind: "file",
          id: "thread-ownership-backfill-00000000-0000-4000-8000-000000000002",
          name: "old.mp4",
          mimeType: "video/mp4",
          sizeBytes: 4,
          ownerThreadId: "thread-ownership-backfill",
        },
        { type: "thread-mention", threadId: "other-thread", title: "Other" },
      ]);

      const ownership = yield* sql<{
        readonly attachmentId: string;
        readonly threadId: string;
        readonly ambiguous: number;
      }>`
        SELECT
          attachment_id AS "attachmentId",
          thread_id AS "threadId",
          ambiguous
        FROM attachment_ownership
        ORDER BY attachment_id ASC
      `;
      assert.lengthOf(ownership, 2);
      const duplicate = ownership.find(
        (entry) =>
          entry.attachmentId ===
          "thread-ownership-backfill-00000000-0000-4000-8000-000000000001",
      );
      const unique = ownership.find(
        (entry) =>
          entry.attachmentId ===
          "thread-ownership-backfill-00000000-0000-4000-8000-000000000002",
      );
      assert.isDefined(duplicate);
      assert.isDefined(unique);
      assert.isTrue(duplicate.threadId === "thread-ownership-backfill");
      assert.isTrue(duplicate.ambiguous === 1);
      assert.isTrue(unique.threadId === "thread-ownership-backfill");
      assert.isTrue(unique.ambiguous === 0);
    }),
  );
});
