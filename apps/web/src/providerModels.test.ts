import { ProviderDriverKind } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import { getProviderModelMediaSupport } from "./providerModels";

const codex = ProviderDriverKind.make("codex");

function model(slug: string, metadata?: { inputModalities?: string[] }) {
  return {
    slug,
    name: slug,
    isCustom: false,
    capabilities: null,
    ...(metadata ? { metadata } : {}),
  };
}

describe("getProviderModelMediaSupport", () => {
  it("resolves media support from the selected model's catalog metadata", () => {
    const models = [
      model("gpt-5.6-sol", { inputModalities: ["text", "image"] }),
      model("gemini-3.7-flash", { inputModalities: ["text", "image", "audio", "video"] }),
    ];
    expect(getProviderModelMediaSupport(models, "gemini-3.7-flash", codex)).toEqual({
      image: true,
      audio: true,
      video: true,
      pdf: false,
      folder: "unknown",
    });
  });

  it("keeps unknown catalog capabilities explicit instead of guessing support", () => {
    expect(getProviderModelMediaSupport([], "anything", codex)).toEqual({
      image: "unknown",
      audio: "unknown",
      video: "unknown",
      pdf: "unknown",
      folder: "unknown",
    });
    expect(getProviderModelMediaSupport([model("gpt-5.6-sol")], "gpt-5.6-sol", codex)).toEqual({
      image: "unknown",
      audio: "unknown",
      video: "unknown",
      pdf: "unknown",
      folder: "unknown",
    });
  });

  it("expands provider aliases before matching the catalog entry", () => {
    const claude = ProviderDriverKind.make("claudeAgent");
    const models = [model("claude-sonnet-5", { inputModalities: ["text"] })];
    expect(getProviderModelMediaSupport(models, "sonnet-5", claude)).toEqual({
      image: false,
      audio: false,
      video: false,
      pdf: false,
      folder: "unknown",
    });
  });
});
