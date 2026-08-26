import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { RuneLoader } from "./RuneLoader";

describe("RuneLoader", () => {
  it("announces itself as a status region", () => {
    const markup = renderToStaticMarkup(<RuneLoader />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="Loading"');
  });

  it("cuts the mark into six facets", () => {
    const markup = renderToStaticMarkup(<RuneLoader />);

    expect(markup.match(/<clipPath/g)?.length).toBe(6);
    expect(markup.match(/rune-loader-facet/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("scopes its gradient and clip ids per instance", () => {
    // Both loaders share one tree so React's useId counter must disambiguate.
    const markup = renderToStaticMarkup(
      <>
        <RuneLoader />
        <RuneLoader size={32} label="Busy" />
      </>,
    );

    const ids = markup.match(/id="([^"]+)"/g) ?? [];
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(markup).toContain('aria-label="Busy"');
  });
});
