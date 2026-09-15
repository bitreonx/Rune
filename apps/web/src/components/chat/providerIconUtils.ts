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

const ICON_BY_KEY: Record<(typeof PROVIDER_BRANDS)[keyof typeof PROVIDER_BRANDS]["iconKey"], Icon> =
  {
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

export interface ProviderBrandPresentation {
  readonly id: string;
  readonly displayName: string;
  readonly iconKey: (typeof PROVIDER_BRANDS)[keyof typeof PROVIDER_BRANDS]["iconKey"];
  readonly accessibilityLabel: string;
  readonly source: (typeof PROVIDER_BRANDS)[keyof typeof PROVIDER_BRANDS]["source"];
  readonly icon: Icon;
}

/**
 * Resolve provider/service identity and its renderer in one place. Callers
 * should use this for labels and marks together so an instance cannot display
 * a mark from one provider beside another provider's name.
 */
export function getProviderBrandPresentation(kind: string): ProviderBrandPresentation | null {
  const brand = getProviderBrand(kind);
  if (!brand) return null;
  const icon = ICON_BY_KEY[brand.iconKey];
  if (!icon) return null;
  return { ...brand, icon };
}

export function getProviderOrServiceIcon(kind: string): Icon | null {
  return getProviderBrandPresentation(kind)?.icon ?? null;
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
