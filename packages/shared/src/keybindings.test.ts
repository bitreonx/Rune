import { describe, expect, it } from "vite-plus/test";

import {
  compileResolvedKeybindingsConfig,
  DEFAULT_KEYBINDINGS,
  DEFAULT_RESOLVED_KEYBINDINGS,
} from "./keybindings.ts";

describe("DEFAULT_KEYBINDINGS", () => {
  it("binds terminal.search to mod+f while the terminal has focus", () => {
    const rules = DEFAULT_KEYBINDINGS.filter((rule) => rule.command === "terminal.search");
    expect(rules).toHaveLength(1);
    expect(rules[0]?.key).toBe("mod+f");
    expect(rules[0]?.when).toBe("terminalFocus");
  });

  it("compiles terminal.search into the resolved defaults", () => {
    const resolved = compileResolvedKeybindingsConfig(DEFAULT_KEYBINDINGS).filter(
      (rule) => rule.command === "terminal.search",
    );
    expect(resolved).toHaveLength(1);
    expect(DEFAULT_RESOLVED_KEYBINDINGS.some((rule) => rule.command === "terminal.search")).toBe(
      true,
    );
  });
});
