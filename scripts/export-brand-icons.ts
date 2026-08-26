#!/usr/bin/env node
/**
 * Regenerates every binary brand icon from the vector kit in assets/rune.
 *
 * Rasterization goes through the Playwright-cached Chromium headless shell so
 * the gradient renders exactly like it does in the product, on any dev
 * platform. ICO assembly uses the dependency-free encoder in
 * ./lib/icon-export.ts. Run from the repository root:
 *
 *   node scripts/export-brand-icons.ts          # write all assets
 *   node scripts/export-brand-icons.ts --check  # verify without writing
 *
 * The macOS dock PNGs are flat renders with the classic safe area; Icon
 * Composer's native shadow is not reproduced here. See assets/README.md for
 * the optional Icon Composer re-export.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BRAND_ASSET_PATHS, DEVELOPMENT_PUBLIC_ICON_OVERRIDES } from "./lib/brand-assets.ts";
import { encodePngIco, readPngDimensions, WINDOWS_ICON_SIZES } from "./lib/icon-export.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KIT_DIR = path.join(repoRoot, "assets", "rune");
const APP_ICON_SVG = path.join(KIT_DIR, "08-app-icon-purple-r.svg");
const MARK_SVG = path.join(KIT_DIR, "03-logo-purple-r-transparent.svg");
const WHITE_MARK_SVG = path.join(KIT_DIR, "06-logo-white-transparent.svg");

const MACOS_SAFE_AREA_BODY = 824;
const MACOS_SAFE_AREA_CANVAS = 1024;
/** Android adaptive foreground keeps the mark inside the ~66% safe zone. */
const ANDROID_MARK_SCALE = 0.62;
/** Notification glyphs are small white marks and need breathing room. */
const NOTIFICATION_MARK_SCALE = 0.78;

const VARIANTS = ["prod", "nightly", "dev"] as const;

interface RenderTarget {
  readonly svgPath: string;
  readonly size: number;
  /** Fraction of the canvas the artwork spans, for icons needing a safe zone. */
  readonly scale?: number;
  readonly outPath: string;
}

function findChromium(): string {
  // The headless shell spawns reliably in one shot; full Chromium occasionally
  // hangs at startup, so only fall back to it if no shell build is cached.
  const shellCandidates: Array<string> = [];
  const chromeCandidates: Array<string> = [];
  const home = process.env.HOME ?? "";
  const searchDirs = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "ms-playwright"),
    home && path.join(home, "Library", "Caches", "ms-playwright"),
    home && path.join(home, ".cache", "ms-playwright"),
  ].filter((dir): dir is string => Boolean(dir) && existsSync(dir as string));
  for (const dir of searchDirs) {
    for (const entry of readdirSync(dir)) {
      shellCandidates.push(
        path.join(dir, entry, "chrome-headless-shell-win64", "chrome-headless-shell.exe"),
        path.join(dir, entry, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
        path.join(dir, entry, "chrome-headless-shell-linux64", "chrome-headless-shell"),
      );
      chromeCandidates.push(path.join(dir, entry, "chrome-win64", "chrome.exe"));
    }
  }
  for (const candidate of [...shellCandidates, ...chromeCandidates]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "Chromium headless shell not found. Install Playwright browsers or set CHROME_HEADLESS to the executable path.",
  );
}

/** Strip the outer <svg> wrapper so the kit artwork can be nested and scaled. */
function svgInnerContents(svgPath: string): { inner: string; viewBoxSize: number } {
  const raw = readFileSync(svgPath, "utf8");
  const viewBox = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(raw);
  if (!viewBox || viewBox[1] !== viewBox[2]) {
    throw new Error(`Expected a square viewBox on ${svgPath}`);
  }
  const start = raw.indexOf(">") + 1;
  const end = raw.lastIndexOf("</svg>");
  if (start <= 0 || end < start) {
    throw new Error(`Unexpected SVG structure in ${svgPath}`);
  }
  return { inner: raw.slice(start, end), viewBoxSize: Number(viewBox[1]) };
}

function wrappedSvg(svgPath: string, canvas: number, fill: number): string {
  const { inner, viewBoxSize } = svgInnerContents(svgPath);
  // Nesting drops the source viewBox, so rescale its coordinate space onto
  // the render canvas ourselves; `fill` shrinks the artwork inside the canvas.
  const scale = (canvas / viewBoxSize) * fill;
  const inset = ((1 - fill) * canvas) / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">`,
    `<g transform="translate(${inset} ${inset}) scale(${scale})">${inner}</g>`,
    `</svg>`,
  ].join("");
}

function renderPngOnce(chrome: string, workDir: string, target: RenderTarget): void {
  const source = path.join(workDir, `wrap-${path.basename(target.outPath, ".png")}.svg`);
  writeFileSync(source, wrappedSvg(target.svgPath, target.size, target.scale ?? 1));
  // A dedicated profile dir keeps this run clear of any other Chromium's
  // singleton lock; without it launches hang intermittently on Windows.
  const profileDir = path.join(workDir, "chrome-profile");
  mkdirSync(profileDir, { recursive: true });
  const result = spawnSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      `--user-data-dir=${profileDir}`,
      "--default-background-color=00000000",
      `--screenshot=${target.outPath}`,
      `--window-size=${target.size},${target.size}`,
      `file:///${source.split(path.sep).join("/")}`,
    ],
    { stdio: "pipe", timeout: 60_000 },
  );
  if (result.error || !existsSync(target.outPath)) {
    throw new Error(`Failed to render ${target.outPath}: ${result.error?.message ?? "no output written"}`);
  }
}

