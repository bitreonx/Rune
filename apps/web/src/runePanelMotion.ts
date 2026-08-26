import { useEffect, useRef, useState } from "react";

import { RUNE_MOTION_MS } from "./runeMotion";

export type RunePanelMotionState = "closed" | "opening" | "open" | "closing";

export function resolveRunePanelMotionState(options: {
  open: boolean;
  previousOpen: boolean;
  reducedMotion: boolean;
}): RunePanelMotionState {
  if (options.reducedMotion) return options.open ? "open" : "closed";
  if (options.open) return options.previousOpen ? "open" : "opening";
  return options.previousOpen ? "closing" : "closed";
}

export function runePanelTransitionClass(state: RunePanelMotionState): string {
  switch (state) {
    case "opening":
      return "rune-panel-motion-opening";
    case "open":
      return "rune-panel-motion-open";
    case "closing":
      return "rune-panel-motion-closing";
    case "closed":
      return "rune-panel-motion-closed";
  }
}

/**
 * How long to hold a panel in its entering/leaving state before settling.
 * Panels with longer CSS motion windows pass their duration so the state
 * never flips while the transition is still on screen.
 */
export function resolveRunePanelSettleDelayMs(motionMs?: number): number {
  return (motionMs ?? RUNE_MOTION_MS.standard) + 40;
}

/**
 * Keeps a panel mounted for the close transition. The surface owns its
 * session state, so the host may disappear after the transition without
 * tearing down the terminal, preview, or tab state during the animation.
 */
export function useRunePanelMotionState(options: {
  open: boolean;
  reducedMotion: boolean;
  motionMs?: number;
}): RunePanelMotionState {
  const previousOpenRef = useRef(options.open);
  const [state, setState] = useState<RunePanelMotionState>(() =>
    resolveRunePanelMotionState({
      open: options.open,
      previousOpen: options.open,
      reducedMotion: options.reducedMotion,
    }),
  );

  useEffect(() => {
    const previousOpen = previousOpenRef.current;
    previousOpenRef.current = options.open;
    const nextState = resolveRunePanelMotionState({
      open: options.open,
      previousOpen,
      reducedMotion: options.reducedMotion,
    });
    setState(nextState);

    if (options.reducedMotion || (nextState !== "opening" && nextState !== "closing")) {
      return;
    }

    const finish = () => setState(options.open ? "open" : "closed");
    // Let the element render in its entering/leaving state for the full
    // motion window. A one-frame finish makes a freshly-mounted surface jump
    // straight to its final style before the browser can paint the animation.
    const timer =
      typeof window !== "undefined"
        ? window.setTimeout(finish, resolveRunePanelSettleDelayMs(options.motionMs))
        : undefined;
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [options.open, options.reducedMotion]);

  return state;
}
