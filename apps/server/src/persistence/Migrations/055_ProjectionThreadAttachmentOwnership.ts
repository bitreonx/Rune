import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** Backfills exact source-thread ownership for finalized attachments created before ID binding. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
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
  }
});
