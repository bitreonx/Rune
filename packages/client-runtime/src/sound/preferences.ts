export type SoundEventId = "done" | "needs-input" | "error" | "click";

/**
 * Per-device sound preferences. Deliberately local-only state: speakers,
 * OS volume, and tolerance for audible UI differ between a laptop, a phone
 * driving the same server, and a headless machine.
 */
export interface SoundPreferences {
  /** Master switch. Off silences every event regardless of per-event rows. */
  readonly enabled: boolean;
  /** 0..1, applied to every effect. */
  readonly volume: number;
  readonly events: Readonly<Record<SoundEventId, boolean>>;
  /** Whether unfocused-window attention edges may raise an OS banner. */
  readonly notifications: boolean;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.6,
  events: { done: true, "needs-input": true, error: true, click: true },
  notifications: true,
};

/** Stored volumes come from JSON and sliders; both can stray out of range. */
export function clampVolume(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SOUND_PREFERENCES.volume;
  return Math.min(1, Math.max(0, value));
}

function sanitizeFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Coerces whatever an older or hand-edited localStorage left behind into a
 * complete SoundPreferences. Unknown shapes never reach playback: every
 * mistyped field falls back to its default so a corrupt write can only ever
 * reset the user to defaults, not break the store.
 */
export function sanitizeSoundPreferences(input: unknown): SoundPreferences {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return DEFAULT_SOUND_PREFERENCES;
  }
  const record = input as Record<string, unknown>;
  const storedEvents =
    typeof record.events === "object" && record.events !== null
      ? (record.events as Record<string, unknown>)
      : {};
  const events = Object.fromEntries(
    (Object.keys(DEFAULT_SOUND_PREFERENCES.events) as SoundEventId[]).map((event) => [
      event,
      sanitizeFlag(storedEvents[event], true),
    ]),
  ) as Record<SoundEventId, boolean>;
  const volume =
    typeof record.volume === "number" ? clampVolume(record.volume) : DEFAULT_SOUND_PREFERENCES.volume;
  return {
    enabled: sanitizeFlag(record.enabled, DEFAULT_SOUND_PREFERENCES.enabled),
    volume,
    events,
    notifications: sanitizeFlag(record.notifications, DEFAULT_SOUND_PREFERENCES.notifications),
  };
}

export function resolveEventEnabled(
  preferences: SoundPreferences,
  event: SoundEventId,
): boolean {
  return preferences.enabled && preferences.events[event];
}
