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
    expect(html).toContain('aria-label="Model attachment capabilities"');
    expect(html).toContain("Model attachment capabilities");
    expect(
      resolveAttachmentCapabilityCopy({
        image: true,
        audio: "unknown",
        video: false,
        pdf: "unknown",
        folder: true,
      }).image,
    ).toContain("Direct provider-advertised model input");
  });

  it("separates provider-advertised input from RUNE-tested transport", () => {
    const copy = resolveAttachmentCapabilityCopy({
      image: true,
      audio: true,
      video: true,
      pdf: true,
      folder: true,
    });
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapabilityDetails
        modelName="Multimodal model"
        mediaSupport={{
          image: true,
          audio: true,
          video: true,
          pdf: true,
          folder: true,
        }}
      />,
    );

    expect(copy.audio).toContain("Direct provider-advertised model input");
    expect(copy.audio).not.toBe("Audio input is available.");
    expect(html).toContain("RUNE-tested file/path transport");
    expect(html).toContain("does not imply native model input");
  });

  it("shows Unknown when the model catalog is silent without a checked state", () => {
    const html = renderToStaticMarkup(
      <ComposerAttachmentCapabilityDetails modelName="Unlisted model" mediaSupport={{}} />,
    );

    expect(html).toContain("Unknown");
    expect(html).toContain("catalog is silent");
    expect(html).toContain("RUNE-tested file/path transport");
    expect(html).not.toContain('data-composer-attachment-capability-state="true"');
    expect(html).not.toContain("✓");
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

    expect(html).toContain("Model attachment capabilities");
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
