import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { ComposerContextTray } from "./ComposerContextTray";

describe("ComposerContextTray", () => {
  it("renders context chips without an always-on provider skill inventory", () => {
    const html = renderToStaticMarkup(
      <ComposerContextTray
        contexts={[{ id: "terminal-1", kind: "terminal", label: "Console", scope: "lines 4-8" }]}
        onRemoveContext={vi.fn()}
      />,
    );
    expect(html).toContain('data-composer-context-tray="true"');
    expect(html).toContain("Console");
    expect(html).toContain("lines 4-8");
    expect(html).not.toContain("data-composer-skill-tray");
  });

  it("does not add empty chrome", () => {
    expect(
      renderToStaticMarkup(<ComposerContextTray contexts={[]} onRemoveContext={vi.fn()} />),
    ).toBe("");
  });
});
