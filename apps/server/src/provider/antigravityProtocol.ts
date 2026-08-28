/**
 * Small, provider-local helpers for Google's `agy` stream-json protocol.
 *
 * Antigravity intentionally stays behind this boundary. The rest of the
 * provider adapter consumes the documented event envelope and never needs to
 * know about the CLI's snake_case fields or its newline-delimited transport.
 */

export type AntigravityStreamEventName = "init" | "step_update" | "result";

export type AntigravityStreamEvent = {
  readonly event: AntigravityStreamEventName;
  readonly [key: string]: unknown;
};

export interface AntigravityModelListEntry {
  readonly slug: string;
  readonly name: string;
}

export interface AntigravityCliArgsOptions {
  readonly model?: string | undefined;
  readonly effort?: "low" | "medium" | "high" | undefined;
  readonly conversationId?: string | undefined;
  readonly dangerouslySkipPermissions?: boolean | undefined;
}

export interface AntigravityResumeCursor {
  readonly schemaVersion: 1;
  readonly conversationId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MODEL_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const MODEL_LIST_LABELS = new Set(["model", "models", "name", "names", "slug", "slugs"]);

function addModel(
  models: AntigravityModelListEntry[],
  seen: Set<string>,
  slugValue: unknown,
  nameValue?: unknown,
): void {
  if (typeof slugValue !== "string") return;
  const slug = slugValue.trim();
  if (!MODEL_SLUG_PATTERN.test(slug) || MODEL_LIST_LABELS.has(slug.toLowerCase())) return;
  if (seen.has(slug)) return;
  const name = typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : slug;
  seen.add(slug);
  models.push({ slug, name });
}

function collectJsonModels(
  value: unknown,
  models: AntigravityModelListEntry[],
  seen: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonModels(item, models, seen);
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && value.includes("-")) addModel(models, seen, value);
    return;
  }

  const slug =
    value.id ?? value.slug ?? value.model ?? value.model_id ?? value.modelId ?? value.identifier;
  const name = value.display_name ?? value.displayName ?? value.name ?? value.label;
  addModel(models, seen, slug, name);
  for (const child of Object.values(value)) {
    if (Array.isArray(child) || isRecord(child)) collectJsonModels(child, models, seen);
  }
}

/** Parse one line from `agy --output-format stream-json`. */
export function parseAntigravityStreamLine(line: string): AntigravityStreamEvent | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  let decoded: unknown;
  try {
    decoded = JSON.parse(trimmed);
  } catch {
    return undefined;
  }

  if (!isRecord(decoded)) return undefined;
  const event = decoded.event;
  if (event !== "init" && event !== "step_update" && event !== "result") {
    return undefined;
  }

  // `agy` currently wraps the event-specific fields under a property matching
  // the event name (for example, `{ event: "result", result: { status } }`).
  // Older builds emitted those fields at the top level. Normalize both shapes
  // here so the adapter has one protocol boundary and still retains the full
  // provider payload for diagnostics.
  const nested = decoded[event];
  return {
    ...decoded,
    ...(isRecord(nested) ? nested : {}),
  } as AntigravityStreamEvent;
}

/**
 * Build the persistent headless command. Keep every flag explicit so a
 * configured binary cannot accidentally inherit a one-shot/text protocol.
 */
export function buildAntigravityCliArgs(options: AntigravityCliArgsOptions = {}): string[] {
  const args = ["--input-format", "stream-json", "--output-format", "stream-json"];

  if (options.model?.trim()) {
    args.push("--model", options.model.trim());
  }
  if (options.effort !== undefined) {
    args.push("--effort", options.effort);
  }
  if (options.conversationId?.trim()) {
    args.push("--conversation", options.conversationId.trim());
  }
  if (options.dangerouslySkipPermissions === true) {
    args.push("--dangerously-skip-permissions");
  }

  return args;
}

/** Serialize one user turn for the long-lived stream input. */
export function serializeAntigravityUserMessage(content: string): string {
  return `${JSON.stringify({ event: "user", message: { content } })}\n`;
}

export function readAntigravityConversationId(resumeCursor: unknown): string | undefined {
  if (!isRecord(resumeCursor) || resumeCursor.schemaVersion !== 1) {
    return undefined;
  }
  const conversationId = resumeCursor.conversationId;
  return typeof conversationId === "string" && conversationId.trim().length > 0
    ? conversationId.trim()
    : undefined;
}

export function makeAntigravityResumeCursor(
  conversationId: string,
): AntigravityResumeCursor | undefined {
  const normalized = conversationId.trim();
  return normalized.length > 0 ? { schemaVersion: 1, conversationId: normalized } : undefined;
}

/**
 * Parse the human-readable output of `agy models`.
 *
 * Current builds render a tab-separated slug/name table. The whitespace
 * fallback tolerates terminals that replace tabs while preserving a strict
 * slug shape so headings and help text are not exposed as fake models.
 */
export function parseAntigravityModelList(output: string): AntigravityModelListEntry[] {
  const seen = new Set<string>();
  const models: AntigravityModelListEntry[] = [];

  const trimmedOutput = output.trim();
  if (trimmedOutput) {
    try {
      collectJsonModels(JSON.parse(trimmedOutput), models, seen);
    } catch {
      // Some CLI versions prefix a JSON catalog with human-readable notices.
      // The line parser below still handles the table format in that case.
    }
  }

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const columns = line.split(/\t+/).map((column) => column.trim());
    let slug = columns[0] ?? "";
    let name = columns.slice(1).join(" ").trim();

    if (!name) {
      const match = line.match(/^([A-Za-z0-9][A-Za-z0-9._/-]*)\s{2,}(.+?)\s*$/);
      if (match?.[1] && match[2]) {
        slug = match[1];
        name = match[2];
      } else if (line.includes("-") || line.includes("/") || line.includes(".")) {
        name = slug;
      } else {
        continue;
      }
    }

    addModel(models, seen, slug, name);
  }

  return models;
}
