import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";

import { ComposerControlChevron } from "./ComposerControl";

describe("ComposerControlChevron", () => {
  it("points down while its control is closed", () => {
    const markup = renderToStaticMarkup(<ComposerControlChevron />);
    expect(markup).toContain("data-composer-control-chevron");
    expect(markup).not.toContain("rotate-180");
  });

  it("flips up while its control is open", () => {
    const markup = renderToStaticMarkup(<ComposerControlChevron open />);
    expect(markup).toContain("data-composer-control-chevron");
    expect(markup).toContain("rotate-180");
  });
});
