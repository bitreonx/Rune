import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { ScheduleAccessScope, ScheduleCreateInput } from "@rune/contracts";
import { ScheduleRegistry } from "./ScheduleRegistry.ts";
import { ScheduleRegistryLive } from "../Layers/ScheduleRegistry.ts";
import { SqlitePersistenceMemory } from "../Layers/Sqlite.ts";

const registryLayer = ScheduleRegistryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory));
const scope = Schema.decodeUnknownSync(ScheduleAccessScope)({ environmentId: "environment:test" });
const createInput = Schema.decodeUnknownSync(ScheduleCreateInput)({
  idempotencyKey: "request:schedule:create",
  name: "Hourly review",
  environmentId: scope.environmentId,
  trigger: { type: "interval", firstRunAt: "2026-01-01T00:00:00.000Z", everySeconds: 3_600 },
  target: { type: "prompt", threadId: "thread:test", prompt: "Review the latest changes." },
  policy: { approvalPolicy: "inherit", allowProviderFallback: false, catchUp: "coalesce-one" },
  displayTimeZone: "UTC",
});

describe("ScheduleRegistry", () => {
  it.effect("creates idempotently and filters by authorized environment", () =>
    Effect.gen(function* () {
      const registry = yield* ScheduleRegistry;
      const first = yield* registry.create(scope, createInput, "user");
      const retry = yield* registry.create(scope, createInput, "user");
      expect(retry).toEqual(first);
      expect((yield* registry.list(scope, {})).schedules).toHaveLength(1);
      const otherScope = Schema.decodeUnknownSync(ScheduleAccessScope)({ environmentId: "environment:other" });
      const other = yield* Effect.exit(registry.get(otherScope, { scheduleId: first.schedule.id }));
      expect(other._tag).toBe("Failure");
    }).pipe(Effect.provide(registryLayer)),
  );

  it.effect("claims one occurrence and leaves recurrence unchanged for run-now", () =>
    Effect.gen(function* () {
      const registry = yield* ScheduleRegistry;
      const created = yield* registry.create(scope, createInput, "agent");
      const claimed = yield* registry.claimDueRun({
        scope,
        scheduleId: created.schedule.id,
        scheduledFor: createInput.trigger.type === "interval" ? createInput.trigger.firstRunAt : "2026-01-01T00:00:00.000Z",
        now: "2026-01-01T00:01:00.000Z",
        leaseOwner: "runner:test",
        leaseForSeconds: 60,
      });
      expect(claimed.trigger).toBe("scheduled");
      const before = yield* registry.get(scope, { scheduleId: created.schedule.id });
      const manual = yield* registry.runNow(scope, { scheduleId: created.schedule.id, idempotencyKey: "request:schedule:manual" });
      expect(manual.run.trigger).toBe("manual");
      const after = yield* registry.get(scope, { scheduleId: created.schedule.id });
      expect(after.claimedRunCount).toBe(before.claimedRunCount);
      expect(after.nextRunAt).toBe(before.nextRunAt);
    }).pipe(Effect.provide(registryLayer)),
  );
});
