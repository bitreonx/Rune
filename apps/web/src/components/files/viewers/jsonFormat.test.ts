import { describe, expect, it } from "vite-plus/test";

import { countJsonLeaves, formatJson, tryParseJson } from "./jsonFormat.ts";

describe("tryParseJson", () => {
  it("parses a valid object", () => {
    const result = tryParseJson('{"a": 1}');
    expect(result._tag).toBe("Ok");
  });

  it("returns an error for invalid JSON", () => {
    const result = tryParseJson("not json");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.message).toBeTruthy();
    }
  });

  it("returns null for empty input", () => {
    const result = tryParseJson("");
    expect(result._tag).toBe("Ok");
  });

  it("trims whitespace before parsing", () => {
    const result = tryParseJson('  {"a": 1}  ');
    expect(result._tag).toBe("Ok");
  });
});

describe("formatJson", () => {
  it("pretty-prints with 2-space indent", () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it("preserves nested objects", () => {
    expect(formatJson('{"a":{"b":1}}')).toBe('{\n  "a": {\n    "b": 1\n  }\n}');
  });

  it("preserves arrays", () => {
    expect(formatJson('[1,2,3]')).toBe("[\n  1,\n  2,\n  3\n]");
  });
});

describe("countJsonLeaves", () => {
  it("counts primitive values", () => {
    expect(countJsonLeaves("a")).toBe(1);
    expect(countJsonLeaves(42)).toBe(1);
    expect(countJsonLeaves(null)).toBe(1);
  });

  it("counts array elements", () => {
    expect(countJsonLeaves([1, 2, 3])).toBe(3);
  });

  it("counts object values", () => {
    expect(countJsonLeaves({ a: 1, b: 2 })).toBe(2);
  });

  it("counts nested leaves", () => {
    expect(countJsonLeaves({ a: [1, 2], b: { c: 3 } })).toBe(3);
  });

  it("returns 0 for empty containers", () => {
    expect(countJsonLeaves({})).toBe(0);
    expect(countJsonLeaves([])).toBe(0);
  });
});
