/**
 * Canonical URLs for every third-party provider and brand mark that the
 * web app renders. Mirrors the assets in `apps/web/public/logos/` so a
 * single constant can be imported wherever a logo is needed (provider
 * picker, settings cards, instance badges, marketing surfaces). The
 * `public/` directory is served as-is by Vite, so absolute paths are
 * stable and survive hashing.
 *
 * Convention: PNG is the authoritative raster from the brand; an `…Svg`
 * key exists when a themeable hand-traced vector is also needed. See
 * `apps/web/public/logos/README.md` for the full rules.
 */
export const LOGO_URLS = {
  /** OpenRouter mark (raster, full-fidelity). Source of truth: `public/logos/openrouter.png`. */
  openrouter: "/logos/openrouter.png",
  /** OpenRouter mark (vector, `currentColor`-themeable). Source of truth: `public/logos/openrouter.svg`. */
  openrouterSvg: "/logos/openrouter.svg",
  /** Google Antigravity mark (vector, `currentColor`-themeable). Source of truth: `public/logos/antigravity.svg`. */
  antigravity: "/logos/antigravity.svg",
  /** RUNE mark (vector, `currentColor`-themeable). Source of truth: `public/logos/rune.svg`. */
  rune: "/logos/rune.svg",
} as const;

export type LogoSlug = keyof typeof LOGO_URLS;

/** Resolve a brand slug to its public logo URL. */
export function getLogoUrl(slug: LogoSlug): string {
  return LOGO_URLS[slug];
}
