import { useId } from "react";

import "./runeLoader.css";

// The kit mark as one even-odd path: the hexagonal outline with the R cut
// out, so the background shows through the letter regardless of theme.
const MARK_PATH =
  "M628 156L997 370L997 858L927 905L858 952L627 1108L541 1050L438 983L258 858L259 373Z" +
  "M629 156L259 373L749 373L913 537L749 709L927 905L997 858L997 370Z" +
  "M259 373L439 491L438 983L258 858Z" +
  "M758 511L541 511L541 1050L627 1108L858 952L544 736Z";

// Six wedges cut from the mark's center (627.67,620.5) out to consecutive
// hull vertices. Each facet drifts along its own radial, tilts about its
// centroid, and springs back; the numbers are precomputed from the 1254-unit
// kit geometry.
const FACETS = [
  {
    clip: "628,156 997,370",
    dx: 41.3,
    dy: -79.9,
    tilt: 4,
    origin: "750.9px 382.2px",
    stagger: 0,
  },
  {
    clip: "997,370 997,858",
    dx: 90,
    dy: -1.6,
    tilt: -4,
    origin: "873.9px 616.2px",
    stagger: 60,
  },
  {
    clip: "997,858 627,1108",
    dx: 40.8,
    dy: 80.2,
    tilt: 4,
    origin: "750.6px 862.2px",
    stagger: 120,
  },
  {
    clip: "627,1108 258,858",
    dx: -40.9,
    dy: 80.1,
    tilt: -4,
    origin: "504.2px 862.2px",
    stagger: 180,
  },
  {
    clip: "258,858 259,373",
    dx: -90,
    dy: -1.2,
    tilt: 4,
    origin: "381.6px 617.2px",
    stagger: 240,
  },
  {
    clip: "259,373 628,156",
    dx: -41.4,
    dy: -79.9,
    tilt: -4,
    origin: "504.9px 383.2px",
    stagger: 300,
  },
] as const;

export function RuneLoader({
  size = 72,
  label = "Loading",
}: {
  size?: number;
  label?: string;
}) {
  // Facet clips and the gradient are scoped per instance so several loaders
  // can coexist without id collisions.
  const idPrefix = `${useId().replace(/[^a-zA-Z0-9-]/g, "")}-rune-loader`;
  const gradientId = `${idPrefix}-gradient`;

  return (
    <div
      aria-label={label}
      className="rune-loader"
      role="status"
      style={{ width: size, height: size }}
    >
      <div aria-hidden className="rune-loader-glow" />
      <svg aria-hidden className="rune-loader-mark" viewBox="0 0 1254 1254">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          {FACETS.map((facet, index) => (
            <clipPath id={`${idPrefix}-facet-${index}`} key={facet.clip}>
              <polygon points={`627.67,620.5 ${facet.clip}`} />
            </clipPath>
          ))}
        </defs>
        {FACETS.map((facet, index) => (
          <g
            clipPath={`url(#${idPrefix}-facet-${index})`}
            key={facet.clip}
            style={
              {
                "--rune-facet-dx": `${facet.dx}px`,
                "--rune-facet-dy": `${facet.dy}px`,
                "--rune-facet-tilt": `${facet.tilt}deg`,
                "--rune-facet-stagger": `${facet.stagger}ms`,
                transformOrigin: facet.origin,
              } as React.CSSProperties
            }
            className="rune-loader-facet"
          >
            <path d={MARK_PATH} fill={`url(#${gradientId})`} fillRule="evenodd" />
          </g>
        ))}
      </svg>
    </div>
  );
}
