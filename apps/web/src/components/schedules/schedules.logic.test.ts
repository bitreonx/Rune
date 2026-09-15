import { describe, expect, it } from "@effect/vitest";

import {
  formatDuration,
  formatScheduleStatus,
  localDateTimeToIso,
} from "./schedules.logic";

describe("schedule presentation helpers", () => {
  it("formats recurrence durations without losing useful units", () => {
    expect(formatDuration(60)).toBe("1 minute");
    expect(formatDuration(7_200)).toBe("2 hours");
    expect(formatDuration(86_400)).toBe("1 day");
    expect(formatDuration(65)).toBe("65 seconds");
  });

  it("capitalizes schedule statuses for compact badges", () => {
    expect(formatScheduleStatus("paused")).toBe("Paused");
    expect(formatScheduleStatus("completed")).toBe("Completed");
  });

  it("normalizes local form values to UTC and rejects empty input", () => {
    expect(localDateTimeToIso("")).toBeNull();
    expect(localDateTimeToIso("not-a-date")).toBeNull();
    expect(localDateTimeToIso("2026-01-02T03:04")).toMatch(
      /^2026-01-02T\d{2}:04:00\.000Z$/u,
    );
  });
});
