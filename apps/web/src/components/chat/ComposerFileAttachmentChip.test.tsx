import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  COMPOSER_FILE_ATTACHMENT_ACTIONS,
  ComposerFileAttachmentChip,
} from "./ComposerFileAttachmentChip";

describe("ComposerFileAttachmentChip", () => {
  it("renders a compact typed attachment without leaking its path", () => {
    const html = renderToStaticMarkup(
      <ComposerFileAttachmentChip
        attachment={{
          type: "file",
          kind: "file",
          id: "video-1",
          name: "ALT70xlbnR.mp4",
          mimeType: "video/mp4",
          sizeBytes: 18_400_000,
          path: "C:\\Users\\Bitreon\\Videos\\ALT70xlbnR.mp4",
        }}
        onPreview={vi.fn()}
        onRevealInFiles={vi.fn()}
        onRevealInExplorer={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain('data-composer-file-attachment="true"');
    expect(html).toContain("ALT70xlbnR.mp4");
    expect(html).toContain("17.5 MB");
    expect(html).toContain("Video");
    expect(html).toContain("Preview");
    expect(html).toContain("Attachment actions for ALT70xlbnR.mp4");
    expect(COMPOSER_FILE_ATTACHMENT_ACTIONS).toEqual([
      "Preview",
      "Reveal in RUNE Files",
      "Reveal in system Explorer",
      "Remove",
    ]);
    expect(html).not.toContain("C:\\\\Users\\\\Bitreon");
  });

  it("labels folders separately from media files", () => {
    const html = renderToStaticMarkup(
      <ComposerFileAttachmentChip
        attachment={{
          type: "file",
          kind: "folder",
          id: "folder-1",
          name: "release",
          mimeType: "inode/directory",
          sizeBytes: 0,
          path: "C:\\repo\\release",
        }}
        onPreview={vi.fn()}
        onRevealInFiles={vi.fn()}
        onRevealInExplorer={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain("release");
    expect(html).toContain("0 B");
    expect(html).toContain("Folder");
  });
});
