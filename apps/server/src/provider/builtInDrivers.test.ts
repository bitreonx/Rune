import { describe, expect, it } from "vite-plus/test";

import { BUILT_IN_DRIVERS } from "./builtInDrivers.ts";

describe("built-in provider drivers", () => {
  it("registers Antigravity as a first-class provider driver", () => {
    expect(BUILT_IN_DRIVERS.some((driver) => driver.driverKind === "antigravity")).toBe(true);
  });
});
