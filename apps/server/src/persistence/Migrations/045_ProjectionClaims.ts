import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

// Claims are derived data: a projection of the orchestration events, safe to
// regenerate. message_raw preserves the provider-native runtime event payload
// beside the harness-neutral message projection so cross-thread expansion can
// return the source dialect.
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS projection_claims (
      claim_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      message_ids_json TEXT NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      refs_json TEXT NOT NULL,
      confidence REAL NOT NULL,
      verified INTEGER NULL,
      extraction_model TEXT NOT NULL,
      extracted_at INTEGER NOT NULL,
      stale INTEGER NOT NULL DEFAULT 0,
      superseded_by TEXT NULL,
      invalidation_reason TEXT NULL
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS projection_claims_thread
      ON projection_claims (thread_id, stale)
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS projection_claims_turn
      ON projection_claims (turn_id)
  `;

  yield* sql`
    CREATE VIRTUAL TABLE IF NOT EXISTS projection_claims_search USING fts5(
      claim_id UNINDEXED,
      thread_id UNINDEXED,
      project_id UNINDEXED,
      kind UNINDEXED,
      text,
      ref_paths,
      tokenize = 'porter unicode61 remove_diacritics 2'
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS projection_message_raw (
      message_id TEXT PRIMARY KEY,
      raw_source TEXT NOT NULL,
      raw_method TEXT NULL,
      raw_message_type TEXT NULL,
      raw_payload_json TEXT NULL
    )
  `;
});
