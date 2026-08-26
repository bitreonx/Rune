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
    });
  });

  it("falls back to images-only defaults for unknown or silent models", () => {
    expect(getProviderModelMediaSupport([], "anything", codex)).toEqual({
      image: true,
      audio: false,
      video: false,
    });
    expect(getProviderModelMediaSupport([model("gpt-5.6-sol")], "gpt-5.6-sol", codex)).toEqual({
      image: true,
      audio: false,
      video: false,
    });
  });

  it("expands provider aliases before matching the catalog entry", () => {
    const claude = ProviderDriverKind.make("claudeAgent");
    const models = [model("claude-sonnet-5", { inputModalities: ["text"] })];
    expect(getProviderModelMediaSupport(models, "sonnet-5", claude)).toEqual({
      image: false,
      audio: false,
      video: false,
    });
  });
});
