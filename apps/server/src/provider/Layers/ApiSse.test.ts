import { describe, expect, it } from "vite-plus/test";

import * as Effect from "effect/Effect";
import { makeCoalescedDeltaSink, resultFromSseLine, type SseLineResult } from "./ApiSse.ts";

const delta = (text: string): SseLineResult => ({ kind: "delta", text });

describe("SSE line parsing", () => {
  it("extracts assistant text from chat-completion data lines", () => {
    expect(
      resultFromSseLine(
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      ),
    ).toEqual(delta("Hello"));
  });

  it("reports the done sentinel", () => {
    expect(resultFromSseLine("data: [DONE]")).toEqual({ kind: "done" });
    expect(resultFromSseLine("data:[DONE]")).toEqual({ kind: "done" });
  });

  it("ignores keepalive comments, non-data lines, and blank lines", () => {
    expect(resultFromSseLine(": OPENROUTER PROCESSING")).toEqual({ kind: "ignore" });
    expect(resultFromSseLine("event: ping")).toEqual({ kind: "ignore" });
    expect(resultFromSseLine("")).toEqual({ kind: "ignore" });
  });

  it("ignores malformed or contentless data payloads", () => {
    expect(resultFromSseLine("data: {not json")).toEqual({ kind: "ignore" });
    expect(resultFromSseLine('data: {"choices":[]}')).toEqual({ kind: "ignore" });
    expect(
      resultFromSseLine('data: {"choices":[{"delta":{"reasoning":"hidden"}}]}'),
    ).toEqual({ kind: "ignore" });
  });
});

describe("coalesced delta sink", () => {
  it("flushes the first delta immediately so first tokens are visible", async () => {
    const flushed: string[] = [];
    let timeMs = 1_000;
    const sink = makeCoalescedDeltaSink({
      flush: (text) =>
        Effect.sync(() => {
          flushed.push(text);
        }),
      now: Effect.sync(() => timeMs),
      intervalMs: 100,
    });

    await Effect.runPromise(sink.add("Hello"));

    expect(flushed).toEqual(["Hello"]);
  });

  it("coalesces deltas inside the interval and flushes when it elapses", async () => {
    const flushed: string[] = [];
    let timeMs = 1_000;
    const sink = makeCoalescedDeltaSink({
      flush: (text) =>
        Effect.sync(() => {
          flushed.push(text);
        }),
      now: Effect.sync(() => timeMs),
      intervalMs: 100,
    });

    await Effect.runPromise(sink.add("Hello")); // immediate first flush
    timeMs += 20;
    await Effect.runPromise(sink.add(" wor"));
    timeMs += 20;
    await Effect.runPromise(sink.add("ld"));
    timeMs += 61; // 101ms after the first flush
    await Effect.runPromise(sink.add("!"));

    expect(flushed).toEqual(["Hello", " world!"]);
  });

  it("flushes the remaining buffer on end", async () => {
    const flushed: string[] = [];
    let timeMs = 5_000;
    const sink = makeCoalescedDeltaSink({
      flush: (text) =>
        Effect.sync(() => {
          flushed.push(text);
        }),
      now: Effect.sync(() => timeMs),
      intervalMs: 100,
    });

    await Effect.runPromise(sink.add("Hello")); // immediate first flush
    timeMs += 30;
    await Effect.runPromise(sink.add(" wor"));
    await Effect.runPromise(sink.end()); // stream closed before the interval elapsed

    expect(flushed).toEqual(["Hello", " wor"]);
  });

  it("does not flush empty buffers on end", async () => {
    const flushed: string[] = [];
    const sink = makeCoalescedDeltaSink({
      flush: (text) =>
        Effect.sync(() => {
          flushed.push(text);
        }),
      now: Effect.sync(() => 1_000),
      intervalMs: 100,
    });

    await Effect.runPromise(sink.end());

    expect(flushed).toEqual([]);
  });
});
