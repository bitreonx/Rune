import { it } from "@effect/vitest";
import { expect } from "vite-plus/test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as PocketStoreModule from "./PocketStore.ts";
import { SqlitePersistenceMemory } from "../persistence/Layers/Sqlite.ts";

const storeLayer = PocketStoreModule.layer.pipe(Layer.provideMerge(SqlitePersistenceMemory));

it.layer(storeLayer)("PocketStore", (it) => {
  it.effect("persists commands and replays them into the authoritative snapshot", () =>
    Effect.gen(function* () {
      const store = yield* PocketStoreModule.PocketStore;
      const created = yield* store.dispatch({
        type: "pocket.create",
        pocket: {
          id: "pocket-a" as never,
          title: "Work",
          parentPocketId: null,
          orderKey: "a",
          archivedAt: null,
          trashedAt: null,
          createdAt: "2026-08-28T00:00:00.000Z",
          updatedAt: "2026-08-28T00:00:00.000Z",
        },
      });
      expect(created.revision).toBe(1);
      const afterMembership = yield* store.dispatch({
        type: "pocket.thread-added",
        pocketId: "pocket-a" as never,
        threadId: "thread-a" as never,
        orderKey: "a",
      });
      expect(afterMembership.threadMemberships).toHaveLength(1);
      const restarted = yield* store.snapshot();
      expect(restarted).toEqual(afterMembership);
    }),
  );
});
