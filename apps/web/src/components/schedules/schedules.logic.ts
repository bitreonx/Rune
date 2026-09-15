import type { ScheduleTrigger, ScheduleStatus } from "@rune/contracts";

export function formatScheduleTrigger(
  trigger: ScheduleTrigger,
  displayTimeZone: string,
): string {
  const timeZoneFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: displayTimeZone,
  });
  if (trigger.type === "once") {
    return `Once · ${timeZoneFormatter.format(new Date(trigger.runAt))}`;
  }
  return `Every ${formatDuration(trigger.everySeconds)} · starting ${timeZoneFormatter.format(
    new Date(trigger.firstRunAt),
  )}`;
}

export function formatScheduleNextRun(
  nextRunAt: string | null,
  displayTimeZone: string,
): string {
  if (nextRunAt === null) return "No further runs";
  return `${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: displayTimeZone,
  }).format(new Date(nextRunAt))} (${displayTimeZone})`;
}

export function formatDuration(seconds: number): string {
  if (seconds % 86_400 === 0) return `${seconds / 86_400} day${seconds === 86_400 ? "" : "s"}`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600} hour${seconds === 3_600 ? "" : "s"}`;
  if (seconds % 60 === 0) return `${seconds / 60} minute${seconds === 60 ? "" : "s"}`;
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

export function formatScheduleStatus(status: ScheduleStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Converts a browser-local datetime-local value to the UTC wire format. */
export function localDateTimeToIso(value: string): string | null {
  if (value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
