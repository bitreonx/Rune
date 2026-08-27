/**
 * Fade-in opacity helper. Maps a frame counter to a Tailwind class
 * for the file preview panel's mount animation. The clip is 200ms
 * (12 frames at 60fps) so the transition feels instant without
 * pegging the GPU.
 */
export const FADE_IN_FRAMES = 12;

export function clampFadeIn(frame: number): "opacity-0" | "opacity-100" {
  if (frame >= FADE_IN_FRAMES) return "opacity-100";
  return "opacity-0";
}

/**
 * Compute the next opacity class. The caller ticks the frame
 * counter on every requestAnimationFrame; once the cap is hit the
 * helper keeps the panel fully opaque without re-rendering.
 */
export function nextFadeClass(currentFrame: number): {
  readonly className: ReturnType<typeof clampFadeIn>;
  readonly done: boolean;
} {
  const className = clampFadeIn(currentFrame);
  return { className, done: className === "opacity-100" };
}
