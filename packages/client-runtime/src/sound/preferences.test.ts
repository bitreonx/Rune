import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_SOUND_PREFERENCES, sanitizeSoundPreferences } from "./preferences.ts";

describe("sanitizeSoundPreferences", () => {
  it("falls back to defaults for missing or non-object storage", () => {
    for (const garbage of [null, undefined, "on", 42, []]) {
      expect(sanitizeSoundPreferences(garbage)).toEqual(DEFAULT_SOUND_PREFERENCES);
    }
  });

  it("keeps valid values and clamps stray ones", () => {
    expect(
      sanitizeSoundPreferences({
        enabled: false,
        volume: 1.4,
        events: { done: true, "needs-input": false, error: true, click: true },
        notifications: false,
      }),
    ).toEqual({
      enabled: false,
      volume: 1,
      events: { done: true, "needs-input": false, error: true, click: true },
      notifications: false,
    });
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
