import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ScheduleRegistry } from "../Services/ScheduleRegistry.ts";
import { ScheduleRegistryLive } from "./ScheduleRegistry.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

it.effect("ScheduleRegistryLive exposes a cursor-bearing snapshot", () =>
  Effect.gen(function* () {
    const registry = yield* ScheduleRegistry;
    const snapshot = yield* registry.subscription(
      { environmentId: "environment:empty" },
      { afterSequence: 0 },
    );
    expect(snapshot.type).toBe("snapshot");
    expect(snapshot.sequence).toBe(0);
    expect(snapshot.schedules).toEqual([]);
    expect(snapshot.runs).toEqual([]);
  }).pipe(Effect.provide(ScheduleRegistryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)))),
);
