import type {
  IsoDateTime,
  ScheduleMissedOccurrenceDecision,
  ScheduleOccurrenceResult,
  ScheduleTrigger,
} from "@rune/contracts";

const SECOND_MS = 1_000;

const parseInstant = (value: IsoDateTime): number => {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new RangeError(`Invalid schedule instant: ${value}`);
  }
  return milliseconds;
};

const formatInstant = (milliseconds: number): IsoDateTime => {
  const value = new Date(milliseconds);
  if (!Number.isFinite(value.getTime())) {
    throw new RangeError(`Schedule instant is outside the supported date range: ${milliseconds}`);
  }
  return value.toISOString();
};

const hasReachedMaxRuns = (claimedRunCount: number, maxRuns: number | undefined): boolean =>
  maxRuns !== undefined && claimedRunCount >= maxRuns;

/**
 * Return the next occurrence strictly after `after`.
 *
 * Interval schedules are arithmetic over UTC instants. `displayTimeZone` is
 * deliberately absent from this input so a daylight-saving transition cannot
 * change an elapsed interval.
 */
export function nextScheduleOccurrence(input: {
  readonly trigger: ScheduleTrigger;
  readonly after: IsoDateTime;
  readonly claimedRunCount: number;
  readonly maxRuns?: number;
}): ScheduleOccurrenceResult {
  if (hasReachedMaxRuns(input.claimedRunCount, input.maxRuns)) {
    return { status: "completed" };
  }

  const after = parseInstant(input.after);

  if (input.trigger.type === "once") {
    const runAt = parseInstant(input.trigger.runAt);
    return runAt > after
      ? { status: "next", at: formatInstant(runAt) }
      : { status: "completed" };
  }

  const firstRunAt = parseInstant(input.trigger.firstRunAt);
  const intervalMs = input.trigger.everySeconds * SECOND_MS;
  if (after < firstRunAt) {
    return { status: "next", at: formatInstant(firstRunAt) };
  }

  const elapsedIntervals = Math.floor((after - firstRunAt) / intervalMs) + 1;
  return { status: "next", at: formatInstant(firstRunAt + elapsedIntervals * intervalMs) };
}

/**
 * Resolve missed work to one bounded action. The caller persists the returned
 * decision before dispatching, so a restart never requires materializing every
 * missed occurrence in memory or on the wire.
 */
export function resolveMissedOccurrence(input: {
  readonly trigger: ScheduleTrigger;
  readonly lastScheduledFor: IsoDateTime | null;
  readonly now: IsoDateTime;
  readonly catchUp: "skip" | "coalesce-one";
  readonly claimedRunCount: number;
  readonly maxRuns?: number;
}): ScheduleMissedOccurrenceDecision {
  if (hasReachedMaxRuns(input.claimedRunCount, input.maxRuns)) {
    return { status: "completed" };
  }

  const now = parseInstant(input.now);

  if (input.trigger.type === "once") {
    const runAt = parseInstant(input.trigger.runAt);
    if (now < runAt) return { status: "none", nextRunAt: formatInstant(runAt) };
    if (input.catchUp === "skip") return { status: "completed" };

    // The one-time run is still the current pointer until the durable claim is
    // committed; the registry then transitions the schedule to completed.
    return {
      status: "coalesce-one",
      scheduledFor: formatInstant(runAt),
      nextRunAt: formatInstant(runAt),
    };
  }

  const firstRunAt = parseInstant(input.trigger.firstRunAt);
  const intervalMs = input.trigger.everySeconds * SECOND_MS;
  const lowerBound = input.lastScheduledFor === null
    ? firstRunAt
    : parseInstant(input.lastScheduledFor) + intervalMs;

  if (now < lowerBound) {
    return { status: "none", nextRunAt: formatInstant(lowerBound) };
  }

  const missedIntervals = Math.floor((now - lowerBound) / intervalMs);
  const latestMissed = lowerBound + missedIntervals * intervalMs;
  const nextRunAt = latestMissed + intervalMs;

  return input.catchUp === "skip"
    ? { status: "skip", nextRunAt: formatInstant(nextRunAt) }
    : {
        status: "coalesce-one",
        scheduledFor: formatInstant(latestMissed),
        nextRunAt: formatInstant(nextRunAt),
      };
}

