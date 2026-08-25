import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { CompactComposerControlsMenu } from "./CompactComposerControlsMenu";

describe("CompactComposerControlsMenu", () => {
  it("renders its trigger on the shared composer control rhythm", () => {
    const markup = renderToStaticMarkup(
      <CompactComposerControlsMenu
        interactionMode="default"
        runtimeMode="auto"
        showInteractionModeToggle={true}
        onToggleInteractionMode={() => {}}
        onRuntimeModeChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-label="More composer controls"');
    // ComposerControl signature classes: the compact trigger must match the
    // footer's other controls instead of drifting onto raw button sizing.
    expect(markup).toContain("min-h-7");
    expect(markup).toContain("text-secondary-label");
  });
});
