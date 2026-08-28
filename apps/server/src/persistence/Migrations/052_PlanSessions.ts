import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** One provider-neutral plan document per thread, with a server-owned revision. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS plan_sessions (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL,
      session_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS plan_sessions_thread_lookup
    ON plan_sessions (thread_id)
  `;
});
