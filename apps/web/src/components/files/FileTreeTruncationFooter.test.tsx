/**
 * The footer only exists to tell somebody with a huge workspace why their tree
 * looks short. Called as a plain function and read for text, like every other
 * presentational check here.
 */
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vite-plus/test";

import { FileTreeTruncationFooter } from "./FileTreeTruncationFooter";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (!isValidElement(node)) return "";
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

describe("FileTreeTruncationFooter", () => {
  it("says what happened when the listing hit the cap", () => {
    const text = textOf(FileTreeTruncationFooter());
    expect(text).toContain("25,000");
  });
});
