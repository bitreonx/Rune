import {
  ClaudeSettings,
  CodexSettings,
  CursorSettings,
  GrokSettings,
  AntigravitySettings,
  OpenAiApiSettings,
  OpenRouterSettings,
  OpenCodeSettings,
  ProviderDriverKind,
} from "@rune/contracts";
import type * as Schema from "effect/Schema";
import {
  ClaudeAI,
  CursorIcon,
  GrokIcon,
  AntigravityIcon,
  type Icon,
  OpenAI,
  OpenCodeIcon,
  OpenRouterIcon,
} from "../Icons";

type ProviderSettingsSchema = {
  readonly fields: Readonly<Record<string, Schema.Top>>;
} & Schema.Top;

/**
 * Browser-safe provider definition. This is deliberately shaped like the
 * future provider package client export: the core web app gets a schema with
 * field annotations plus provider-level presentation metadata, then renders
 * settings generically.
 */
export interface ProviderClientDefinition {
  readonly value: ProviderDriverKind;
  readonly label: string;
  readonly icon: Icon;
  readonly settingsSchema: ProviderSettingsSchema;
  /**
   * Optional short label rendered as a `variant="warning"` badge next to
   * the instance title. Used to flag drivers that still ship under an
   * early-access or preview gate — the flag is a property of the driver
   * kind (not a specific instance), so every instance of that driver —
   * built-in default or custom — advertises the same marker.
   */
  readonly badgeLabel?: string;
}

/**
 * Host-side setup instructions shown while adding an instance. Provider
 * CLIs belong to the machine running RUNE, so the UI should make the one-time
 * install/auth step obvious without pretending it can safely sign a user in
 * from the browser.
 */
export interface ProviderSetupGuide {
  readonly binary: string;
  readonly installCommand?: string;
  readonly signInCommand?: string;
  readonly signInDescription: string;
  readonly docsUrl?: string;
}

export const PROVIDER_CLIENT_DEFINITIONS: readonly ProviderClientDefinition[] = [
  {
    value: ProviderDriverKind.make("codex"),
    label: "Codex",
    icon: OpenAI,
    settingsSchema: CodexSettings,
  },
  {
    value: ProviderDriverKind.make("claudeAgent"),
    label: "Claude Code",
    icon: ClaudeAI,
    settingsSchema: ClaudeSettings,
  },
  {
    value: ProviderDriverKind.make("antigravity"),
    label: "Antigravity",
    icon: AntigravityIcon,
    settingsSchema: AntigravitySettings,
  },
  {
    value: ProviderDriverKind.make("cursor"),
    label: "Cursor",
    icon: CursorIcon,
    badgeLabel: "Early Access",
    settingsSchema: CursorSettings,
  },
  {
    value: ProviderDriverKind.make("grok"),
    label: "Grok",
    icon: GrokIcon,
    badgeLabel: "Early Access",
    settingsSchema: GrokSettings,
  },
  {
    value: ProviderDriverKind.make("opencode"),
    label: "OpenCode",
    icon: OpenCodeIcon,
    settingsSchema: OpenCodeSettings,
  },
  {
    value: ProviderDriverKind.make("openaiApi"),
    label: "OpenAI API",
    icon: OpenAI,
    settingsSchema: OpenAiApiSettings,
  },
  {
    value: ProviderDriverKind.make("openrouter"),
    label: "OpenRouter",
    icon: OpenRouterIcon,
    settingsSchema: OpenRouterSettings,
  },
];

export const PROVIDER_CLIENT_DEFINITION_BY_VALUE: Partial<
  Record<ProviderDriverKind, ProviderClientDefinition>
> = Object.fromEntries(
  PROVIDER_CLIENT_DEFINITIONS.map((definition) => [definition.value, definition]),
);

export const DRIVER_OPTIONS = PROVIDER_CLIENT_DEFINITIONS;
export const DRIVER_OPTION_BY_VALUE = PROVIDER_CLIENT_DEFINITION_BY_VALUE;
export type DriverOption = ProviderClientDefinition;

export const PROVIDER_SETUP_GUIDES: Partial<Record<ProviderDriverKind, ProviderSetupGuide>> = {
  [ProviderDriverKind.make("codex")]: {
    binary: "codex",
    installCommand: "npm install -g @openai/codex@latest",
    signInCommand: "codex login",
    signInDescription:
      "Sign in with your ChatGPT account on the machine running RUNE. Additional Codex instances get separate auth homes automatically.",
    docsUrl: "https://developers.openai.com/codex/cli",
  },
  [ProviderDriverKind.make("claudeAgent")]: {
    binary: "claude",
    installCommand:
      "npm install -g --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code@latest",
    signInCommand: "claude auth login",
    signInDescription: "Sign in with your Anthropic account on the machine running RUNE.",
    docsUrl: "https://code.claude.com/docs/en/overview",
  },
  [ProviderDriverKind.make("antigravity")]: {
    binary: "agy",
    signInCommand: "agy",
    signInDescription: "Start Antigravity once and complete its sign-in flow on the host machine.",
    docsUrl: "https://antigravity.google/docs/cli/install/",
  },
  [ProviderDriverKind.make("cursor")]: {
    binary: "cursor-agent",
    signInCommand: "agent login",
    signInDescription: "Authenticate Cursor with the agent command, not cursor-agent login.",
    docsUrl: "https://cursor.com/cli",
  },
  [ProviderDriverKind.make("grok")]: {
    binary: "grok",
    signInCommand: "grok login",
    signInDescription: "Complete Grok Build sign-in on the machine running RUNE.",
    docsUrl: "https://x.ai/cli",
  },
  [ProviderDriverKind.make("opencode")]: {
    binary: "opencode",
    installCommand: "npm install -g opencode-ai@latest",
    signInCommand: "opencode auth login",
    signInDescription: "Choose and authenticate an OpenCode provider on the host machine.",
    docsUrl: "https://opencode.ai",
  },
  [ProviderDriverKind.make("openaiApi")]: {
    binary: "",
    signInDescription: "Paste an API key below. This connection does not require a CLI login.",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  [ProviderDriverKind.make("openrouter")]: {
    binary: "",
    signInDescription: "Paste an API key below. This connection does not require a CLI login.",
    docsUrl: "https://openrouter.ai/keys",
  },
};

export function getProviderSetupGuide(
  driver: ProviderDriverKind | undefined,
): ProviderSetupGuide | undefined {
  return driver === undefined ? undefined : PROVIDER_SETUP_GUIDES[driver];
}

/**
 * Look up the driver metadata for an instance's `driver` field. Accepts
 * Returns `undefined` for fork / unknown drivers so callers can decide how
 * to render them — typically by falling back to a generic card.
 */
export function getDriverOption(driver: ProviderDriverKind | undefined): DriverOption | undefined {
  if (driver === undefined) return undefined;
  return PROVIDER_CLIENT_DEFINITION_BY_VALUE[driver];
}
