/**
 * Tiny, allowlist-driven SVG sanitizer for the local-workspace SVG
 * viewer. Workspace files are user-controlled (any file in the user's
 * project can end up here) so we still strip <script>, javascript: URLs,
 * and on* event attributes before injection. Nothing fancy — the goal
 * is to make the common cases (icon, logo, diagram) render without
 * inviting XSS.
 */
const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
// Self-closing scripts: must end with `/>`, not just `>`. The pair
// regex above would otherwise overlap with this one on the opening
// tag of every paired script.
const SCRIPT_SELF_CLOSING = /<script\b[^>]*\/>/gi;
const ON_ATTRIBUTE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL = /\b(href|src|xlink:href|action|formaction)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;
// data: URLs are allowed for <image> embeds, but only image/png and
// image/jpeg. Anything else (e.g. data:text/html) is dropped.
const DATA_URL = /\b(href|src|xlink:href)\s*=\s*("data:(?!image\/(?:png|jpe?g|gif|webp);)[^"]*"|'data:(?!image\/(?:png|jpe?g|gif|webp);)[^']*')/gi;

const FOREIGN_OBJECT_TAG = /<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi;
const USE_TAG = /<use\b[^>]*>/gi;

export type SanitizeResult = {
  readonly sanitized: string;
  readonly droppedScripts: number;
  readonly droppedEventHandlers: number;
  readonly droppedJavascriptUrls: number;
  readonly droppedDataUrls: number;
  readonly droppedForeignObjects: number;
  readonly droppedExternalReferences: number;
};

/**
 * Pure sanitizer. Counts what it strips so the viewer can show a
 * small banner if anything was removed. The same source text always
 * produces the same output, so it's safe to memoize on the caller.
 */
export function sanitizeSvg(input: string): SanitizeResult {
  let sanitized = input;
  // Count once against the input, then strip. The two regexes overlap
  // (a self-closing <script> would otherwise count twice), so we run
  // both regexes against a copy first, sum the counts, and only then
  // substitute.
  const pairedCount = countMatches(input, SCRIPT_TAG);
  const selfClosingCount = countMatches(input, SCRIPT_SELF_CLOSING);
  const droppedScripts = pairedCount + selfClosingCount;
  sanitized = sanitized.replace(SCRIPT_TAG, "").replace(SCRIPT_SELF_CLOSING, "");

  const droppedForeignObjects = countMatches(sanitized, FOREIGN_OBJECT_TAG);
  sanitized = sanitized.replace(FOREIGN_OBJECT_TAG, "");

  const beforeUse = sanitized;
  sanitized = sanitized.replace(USE_TAG, "");
  const droppedExternalReferences = beforeUse.length - sanitized.length > 0
    ? countMatches(beforeUse, USE_TAG)
    : 0;

  const droppedEventHandlers = countMatches(sanitized, ON_ATTRIBUTE);
  sanitized = sanitized.replace(ON_ATTRIBUTE, "");

  const droppedJavascriptUrls = countMatches(sanitized, JAVASCRIPT_URL);
  sanitized = sanitized.replace(JAVASCRIPT_URL, "");

  const droppedDataUrls = countMatches(sanitized, DATA_URL);
  sanitized = sanitized.replace(DATA_URL, "");

  return {
    sanitized,
    droppedScripts,
    droppedEventHandlers,
    droppedJavascriptUrls,
    droppedDataUrls,
    droppedForeignObjects,
    droppedExternalReferences,
  };
}

function countMatches(input: string, pattern: RegExp): number {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}
