/**
 * Zoom/pan state machine for the image viewer. Pure functions only —
 * the actual rendering wires the result through a transform style.
 *
 * Bounds: 0.25x (zoomed out, small images still fill the panel) to
 * 8x (zoomed in for design review). Step is 1.25x (Ctrl/Cmd+wheel
 * and the toolbar buttons use the same multiplier).
 */

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.25;

export type Pan = { readonly x: number; readonly y: number };

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value < MIN_ZOOM) return MIN_ZOOM;
  if (value > MAX_ZOOM) return MAX_ZOOM;
  return value;
}

export function stepZoom(current: number, direction: 1 | -1): number {
  return clampZoom(current * (direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP));
}

export function resetPan(): Pan {
  return { x: 0, y: 0 };
}

/**
 * Compute the next pan offset after a pointer drag. The caller passes
 * in the starting cursor position, the current cursor position, and
 * the pan at the start of the drag.
 */
export function nextPan(
  start: { x: number; y: number },
  current: { x: number; y: number },
  base: Pan,
): Pan {
  return {
    x: base.x + (current.x - start.x),
    y: base.y + (current.y - start.y),
  };
}
