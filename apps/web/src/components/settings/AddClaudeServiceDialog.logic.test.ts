import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { OPENROUTER_BASE_URL } from "../../claudeServices";
import {
  CLAUDE_SERVICE_WIZARD_STEPS,
  buildClaudeServiceInstance,
  claudeServicePresetDefaults,
  deriveClaudeServiceInstanceId,
  fetchClaudeServiceCatalog,
  initialClaudeServiceDraft,
  orderClaudeCatalogModels,
  resolveClaudeServiceWizardNavigation,
  type ClaudeServiceDraft,
} from "./AddClaudeServiceDialog.logic";

function draftWith(patch: Partial<ClaudeServiceDraft>): ClaudeServiceDraft {
  return { ...initialClaudeServiceDraft(), ...patch };
}

describe("CLAUDE_SERVICE_WIZARD_STEPS", () => {
  it("declares the five guided steps", () => {
    expect([...CLAUDE_SERVICE_WIZARD_STEPS]).toEqual([
      "Service",
      "API key",
      "Models",
      "Roles",
      "Finish",
    ]);
  });
});

describe("initialClaudeServiceDraft", () => {
  it("starts on the OpenRouter preset with its base URL and label prefilled", () => {
    const draft = initialClaudeServiceDraft();
    expect(draft.preset).toBe("openrouter");
    expect(draft.baseUrl).toBe(OPENROUTER_BASE_URL);
    expect(draft.label).toBe("Claude OpenRouter");
    expect(draft.apiKey).toBe("");
    expect(draft.models).toEqual([]);
    expect(draft.roles).toEqual({});
    expect(draft.accentColor).toBe("");
    expect(draft.instanceIdOverride).toBeNull();
  });
});

describe("claudeServicePresetDefaults", () => {
  it("maps each preset to its base URL and display label", () => {
    expect(claudeServicePresetDefaults("openrouter")).toEqual({
      baseUrl: OPENROUTER_BASE_URL,
      label: "Claude OpenRouter",
    });
    expect(claudeServicePresetDefaults("custom")).toEqual({
      baseUrl: "",
      label: "Claude Gateway",
    });
  });
});

describe("deriveClaudeServiceInstanceId", () => {
  it("derives the OpenRouter default id", () => {
    expect(deriveClaudeServiceInstanceId(initialClaudeServiceDraft(), new Set())).toBe(
      "claude_openrouter",
    );
  });

  it("suffixes _2, _3 on collisions", () => {
    const draft = initialClaudeServiceDraft();
    expect(
      deriveClaudeServiceInstanceId(draft, new Set(["claude_openrouter"])),
    ).toBe("claude_openrouter_2");
    expect(
      deriveClaudeServiceInstanceId(draft, new Set(["claude_openrouter", "claude_openrouter_2"])),
    ).toBe("claude_openrouter_3");
  });

  it("slugifies the label for a custom service", () => {
    const draft = draftWith({ preset: "custom", label: "Acme Gateway!" });
    expect(deriveClaudeServiceInstanceId(draft, new Set())).toBe("claude_acme_gateway");
  });

  it("honors an explicit override verbatim (collision is surfaced by validation)", () => {
    const draft = draftWith({ instanceIdOverride: "my_gateway" });
    expect(deriveClaudeServiceInstanceId(draft, new Set(["my_gateway"]))).toBe("my_gateway");
  });
});

describe("buildClaudeServiceInstance", () => {
  it("builds a claudeAgent envelope with service env, role pins, and custom models", () => {
    const draft = draftWith({
      apiKey: "sk-or-v1-test",
      models: ["anthropic/claude-opus-4.5", "vendor/other"],
      roles: { sonnet: "anthropic/claude-sonnet-4.5" },
      label: "Claude OpenRouter",
      accentColor: "#7c3aed",
    });
    const instance = buildClaudeServiceInstance(draft, "claude_openrouter");

    expect(instance.driver).toBe("claudeAgent");
    expect(instance.displayName).toBe("Claude OpenRouter");
    expect(instance.accentColor).toBe("#7c3aed");
    expect(instance.config).toEqual({
      customModels: ["anthropic/claude-opus-4.5", "vendor/other"],
    });

    const environment = instance.environment ?? [];
    const byName = new Map(environment.map((variable) => [variable.name, variable]));
    expect(byName.get("ANTHROPIC_BASE_URL")).toMatchObject({
      value: OPENROUTER_BASE_URL,
      sensitive: false,
    });
    expect(byName.get("ANTHROPIC_AUTH_TOKEN")).toMatchObject({
      value: "sk-or-v1-test",
      sensitive: true,
    });
    // Explicitly empty so the CLI cannot fall back to a global Anthropic key.
    expect(byName.get("ANTHROPIC_API_KEY")).toMatchObject({ value: "", sensitive: true });
    expect(byName.get("ANTHROPIC_DEFAULT_SONNET_MODEL")).toMatchObject({
      value: "anthropic/claude-sonnet-4.5",
      sensitive: false,
    });
  });

  it("omits unset optional fields instead of writing empty strings", () => {
    const draft = draftWith({ accentColor: "", models: [] });
    const instance = buildClaudeServiceInstance(draft, "claude_openrouter");
    expect("accentColor" in instance).toBe(false);
    expect(instance.environment).toBeDefined();
  });
});

