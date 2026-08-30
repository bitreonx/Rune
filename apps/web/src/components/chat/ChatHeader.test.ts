import { renderToStaticMarkup } from "react-dom/server";
import { EnvironmentId } from "@rune/contracts";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";

import {
  resolveRenameCommit,
  resolveThreadTitleMenuPosition,
  shouldShowOpenInPicker,
  ThreadTitleAnchor,
} from "./ChatHeader";

describe("ThreadTitleAnchor", () => {
  it("keeps the title flexible while the menu trigger remains visible", () => {
    const markup = renderToStaticMarkup(
      createElement(ThreadTitleAnchor, {
        activeThreadTitle: "A very long thread title that should ellipsize before the trigger",
        onDoubleClick: () => undefined,
        onOpenMenu: () => undefined,
      }),
    );

    expect(markup).toContain('data-thread-title-anchor="true"');
    expect(markup).toContain('data-thread-title-trigger="true"');
    expect(markup).toContain("min-w-0 flex-1");
    expect(markup).toContain("truncate");
    expect(markup).toContain("size-6 shrink-0");
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain("duration-[var(--rune-motion-fast)]");
    expect(markup).toContain("motion-reduce:transition-none");
  });
});

describe("resolveThreadTitleMenuPosition", () => {
  it("uses the dedicated trigger click point for pointer opens", () => {
    expect(
      resolveThreadTitleMenuPosition({
        pointerPosition: { x: 420, y: 36 },
        anchorRect: { left: 12, bottom: 52 },
      }),
    ).toEqual({ x: 420, y: 36 });
  });

  it("anchors keyboard opens to the trigger bottom edge", () => {
    expect(
      resolveThreadTitleMenuPosition({
        pointerPosition: null,
        anchorRect: { left: 12, bottom: 52 },
      }),
    ).toEqual({ x: 12, y: 56 });
  });

  it("does not invent a position when no trigger anchor is available", () => {
    expect(resolveThreadTitleMenuPosition({ pointerPosition: null })).toBeNull();
  });
});

describe("shouldShowOpenInPicker", () => {
  const primaryEnvironmentId = EnvironmentId.make("environment-primary");

  it("shows the picker for projects in the primary environment", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: primaryEnvironmentId,
        primaryEnvironmentId,
        remoteOpenMode: "local-exec",
      }),
    ).toBe(true);
  });

  it("shows the picker for remote environments in deep-link mode", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: EnvironmentId.make("environment-remote"),
        primaryEnvironmentId,
        remoteOpenMode: "remote-links",
      }),
    ).toBe(true);
  });

  it("shows the picker's unavailable state for remote environments without an SSH route", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: EnvironmentId.make("environment-remote"),
        primaryEnvironmentId: null,
        remoteOpenMode: "remote-unavailable",
      }),
    ).toBe(true);
  });

  it("hides the picker for non-primary local backends", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: EnvironmentId.make("environment-remote"),
        primaryEnvironmentId,
        remoteOpenMode: "local-exec",
      }),
    ).toBe(false);
  });

  it("hides the picker when there is no active project", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: undefined,
        activeThreadEnvironmentId: primaryEnvironmentId,
        primaryEnvironmentId,
        remoteOpenMode: "remote-links",
      }),
    ).toBe(false);
  });
});

describe("resolveRenameCommit", () => {
  it("commits a trimmed changed title", () => {
    expect(resolveRenameCommit({ title: "  New title ", originalTitle: "Old" })).toEqual({
      action: "commit",
      title: "New title",
    });
  });

  it("rejects empty and whitespace-only titles", () => {
    expect(resolveRenameCommit({ title: "   ", originalTitle: "Old" })).toEqual({
      action: "reject-empty",
    });
  });

  it("no-ops when the trimmed title is unchanged", () => {
    expect(resolveRenameCommit({ title: " Old ", originalTitle: "Old" })).toEqual({
      action: "noop",
    });
  });
});
