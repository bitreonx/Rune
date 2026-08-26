import { ProviderDriverKind } from "@rune/contracts";
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
  xAIIcon,
} from "../Icons";
import { PROVIDER_OPTIONS } from "../../session-logic";

export const PROVIDER_ICON_BY_PROVIDER: Partial<Record<ProviderDriverKind, Icon>> = {
  [ProviderDriverKind.make("codex")]: OpenAI,
  [ProviderDriverKind.make("claudeAgent")]: ClaudeAI,
  [ProviderDriverKind.make("antigravity")]: AntigravityIcon,
  [ProviderDriverKind.make("opencode")]: OpenCodeIcon,
  [ProviderDriverKind.make("cursor")]: CursorIcon,
  [ProviderDriverKind.make("grok")]: GrokIcon,
  [ProviderDriverKind.make("openaiApi")]: OpenAI,
  [ProviderDriverKind.make("openrouter")]: OpenRouterIcon,
};

export const SERVICE_ICON_BY_KIND: Record<string, Icon> = {
  openrouter: OpenRouterIcon,
  openai: OpenAI,
  anthropic: ClaudeAI,
  google: Gemini,
  gemini: Gemini,
  deepseek: DeepSeekIcon,
  xai: xAIIcon,
  grok: GrokIcon,
  "custom-openai-compatible": OpenAI,
  "custom-anthropic-compatible": ClaudeAI,
};

export function getProviderOrServiceIcon(kind: string): Icon | null {
  const driverKind = ProviderDriverKind.make(kind);
  if (PROVIDER_ICON_BY_PROVIDER[driverKind]) {
    return PROVIDER_ICON_BY_PROVIDER[driverKind]!;
  }
  const lower = kind.toLowerCase();
  if (SERVICE_ICON_BY_KIND[lower]) {
    return SERVICE_ICON_BY_KIND[lower]!;
  }
  return null;
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