function renderPng(chrome: string, workDir: string, target: RenderTarget): Buffer {
  // Browser startup is occasionally slow under disk scanning; retry instead
  // of failing the whole export.
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      rmSync(target.outPath, { force: true });
      renderPngOnce(chrome, workDir, target);
      const contents = readFileSync(target.outPath);
      const dimensions = readPngDimensions(contents);
      if (dimensions.width === target.size && dimensions.height === target.size) return contents;
      lastError = new Error(
        `Rendered ${target.outPath} at ${dimensions.width}x${dimensions.height}, expected ${target.size}x${target.size}.`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error(`Failed to render ${target.outPath}`);
}

function renderTargets(chrome: string, workDir: string, targets: ReadonlyArray<RenderTarget>): Map<string, Buffer> {
  const generated = new Map<string, Buffer>();
  for (const target of targets) {
    generated.set(target.outPath, renderPng(chrome, workDir, target));
    console.log(`rendered ${path.relative(repoRoot, target.outPath)}`);
  }
  return generated;
}

function renderIco(chrome: string, workDir: string, svgPath: string, outPath: string): Buffer {
  const renditions = WINDOWS_ICON_SIZES.map((size) => ({
    size,
    contents: renderPng(chrome, workDir, { svgPath, size, outPath: path.join(workDir, `${path.basename(outPath, ".ico")}-${size}.png`) }),
  }));
  return encodePngIco(renditions);
}

/** Every generated file, keyed by repository-relative path. */
function collectGenerated(chrome: string, workDir: string): Map<string, Buffer> {
  const targets: Array<RenderTarget> = [];
  for (const variant of VARIANTS) {
    const dir = path.join(repoRoot, "assets", variant);
    mkdirSync(dir, { recursive: true });
    targets.push(
      { svgPath: APP_ICON_SVG, size: 1024, outPath: path.join(dir, "rune-ios-1024.png") },
      { svgPath: APP_ICON_SVG, size: 1024, outPath: path.join(dir, "rune-universal-1024.png") },
      {
        svgPath: APP_ICON_SVG,
        size: 1024,
        scale: MACOS_SAFE_AREA_BODY / MACOS_SAFE_AREA_CANVAS,
        outPath: path.join(dir, "rune-macos-1024.png"),
      },
      { svgPath: MARK_SVG, size: 180, outPath: path.join(dir, "rune-web-apple-touch-180.png") },
      { svgPath: MARK_SVG, size: 32, outPath: path.join(dir, "rune-web-favicon-32x32.png") },
      { svgPath: MARK_SVG, size: 16, outPath: path.join(dir, "rune-web-favicon-16x16.png") },
    );
  }
  targets.push(
    {
      svgPath: MARK_SVG,
      size: 432,
      scale: ANDROID_MARK_SCALE,
      outPath: path.join(repoRoot, "apps", "mobile", "assets", "android-icon-mark.png"),
    },
    {
      svgPath: WHITE_MARK_SVG,
      size: 96,
      scale: NOTIFICATION_MARK_SCALE,
      outPath: path.join(repoRoot, "apps", "mobile", "assets", "android-notification-icon.png"),
    },
  );

  const generated = renderTargets(chrome, workDir, targets);
  for (const variant of VARIANTS) {
    const dir = path.join(repoRoot, "assets", variant);
    for (const [name, contents] of [
      ["rune-windows.ico", renderIco(chrome, workDir, APP_ICON_SVG, path.join(dir, "rune-windows.ico"))],
      ["rune-web-favicon.ico", renderIco(chrome, workDir, MARK_SVG, path.join(dir, "rune-web-favicon.ico"))],
    ] as const) {
      generated.set(path.join(dir, name), contents);
      console.log(`rendered ${path.relative(repoRoot, path.join(dir, name))}`);
    }
  }

  // The development web exports also serve as the checked-in browser icons.
  for (const override of DEVELOPMENT_PUBLIC_ICON_OVERRIDES) {
    const sourcePath = path.join(repoRoot, override.sourceRelativePath);
    const contents = generated.get(sourcePath);
    if (contents === undefined) {
      throw new Error(`Development web icon was not generated: ${override.sourceRelativePath}`);
    }
    generated.set(path.join(repoRoot, override.targetRelativePath), contents);
  }
  return generated;
}

function main(): void {
  const checkOnly = process.argv.includes("--check");
  const chrome = process.env.CHROME_HEADLESS ?? findChromium();
  const workDir = mkdtempSync(path.join(tmpdir(), "rune-icons-"));
  try {
    const generated = collectGenerated(chrome, workDir);
    const stale: Array<string> = [];
    for (const [absolutePath, contents] of generated) {
      const current = existsSync(absolutePath) && readFileSync(absolutePath).equals(contents);
      if (current) continue;
      stale.push(path.relative(repoRoot, absolutePath));
      if (!checkOnly) writeFileSync(absolutePath, contents);
    }
    if (checkOnly) {
      if (stale.length > 0) {
        console.error(`Generated icon assets are stale:\n${stale.map((file) => `- ${file}`).join("\n")}`);
        process.exitCode = 1;
        return;
      }
      console.log(`All ${generated.size} generated icon assets are current.`);
      return;
    }
    console.log(`Updated ${stale.length} icon assets.`);
    console.log(
      "macOS dock PNGs are flat renders; re-export with Icon Composer for the native shadow (see assets/README.md).",
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
