import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { PocketShelf } from "./PocketShelf";
import type { PocketWorkspaceThreadData } from "./pocketWorkspace.logic";

const thread = (id: string): PocketWorkspaceThreadData => ({
  id,
  title: `Thread ${id}`,
  updatedAt: "2026-08-29T00:00:00.000Z",
  createdAt: "2026-08-28T00:00:00.000Z",
  status: "done",
  pinned: false,
  providerLabel: "Codex",
});

describe("PocketShelf", () => {
  it("renders the bounded shelf, overflow count, and finite motion hooks", () => {
    const markup = renderToStaticMarkup(
      <PocketShelf
        threads={Array.from({ length: 9 }, (_, index) => thread(String(index)))}
        onOpenThread={() => undefined}
      />,
    );

    expect(markup).toContain('data-rune-pocket-shelf="true"');
    expect(markup).toContain('data-rune-pocket-shelf-count="6"');
    expect(markup).toContain('data-rune-pocket-shelf-overflow="3"');
    expect(markup).toContain('data-rune-pocket-motion-phase="settle"');
    expect(markup).toContain('data-rune-pocket-motion-finite="true"');
    expect(markup).toContain("+3");
  });
});
