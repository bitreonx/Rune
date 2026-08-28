import { ProviderDriverKind } from "@rune/contracts";
import { getProviderBrand, PROVIDER_BRANDS } from "@rune/shared/providerBrands";
import {
  AntigravityIcon,
  ClaudeAI,
  CursorIcon,
  DeepSeekIcon,
  Gemini,
  GrokIcon,
  Icon,
  OpenAI,
  OpenCodeIcon,
  OpenRouterIcon,
  RuneMarkIcon,
  xAIIcon,
} from "../Icons";
import { PROVIDER_OPTIONS } from "../../session-logic";

/**
 * Provider / harness → icon registry.
 *
 * The map is keyed by `ProviderDriverKind` for the provider-driver surfaces
 * (Codex, Claude, etc.) and additionally by `HarnessKind` strings for the
 * harness picker surfaces (`runeNative` is a `HarnessKind` but no
 * `ProviderDriverKind`, so it has to be looked up via a type-loose key). The
 * `string` key signature here is what lets `AddHarnessDialog` do
 * `PROVIDER_ICON_BY_PROVIDER[harness.kind as any]` without TypeScript
 * complaining; the harness string keys never collide with driver kinds.
 */
const ICON_BY_KEY: Record<(typeof PROVIDER_BRANDS)[keyof typeof PROVIDER_BRANDS]["iconKey"], Icon> = {
  rune: RuneMarkIcon,
  openai: OpenAI,
  claude: ClaudeAI,
  antigravity: AntigravityIcon,
  opencode: OpenCodeIcon,
  cursor: CursorIcon,
  grok: GrokIcon,
  openrouter: OpenRouterIcon,
  google: Gemini,
  deepseek: DeepSeekIcon,
  xai: xAIIcon,
};

export const PROVIDER_ICON_BY_PROVIDER: Partial<Record<ProviderDriverKind | string, Icon>> =
  Object.fromEntries(
    Object.values(PROVIDER_BRANDS).map((brand) => [brand.id, ICON_BY_KEY[brand.iconKey]]),
  );

export const SERVICE_ICON_BY_KIND: Record<string, Icon> = Object.fromEntries(
  Object.values(PROVIDER_BRANDS)
    .filter((brand) => brand.source === "service")
    .map((brand) => [brand.id, ICON_BY_KEY[brand.iconKey]]),
);

export function getProviderOrServiceIcon(kind: string): Icon | null {
  const brand = getProviderBrand(kind);
  return brand ? ICON_BY_KEY[brand.iconKey] : null;
}

function isAvailableProviderOption(option: (typeof PROVIDER_OPTIONS)[number]): option is {
  value: ProviderDriverKind;
  label: string;
  available: true;
  pickerSidebarBadge?: "new" | "soon";
} {
  return option.available;
}

export const AVAILABLE_PROVIDER_OPTIONS = PROVIDER_OPTIONS.filter(isAvailableProviderOption);

export type ModelEsque = {
  slug: string;
  name: string;
  shortName?: string | undefined;
  subProvider?: string | undefined;
  isLegacy?: boolean | undefined;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingQualifier(value: string, qualifier: string | null | undefined): string {
  const trimmedQualifier = qualifier?.trim();
  if (!trimmedQualifier) {
    return value;
  }

  const pattern = new RegExp(`^${escapeRegExp(trimmedQualifier)}(?:\\s*[.:/-]\\s*|\\s+)`, "iu");
  return value.replace(pattern, "").trim() || value;
}

export function getDisplayModelName(
  model: ModelEsque,
  options?: { preferShortName?: boolean },
): string {
  const name = options?.preferShortName && model.shortName ? model.shortName : model.name;
  return stripLeadingQualifier(name, model.subProvider);
}

export function getTriggerDisplayModelName(model: ModelEsque): string {
  return getDisplayModelName(model, { preferShortName: true });
}

export function getTriggerDisplayModelLabel(model: ModelEsque): string {
  return getTriggerDisplayModelName(model);
}
