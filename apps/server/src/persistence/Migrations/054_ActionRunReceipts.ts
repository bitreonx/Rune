import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** Stores the redacted, provider-neutral action lifecycle receipt beside run metadata. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`ALTER TABLE action_run_history ADD COLUMN receipt_json TEXT`;
});
