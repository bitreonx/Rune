import type {
  ModelServiceConfig,
  ProviderInstanceConfig,
  ProviderDriverKind,
  ServerProvider,
  ServerProviderVersionAdvisory,
} from "@rune/contracts";
import { resolveProviderInstanceEnabled } from "@rune/contracts";
import { APP_BASE_NAME } from "../../branding";
import { resolveClaudeInstanceService } from "../../claudeServices";

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
 * Readiness is deliberately a different vocabulary from the raw provider
 * probe status. A harness can be installed and healthy while its selected
 * model service needs a credential, and a native harness can be authenticated
 * while its model catalog is still being discovered.
 */
export type InstanceReadiness =
  | { readonly tag: "ready"; readonly connectionLabel: string }
  | {
      readonly tag: "sign-in-required";
      readonly target: "harness" | "connection";
      readonly action: string;
    }
  | { readonly tag: "discovering-models"; readonly fallbackModel?: string }
  | { readonly tag: "needs-attention"; readonly reason: string; readonly recovery: string }
  | { readonly tag: "disabled" }
  | { readonly tag: "missing" };

type InstanceReadinessInput = {
  readonly instance?: ProviderInstanceConfig;
  readonly provider?: ServerProvider;
  readonly services?: Readonly<Record<string, ModelServiceConfig | undefined>>;
  readonly fallbackModel?: string;
};

const fallbackModelFrom = (input: InstanceReadinessInput): string | undefined => {
  const configured = input.fallbackModel?.trim() || input.instance?.modelBindings?.main?.trim();
  return configured || undefined;
};

const serviceLabelFrom = (service: ModelServiceConfig): string =>
  service.maskedLabel?.trim() || service.displayName;

const EXTERNAL_SERVICE_LABELS: Readonly<Record<string, string>> = {
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gateway: "Custom gateway",
  google: "Google Gemini",
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

function serviceKindLabel(kind: string): string {
  const normalized = kind.trim().toLowerCase();
  return (
    EXTERNAL_SERVICE_LABELS[normalized] ??
    normalized
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

/**
 * Detect migration-era routes that predate `connectionId` being persisted.
 * These routes still describe an external model service, so native harness
 * authentication must not be treated as the instance's readiness gate.
 */
function externalConnectionLabelFrom(instance: ProviderInstanceConfig | undefined): string | undefined {
  const explicitServiceKind = instance?.serviceKind?.trim();
  if (explicitServiceKind && explicitServiceKind.toLowerCase() !== "native") {
    return serviceKindLabel(explicitServiceKind);
  }

  const claudeService = resolveClaudeInstanceService(instance);
  if (claudeService === "openrouter") return "OpenRouter";
  if (claudeService === "gateway") return "Custom gateway";

  return instance?.authMode === "rune-managed" ? "Managed service" : undefined;
}

/**
 * Resolve the user-actionable state of one exact instance.
 *
 * `connectionId` is the authority for external routing. In particular, an
 * external-service instance never becomes "sign-in required" because the
 * underlying Claude/Codex probe reports native auth as unauthenticated.
 */
export function resolveInstanceReadiness(input: InstanceReadinessInput): InstanceReadiness {
  const { instance, provider } = input;
  if (instance && !resolveProviderInstanceEnabled(instance)) return { tag: "disabled" };
  if (provider?.enabled === false || provider?.status === "disabled") {
    return { tag: "disabled" };
  }

  const fallbackModel = fallbackModelFrom(input);
  const connectionId = instance?.connectionId?.trim();
  if (connectionId) {
    const service = input.services?.[connectionId];
    if (!service) {
      return {
        tag: "needs-attention",
        reason: "The selected model service is missing.",
        recovery: "Open Model Services and reconnect this instance to an available service.",
      };
    }
    const connectionLabel = serviceLabelFrom(service);
    if (service.status === "needs-auth" || service.hasCredential === false) {
      return {
        tag: "sign-in-required",
        target: "connection",
        action: `Connect ${connectionLabel}`,
      };
    }
    if (service.status === "unavailable") {
      return {
        tag: "needs-attention",
        reason: `${connectionLabel} is unavailable.`,
        recovery: "Check the service URL and credential, then refresh its connection.",
      };
    }
    if (provider?.availability === "unavailable") return { tag: "missing" };
    if (provider && !provider.installed) return { tag: "missing" };
    if (provider?.status === "error" || provider?.status === "warning") {
      return {
        tag: "needs-attention",
        reason: provider.message ?? "The harness failed its startup checks.",
        recovery: "Open the instance diagnostics and refresh the harness.",
      };
    }
    if (service.status === "checking" || service.status === undefined || !provider) {
      return {
        tag: "discovering-models",
        ...(fallbackModel ? { fallbackModel } : {}),
      };
    }
    return { tag: "ready", connectionLabel };
  }

  const externalConnectionLabel = externalConnectionLabelFrom(instance);
  if (externalConnectionLabel) {
    if (provider?.availability === "unavailable" || (provider && !provider.installed)) {
      return { tag: "missing" };
    }
    if (!provider) {
      return {
        tag: "discovering-models",
        ...(fallbackModel ? { fallbackModel } : {}),
      };
    }
    if (provider.status === "error" || provider.status === "warning") {
      return {
        tag: "needs-attention",
        reason: provider.message ?? "The harness failed its startup checks.",
        recovery: "Open the instance diagnostics and refresh the harness.",
      };
    }
    if (provider.status === "ready") {
      return { tag: "ready", connectionLabel: externalConnectionLabel };
    }
    return {
      tag: "discovering-models",
      ...(fallbackModel ? { fallbackModel } : {}),
    };
  }

  if (provider?.availability === "unavailable" || (provider && !provider.installed)) {
    return { tag: "missing" };
  }
  if (!provider) {
    return {
      tag: "discovering-models",
      ...(fallbackModel ? { fallbackModel } : {}),
    };
  }
  if (provider.auth.status === "unauthenticated") {
    return { tag: "sign-in-required", target: "harness", action: "Sign in to this harness" };
  }
  if (provider.status === "error" || provider.status === "warning") {
    return {
      tag: "needs-attention",
      reason: provider.message ?? "The harness failed its startup checks.",
      recovery: "Open the instance diagnostics and refresh the harness.",
    };
  }
  if (provider.status === "ready") {
    return {
      tag: "ready",
      connectionLabel: provider.auth.label?.trim() || provider.auth.type?.trim() || "Native",
    };
  }
  return {
    tag: "discovering-models",
    ...(fallbackModel ? { fallbackModel } : {}),
  };
}

export function instanceReadinessLabel(readiness: InstanceReadiness): string {
  switch (readiness.tag) {
    case "ready":
      return readiness.connectionLabel === "Native"
        ? "Ready"
        : `Ready via ${readiness.connectionLabel}`;
    case "sign-in-required":
      return readiness.target === "connection" ? "Connect service" : "Sign in required";
    case "discovering-models":
      return readiness.fallbackModel
        ? `Discovering models · fallback ${readiness.fallbackModel}`
        : "Discovering models";
    case "needs-attention":
      return "Needs attention";
    case "disabled":
      return "Disabled";
    case "missing":
      return "Not installed";
  }
}

export function instanceReadinessStatusKey(readiness: InstanceReadiness): ProviderStatusKey {
  switch (readiness.tag) {
    case "ready":
      return "ready";
    case "sign-in-required":
      return "unauthenticated";
    case "needs-attention":
      return "error";
    case "missing":
      return "not-installed";
    case "discovering-models":
    case "disabled":
      return "pending";
  }
}

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
