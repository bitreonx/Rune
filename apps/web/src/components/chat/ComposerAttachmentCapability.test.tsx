import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import {
  ComposerAttachmentCapability,
  resolveAttachmentCapabilityCopy,
} from "./ComposerAttachmentCapability";

describe("ComposerAttachmentCapability", () => {
  it("keeps the capability explanation behind an adjacent click control", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapability modelName="GPT-5.6-Luna" supportsNativeImageUpload />,
    );

    expect(html).toContain('data-composer-attachment-capability-trigger="true"');
    expect(resolveAttachmentCapabilityCopy(true).image).toContain("Images upload directly");
    expect(resolveAttachmentCapabilityCopy(true).other).toContain("Audio, video");
  });

  it("explains path handling when the model cannot receive images", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapability modelName="Text model" supportsNativeImageUpload={false} />,
    );

    expect(resolveAttachmentCapabilityCopy(false).image).toContain("no image input");
    expect(resolveAttachmentCapabilityCopy(false).image).not.toContain("Images upload directly");
  });
});
