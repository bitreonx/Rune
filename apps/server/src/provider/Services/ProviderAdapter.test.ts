import { describe, expect, it } from "@effect/vitest";

import { normalizeProviderAdapterCapabilities } from "./ProviderAdapter.ts";

describe("ProviderAdapter capabilities", () => {
  it("fails closed for adapters using the legacy capability shape", () => {
    expect(normalizeProviderAdapterCapabilities({ sessionModelSwitch: "unsupported" })).toEqual({
      sessionModelSwitch: "unsupported",
      supportsResume: false,
      supportsSteering: false,
      supportsApprovals: false,
      supportsToolStream: false,
      supportsUsage: false,
      supportsNativeSubagents: false,
      supportsPlanEvents: false,
    });
  });

  it("preserves explicit native capability evidence", () => {
    expect(
      normalizeProviderAdapterCapabilities({
        sessionModelSwitch: "in-session",
        supportsResume: true,
        supportsSteering: true,
        supportsApprovals: true,
        supportsToolStream: true,
        supportsUsage: true,
        supportsNativeSubagents: true,
        supportsPlanEvents: true,
      }).supportsNativeSubagents,
    ).toBe(true);
  });
});
