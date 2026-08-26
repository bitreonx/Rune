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
  | {
      readonly kind: "toolCallDelta";
      readonly index: number;
      readonly id?: string;
      readonly name?: string;
      readonly argsDelta: string;
    }
  | { readonly kind: "finish"; readonly reason: string }
  | { readonly kind: "usage"; readonly usage: Record<string, unknown> }
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
  if (!isRecord(parsed)) return { kind: "ignore" };
  if (isRecord(parsed.usage)) {
    const usage: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.usage)) {
      usage[key] = value;
    }
    return { kind: "usage", usage };
  }
  if (!Array.isArray(parsed.choices)) return { kind: "ignore" };
  const choice = parsed.choices.find(isRecord);
  if (!choice) return { kind: "ignore" };
  if (typeof choice.finish_reason === "string" && choice.finish_reason.length > 0) {
    return { kind: "finish", reason: choice.finish_reason };
  }
  if (!isRecord(choice.delta)) return { kind: "ignore" };
  if (Array.isArray(choice.delta.tool_calls)) {
    const call = choice.delta.tool_calls.find(isRecord);
    if (!call || typeof call.index !== "number") return { kind: "ignore" };
    const fn = isRecord(call.function) ? call.function : {};
    return {
      kind: "toolCallDelta",
      index: call.index,
      ...(typeof call.id === "string" && call.id.length > 0 ? { id: call.id } : {}),
      ...(typeof fn.name === "string" && fn.name.length > 0 ? { name: fn.name } : {}),
      argsDelta: typeof fn.arguments === "string" ? fn.arguments : "",
    };
  }
  if (typeof choice.delta.content !== "string") return { kind: "ignore" };
  return { kind: "delta", text: choice.delta.content };
};

export interface CompletedToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

/**
 * Merge streamed `tool_calls` fragments back into whole calls. Fragments for
 * one call arrive across many chunks — first carries id/name, later ones
 * append argument text — so accumulation is keyed by the provider's index.
 */
export const makeToolCallAccumulator = (): {
  add: (result: Extract<SseLineResult, { kind: "toolCallDelta" }>) => void;
  finish: () => Array<CompletedToolCall>;
} => {
  const byIndex = new Map<number, { id: string; name: string; arguments: string }>();
  return {
    add: (result) => {
      const current = byIndex.get(result.index) ?? { id: "", name: "", arguments: "" };
      byIndex.set(result.index, {
        id: current.id || result.id || "",
        name: current.name || result.name || "",
        arguments: current.arguments + result.argsDelta,
      });
    },
    finish: () =>
      [...byIndex.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, call]) => ({ ...call, id: call.id || `call_${index}` }))
        .filter((call) => call.name.length > 0),
  };
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
