import { it } from "@effect/vitest";
import { expect } from "vite-plus/test";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { SqlitePersistenceMemory } from "../Layers/Sqlite.ts";

it.layer(SqlitePersistenceMemory)("Pocket events migration", (it) => {
  it.effect("creates the append-only event table", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pocket_events'
      `;
      expect(rows.map((row) => row.name)).toContain("pocket_events");
    }),
  );
});
