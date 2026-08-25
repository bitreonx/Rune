import { describe, expect, it } from "vite-plus/test";
import { RUNE_MOTION_MS, resolveRuneMotionDuration } from "./runeMotion";

describe("RUNE motion contract", () => {
  it("uses short product motion durations", () => {
    expect(RUNE_MOTION_MS.fast).toBe(160);
    expect(RUNE_MOTION_MS.standard).toBe(200);
    expect(RUNE_MOTION_MS.slow).toBe(240);
  });

  it("disables motion when reduced motion is requested", () => {
    expect(resolveRuneMotionDuration(RUNE_MOTION_MS.standard, true)).toBe(0);
    expect(resolveRuneMotionDuration(RUNE_MOTION_MS.standard, false)).toBe(200);
  });
});
