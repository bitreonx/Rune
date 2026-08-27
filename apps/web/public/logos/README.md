# Provider & brand logos

This directory is the single source of truth for every third-party provider
or brand mark that RUNE renders in the app — provider picker rails, settings
cards, instance badges, the marketing site, and the install/connection
onboarding surfaces. Files here are served as static assets under `/logos/*`
and referenced by URL from
[`apps/web/src/lib/logoUrls.ts`](../../src/lib/logoUrls.ts).

If you need a brand mark in RUNE, it goes here, not in `src/assets/` and not
inlined into a component.

## Why a central directory

- **One place to audit brand usage.** Brand owners care about correctness.
  When the OpenRouter mark changes, the diff lives in one folder, not in
  five components.
- **Stable URLs across hashes.** Files in `public/` are served as-is by Vite
  and survive cache-busting; the `src/assets/` tree is bundled and hash-named
  on every build, which makes brand URLs unstable.
- **Reuse across surfaces.** The same raster works in the provider picker,
  in the install card, in the marketing site, and in badges — without
  duplicating the file.

## Conventions

- One file per brand, named with the brand slug in `kebab-case`
  (e.g. `openrouter.png`, `antigravity.svg`, `rune.svg`).
- Prefer the **official artwork** published by the brand. When the brand
  ships only a raster logo, mirror the original format and resolution so we
  never re-render the mark.
- **PNG for fidelity, SVG for theming.** When the mark is single-tone and
  the host needs to tint it (e.g. light/dark mode), also publish an SVG
  variant that uses `currentColor`. The PNG remains the visual source of
  truth; the SVG exists for the cases that need recoloring.
- Do not bake theme colours into the SVG file. Use `currentColor` only when
  the mark is intentionally themeable.
- Add new entries to [`logoUrls.ts`](../../src/lib/logoUrls.ts) so callers
  pick up the central constant instead of hardcoding a path.
- Inline SVGs in [`components/Icons.tsx`](../../src/components/Icons.tsx)
  are for glyphs we own (Rune's own brand mark, generic UI icons). Third
  party brand marks live here.

## Adding a new brand

1. Drop the file into this directory, named with the brand slug.
2. Add an entry to `LOGO_URLS` in
   [`logoUrls.ts`](../../src/lib/logoUrls.ts) with the public path.
3. If the mark is themeable, also add an SVG variant and reference it via
   the `…Svg` key.
4. Use `getLogoUrl("your-slug")` (or import the constant directly) at
   every render site — never hardcode the path in a component.

## What lives here

| File              | Brand       | Format | Themeable | Notes                                                                                                                                                                                    |
| ----------------- | ----------- | ------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openrouter.png`  | OpenRouter  | PNG    | —         | Official raster, single-tone. Source of truth for the mark.                                                                                                                              |
| `openrouter.svg`  | OpenRouter  | SVG    | yes       | Hand-traced vector for `currentColor` theming.                                                                                                                                           |
| `antigravity.svg` | Antigravity | SVG    | yes       | Google Antigravity "A" + four-point sparkle, monochrome.                                                                                                                                 |
| `rune.svg`        | Rune        | SVG    | yes       | RUNE hexagonal mark, monochrome. The branded wordmark "RUNE" lives in [`public/rune-mark.svg`](../rune-mark.svg) and is rendered by [`RuneMark.tsx`](../../src/components/RuneMark.tsx). |
| `README.md`       | —           | —      | —         | This file.                                                                                                                                                                               |
