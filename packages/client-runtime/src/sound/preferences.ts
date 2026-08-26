export type SoundEventId =
  | "done"
  | "needs-input"
  | "error"
  | "click"
  | "switch-on"
  | "switch-off"
  | "copy"
  | "sent";

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
  /**
   * Chosen flavor per event, when the user picked one. Absent means the
   * default variant; unknown ids fall back to the default at playback.
   */
  readonly variants: Readonly<Partial<Record<SoundEventId, string>>>;
  /** Whether unfocused-window attention edges may raise an OS banner. */
  readonly notifications: boolean;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.6,
  events: {
    done: true,
    "needs-input": true,
    error: true,
    click: true,
    "switch-on": true,
    "switch-off": true,
    copy: true,
    sent: true,
  },
  variants: {},
  notifications: true,
};

/** Stored volumes come from JSON and sliders; both can stray out of range. */
export function clampVolume(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SOUND_PREFERENCES.volume;
  return Math.min(1, Math.max(0, value));
}

/**
 * Slider position to output gain. Loudness is roughly the square of amplitude,
 * so a linear slider bunches every audible step at the top; squaring spreads
 * the useful range back out and makes 50% feel like half.
 */
export function volumeCurve(volume: number): number {
  const clamped = clampVolume(volume);
  return clamped * clamped;
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
  // Variant ids are validated only as strings here; whether an id names a
  // real variant is playback's concern, and it falls back to the default.
  const variants = Object.fromEntries(
    Object.entries(
      typeof record.variants === "object" && record.variants !== null
        ? (record.variants as Record<string, unknown>)
        : {},
    ).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const volume =
    typeof record.volume === "number" ? clampVolume(record.volume) : DEFAULT_SOUND_PREFERENCES.volume;
  return {
    enabled: sanitizeFlag(record.enabled, DEFAULT_SOUND_PREFERENCES.enabled),
    volume,
    events,
    variants,
    notifications: sanitizeFlag(record.notifications, DEFAULT_SOUND_PREFERENCES.notifications),
  };
}

export function resolveEventEnabled(
  preferences: SoundPreferences,
  event: SoundEventId,
): boolean {
  return preferences.enabled && preferences.events[event];
}
