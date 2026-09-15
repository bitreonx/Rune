import type { MotionProfile } from "@rune/contracts";

export const RUNE_MOTION_MS = Object.freeze({
  fast: 160,
  standard: 200,
  slow: 240,
} as const);

export function resolveRuneMotionDuration(durationMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : durationMs;
}

/** Resolve the stored RUNE motion profile to the duration used by JS state. */
export function resolveRuneMotionDurationForProfile(
  durationMs: number,
  profile: MotionProfile,
  reducedMotion: boolean,
): number {
  if (reducedMotion || profile === "reduced") return 0;
  if (profile === "expressive") return Math.round(durationMs * 1.6);
  return durationMs;
}
