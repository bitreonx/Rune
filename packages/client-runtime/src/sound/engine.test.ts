import { describe, expect, it } from "vite-plus/test";

import {
  applyDetune,
  randomClickDetune,
  resolveSoundScore,
  SOUND_VARIANTS,
} from "./engine.ts";
import { DEFAULT_SOUND_PREFERENCES, clampVolume } from "./preferences.ts";

describe("SOUND_VARIANTS", () => {
  it("covers every preference event and nothing spare", () => {
    // Playback resolves every enabled id through this record; a missing key
    // would crash mid-effect and an unused one is a preference that does
    // nothing.
    expect(Object.keys(SOUND_VARIANTS).sort()).toEqual(
      Object.keys(DEFAULT_SOUND_PREFERENCES.events).sort(),
    );
  });

  it("gives every event at least two flavors with unique names", () => {
    for (const [event, variants] of Object.entries(SOUND_VARIANTS)) {
      expect(variants.length, event).toBeGreaterThanOrEqual(2);
      expect(new Set(variants.map((variant) => variant.id)).size, event).toBe(variants.length);
      expect(new Set(variants.map((variant) => variant.label)).size, event).toBe(variants.length);
      for (const variant of variants) {
        expect(variant.id.length, event).toBeGreaterThan(0);
        expect(variant.label.length, event).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every spec physically playable and UI-length", () => {
    // The scheduler ramps frequencies, filters, and gains exponentially —
    // any zero or negative value throws on the audio thread at play time,
    // so the guarantee belongs in data validation, not runtime.
    for (const [event, variants] of Object.entries(SOUND_VARIANTS)) {
      for (const { score } of variants) {
        expect(score.tones.length, event).toBeGreaterThan(0);
        for (const tone of score.tones) {
          expect(tone.frequency, event).toBeGreaterThan(0);
          expect(tone.frequencyTo ?? tone.frequency, event).toBeGreaterThan(0);
          expect(tone.attack === undefined || tone.attack > 0, event).toBe(true);
          expect(tone.startAt, event).toBeGreaterThanOrEqual(0);
          expect(tone.duration, event).toBeGreaterThan(0);
          expect(tone.startAt + tone.duration, event).toBeLessThanOrEqual(2);
          expect(tone.gain, event).toBeGreaterThan(0);
          expect(tone.gain, event).toBeLessThanOrEqual(0.5);
          if (tone.pan !== undefined) {
            expect(Math.abs(tone.pan), event).toBeLessThanOrEqual(1);
          }
          if (tone.lowpassFrom !== undefined) {
            expect(tone.lowpassFrom, event).toBeGreaterThan(0);
            expect(tone.lowpassTo ?? tone.lowpassFrom, event).toBeGreaterThan(0);
          }
        }
        if (score.noise) {
          expect(score.noise.startAt + score.noise.duration, event).toBeLessThanOrEqual(2);
          expect(score.noise.gain, event).toBeGreaterThan(0);
          expect(score.noise.lowpassFrom, event).toBeGreaterThan(0);
          expect(score.noise.lowpassTo, event).toBeGreaterThan(0);
        }
        if (score.space !== undefined) {
          expect(score.space, event).toBeGreaterThanOrEqual(0);
          expect(score.space, event).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe("resolveSoundScore", () => {
  it("returns the chosen variant's score", () => {
    const bells = SOUND_VARIANTS.done.find((variant) => variant.id === "bells");
    expect(resolveSoundScore("done", "bells")).toBe(bells?.score);
  });

  it("falls back to the default for missing or unknown ids", () => {
    const chime = SOUND_VARIANTS.done[0];
    expect(resolveSoundScore("done", "no-such-flavor")).toBe(chime.score);
    expect(resolveSoundScore("done", undefined)).toBe(chime.score);
  });
});

describe("randomClickDetune", () => {
  it("spans subtle variation centered on the true pitch", () => {
    expect(randomClickDetune(() => 0)).toBeLessThan(0);
    expect(randomClickDetune(() => 0.5)).toBe(0);
    expect(randomClickDetune(() => 1)).toBeGreaterThan(0);
    // Variation stays subtle: under a quarter tone either way.
    expect(Math.abs(randomClickDetune(() => 0))).toBeLessThanOrEqual(30);
    expect(Math.abs(randomClickDetune(() => 1))).toBeLessThanOrEqual(30);
  });

  it("varies between presses so rapid clicking never sounds mechanical", () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const detunes = new Set(Array.from({ length: 20 }, () => randomClickDetune(rng)));
    expect(detunes.size).toBeGreaterThan(5);
  });
});

describe("applyDetune", () => {
  it("shifts pitch by cents without changing it at zero", () => {
    expect(applyDetune(1000, 0)).toBe(1000);
    expect(applyDetune(1000, 1200)).toBeCloseTo(2000);
    expect(applyDetune(1000, -1200)).toBeCloseTo(500);
  });
});

describe("clampVolume", () => {
  it("keeps stored volumes inside the playable range", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(0.6)).toBe(0.6);
    expect(clampVolume(1.5)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_SOUND_PREFERENCES.volume);
  });
});
