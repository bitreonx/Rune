import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import {
  ComposerAttachmentCapability,
  ComposerAttachmentCapabilityDetails,
  resolveAttachmentCapabilityCopy,
} from "./ComposerAttachmentCapability";

describe("ComposerAttachmentCapability", () => {
  it("keeps the capability explanation behind an adjacent click control", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapability
        modelName="GPT-5.6-Luna"
        mediaSupport={{
          image: true,
          audio: "unknown",
          video: false,
          pdf: "unknown",
          folder: true,
        }}
      />,
    );

    expect(html).toContain('data-composer-attachment-capability-trigger="true"');
    expect(
      resolveAttachmentCapabilityCopy({
        image: true,
        audio: "unknown",
        video: false,
        pdf: "unknown",
        folder: true,
      }).image,
    ).toContain("Direct vision");
  });

  it("explains path handling when the model cannot receive images", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapability
        modelName="Text model"
        mediaSupport={{
          image: false,
          audio: "unknown",
          video: "unknown",
          pdf: "unknown",
          folder: "unknown",
        }}
      />,
    );

    expect(
      resolveAttachmentCapabilityCopy({
        image: false,
        audio: "unknown",
        video: "unknown",
        pdf: "unknown",
        folder: "unknown",
      }).image,
    ).toContain("Unavailable");
    expect(
      resolveAttachmentCapabilityCopy({
        image: "unknown",
        audio: "unknown",
        video: "unknown",
        pdf: "unknown",
        folder: "unknown",
      }).image,
    ).toContain("Unknown");
  });

  it("renders a compact secondary capability sheet with real states", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapabilityDetails
        modelName="GPT-5.6-Luna"
        mediaSupport={{
          image: true,
          audio: "unknown",
          video: false,
          pdf: "unknown",
          folder: true,
        }}
      />,
    );

    expect(html).toContain("What can this model use?");
    expect(html).toContain("Images");
    expect(html).toContain("Video");
    expect(html).toContain("Audio");
    expect(html).toContain("Folders");
    expect(html).toContain("Unknown");
    expect(html).toContain('data-composer-attachment-capability-state="true"');
    expect(html).toContain('data-composer-attachment-capability-state="false"');
    expect(html).toContain('data-composer-attachment-capability-state="unknown"');
    expect(html).toContain("✓");
    expect(html).toContain("○");
  });
});
