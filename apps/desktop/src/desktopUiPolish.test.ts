import { describe, expect, it } from "vite-plus/test";
import { DESKTOP_UI_POLISH_STYLE, installDesktopUiPolish } from "./desktopUiPolish.ts";

describe("desktop UI polish", () => {
  it("keeps sidebar motion desktop-scoped and reduced-motion aware", () => {
    expect(DESKTOP_UI_POLISH_STYLE).toContain(":root[data-desktop-shell]");
    expect(DESKTOP_UI_POLISH_STYLE).toContain("prefers-reduced-motion: reduce");
    expect(DESKTOP_UI_POLISH_STYLE).toContain("will-change: width, transform");
    expect(DESKTOP_UI_POLISH_STYLE).toContain("data-rune-sidebar-rail");
  });

  it("does not abort the preload while the document element is still unavailable", () => {
    let domContentLoaded: (() => void) | undefined;
    const root = {
      dataset: {} as DOMStringMap,
      append: () => undefined,
    } as HTMLElement;
    const style = {
      dataset: {} as DOMStringMap,
      textContent: null as string | null,
      append: () => undefined,
    } as HTMLStyleElement;
    const documentDuringPreload = {
      documentElement: null as HTMLElement | null,
      head: null,
      createElement: () => style,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        domContentLoaded = listener as () => void;
      },
    } as unknown as Document;

    expect(() => installDesktopUiPolish(documentDuringPreload)).not.toThrow();
    expect(domContentLoaded).toBeTypeOf("function");

    Object.defineProperty(documentDuringPreload, "documentElement", { value: root });
    domContentLoaded?.();

    expect(root.dataset.desktopShell).toBe("true");
    expect(style.textContent).toBe(DESKTOP_UI_POLISH_STYLE);
  });
});
