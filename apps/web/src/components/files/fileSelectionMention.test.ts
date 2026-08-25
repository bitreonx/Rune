import { describe, expect, it } from "vite-plus/test";

import { buildFileSelectionMention } from "./fileSelectionMention";

describe("buildFileSelectionMention", () => {
  it("mentions the file with a one-based line label", () => {
    expect(buildFileSelectionMention("src/app.ts", 2, 2)).toBe("[app.ts](src/app.ts) L3");
  });

  it("normalizes a backwards selection into ascending order", () => {
    expect(buildFileSelectionMention("src/app.ts", 8, 3)).toBe(
      "[app.ts](src/app.ts) L4 to L9",
    );
  });
});
