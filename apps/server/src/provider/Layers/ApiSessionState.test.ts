import { describe, expect, it } from "vite-plus/test";

import {
  decodeApiResumeCursor,
  encodeApiResumeCursor,
  type ApiTranscriptSource,
} from "./ApiSessionState.ts";

describe("ApiSessionState", () => {
  it("round trips a bounded transcript without tool or system messages", () => {
    const cursor = encodeApiResumeCursor({
      messages: [
        { role: "system", content: "Do not persist this." },
        { role: "user", content: "Build the feature." },
        { role: "assistant", content: "I will inspect the repository." },
        { role: "tool", content: "secret output" },
      ],
      turns: [
        {
          id: "turn-1",
          items: [
            { role: "user", content: "Build the feature." },
            { role: "assistant", content: "I will inspect the repository." },
            { role: "tool", content: "secret output" },
          ],
        },
      ],
    });

    expect(decodeApiResumeCursor(cursor)).toEqual({
      version: 1,
      messages: [
        { role: "user", content: "Build the feature." },
        { role: "assistant", content: "I will inspect the repository." },
      ],
      turns: [
        {
          id: "turn-1",
          items: [
            { role: "user", content: "Build the feature." },
            { role: "assistant", content: "I will inspect the repository." },
          ],
        },
      ],
    });
  });

  it("rejects malformed, unknown-version, and oversized cursors", () => {
    expect(decodeApiResumeCursor(undefined)).toBeUndefined();
    expect(decodeApiResumeCursor({ version: 2, messages: [], turns: [] })).toBeUndefined();
    expect(
      decodeApiResumeCursor({ version: 1, messages: "not-an-array", turns: [] }),
    ).toBeUndefined();
    expect(
      decodeApiResumeCursor({
        version: 1,
        messages: [{ role: "user", content: "x".repeat(100_001) }],
        turns: [],
      }),
    ).toBeUndefined();
  });

  it("keeps the newest content within the total cursor budget", () => {
    const input: ApiTranscriptSource = {
      messages: Array.from({ length: 80 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `message-${index}-${"x".repeat(4_000)}`,
      })),
      turns: Array.from({ length: 40 }, (_, index) => ({
        id: `turn-${index}`,
        items: [{ role: "assistant", content: `turn-${index}-${"y".repeat(4_000)}` }],
      })),
    };

    const decoded = decodeApiResumeCursor(encodeApiResumeCursor(input));

    expect(decoded).toBeDefined();
    expect(decoded!.messages.at(-1)?.content).toContain("message-79");
    expect(decoded!.turns.at(-1)?.id).toBe("turn-39");
    expect(JSON.stringify(decoded).length).toBeLessThan(120_001);
  });
});
