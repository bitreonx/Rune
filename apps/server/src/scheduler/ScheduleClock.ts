import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Context from "effect/Context";

import { ScheduleDateTime } from "@rune/contracts";

export interface ScheduleClockShape {
  readonly now: Effect.Effect<ScheduleDateTime>;
  readonly sleepUntil: (at: ScheduleDateTime) => Effect.Effect<void>;
}

const now = DateTime.now.pipe(Effect.map(DateTime.formatIso));

const sleepUntil = (at: ScheduleDateTime) =>
  Effect.gen(function* () {
    const current = yield* now;
    const milliseconds = Date.parse(at) - Date.parse(current);
    if (milliseconds > 0) yield* Effect.sleep(Duration.millis(milliseconds));
  });

export class ScheduleClock extends Context.Service<ScheduleClock, ScheduleClockShape>()(
  "rune/scheduler/ScheduleClock",
) {}

export const ScheduleClockLive = Layer.succeed(ScheduleClock, { now, sleepUntil });
