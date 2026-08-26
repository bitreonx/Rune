import { describe, expect, it } from "vitest";
import {
  generateSubagentColor,
  generateSubagentIcon,
  generateSubagentIdentity,
  generateSubagentName,
  SUBAGENT_ICON_NAMES,
} from "./subagentIdentity";

describe("subagentIdentity", () => {
  it("generates deterministic whimsical names for agent IDs", () => {
    const name1 = generateSubagentName("agent-123");
    const name2 = generateSubagentName("agent-123");
    const name3 = generateSubagentName("agent-456");

    expect(name1).toBe(name2);
    expect(typeof name1).toBe("string");
    expect(name1.length).toBeGreaterThan(3);
    // Capitalized
    expect(name1[0]).toMatch(/[A-Z]/);
  });

  it("generates deterministic HSL colors for agent IDs", () => {
    const color1 = generateSubagentColor("agent-123");
    const color2 = generateSubagentColor("agent-123");

    expect(color1).toBe(color2);
    expect(color1).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
  });

  it("generates deterministic icon glyphs from the icon palette", () => {
    const icon1 = generateSubagentIcon("agent-123");
    const icon2 = generateSubagentIcon("agent-123");

    expect(icon1).toBe(icon2);
    expect(SUBAGENT_ICON_NAMES).toContain(icon1);
  });

  it("generates complete identity with name, color, and icon", () => {
    const identity = generateSubagentIdentity("subagent-codex-1");

    expect(identity.generatedName).toBeTruthy();
    expect(identity.iconColor).toMatch(/^hsl\(/);
    expect(SUBAGENT_ICON_NAMES).toContain(identity.iconName);
  });
});
