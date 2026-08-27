import { describe, expect, it } from "vite-plus/test";

import { formatBytes } from "./formatBytes.ts";

describe("formatBytes", () => {
  it("formats bytes under 1 KB as B", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats KB, MB, GB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1_500_000)).toBe("1.4 MB");
    expect(formatBytes(2_500_000_000)).toBe("2.3 GB");
  });

  it("handles negative and non-finite input", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});
