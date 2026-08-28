import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS pocket_events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      event_type TEXT NOT NULL,
      event_json TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      UNIQUE (event_id)
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS pocket_events_type_sequence
    ON pocket_events (event_type, sequence)
  `;
});
