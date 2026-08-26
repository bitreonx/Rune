import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Ref from "effect/Ref";
import { describe, expect, it } from "@effect/vitest";

import { scheduleToolCalls, type ScheduledToolCall } from "./ApiToolScheduler.ts";

const call = (id: string, mutation = false): ScheduledToolCall => ({
  id,
  name: mutation ? "edit_file" : "read_file",
  arguments: {},
  mutation,
});

describe("ApiToolScheduler", () => {
  it.effect("runs safe calls concurrently and returns observations in input order", () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      const active = yield* Ref.make(0);
      const maximum = yield* Ref.make(0);

      const fiber = yield* scheduleToolCalls([call("a"), call("b")], {
        maxConcurrentSafeTools: 8,
        execute: (toolCall) =>
          Effect.gen(function* () {
            const next = yield* Ref.updateAndGet(active, (value) => value + 1);
            yield* Ref.update(maximum, (value) => Math.max(value, next));
            if (next === 2) yield* Deferred.succeed(started, undefined);
            yield* Deferred.await(release);
            yield* Ref.update(active, (value) => value - 1);
            return `result-${toolCall.id}`;
          }),
      }).pipe(Effect.forkChild);

      yield* Deferred.await(started);
      expect(yield* Ref.get(maximum)).toBe(2);
      yield* Deferred.succeed(release, undefined);

      expect(yield* Fiber.join(fiber)).toEqual([
        { id: "a", content: "result-a" },
        { id: "b", content: "result-b" },
      ]);
    }),
  );

  it.effect("keeps mutation calls ordered after safe calls", () =>
    Effect.gen(function* () {
      const order: string[] = [];
      const result = yield* scheduleToolCalls([call("read"), call("write", true)], {
        maxConcurrentSafeTools: 8,
        execute: (toolCall) =>
          Effect.sync(() => {
            order.push(toolCall.id);
            return `result-${toolCall.id}`;
          }),
      });

      expect(order).toEqual(["read", "write"]);
      expect(result).toEqual([
        { id: "read", content: "result-read" },
        { id: "write", content: "result-write" },
      ]);
    }),
  );
});
