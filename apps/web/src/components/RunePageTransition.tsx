import { useEffect, useState, type ReactNode } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { cn } from "../lib/utils";

type RunePageTransitionState = "entering" | "entered";

/**
 * Shared, non-blocking route-enter boundary for workspace page content.
 * The current page replaces the previous one immediately, so routes never
 * overlap or retain an outgoing tree while the short transition settles.
 */
export function RunePageTransition({
  routeKey,
  children,
  className,
}: {
  readonly routeKey: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <RunePageTransitionFrame
      key={`${routeKey}:${prefersReducedMotion ? "reduced" : "motion"}`}
      routeKey={routeKey}
      prefersReducedMotion={prefersReducedMotion}
      className={className}
    >
      {children}
    </RunePageTransitionFrame>
  );
}

function RunePageTransitionFrame({
  routeKey,
  prefersReducedMotion,
  children,
  className,
}: {
  readonly routeKey: string;
  readonly prefersReducedMotion: boolean;
  readonly children: ReactNode;
  readonly className: string | undefined;
}) {
  const [state, setState] = useState<RunePageTransitionState>(() =>
    prefersReducedMotion ? "entered" : "entering",
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    const frame = requestAnimationFrame(() => setState("entered"));
    return () => cancelAnimationFrame(frame);
  }, [prefersReducedMotion]);

  return (
    <div
      className={cn(
        "min-w-0 transition-[opacity,transform] duration-[var(--rune-motion-standard)] ease-out motion-reduce:transition-none",
        className,
      )}
      data-rune-page-transition={routeKey}
      data-rune-page-transition-state={state}
    >
      {children}
    </div>
  );
}
