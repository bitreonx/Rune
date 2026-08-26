import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("043_ProjectionThreadsTemporaryDeletionSnooze", (it) => {
  it.effect("applies migration 43 to a fresh database and stays idempotent", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 42 });

      const before = yield* sql<{ readonly name: string }>`
        PRAGMA table_info(projection_threads)
      `;
      assert.isFalse(before.some((column) => column.name === "temporary_deletion_snoozed_until"));

      const applied = yield* runMigrations({ toMigrationInclusive: 43 });
      assert.deepEqual(applied, [[43, "ProjectionThreadsTemporaryDeletionSnooze"]]);

      const repeated = yield* runMigrations({ toMigrationInclusive: 43 });
      assert.deepEqual(repeated, []);

      const after = yield* sql<{ readonly name: string }>`
        PRAGMA table_info(projection_threads)
      `;
      assert.isTrue(after.some((column) => column.name === "temporary_deletion_snoozed_until"));
    }),
  );
});
