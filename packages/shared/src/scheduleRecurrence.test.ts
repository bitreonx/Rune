import { describe, expect, it } from "vite-plus/test";

import {
  nextScheduleOccurrence,
  resolveMissedOccurrence,
} from "./scheduleRecurrence.js";

const hourly = {
  type: "interval" as const,
  firstRunAt: "2026-03-08T06:30:00.000Z",
  everySeconds: 3_600,
};

describe("schedule recurrence", () => {
  it("returns a one-time occurrence only before its scheduled instant", () => {
    const trigger = { type: "once" as const, runAt: "2026-03-08T06:30:00.000Z" };
    expect(nextScheduleOccurrence({ trigger, after: "2026-03-08T06:29:59.000Z", claimedRunCount: 0 })).toEqual({
      status: "next",
      at: trigger.runAt,
    });
    expect(nextScheduleOccurrence({ trigger, after: trigger.runAt, claimedRunCount: 1 })).toEqual({
      status: "completed",
    });
  });

  it("uses elapsed UTC seconds across daylight-saving transitions", () => {
    expect(nextScheduleOccurrence({
      trigger: hourly,
      after: "2026-03-08T06:30:00.000Z",
      claimedRunCount: 1,
    })).toEqual({ status: "next", at: "2026-03-08T07:30:00.000Z" });
    expect(nextScheduleOccurrence({
      trigger: hourly,
      after: "2026-11-01T05:30:00.000Z",
      claimedRunCount: 1,
    })).toEqual({ status: "next", at: "2026-11-01T06:30:00.000Z" });
  });

  it("does not fire an interval before its explicit firstRunAt", () => {
    expect(nextScheduleOccurrence({
      trigger: hourly,
      after: "2026-03-08T05:30:00.000Z",
      claimedRunCount: 0,
    })).toEqual({ status: "next", at: hourly.firstRunAt });
  });

  it("resolves missed intervals to one bounded decision after restart", () => {
    expect(resolveMissedOccurrence({
      trigger: hourly,
      lastScheduledFor: null,
      now: "2026-03-08T09:45:00.000Z",
      catchUp: "skip",
      claimedRunCount: 0,
    })).toEqual({ status: "skip", nextRunAt: "2026-03-08T10:30:00.000Z" });
    expect(resolveMissedOccurrence({
      trigger: hourly,
      lastScheduledFor: "2026-03-08T07:30:00.000Z",
      now: "2026-03-08T09:45:00.000Z",
      catchUp: "coalesce-one",
      claimedRunCount: 1,
    })).toEqual({
      status: "coalesce-one",
      scheduledFor: "2026-03-08T09:30:00.000Z",
      nextRunAt: "2026-03-08T10:30:00.000Z",
    });
    expect(resolveMissedOccurrence({
      trigger: hourly,
      lastScheduledFor: null,
      now: "2026-03-08T06:00:00.000Z",
      catchUp: "coalesce-one",
      claimedRunCount: 0,
    })).toEqual({ status: "none", nextRunAt: hourly.firstRunAt });
  });

  it("stops recurrence when maxRuns has consumed all durable intents", () => {
    expect(nextScheduleOccurrence({
      trigger: hourly,
      after: hourly.firstRunAt,
      claimedRunCount: 3,
      maxRuns: 3,
    })).toEqual({ status: "completed" });
    expect(resolveMissedOccurrence({
      trigger: hourly,
      lastScheduledFor: null,
      now: "2026-03-08T09:45:00.000Z",
      catchUp: "coalesce-one",
      claimedRunCount: 2,
      maxRuns: 2,
    })).toEqual({ status: "completed" });
  });

  it("never treats a manual run-now as a recurrence occurrence", () => {
    const scheduleBefore = {
      nextRunAt: hourly.firstRunAt,
      claimedRunCount: 4,
    };
    const manualRun = { trigger: "manual" as const, scheduledFor: "2026-03-08T12:00:00.000Z" };
    expect(manualRun.trigger).toBe("manual");
    expect(scheduleBefore).toEqual({ nextRunAt: hourly.firstRunAt, claimedRunCount: 4 });
  });
});
