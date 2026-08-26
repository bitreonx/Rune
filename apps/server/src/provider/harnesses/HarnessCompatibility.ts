/**
 * HarnessCompatibility — static compatibility matrix for harness + model service combinations.
 *
 * @module provider/harnesses/HarnessCompatibility
 */
import type { HarnessKind, ModelServiceKind } from "@rune/contracts";

export type HarnessCompatibilityLevel =
  | "compatible"
  | "likely"
  | "experimental"
  | "unsupported"
  | "unknown";

export interface HarnessCompatibilityResult {
  readonly level: HarnessCompatibilityLevel;
  readonly reason?: string;
}

export function checkHarnessCompatibility(input: {
  readonly harnessKind: HarnessKind | string;
  readonly serviceKind: ModelServiceKind | string;
  readonly modelSlug?: string;
}): HarnessCompatibilityResult {
  const { harnessKind, serviceKind, modelSlug = "" } = input;
  const normalizedModel = modelSlug.toLowerCase();

  // Codex
  if (harnessKind === "codex") {
    if (serviceKind === "native") {
      return { level: "compatible" };
    }
    return {
      level: "unsupported",
      reason: "Codex CLI only supports native OpenAI authentication in v1.",
    };
  }

  // Claude Code
  if (harnessKind === "claudeAgent") {
    if (serviceKind === "native" || serviceKind === "anthropic") {
      return { level: "compatible" };
    }
    if (
      serviceKind === "openrouter" ||
      serviceKind === "custom-anthropic-compatible"
    ) {
      if (
        normalizedModel.startsWith("anthropic/") ||
        normalizedModel.includes("claude")
      ) {
        return {
          level: "likely",
          reason:
            "Anthropic-family models through OpenRouter or compatible gateways are well supported.",
        };
      }
      return {
        level: "experimental",
        reason:
          "Non-Anthropic models through Claude Code may experience tool calling or formatting issues.",
      };
    }
    return {
      level: "experimental",
      reason:
        "Using this gateway with Claude Code is experimental and may require custom prompt handling.",
    };
  }

  // Rune Native
  if (harnessKind === "runeNative") {
    if (
      serviceKind === "openrouter" ||
      serviceKind === "openai" ||
      serviceKind === "custom-openai-compatible" ||
      serviceKind === "anthropic" ||
      serviceKind === "google"
    ) {
      return { level: "compatible" };
    }
    return { level: "likely" };
  }

  // Single-source native harnesses
  if (
    harnessKind === "cursor" ||
    harnessKind === "grok" ||
    harnessKind === "opencode" ||
    harnessKind === "antigravity"
  ) {
    if (serviceKind === "native") {
      return { level: "compatible" };
    }
    return {
      level: "experimental",
      reason: `${harnessKind} harness typically expects native provider authentication.`,
    };
  }

  return { level: "unknown" };
}
