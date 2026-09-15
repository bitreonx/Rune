import type { MotionProfile } from "@rune/contracts";
import { useEffect, useState } from "react";

import {
  POCKET_MOTION_BOUNDARIES_MS,
  POCKET_MOTION_PHASES,
  type PocketMotionPhase,
} from "./pocketWorkspace.logic";

interface PocketMotionOptions {
  readonly motionProfile: MotionProfile;
  readonly reducedMotion: boolean;
}

/** Advance the Pocket open morph with finite timers, not a repaint loop. */
export function usePocketMotionPhase({
  motionProfile,
  reducedMotion,
}: PocketMotionOptions): PocketMotionPhase {
  const [phase, setPhase] = useState<PocketMotionPhase>("settle");

  useEffect(() => {
    if (reducedMotion || motionProfile === "reduced") {
      setPhase("settle");
      return;
    }

    setPhase(POCKET_MOTION_PHASES[0]!);
    const scale = motionProfile === "expressive" ? 1.6 : 1;
    const timers = POCKET_MOTION_BOUNDARIES_MS.map((boundary, index) =>
      window.setTimeout(
        () => {
          setPhase(POCKET_MOTION_PHASES[index + 1]!);
        },
        Math.round(boundary * scale),
      ),
    );

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [motionProfile, reducedMotion]);

  return phase;
}