describe("resolveClaudeServiceWizardNavigation", () => {
  it("blocks leaving Service while a custom preset has no base URL", () => {
    const draft = draftWith({ preset: "custom", baseUrl: "" });
    expect(resolveClaudeServiceWizardNavigation(0, 1, draft)).toEqual({
      kind: "blocked",
      step: 0,
      error: "A base URL is required for a custom service.",
    });
  });

  it("allows leaving Service once the custom base URL is present", () => {
    const draft = draftWith({ preset: "custom", baseUrl: "https://gw.example.com" });
    expect(resolveClaudeServiceWizardNavigation(0, 1, draft)).toEqual({
      kind: "navigate",
      step: 1,
    });
  });

  it("blocks skipping past Models with zero picked models and lands on Models", () => {
    const draft = draftWith({ models: [] });
    expect(resolveClaudeServiceWizardNavigation(1, 4, draft)).toEqual({
      kind: "blocked",
      step: 2,
      error: "Pick at least one model before continuing.",
    });
  });

  it("allows Roles to be skipped without any pin", () => {
    const draft = draftWith({ models: ["anthropic/claude-opus-4.5"] });
    expect(resolveClaudeServiceWizardNavigation(3, 4, draft)).toEqual({
      kind: "navigate",
      step: 4,
    });
  });

  it("always preserves backward navigation even with invalid drafts", () => {
    const draft = draftWith({ preset: "custom", baseUrl: "", models: [] });
    expect(resolveClaudeServiceWizardNavigation(2, 0, draft)).toEqual({
      kind: "navigate",
      step: 0,
    });
  });

  it("clamps requested steps into the wizard bounds", () => {
    const draft = draftWith({ models: ["m"] });
    expect(resolveClaudeServiceWizardNavigation(4, 9, draft)).toEqual({
      kind: "navigate",
      step: 4,
    });
    expect(resolveClaudeServiceWizardNavigation(2, -3, draft)).toEqual({
      kind: "navigate",
      step: 0,
    });
  });
});

describe("orderClaudeCatalogModels", () => {
  it("puts anthropic/* models first and sorts within groups", () => {
    const ordered = orderClaudeCatalogModels([
      { id: "z.ai/glm-4.6", name: "GLM" },
      { id: "anthropic/claude-opus-4.5", name: "Opus" },
      { id: "anthropic/claude-haiku-4.5", name: "Haiku" },
      { id: "openai/gpt-5", name: "GPT" },
    ]);
    expect(ordered.map((model) => model.id)).toEqual([
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4.5",
      "openai/gpt-5",
      "z.ai/glm-4.6",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [{ id: "b/x", name: "B" }, { id: "anthropic/a", name: "A" }];
    orderClaudeCatalogModels(input);
    expect(input.map((model) => model.id)).toEqual(["b/x", "anthropic/a"]);
  });
});

describe("fetchClaudeServiceCatalog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses an OpenAI-style catalog response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: [
            { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
            { id: "openai/gpt-5" },
          ],
        }),
      ),
    );
    const result = await fetchClaudeServiceCatalog(OPENROUTER_BASE_URL, new AbortController().signal);
    expect(result._tag).toBe("Success");
    if (result._tag === "Success") {
      expect(result.models).toEqual([
        { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
        { id: "openai/gpt-5", name: "openai/gpt-5" },
      ]);
    }
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${OPENROUTER_BASE_URL}/v1/models`);
  });

  it("trims trailing slashes when joining the models path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [] })),
    );
    await fetchClaudeServiceCatalog("https://gw.example.com/", new AbortController().signal);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("https://gw.example.com/v1/models");
  });

  it("fails on HTTP errors, junk shapes, and thrown fetches", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect((await fetchClaudeServiceCatalog(OPENROUTER_BASE_URL, new AbortController().signal))._tag)
      .toBe("Failure");

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ models: "all of them" })));
    expect((await fetchClaudeServiceCatalog(OPENROUTER_BASE_URL, new AbortController().signal))._tag)
      .toBe("Failure");

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [{ nope: true }] })));
    expect((await fetchClaudeServiceCatalog(OPENROUTER_BASE_URL, new AbortController().signal))._tag)
      .toBe("Failure");

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect((await fetchClaudeServiceCatalog(OPENROUTER_BASE_URL, new AbortController().signal))._tag)
      .toBe("Failure");
  });
});
