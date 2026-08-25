/**
 * The toolbar is presentational chrome; called as a plain function and walked
 * for element props, like every other presentational check here.
 */
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vite-plus/test";

import { FileEditorToolbar, type FileEditorToolbarProps } from "./FileEditorToolbar";

type AnyElement = ReactElement<Record<string, unknown>>;

function collectElements(node: ReactNode, into: AnyElement[]): void {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, into);
    return;
  }
  if (!isValidElement(node)) return;
  const element = node as AnyElement;
  into.push(element);
  for (const value of Object.values(element.props)) {
    if (value !== null && typeof value === "object") collectElements(value as ReactNode, into);
  }
}

function findByAriaLabel(root: ReactNode, label: string): AnyElement | undefined {
  const elements: AnyElement[] = [];
  collectElements(root, elements);
  return elements.find((element) => element.props["aria-label"] === label);
}

function baseProps(overrides?: Partial<FileEditorToolbarProps>): FileEditorToolbarProps {
  return {
    pending: false,
    canUndo: false,
    canRedo: false,
    changesOpen: false,
    onSave: () => {},
    onUndo: () => {},
    onRedo: () => {},
    onFind: () => {},
    onToggleChanges: () => {},
    ...overrides,
  };
}

describe("FileEditorToolbar", () => {
  it("enables save only while there are unsaved changes", () => {
    const clean = findByAriaLabel(FileEditorToolbar(baseProps()), "Save file");
    expect(clean?.props["disabled"]).toBe(true);

    const dirty = findByAriaLabel(FileEditorToolbar(baseProps({ pending: true })), "Save file");
    expect(dirty?.props["disabled"]).toBe(false);
  });

  it("mirrors the editor's undo and redo availability", () => {
    const idle = FileEditorToolbar(baseProps());
    expect(findByAriaLabel(idle, "Undo")?.props["disabled"]).toBe(true);
    expect(findByAriaLabel(idle, "Redo")?.props["disabled"]).toBe(true);

    const midHistory = FileEditorToolbar(baseProps({ canUndo: true, canRedo: true }));
    expect(findByAriaLabel(midHistory, "Undo")?.props["disabled"]).toBe(false);
    expect(findByAriaLabel(midHistory, "Redo")?.props["disabled"]).toBe(false);
  });

  it("reflects whether the uncommitted-changes view is open", () => {
    const closed = findByAriaLabel(FileEditorToolbar(baseProps()), "Show uncommitted changes");
    expect(closed?.props["pressed"]).toBe(false);

    const open = findByAriaLabel(
      FileEditorToolbar(baseProps({ changesOpen: true })),
      "Show uncommitted changes",
    );
    expect(open?.props["pressed"]).toBe(true);
  });
});
