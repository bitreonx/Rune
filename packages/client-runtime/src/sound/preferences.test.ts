import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_SOUND_PREFERENCES, sanitizeSoundPreferences, volumeCurve } from "./preferences.ts";

describe("sanitizeSoundPreferences", () => {
  it("falls back to defaults for missing or non-object storage", () => {
    for (const garbage of [null, undefined, "on", 42, []]) {
      expect(sanitizeSoundPreferences(garbage)).toEqual(DEFAULT_SOUND_PREFERENCES);
    }
  });

  it("keeps valid values and clamps stray ones", () => {
    // Expressed against the defaults so adding an event id later is a
    // one-file change, not an update to every fixture here.
    const events = { ...DEFAULT_SOUND_PREFERENCES.events, "needs-input": false };
    expect(
      sanitizeSoundPreferences({
        enabled: false,
        volume: 1.4,
        events,
        variants: { done: "bells", sent: "pluck" },
        notifications: false,
        inAppNotifications: true,
      }),
    ).toEqual({
      enabled: false,
      volume: 1,
      events,
      variants: { done: "bells", sent: "pluck" },
      notifications: false,
      inAppNotifications: true,
    });
  });

  it("drops mistyped variant choices instead of trusting stored JSON", () => {
    expect(
      sanitizeSoundPreferences({ variants: { done: 7, error: "thud", click: null } }).variants,
    ).toEqual({ error: "thud" });
    expect(sanitizeSoundPreferences({ variants: "loud" }).variants).toEqual({});
  });

  it("fills gaps so newly-added events default on", () => {
    const sanitized = sanitizeSoundPreferences({ volume: 0.2 });
    expect(sanitized.volume).toBe(0.2);
    expect(sanitized.enabled).toBe(true);
    expect(sanitized.events).toEqual(DEFAULT_SOUND_PREFERENCES.events);
    expect(sanitized.notifications).toBe(true);
  });

  it("coerces mistyped fields instead of trusting stored JSON", () => {
    expect(
      sanitizeSoundPreferences({
        enabled: "yes",
        volume: "loud",
        events: { done: "sure" },
        notifications: 1,
      }),
    ).toEqual(DEFAULT_SOUND_PREFERENCES);
  });
});

describe("volumeCurve", () => {
  it("keeps the endpoints exact and clamps strays", () => {
    expect(volumeCurve(0)).toBe(0);
    expect(volumeCurve(1)).toBe(1);
    expect(volumeCurve(-0.5)).toBe(0);
    expect(volumeCurve(1.5)).toBe(1);
    expect(volumeCurve(Number.NaN)).toBe(DEFAULT_SOUND_PREFERENCES.volume ** 2);
  });

  it("spreads loudness so mid slider positions feel like half", () => {
    // Squaring: half the slider is a quarter of the amplitude, which the ear
    // reads as roughly half as loud.
    expect(volumeCurve(0.5)).toBeCloseTo(0.25);
    expect(volumeCurve(0.75)).toBeGreaterThan(volumeCurve(0.5));
  });
});
