import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { SENT_FILE_ATTACHMENT_ACTIONS, SentFileAttachmentChip } from "./SentFileAttachmentChip";

describe("SentFileAttachmentChip", () => {
  it("uses Preview as the primary action and exposes safe attachment actions without its path", () => {
    const attachmentPath = "C:\\agent\\private\\report.pdf";
    const html = renderToStaticMarkup(
      <SentFileAttachmentChip
        attachment={{
          type: "file",
          kind: "file",
          id: "report-pdf",
          name: "report.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2_048,
          path: attachmentPath,
        }}
        onOpenAttachment={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="Preview report.pdf · PDF"');
    expect(html).toContain("Preview");
    expect(SENT_FILE_ATTACHMENT_ACTIONS).toEqual([
      "Preview",
      "Reveal in RUNE Files",
      "Reveal in system Explorer",
      "Remove",
    ]);
    expect(html).not.toContain(attachmentPath);
  });

  it("marks path-dependent actions unavailable for a pathless server upload", () => {
    const html = renderToStaticMarkup(
      <SentFileAttachmentChip
        attachment={{
          type: "file",
          kind: "file",
          id: "server-upload",
          name: "server-upload.bin",
          mimeType: "application/octet-stream",
          sizeBytes: 512,
        }}
        onOpenAttachment={vi.fn()}
      />,
    );

    expect(SENT_FILE_ATTACHMENT_ACTIONS).toContain("Reveal in RUNE Files");
    expect(SENT_FILE_ATTACHMENT_ACTIONS).toContain("Reveal in system Explorer");
    expect(SENT_FILE_ATTACHMENT_ACTIONS).toContain("Remove");
    expect(html).toContain('aria-label="Attachment actions for server-upload.bin"');
  });
});
