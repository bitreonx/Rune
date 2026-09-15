import { it } from "@effect/vitest";
import { expect } from "vite-plus/test";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrationManifest } from "../Migrations.ts";
import { SqlitePersistenceMemory } from "../Layers/Sqlite.ts";

it.layer(SqlitePersistenceMemory)("Schedules migration", (it) => {
  it.effect("registers and creates the durable schedule tables", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const tables = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'table'
          AND name IN ('schedules', 'schedule_events', 'schedule_runs', 'schedule_command_receipts', 'schedule_dispatch_outbox')
      `;
      expect(tables.map(({ name }) => name)).toEqual(expect.arrayContaining([
        "schedules",
        "schedule_events",
        "schedule_runs",
        "schedule_command_receipts",
        "schedule_dispatch_outbox",
      ]));
      expect(migrationManifest).toContainEqual([55, "Schedules"]);

      const uniqueIndexes = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'schedule_runs'
      `;
      expect(uniqueIndexes.map(({ name }) => name).join(" ")).toContain("sqlite_autoindex_schedule_runs");
    }),
  );

  it.effect("guards the event log against updates and deletes", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
        INSERT INTO schedule_events (environment_id, schedule_id, kind, at)
        VALUES ('environment:test', 'schedule:test', 'created', '2026-09-11T00:00:00.000Z')
      `;
      const updateExit = yield* Effect.exit(
        sql`UPDATE schedule_events SET kind = 'updated' WHERE sequence = 1`,
      );
      expect(updateExit._tag).toBe("Failure");
      const deleteExit = yield* Effect.exit(
        sql`DELETE FROM schedule_events WHERE sequence = 1`,
      );
      expect(deleteExit._tag).toBe("Failure");
    }),
  );
});
