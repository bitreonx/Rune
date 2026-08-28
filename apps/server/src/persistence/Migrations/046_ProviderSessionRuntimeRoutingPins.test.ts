import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrationManifest, runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("046_ProviderSessionRuntimeRoutingPins", (it) => {
  it.effect("adds nullable routing pin columns to both runtime projections", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 45 });
      yield* runMigrations({ toMigrationInclusive: 46 });
      yield* runMigrations({ toMigrationInclusive: 46 });

      const expected = [
        "service_connection_id",
        "model_profile_id",
        "runtime_manifest_fingerprint",
        "runtime_manifest_version",
      ];
      for (const table of ["provider_session_runtime", "projection_thread_sessions"]) {
        const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(${sql.unsafe(table)})`;
        for (const name of expected) {
          assert.isTrue(
            columns.some((column) => column.name === name),
            `${table} is missing ${name}`,
          );
        }
      }

      assert.deepStrictEqual(
        migrationManifest.find(([id]) => id === 46),
        [46, "ProviderSessionRuntimeRoutingPins"],
      );
    }),
  );
});
