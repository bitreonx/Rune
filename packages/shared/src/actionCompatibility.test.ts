import { describe, expect, it } from "@effect/vitest";

import { evaluateActionCompatibility } from "./actionCompatibility.ts";

describe("evaluateActionCompatibility", () => {
  it("normalizes equivalent operating-system names", () => {
    expect(
      evaluateActionCompatibility({
        action: { compatibility: { osFamily: "win32" } },
        observation: { osFamily: "windows" },
      }),
    ).toEqual({ status: "compatible", reasons: [] });
  });

  it("distinguishes drift from an unavailable observation", () => {
    expect(
      evaluateActionCompatibility({
        action: { compatibility: { osFamily: "linux", packageManager: "pnpm" } },
        observation: { packageManager: "npm" },
      }).status,
    ).toBe("drifted");
    expect(
      evaluateActionCompatibility({
        action: { compatibility: { osFamily: "linux", toolVersions: { node: "24" } } },
        observation: { osFamily: "linux" },
      }),
    ).toEqual({
      status: "unverified",
      reasons: ["Tool version fingerprint could not be verified."],
    });
  });
});
