/**
 * Canonical provider and harness identity metadata.
 *
 * Renderers deliberately stay platform-local: web uses its React SVG icons and
 * mobile uses react-native-svg. The registry is the shared decision about
 * which identity each renderer must use.
 */
export type ProviderBrandIconKey =
  | "rune"
  | "openai"
  | "claude"
  | "antigravity"
  | "opencode"
  | "cursor"
  | "grok"
  | "openrouter"
  | "google"
  | "deepseek"
  | "xai";

export interface ProviderBrand {
  readonly id: string;
  readonly displayName: string;
  readonly iconKey: ProviderBrandIconKey;
  readonly accessibilityLabel: string;
  readonly source: "rune" | "provider" | "service";
}

export const PROVIDER_BRANDS = {
  runeNative: {
    id: "runeNative",
    displayName: "Rune Native",
    iconKey: "rune",
    accessibilityLabel: "Rune Native",
    source: "rune",
  },
  codex: {
    id: "codex",
    displayName: "Codex",
    iconKey: "openai",
    accessibilityLabel: "OpenAI Codex",
    source: "provider",
  },
  claudeAgent: {
    id: "claudeAgent",
    displayName: "Claude Code",
    iconKey: "claude",
    accessibilityLabel: "Claude Code",
    source: "provider",
  },
  antigravity: {
    id: "antigravity",
    displayName: "Antigravity",
    iconKey: "antigravity",
    accessibilityLabel: "Google Antigravity",
    source: "provider",
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor Agent",
    iconKey: "cursor",
    accessibilityLabel: "Cursor Agent",
    source: "provider",
  },
  grok: {
    id: "grok",
    displayName: "Grok",
    iconKey: "grok",
    accessibilityLabel: "xAI Grok",
    source: "provider",
  },
  opencode: {
    id: "opencode",
    displayName: "OpenCode",
    iconKey: "opencode",
    accessibilityLabel: "OpenCode",
    source: "provider",
  },
  openaiApi: {
    id: "openaiApi",
    displayName: "OpenAI",
    iconKey: "openai",
    accessibilityLabel: "OpenAI",
    source: "service",
  },
  openrouter: {
    id: "openrouter",
    displayName: "OpenRouter",
    iconKey: "openrouter",
    accessibilityLabel: "OpenRouter",
    source: "service",
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    iconKey: "openai",
    accessibilityLabel: "OpenAI",
    source: "service",
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    iconKey: "claude",
    accessibilityLabel: "Anthropic",
    source: "service",
  },
  google: {
    id: "google",
    displayName: "Google",
    iconKey: "google",
    accessibilityLabel: "Google Gemini",
    source: "service",
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    iconKey: "google",
    accessibilityLabel: "Google Gemini",
    source: "service",
  },
  deepseek: {
    id: "deepseek",
    displayName: "DeepSeek",
    iconKey: "deepseek",
    accessibilityLabel: "DeepSeek",
    source: "service",
  },
  xai: {
    id: "xai",
    displayName: "xAI",
    iconKey: "xai",
    accessibilityLabel: "xAI",
    source: "service",
  },
  "custom-openai-compatible": {
    id: "custom-openai-compatible",
    displayName: "Custom OpenAI-compatible",
    iconKey: "openai",
    accessibilityLabel: "Custom OpenAI-compatible service",
    source: "service",
  },
  "custom-anthropic-compatible": {
    id: "custom-anthropic-compatible",
    displayName: "Custom Anthropic-compatible",
    iconKey: "claude",
    accessibilityLabel: "Custom Anthropic-compatible service",
    source: "service",
  },
} as const satisfies Record<string, ProviderBrand>;

export type ProviderBrandId = keyof typeof PROVIDER_BRANDS;

export function getProviderBrand(kind: string | null | undefined): ProviderBrand | null {
  const normalized = kind?.trim();
  if (!normalized) return null;
  const exact = PROVIDER_BRANDS[normalized as ProviderBrandId];
  if (exact) return exact;
  const lower = normalized.toLowerCase();
  return (
    Object.values(PROVIDER_BRANDS).find((brand) => brand.id.toLowerCase() === lower) ?? null
  );
}
