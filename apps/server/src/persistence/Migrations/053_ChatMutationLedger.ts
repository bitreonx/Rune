import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS chat_mutation_ledger (
      operation_id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      paths_json TEXT NOT NULL CHECK (json_valid(paths_json)),
      patch_hash TEXT NOT NULL,
      actor TEXT NOT NULL,
      agent_id TEXT,
      checkpoint_ref TEXT,
      before_hash TEXT,
      after_hash TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'settled', 'failed', 'cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      settled_at TEXT,
      settled_by TEXT,
      CHECK ((status = 'pending' AND settled_at IS NULL) OR
        (status <> 'pending' AND settled_at IS NOT NULL))
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS chat_mutation_ledger_thread_created
    ON chat_mutation_ledger (thread_id, created_at, operation_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS chat_mutation_ledger_chat_created
    ON chat_mutation_ledger (chat_id, created_at, operation_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS chat_mutation_ledger_branch_created
    ON chat_mutation_ledger (branch_id, created_at, operation_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS chat_mutation_ledger_status_created
    ON chat_mutation_ledger (status, created_at, operation_id)
  `;
});
