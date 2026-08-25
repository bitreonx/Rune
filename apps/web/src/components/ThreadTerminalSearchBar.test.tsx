import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import {
  searchCountLabel,
  searchInputKeyDown,
  ThreadTerminalSearchBar,
} from "./ThreadTerminalSearchBar";

describe("searchCountLabel", () => {
  it("shows position over total once a match is active", () => {
    expect(searchCountLabel({ query: "err", count: 17, activeIndex: 2 })).toBe("3/17");
    expect(searchCountLabel({ query: "err", count: 1, activeIndex: 0 })).toBe("1/1");
  });

  it("falls back to a bare count when nothing is active yet", () => {
    expect(searchCountLabel({ query: "err", count: 4, activeIndex: -1 })).toBe("4 results");
    expect(searchCountLabel({ query: "err", count: 1, activeIndex: -1 })).toBe("1 result");
  });

  it("reports an empty buffer without matches", () => {
    expect(searchCountLabel({ query: "err", count: 0, activeIndex: -1 })).toBe("No matches");
  });

  it("shows nothing for a cleared query even after a scan", () => {
    expect(searchCountLabel({ query: "", count: 0, activeIndex: -1 })).toBe("");
  });

  it("shows nothing before a scan exists", () => {
    expect(searchCountLabel(null)).toBe("");
  });
});

describe("searchInputKeyDown", () => {
  it("moves to the next match on Enter", () => {
    expect(searchInputKeyDown({ key: "Enter", shiftKey: false })).toBe("next");
  });

  it("moves to the previous match on Shift+Enter", () => {
    expect(searchInputKeyDown({ key: "Enter", shiftKey: true })).toBe("previous");
  });

  it("closes on Escape", () => {
    expect(searchInputKeyDown({ key: "Escape", shiftKey: false })).toBe("close");
  });

  it("ignores every other key", () => {
    expect(searchInputKeyDown({ key: "a", shiftKey: false })).toBeNull();
  });
});

describe("ThreadTerminalSearchBar", () => {
  it("renders the query, count, and labelled navigation controls", () => {
    const markup = renderToStaticMarkup(
      <ThreadTerminalSearchBar
        query="err"
        status={{ query: "err", count: 5, activeIndex: 1 }}
        onQueryChange={() => {}}
        onNext={() => {}}
        onPrevious={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).toContain('data-terminal-search="true"');
    expect(markup).toContain('value="err"');
    expect(markup).toContain(">2/5</");
    expect(markup).toContain('aria-label="Previous match"');
    expect(markup).toContain('aria-label="Next match"');
    expect(markup).toContain('aria-label="Close search"');
  });

  it("announces an empty result set to screen readers", () => {
    const markup = renderToStaticMarkup(
      <ThreadTerminalSearchBar
        query="zzz"
        status={{ query: "zzz", count: 0, activeIndex: -1 }}
        onQueryChange={() => {}}
        onNext={() => {}}
        onPrevious={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).toContain("No matches");
  });

  it("disables stepping while there is nothing to step through", () => {
    const markup = renderToStaticMarkup(
      <ThreadTerminalSearchBar
        query="zzz"
        status={null}
        onQueryChange={() => {}}
        onNext={() => {}}
        onPrevious={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).toContain("disabled");
  });
});
