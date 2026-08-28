import type {
  ProviderDriverKind,
  ServerProvider,
  ServerProviderVersionAdvisory,
} from "@rune/contracts";
import { APP_BASE_NAME } from "../../branding";

/**
 * Visual treatment for each server-reported provider status. Centralized so
 * the default-driver card and per-instance cards share the same language.
 */
export const PROVIDER_STATUS_STYLES = {
  pending: { dot: "bg-muted-foreground/45", tone: "text-muted-foreground", label: null },
  "not-installed": { dot: "bg-destructive", tone: "text-destructive", label: "Not installed" },
  unauthenticated: { dot: "bg-warning", tone: "text-warning", label: "Sign in to enable" },
  ready: { dot: "bg-success", tone: "text-success", label: "Ready" },
  error: { dot: "bg-destructive", tone: "text-destructive", label: "Error" },
  "headless-restricted": {
    dot: "bg-info",
    tone: "text-info",
    label: "Headless mode",
  },
} as const;

export type ProviderStatusKey = keyof typeof PROVIDER_STATUS_STYLES;

/**
 * Collapse the provider wire snapshot into the small vocabulary the settings
 * UI can actually act on. `enabled` intentionally stays outside this mapping:
 * disabling an instance is a control, not a health state.
 */
export function resolveProviderStatusKey(
  provider: ServerProvider | undefined,
  input?: { readonly driver?: ProviderDriverKind; readonly enabled?: boolean },
): ProviderStatusKey {
  if (provider === undefined || input?.enabled === false) return "pending";
  if (!provider.installed) return "not-installed";
  if (provider.auth.status === "unauthenticated") return "unauthenticated";
  if (provider.status === "error") return "error";
  if (String(input?.driver ?? provider.driver) === "antigravity" && provider.status === "ready") {
    return "headless-restricted";
  }
  return provider.status === "ready"
    ? "ready"
    : provider.status === "warning"
      ? "error"
      : "pending";
}

export function providerStatusLabel(status: ProviderStatusKey): string | null {
  return PROVIDER_STATUS_STYLES[status].label;
}

/**
 * Derive the headline + detail copy shown under a provider's name in the
 * settings page. Prefers `provider.message` for server-supplied detail and
 * falls back to generic phrasing when the server has not yet reported any
 * state — which happens before the first probe or when an instance names a
 * driver this build does not ship.
 */
export function getProviderSummary(provider: ServerProvider | undefined) {
  if (!provider) {
    return {
      headline: "Checking provider status",
      detail: "Waiting for the server to report installation and authentication details.",
    };
  }
  if (!provider.enabled) {
    return {
      headline: "Disabled",
      detail:
        provider.message ??
        `This provider is installed but disabled for new sessions in ${APP_BASE_NAME}.`,
    };
  }
  if (!provider.installed) {
    return {
      headline: "Not found",
      detail: provider.message ?? "CLI not detected on PATH.",
    };
  }
  if (provider.auth.status === "authenticated") {
    const authLabel = provider.auth.label ?? provider.auth.type;
    return {
      headline: authLabel ? `Authenticated · ${authLabel}` : "Authenticated",
      detail: provider.message ?? null,
    };
  }
  if (provider.auth.status === "unauthenticated") {
    return {
      headline: "Sign in required",
      detail:
        provider.message ??
        "This account is not signed in. Open the provider's sign-in command or configure its credentials before using it.",
    };
  }
  if (provider.status === "warning") {
    return {
      headline: "Needs attention",
      detail:
        provider.message ??
        "The provider is installed, but something needs fixing. Check the details below; sign-in is required if the account is not authenticated.",
    };
  }
  if (provider.status === "error") {
    return {
      headline: "Unavailable",
      detail: provider.message ?? "The provider failed its startup checks.",
    };
  }
  return {
    headline: "Available",
    detail: provider.message ?? "Installed and ready, but authentication could not be verified.",
  };
}

/**
 * Normalize a version string for display. Adds the `v` prefix when the
 * driver reported a bare version (e.g. `1.2.3`) so cards render
 * consistently regardless of driver.
 */
export function getProviderVersionLabel(version: string | null | undefined) {
  if (!version) return null;
  return version.startsWith("v") ? version : `v${version}`;
}

export function getProviderVersionAdvisoryPresentation(
  advisory: ServerProviderVersionAdvisory | undefined,
): {
  readonly detail: string;
  readonly updateCommand: string | null;
  readonly emphasis: "normal" | "strong";
} | null {
  if (!advisory || advisory.status === "current" || advisory.status === "unknown") {
    return null;
  }

  const label = "Update available";
  const version = advisory.latestVersion;
  const versionLabel = getProviderVersionLabel(version);

  return {
    detail:
      advisory.message ??
      (versionLabel
        ? `${label}: install ${versionLabel}.`
        : `${label}: install the latest provider version.`),
    updateCommand: advisory.updateCommand,
    emphasis: "normal" as const,
  };
}
