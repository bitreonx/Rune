import * as Effect from "effect/Effect";

/**
 * SSE wire helpers for OpenAI-compatible chat-completion streams (OpenRouter,
 * OpenAI API, and other `/chat/completions` providers).
 *
 * The adapter consumes these streams token-by-token but must not flood the
 * orchestration event store, so `makeCoalescedDeltaSink` bounds the published
 * delta rate to roughly one event per interval while keeping the first token
 * visible immediately.
 */

export type SseLineResult =
  | { readonly kind: "delta"; readonly text: string }
  | { readonly kind: "done" }
  | { readonly kind: "ignore" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DONE_SENTINEL = "[DONE]";

export const resultFromSseLine = (line: string): SseLineResult => {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("data:")) return { kind: "ignore" };
  const payload = trimmed.slice("data:".length).trim();
  if (payload.length === 0) return { kind: "ignore" };
  if (payload === DONE_SENTINEL) return { kind: "done" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { kind: "ignore" };
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.choices)) return { kind: "ignore" };
  const choice = parsed.choices.find(isRecord);
  if (!choice || !isRecord(choice.delta)) return { kind: "ignore" };
  if (typeof choice.delta.content !== "string") return { kind: "ignore" };
  return { kind: "delta", text: choice.delta.content };
};

export interface CoalescedDeltaSink<E> {
  /** Accumulate one provider delta; publishes buffered text when due. */
  readonly add: (delta: string) => Effect.Effect<void, E>;
  /** Publish whatever is still buffered when the stream ends. */
  readonly end: () => Effect.Effect<void, E>;
}

const DEFAULT_COALESCE_INTERVAL_MS = 100;

export const makeCoalescedDeltaSink = <E>(options: {
  readonly flush: (text: string) => Effect.Effect<void, E>;
  /** Current time; production passes `Clock.currentTimeMillis`. */
  readonly now: Effect.Effect<number>;
  readonly intervalMs?: number;
}): CoalescedDeltaSink<E> => {
  const intervalMs = options.intervalMs ?? DEFAULT_COALESCE_INTERVAL_MS;
  let buffer = "";
  let lastFlushAtMs: number | undefined;

  const takeBuffer = (): string => {
    const text = buffer;
    buffer = "";
    return text;
  };

  const flushIfDue = (): Effect.Effect<void, E> =>
    Effect.flatMap(options.now, (nowMs) => {
      if (
        buffer.length === 0 ||
        (lastFlushAtMs !== undefined && nowMs - lastFlushAtMs < intervalMs)
      ) {
        return Effect.void;
      }
      lastFlushAtMs = nowMs;
      return options.flush(takeBuffer());
    });

  return {
    add: (delta) =>
      Effect.sync(() => {
        buffer += delta;
      }).pipe(Effect.flatMap(() => flushIfDue())),
    // The stream is over, so whatever is buffered ships immediately.
    end: () => {
      if (buffer.length === 0) return Effect.void;
      return options.flush(takeBuffer());
    },
  };
};
