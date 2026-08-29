import { describe, expect, it } from "vite-plus/test";

import { DRIVER_OPTIONS } from "./providerDriverMeta";

describe("provider driver metadata", () => {
  it("keeps model services out of the harness-instance chooser", () => {
    const labels = DRIVER_OPTIONS.map((option) => option.label);

    expect(labels).toEqual(
      expect.arrayContaining(["Codex", "Claude Code", "OpenCode"]),
    );
    expect(labels).not.toContain("OpenRouter");
    expect(labels).not.toContain("OpenAI API");
  });
});
