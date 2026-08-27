import { describe, expect, it } from "vite-plus/test";

import { FADE_IN_FRAMES, clampFadeIn, nextFadeClass } from "./fileFadeIn.ts";

describe("clampFadeIn", () => {
  it("returns opacity-0 for early frames", () => {
    expect(clampFadeIn(0)).toBe("opacity-0");
    expect(clampFadeIn(1)).toBe("opacity-0");
    expect(clampFadeIn(FADE_IN_FRAMES - 1)).toBe("opacity-0");
  });

  it("returns opacity-100 at and past the cap", () => {
    expect(clampFadeIn(FADE_IN_FRAMES)).toBe("opacity-100");
    expect(clampFadeIn(FADE_IN_FRAMES + 5)).toBe("opacity-100");
  });
});

describe("nextFadeClass", () => {
  it("returns done:false before the cap", () => {
    expect(nextFadeClass(0).done).toBe(false);
    expect(nextFadeClass(FADE_IN_FRAMES - 1).done).toBe(false);
  });

  it("returns done:true at and past the cap", () => {
    expect(nextFadeClass(FADE_IN_FRAMES).done).toBe(true);
    expect(nextFadeClass(FADE_IN_FRAMES + 1).done).toBe(true);
  });

  it("returns the class with done", () => {
    expect(nextFadeClass(0).className).toBe("opacity-0");
    expect(nextFadeClass(FADE_IN_FRAMES).className).toBe("opacity-100");
  });
});
