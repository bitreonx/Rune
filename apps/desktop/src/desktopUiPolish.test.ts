import { describe, expect, it } from "vite-plus/test";
import { DESKTOP_UI_POLISH_STYLE } from "./desktopUiPolish.ts";

describe("desktop UI polish", () => {
  it("keeps sidebar motion desktop-scoped and reduced-motion aware", () => {
    expect(DESKTOP_UI_POLISH_STYLE).toContain(":root[data-desktop-shell]");
    expect(DESKTOP_UI_POLISH_STYLE).toContain("prefers-reduced-motion: reduce");
    expect(DESKTOP_UI_POLISH_STYLE).toContain("will-change: width, transform");
    expect(DESKTOP_UI_POLISH_STYLE).toContain("data-rune-sidebar-rail");
  });
});
