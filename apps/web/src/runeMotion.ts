export const RUNE_MOTION_MS = Object.freeze({
  fast: 160,
  standard: 200,
  slow: 240,
} as const);

export function resolveRuneMotionDuration(durationMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : durationMs;
}
