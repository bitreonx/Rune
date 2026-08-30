import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** Creates and backfills server-owned attachment ownership for all existing installations. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS attachment_ownership (
      attachment_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      ambiguous INTEGER NOT NULL DEFAULT 0
    )
  `;
  const rows = yield* sql<{
    readonly messageId: string;
    readonly threadId: string;
    readonly attachmentsJson: string | null;
  }>`
    SELECT
      message_id AS "messageId",
      thread_id AS "threadId",
      attachments_json AS "attachmentsJson"
    FROM projection_thread_messages
    WHERE attachments_json IS NOT NULL
  `;

  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.attachmentsJson ?? "null");
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    let changed = false;
    const next = parsed.map((attachment) => {
      if (
        !attachment ||
        typeof attachment !== "object" ||
        Array.isArray(attachment) ||
        !(["image", "file"] as readonly unknown[]).includes(
          (attachment as { readonly type?: unknown }).type,
        ) ||
        typeof (attachment as { readonly ownerThreadId?: unknown }).ownerThreadId === "string"
      ) {
        return attachment;
      }
      changed = true;
      return { ...attachment, ownerThreadId: row.threadId };
    });

    if (changed) {
      yield* sql`
        UPDATE projection_thread_messages
        SET attachments_json = ${JSON.stringify(next)}
        WHERE message_id = ${row.messageId}
      `;
    }

    for (const attachment of next) {
      if (
        !attachment ||
        typeof attachment !== "object" ||
        Array.isArray(attachment) ||
        !(["image", "file"] as readonly unknown[]).includes(
          (attachment as { readonly type?: unknown }).type,
        ) ||
        typeof (attachment as { readonly id?: unknown }).id !== "string"
      ) {
        continue;
      }
      const attachmentId = (attachment as { readonly id: string }).id;
      yield* sql`
        INSERT INTO attachment_ownership (attachment_id, thread_id, ambiguous)
        VALUES (${attachmentId}, ${row.threadId}, 0)
        ON CONFLICT (attachment_id) DO UPDATE SET
          ambiguous = CASE
            WHEN attachment_ownership.thread_id <> excluded.thread_id THEN 1
            ELSE attachment_ownership.ambiguous
          END
      `;
    }
  }
});
