import { describe, expect, it } from "vite-plus/test";

import { RUNE_MOTION_MS } from "./runeMotion";

import {
  resolveRuneRightPanelPresentation,
  resolveRunePanelMotionState,
  resolveRunePanelSettleDelayMs,
  runePanelTransitionClass,
  shouldRestoreRunePanelToggleFocus,
} from "./runePanelMotion";

describe("RUNE panel motion", () => {
  it("distinguishes opening, open, closing, and closed states", () => {
    expect(
      resolveRunePanelMotionState({ open: true, previousOpen: false, reducedMotion: false }),
    ).toBe("opening");
    expect(
      resolveRunePanelMotionState({ open: true, previousOpen: true, reducedMotion: false }),
    ).toBe("open");
    expect(
      resolveRunePanelMotionState({ open: false, previousOpen: true, reducedMotion: false }),
    ).toBe("closing");
    expect(
      resolveRunePanelMotionState({ open: false, previousOpen: false, reducedMotion: false }),
    ).toBe("closed");
  });

  it("makes reduced motion immediate", () => {
    expect(
      resolveRunePanelMotionState({ open: true, previousOpen: false, reducedMotion: true }),
    ).toBe("open");
    expect(
      resolveRunePanelMotionState({ open: false, previousOpen: true, reducedMotion: true }),
    ).toBe("closed");
  });

  it("maps each state to a stable CSS hook", () => {
    expect(runePanelTransitionClass("opening")).toBe("rune-panel-motion-opening");
    expect(runePanelTransitionClass("open")).toBe("rune-panel-motion-open");
    expect(runePanelTransitionClass("closing")).toBe("rune-panel-motion-closing");
    expect(runePanelTransitionClass("closed")).toBe("rune-panel-motion-closed");
  });

  it("scales the settle window to the panel's motion duration", () => {
    expect(resolveRunePanelSettleDelayMs(undefined)).toBe(RUNE_MOTION_MS.standard + 40);
    expect(resolveRunePanelSettleDelayMs(280)).toBe(320);
  });

  it("keeps one content identity while the presentation crosses the sheet breakpoint", () => {
    const inline = resolveRuneRightPanelPresentation(false);
    const sheet = resolveRuneRightPanelPresentation(true);

    expect(inline).toEqual({ contentKey: "rune-right-panel-content", mode: "inline" });
    expect(sheet).toEqual({ contentKey: inline.contentKey, mode: "sheet" });
  });

  it("restores and consumes the close intent for reduced motion", () => {
    expect(
      shouldRestoreRunePanelToggleFocus({
        closeIntent: true,
        open: false,
        reducedMotion: true,
        state: "closed",
      }),
    ).toBe(true);
    expect(
      shouldRestoreRunePanelToggleFocus({
        closeIntent: false,
        open: false,
        reducedMotion: true,
        state: "closed",
      }),
    ).toBe(false);
  });
});
