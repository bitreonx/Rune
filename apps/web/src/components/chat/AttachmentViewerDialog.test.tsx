import { EnvironmentId } from "@rune/contracts";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

const viewerState = vi.hoisted(() => ({
  asset: { _tag: "Loading" } as
    | { readonly _tag: "Loading" }
    | { readonly _tag: "Failure"; readonly message: string | null }
    | { readonly _tag: "Success"; readonly url: string },
}));

vi.mock("../../assets/assetUrls", () => ({
  useAssetUrlState: () => viewerState.asset,
}));

vi.mock("../ui/dialog", () => {
  const Content = (props: { readonly children?: ReactNode }) => <div>{props.children}</div>;
  return {
    Dialog: (props: { readonly open: boolean; readonly children?: ReactNode }) =>
      props.open ? <div data-test-dialog="true">{props.children}</div> : null,
    DialogDescription: Content,
    DialogFooter: Content,
    DialogHeader: Content,
    DialogPanel: Content,
    DialogPopup: Content,
    DialogTitle: Content,
  };
});

import { AttachmentViewerDialog } from "./AttachmentViewerDialog";

const environmentId = EnvironmentId.make("environment-local");

describe("AttachmentViewerDialog", () => {
  it("does not pretend to preview provider-host paths and keeps safe actions path-free", () => {
    const attachmentPath = "C:\\agent\\private\\archive.bin";
    const html = renderToStaticMarkup(
      <AttachmentViewerDialog
        open
        environmentId={environmentId}
        attachment={{
          type: "file",
          kind: "file",
          id: "archive-bin",
          name: "archive.bin",
          mimeType: "application/octet-stream",
          sizeBytes: 512,
          path: attachmentPath,
        }}
        onOpenChange={() => {}}
        onRevealInFiles={() => {}}
        onRevealInExplorer={() => {}}
        onCopyPath={() => {}}
      />,
    );

    expect(html).toContain("Preview unavailable for this agent-environment path");
    expect(html).toContain("Reveal in RUNE Files");
    expect(html).toContain("Reveal in system Explorer");
    expect(html).toContain("Copy path");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<audio");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain(attachmentPath);
  });

  it("shows deterministic local metadata including the file modification time", () => {
    const lastModified = Date.parse("2026-08-30T12:34:56.000Z");
    const file = new File(["hello"], "note.bin", {
      type: "application/octet-stream",
      lastModified,
    });
    const html = renderToStaticMarkup(
      <AttachmentViewerDialog
        open
        environmentId={environmentId}
        attachment={{
          type: "file",
          kind: "file",
          id: "note-bin",
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          file,
        }}
        onOpenChange={() => {}}
      />,
    );

    expect(html).toContain("note.bin");
    expect(html).toContain("application/octet-stream");
    expect(html).toContain("5 B");
    expect(html).toContain("Modified");
    expect(html).toContain("2026-08-30T12:34:56.000Z");
  });

  it("respects reduced motion while a server-owned preview is loading", () => {
    viewerState.asset = { _tag: "Loading" };
    const html = renderToStaticMarkup(
      <AttachmentViewerDialog
        open
        environmentId={environmentId}
        attachment={{
          type: "file",
          kind: "file",
          id: "upload-pdf",
          name: "upload.pdf",
          mimeType: "application/pdf",
          sizeBytes: 5,
        }}
        onOpenChange={() => {}}
      />,
    );

    expect(html).toContain("motion-reduce:animate-none");
  });
});
