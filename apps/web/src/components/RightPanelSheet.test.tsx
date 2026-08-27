import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { RightPanelSheet } from "./RightPanelSheet";

describe("RightPanelSheet", () => {
  it("keeps the panel content in one host and only adds a backdrop for sheet mode", () => {
    const inline = renderToStaticMarkup(
      <RightPanelSheet mode="inline" open motionState="open" onClose={() => undefined}>
        <div data-terminal-mount="stable" />
      </RightPanelSheet>,
    );
    const sheet = renderToStaticMarkup(
      <RightPanelSheet mode="sheet" open motionState="open" onClose={() => undefined}>
        <div data-terminal-mount="stable" />
      </RightPanelSheet>,
    );

    expect(inline.match(/data-rune-right-panel-host/g)).toHaveLength(1);
    expect(sheet.match(/data-rune-right-panel-host/g)).toHaveLength(1);
    expect(inline).not.toContain("data-rune-right-panel-backdrop");
    expect(sheet).toContain("data-rune-right-panel-backdrop");
    expect(sheet).toContain('data-terminal-mount="stable"');
  });
});
