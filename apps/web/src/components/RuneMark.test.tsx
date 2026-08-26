import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { RuneMark } from "./RuneMark";

describe("RuneMark", () => {
  it("exposes RUNE as its accessible label", () => {
    const markup = renderToStaticMarkup(<RuneMark />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="RUNE"');
    expect(markup).toContain("data-rune-wordmark");
  });

  it("can render the compact mark without a visible wordmark", () => {
    const markup = renderToStaticMarkup(<RuneMark showWordmark={false} size="sm" />);

    expect(markup).toContain('aria-label="RUNE"');
    expect(markup).not.toContain("data-rune-wordmark");
  });

  it.each(["text-foreground", "text-white"])(
    "inherits its %s color for light and dark chrome",
    (chromeColor) => {
      const markup = renderToStaticMarkup(
        <span className={chromeColor}>
          <RuneMark />
        </span>,
      );

      expect(markup).toContain('fill="currentColor"');
    },
  );
});
