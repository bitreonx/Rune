/**
 * The API adapter's restart-safe state is deliberately smaller than the live
 * model conversation. Tool calls, tool output, system prompts, and credentials
 * never belong in a provider resume cursor.
 */

export const API_RESUME_CURSOR_VERSION = 1 as const;
const MAX_CURSOR_CHARS = 120_000;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_MESSAGE_COUNT = 64;
const MAX_TURN_COUNT = 32;
const MAX_TURN_ITEM_COUNT = 16;
const MAX_TURN_ID_CHARS = 256;

export type ApiTranscriptRole = "user" | "assistant";

export interface ApiTranscriptMessage {
  readonly role: ApiTranscriptRole;
  readonly content: string;
}

export interface ApiTranscriptTurn {
  readonly id: string;
  readonly items: ReadonlyArray<ApiTranscriptMessage>;
}

export interface ApiTranscriptSnapshot {
  readonly version: typeof API_RESUME_CURSOR_VERSION;
  readonly messages: ReadonlyArray<ApiTranscriptMessage>;
  readonly turns: ReadonlyArray<ApiTranscriptTurn>;
}

export interface ApiTranscriptSourceMessage {
  readonly role: string;
  readonly content: string;
}

export interface ApiTranscriptSourceTurn {
  readonly id: string;
  readonly items: ReadonlyArray<ApiTranscriptSourceMessage>;
}

export interface ApiTranscriptSource {
  readonly messages: ReadonlyArray<ApiTranscriptSourceMessage>;
  readonly turns: ReadonlyArray<ApiTranscriptSourceTurn>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeMessage(value: ApiTranscriptSourceMessage): ApiTranscriptMessage | undefined {
  if (value.role !== "user" && value.role !== "assistant") return undefined;
  const content = value.content.trim();
  if (content.length === 0) return undefined;
  return {
    role: value.role,
    content: content.slice(0, MAX_MESSAGE_CHARS),
  };
}

function sanitizeMessages(
  messages: ReadonlyArray<ApiTranscriptSourceMessage>,
): ApiTranscriptMessage[] {
  return messages.flatMap((message) => {
    const sanitized = sanitizeMessage(message);
    return sanitized ? [sanitized] : [];
  });
}

function sanitizeTurns(turns: ReadonlyArray<ApiTranscriptSourceTurn>): ApiTranscriptTurn[] {
  return turns.flatMap((turn) => {
    const id = turn.id.trim().slice(0, MAX_TURN_ID_CHARS);
    if (id.length === 0) return [];
    const items = sanitizeMessages(turn.items).slice(-MAX_TURN_ITEM_COUNT);
    return [{ id, items }];
  });
}

function serializedLength(snapshot: Omit<ApiTranscriptSnapshot, "version">): number {
  return JSON.stringify({ version: API_RESUME_CURSOR_VERSION, ...snapshot }).length;
}

function keepWithinBudget(
  messages: ApiTranscriptMessage[],
  turns: ApiTranscriptTurn[],
): ApiTranscriptSnapshot {
  const boundedMessages = messages.slice(-MAX_MESSAGE_COUNT);
  const boundedTurns = turns.slice(-MAX_TURN_COUNT);

  while (
    serializedLength({ messages: boundedMessages, turns: boundedTurns }) > MAX_CURSOR_CHARS &&
    (boundedMessages.length > 0 || boundedTurns.length > 0)
  ) {
    // Drop the oldest item from whichever side has more history. This keeps
    // the newest user/assistant context and newest turn evidence together.
    if (boundedMessages.length >= boundedTurns.length && boundedMessages.length > 0) {
      boundedMessages.shift();
    } else if (boundedTurns.length > 0) {
      boundedTurns.shift();
    } else {
      break;
    }
  }

  return {
    version: API_RESUME_CURSOR_VERSION,
    messages: boundedMessages,
    turns: boundedTurns,
  };
}

export function encodeApiResumeCursor(source: ApiTranscriptSource): ApiTranscriptSnapshot {
  return keepWithinBudget(sanitizeMessages(source.messages), sanitizeTurns(source.turns));
}

function decodeMessage(value: unknown): ApiTranscriptMessage | undefined {
  if (!isRecord(value) || (value.role !== "user" && value.role !== "assistant")) return undefined;
  if (typeof value.content !== "string") return undefined;
  const content = value.content.trim();
  if (content.length === 0 || content.length > MAX_MESSAGE_CHARS) return undefined;
  return { role: value.role, content };
}

function decodeTurn(value: unknown): ApiTranscriptTurn | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || !Array.isArray(value.items)) {
    return undefined;
  }
  const id = value.id.trim();
  if (id.length === 0 || id.length > MAX_TURN_ID_CHARS) return undefined;
  const items = value.items.flatMap((item) => {
    const decoded = decodeMessage(item);
    return decoded ? [decoded] : [];
  });
  return { id, items: items.slice(-MAX_TURN_ITEM_COUNT) };
}

/** Returns a normalized snapshot or `undefined` for unsafe/corrupt state. */
export function decodeApiResumeCursor(value: unknown): ApiTranscriptSnapshot | undefined {
  if (!isRecord(value) || value.version !== API_RESUME_CURSOR_VERSION) return undefined;
  if (!Array.isArray(value.messages) || !Array.isArray(value.turns)) return undefined;

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return undefined;
  }
  if (serialized.length > MAX_CURSOR_CHARS) return undefined;

  const messages: ApiTranscriptMessage[] = [];
  for (const message of value.messages) {
    const decoded = decodeMessage(message);
    if (!decoded) return undefined;
    messages.push(decoded);
  }
  const turns: ApiTranscriptTurn[] = [];
  for (const turn of value.turns) {
    const decoded = decodeTurn(turn);
    if (!decoded) return undefined;
    turns.push(decoded);
  }

  return {
    version: API_RESUME_CURSOR_VERSION,
    messages: messages.slice(-MAX_MESSAGE_COUNT),
    turns: turns.slice(-MAX_TURN_COUNT),
  };
}
