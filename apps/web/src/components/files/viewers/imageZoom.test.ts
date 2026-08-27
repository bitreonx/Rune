import { describe, expect, it } from "vite-plus/test";

import { clampZoom, nextPan, resetPan, stepZoom } from "./imageZoom.ts";

describe("clampZoom", () => {
  it("clamps below the lower bound", () => {
    expect(clampZoom(0.1)).toBe(0.25);
  });
  it("clamps above the upper bound", () => {
    expect(clampZoom(20)).toBe(8);
  });
  it("keeps in-range values", () => {
    expect(clampZoom(1.5)).toBe(1.5);
  });
  it("returns 1 for non-finite input", () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("stepZoom", () => {
  it("zooms in by 1.25x", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
  });
  it("zooms out by 1/1.25x", () => {
    expect(stepZoom(1, -1)).toBe(0.8);
  });
  it("clamps at the upper bound", () => {
    expect(stepZoom(7, 1)).toBe(8);
  });
  it("clamps at the lower bound", () => {
    expect(stepZoom(0.3, -1)).toBe(0.25);
  });
});

describe("resetPan", () => {
  it("returns origin", () => {
    expect(resetPan()).toEqual({ x: 0, y: 0 });
  });
});

describe("nextPan", () => {
  it("computes the pan offset from a drag", () => {
    const result = nextPan(
      { x: 100, y: 100 },
      { x: 130, y: 90 },
      { x: 0, y: 0 },
    );
    expect(result).toEqual({ x: 30, y: -10 });
  });

  it("preserves the base offset when the cursor returns", () => {
    const result = nextPan(
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 20, y: 20 },
    );
    expect(result).toEqual({ x: 20, y: 20 });
  });
});
