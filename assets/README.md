# Brand assets

`assets/rune/` is the vector source of truth for the RUNE brand: the mark, the
app icon composition, monochrome variants, and the wordmark. Everything binary
in this directory is generated from that kit.

## Regenerating icons

```sh
node scripts/export-brand-icons.ts          # write all assets
node scripts/export-brand-icons.ts --check  # verify without writing
```

The exporter rasterizes the kit through the Playwright-cached Chromium headless
shell (no macOS required) and updates:

- `dev/`, `nightly/`, `prod/` — iOS/universal 1024 PNGs, macOS dock PNGs
  (classic 824×824 safe area), Windows `.ico`, and web favicons
- `apps/mobile/assets/` — Android adaptive foreground mark and the white
  notification glyph
- `apps/web/public/` — the development favicon set copied from `dev/`

Do not edit the generated PNG or ICO files directly; change the kit and
re-export.

## macOS shadow

Chromium renders flat icons, so the tracked `rune-macos-1024.png` files have
the correct safe area but no Icon Composer shadow. For the shadowed dock
rendition, open the matching `app-icon.icon` project in Icon Composer (2 or
newer) on macOS and export with Platform `macOS pre-Tahoe`, Appearance
`Default`, Size `1024pt`, Scale `1×` over the tracked PNG. The `.icon`
projects mirror the kit's geometry for exactly this purpose.
