import { describe, expect, it } from "vite-plus/test";

import { applyDetune, randomClickDetune } from "./engine.ts";
import { DEFAULT_SOUND_PREFERENCES, clampVolume } from "./preferences.ts";

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
