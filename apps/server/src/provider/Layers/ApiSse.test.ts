import { describe, expect, it } from "vite-plus/test";

import * as Effect from "effect/Effect";
import {
  makeCoalescedDeltaSink,
  makeToolCallAccumulator,
  resultFromSseLine,
  type SseLineResult,
} from "./ApiSse.ts";

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

describe("ApiSse tool-call parsing", () => {
  it("parses streamed tool_call fragments", () => {
    expect(
      resultFromSseLine(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read_file","arguments":""}}]}}]}',
      ),
    ).toEqual({ kind: "toolCallDelta", index: 0, id: "call_1", name: "read_file", argsDelta: "" });
    expect(
      resultFromSseLine(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":"}}]}}]}',
      ),
    ).toEqual({ kind: "toolCallDelta", index: 0, argsDelta: '{"path":' });
  });

  it("parses finish_reason and usage chunks", () => {
    expect(resultFromSseLine('data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}')).toEqual({
      kind: "finish",
      reason: "tool_calls",
    });
    expect(
      resultFromSseLine('data: {"choices":[],"usage":{"prompt_tokens":120,"completion_tokens":40}}'),
    ).toEqual({ kind: "usage", usage: { prompt_tokens: 120, completion_tokens: 40 } });
  });

  it("accumulates fragments into complete tool calls", () => {
    const acc = makeToolCallAccumulator();
    acc.add({ kind: "toolCallDelta", index: 0, id: "call_1", name: "edit_file", argsDelta: '{"path"' });
    acc.add({ kind: "toolCallDelta", index: 0, argsDelta: ':"a"}' });
    acc.add({ kind: "toolCallDelta", index: 1, id: "call_2", name: "bash", argsDelta: "{}" });
    expect(acc.finish()).toEqual([
      { id: "call_1", name: "edit_file", arguments: '{"path":"a"}' },
      { id: "call_2", name: "bash", arguments: "{}" },
    ]);
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
