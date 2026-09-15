import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";
import { PocketId } from "@rune/contracts";

import { PocketWorkspace } from "./PocketWorkspace";
import type { PocketWorkspaceThreadData } from "./pocketWorkspace.logic";

const thread: PocketWorkspaceThreadData = {
  id: "thread-1",
  title: "Release notes",
  updatedAt: "2026-08-29T00:00:00.000Z",
  createdAt: "2026-08-28T00:00:00.000Z",
  status: "done",
  pinned: false,
  providerLabel: "Codex",
};

describe("PocketWorkspace", () => {
  it("restores search state and exposes scalable open-surface contracts", () => {
    const getItem = vi.fn(() =>
      JSON.stringify({
        view: "compact",
        sort: "activity",
        query: "release",
        scrollTop: 128,
        expandedChildPocketIds: [],
      }),
    );
    vi.stubGlobal("window", { localStorage: { getItem } });

    try {
      const markup = renderToStaticMarkup(
        <PocketWorkspace
          pocketId={PocketId.make("pocket-1")}
          title="Shipping"
          threads={[thread]}
          onClose={() => undefined}
          onOpenThread={() => undefined}
        />,
      );

      expect(markup).toContain('data-rune-pocket-state="open"');
      expect(markup).toContain('data-rune-pocket-surface-state="open"');
      expect(markup).toContain('data-rune-pocket-motion-phase="settle"');
      expect(markup).toContain('data-rune-pocket-motion-finite="true"');
      expect(markup).toContain('value="release"');
      expect(markup).toContain("[content-visibility:auto]");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
