/**
 * Stores the non-secret routing pins captured when a provider session starts.
 *
 * The columns are nullable because legacy sessions do not have a compiled
 * manifest. Migration deliberately does not guess a service/profile for those
 * rows; the runtime can continue to recover the provider instance while an
 * explicit new session records complete pins.
 */
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

const routingColumns = [
  ["service_connection_id", "TEXT"],
  ["model_profile_id", "TEXT"],
  ["runtime_manifest_fingerprint", "TEXT"],
  ["runtime_manifest_version", "INTEGER"],
] as const;

const addMissingColumns = (table: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(${sql.unsafe(table)})`;
    for (const [name, type] of routingColumns) {
      if (columns.some((column) => column.name === name)) continue;
      yield* sql`ALTER TABLE ${sql.unsafe(table)} ADD COLUMN ${sql.unsafe(name)} ${sql.unsafe(type)}`;
    }
  });

export default Effect.gen(function* () {
  yield* addMissingColumns("provider_session_runtime");
  yield* addMissingColumns("projection_thread_sessions");
});
