"use client";

import { useMemo, type ComponentType, type KeyboardEvent } from "react";
import {
  type ProviderDriverKind,
  type ProviderInstanceEnvironmentVariable,
  type ServerSettings,
} from "@rune/contracts";
import { CheckIcon, Globe2Icon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "../ui/button";
import { DraftInput } from "../ui/draft-input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";
import { getProviderOrServiceIcon, SERVICE_ICON_BY_KIND } from "../chat/providerIconUtils";

export type ServiceConnectionMode = "native" | "openrouter" | "custom";

export interface ServiceConnectionValidation {
  readonly baseUrl: string | null;
  readonly credential: string | null;
}

export function validateServiceConnection(
  connection: Pick<
    ReturnType<typeof readInstanceServiceConnection>,
    "mode" | "baseUrl" | "apiKey" | "hasStoredKey"
  >,
): ServiceConnectionValidation {
  if (connection.mode === "native") {
    return { baseUrl: null, credential: null };
  }

  const credentialError =
    connection.apiKey.trim().length === 0 && !connection.hasStoredKey
      ? connection.mode === "openrouter"
        ? "Add an OpenRouter API key or connect a shared OpenRouter service."
        : "Add a credential for this gateway, or leave the field empty only if the gateway is public."
      : null;

  if (connection.mode === "openrouter") {
    return { baseUrl: null, credential: credentialError };
  }

  const trimmedBaseUrl = connection.baseUrl.trim();
  if (trimmedBaseUrl.length === 0) {
    return {
      baseUrl: "Add a base URL before using this Custom Gateway.",
      credential: credentialError,
    };
  }

  try {
    const parsed = new URL(trimmedBaseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        baseUrl: "Use an HTTP or HTTPS gateway URL.",
        credential: credentialError,
      };
    }
  } catch {
    return { baseUrl: "Enter a valid HTTP or HTTPS gateway URL.", credential: credentialError };
  }

  return { baseUrl: null, credential: credentialError };
}

export function serviceConnectionModeLabel(mode: ServiceConnectionMode): string {
  return mode === "native" ? "Native account" : mode === "openrouter" ? "OpenRouter" : "Custom Gateway";
}

function isOpenRouterEndpoint(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "openrouter.ai" || hostname.endsWith(".openrouter.ai");
  } catch {
    return false;
  }
}

export function readInstanceServiceConnection(
  driverKind: ProviderDriverKind,
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>,
): {
  mode: ServiceConnectionMode;
  baseUrl: string;
  apiKey: string;
  hasStoredKey: boolean;
} {
  const driver = String(driverKind);
  const isClaude = driver === "claudeAgent" || driver === "claude";
  const isCodex = driver === "codex";

  const urlVarName = isClaude ? "ANTHROPIC_BASE_URL" : "OPENAI_BASE_URL";
  const keyVarName = isClaude ? "ANTHROPIC_AUTH_TOKEN" : "OPENAI_API_KEY";

  const urlVar = environment.find((v) => v.name === urlVarName);
  // Read both the provider-native key and the legacy OpenRouter key. Older
  // settings stored the latter even when the CLI actually requires
  // OPENAI_API_KEY / ANTHROPIC_AUTH_TOKEN; the server normalizes it at launch,
  // and the editor must not hide that stored credential from the user.
  const keyVar =
    environment.find((v) => v.name === keyVarName) ??
    environment.find((v) => v.name === "ANTHROPIC_API_KEY") ??
    environment.find((v) => v.name === "OPENROUTER_API_KEY");

  const baseUrl = urlVar?.value.trim() ?? "";
  const hasStoredKey = Boolean(keyVar && (keyVar.valueRedacted || keyVar.value.trim().length > 0));
  const apiKey = keyVar?.valueRedacted ? "" : (keyVar?.value ?? "");
  // Presence is intentional here. Selecting Custom Gateway must remain a
  // durable mode even before the user has filled in the URL/key; deriving the
  // mode from non-empty values made the UI snap back to Native on the next
  // render and silently discarded the user's choice.
  const hasExplicitGatewaySelection = urlVar !== undefined || keyVar !== undefined;

  if (isOpenRouterEndpoint(baseUrl)) {
    return { mode: "openrouter", baseUrl, apiKey, hasStoredKey };
  }
  if (hasExplicitGatewaySelection || baseUrl.length > 0 || hasStoredKey) {
    return { mode: "custom", baseUrl, apiKey, hasStoredKey };
  }
  return { mode: "native", baseUrl: "", apiKey: "", hasStoredKey: false };
}

export function UniversalServiceSettings(props: {
  driverKind: ProviderDriverKind;
  idPrefix: string;
  /** The instance owns this connection; it is not a global provider switch. */
  instanceId?: string;
  instanceLabel?: string;
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>;
  settings: ServerSettings;
  onChange: (nextEnvironment: ReadonlyArray<ProviderInstanceEnvironmentVariable>) => void;
  /** Profile-backed instances choose a canonical model service by ID. */
  connectionId?: string;
  onConnectionIdChange?: (connectionId: string | undefined) => void;
  onOpenAddApiProvider?: () => void;
}) {
  const {
    driverKind,
    idPrefix,
    instanceId,
    instanceLabel,
    environment,
    settings,
    onChange,
    connectionId,
    onConnectionIdChange,
    onOpenAddApiProvider,
  } = props;
  const driver = String(driverKind);
  const isClaude = driver === "claudeAgent" || driver === "claude";

  const connection = useMemo(
    () => readInstanceServiceConnection(driverKind, environment),
    [driverKind, environment],
  );

  const connectedServices = Object.values(settings.harnesses?.services ?? {});
  const openRouterService = connectedServices.find((s) => s.kind === "openrouter");
  const usesCanonicalServiceConnections = onConnectionIdChange !== undefined;
  const validation = validateServiceConnection(connection);

  const moveConnectionMode = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const modes: ServiceConnectionMode[] = ["native", "openrouter", "custom"];
    const currentIndex = Math.max(0, modes.indexOf(connection.mode ?? "native"));
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = modes[(currentIndex + offset + modes.length) % modes.length]!;
    setConnectionMode(next);
    document.getElementById(`${idPrefix}-mode-${next}`)?.focus();
  };

  const setConnectionMode = (mode: ServiceConnectionMode) => {
    const urlVarName = isClaude ? "ANTHROPIC_BASE_URL" : "OPENAI_BASE_URL";
    const keyVarName = isClaude ? "ANTHROPIC_AUTH_TOKEN" : "OPENAI_API_KEY";

    let next = environment.filter(
      (v) =>
        v.name !== urlVarName &&
        v.name !== keyVarName &&
        v.name !== "ANTHROPIC_API_KEY" &&
        v.name !== "OPENROUTER_API_KEY",
    );

    if (mode === "openrouter") {
      const defaultUrl = isClaude ? "https://openrouter.ai/api" : "https://openrouter.ai/api/v1";
      next = [
        ...next,
        { name: urlVarName, value: defaultUrl, sensitive: false },
        ...(openRouterService?.hasCredential
          ? []
          : [{ name: keyVarName, value: "", sensitive: true }]),
      ];
    } else if (mode === "custom") {
      next = [
        ...next,
        { name: urlVarName, value: "", sensitive: false },
        { name: keyVarName, value: "", sensitive: true },
      ];
    }

    onChange(next);
  };

  const updateBaseUrl = (url: string) => {
    const urlVarName = isClaude ? "ANTHROPIC_BASE_URL" : "OPENAI_BASE_URL";
    const next = environment.filter((v) => v.name !== urlVarName);
    if (url.trim().length > 0 || connection.mode === "custom") {
      next.push({ name: urlVarName, value: url.trim(), sensitive: false });
    }
    onChange(next);
  };

  const updateApiKey = (key: string) => {
    const keyVarName = isClaude ? "ANTHROPIC_AUTH_TOKEN" : "OPENAI_API_KEY";
    const next = environment.filter(
      (v) =>
        v.name !== keyVarName && v.name !== "ANTHROPIC_API_KEY" && v.name !== "OPENROUTER_API_KEY",
    );
    if (key.trim().length > 0 || connection.mode === "custom") {
      next.push({ name: keyVarName, value: key.trim(), sensitive: true });
    }
    onChange(next);
  };

  const nativeTitle = isClaude
    ? "Claude account"
    : driver === "codex"
      ? "ChatGPT subscription"
      : "Native CLI credentials";
  const nativeDescription = isClaude
    ? "Direct CLI authentication with your Anthropic / Claude account."
    : driver === "codex"
      ? "Direct authentication using your ChatGPT / OpenAI subscription."
      : "Default CLI authentication from your local system.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3 shadow-[0_14px_36px_-28px_hsl(var(--foreground)/0.6)] backdrop-blur-xl">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Connection identity</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            This connection belongs to <span className="font-medium text-foreground">{instanceLabel ?? "this instance"}</span> only.
            Changing it will not reroute another instance.
          </p>
        </div>
        {instanceId ? (
          <code className="max-w-full truncate rounded-md border border-border/60 bg-background/70 px-2 py-1 font-mono text-[10px] text-muted-foreground" aria-label="Provider instance ID">
            {instanceId}
          </code>
        ) : null}
      </div>

      {usesCanonicalServiceConnections ? (
        <div className="space-y-2.5" role="radiogroup" aria-label="Model service connection">
          <div>
            <p className="text-xs font-semibold text-foreground">Model service</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Choose the reusable service connection for this harness instance. Keys and base URLs
              are owned by Model Services.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ServiceConnectionCard
              id={`${idPrefix}-service-native`}
              label={nativeTitle}
              detail={nativeDescription}
              selected={connectionId === undefined}
              onSelect={() => onConnectionIdChange?.(undefined)}
              icon={SparklesIcon}
            />
            {connectedServices.map((service) => {
              const ServiceIcon =
                SERVICE_ICON_BY_KIND[service.kind] ??
                getProviderOrServiceIcon(String(service.kind)) ??
                SparklesIcon;
              return (
                <ServiceConnectionCard
                  key={service.serviceId}
                  id={`${idPrefix}-service-${service.serviceId}`}
                  label={service.displayName}
                  detail={service.hasCredential ? "Credential stored" : "Needs API key"}
                  selected={connectionId === service.serviceId}
                  onSelect={() => onConnectionIdChange?.(String(service.serviceId))}
                  icon={ServiceIcon}
                />
              );
            })}
          </div>
          {connectedServices.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Add a model service above before selecting an API-backed route.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Legacy environment-backed connection modes */}
      {!usesCanonicalServiceConnections ? (
        <div
          className="grid gap-2.5 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Service connection"
        >
        {/* Native Account */}
        <button
          id={`${idPrefix}-mode-native`}
          type="button"
          role="radio"
          aria-checked={connection.mode === "native"}
          tabIndex={connection.mode === "native" ? 0 : -1}
          onKeyDown={moveConnectionMode}
          onClick={() => setConnectionMode("native")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all",
            connection.mode === "native"
              ? "border-primary/50 bg-primary/8 shadow-sm"
              : "border-border/60 hover:border-border hover:bg-muted/30",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-2 rounded-full",
                connection.mode === "native" ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
            <span className="text-xs font-semibold text-foreground">{nativeTitle}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {nativeDescription}
          </p>
        </button>

        {/* OpenRouter Gateway */}
        <button
          id={`${idPrefix}-mode-openrouter`}
          type="button"
          role="radio"
          aria-checked={connection.mode === "openrouter"}
          tabIndex={connection.mode === "openrouter" ? 0 : -1}
          onKeyDown={moveConnectionMode}
          onClick={() => setConnectionMode("openrouter")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all",
            connection.mode === "openrouter"
              ? "border-primary/50 bg-primary/8 shadow-sm"
              : "border-border/60 hover:border-border hover:bg-muted/30",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-2 rounded-full",
                connection.mode === "openrouter" ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              OpenRouter
              {openRouterService ? (
                <span className="rounded bg-success/10 px-1 py-0.2 text-[9px] font-medium text-success">
                  Connected
                </span>
              ) : null}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Route this harness through OpenRouter and pick from hundreds of external models.
          </p>
        </button>

        {/* Custom Gateway */}
        <button
          id={`${idPrefix}-mode-custom`}
          type="button"
          role="radio"
          aria-checked={connection.mode === "custom"}
          tabIndex={connection.mode === "custom" ? 0 : -1}
          onKeyDown={moveConnectionMode}
          onClick={() => setConnectionMode("custom")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all",
            connection.mode === "custom"
              ? "border-primary/50 bg-primary/8 shadow-sm"
              : "border-border/60 hover:border-border hover:bg-muted/30",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-2 rounded-full",
                connection.mode === "custom" ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
            <span className="text-xs font-semibold text-foreground">Custom Gateway</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Connect to any custom compatible endpoint with your own base URL and API key.
          </p>
        </button>
        </div>
      ) : null}

      {/* Details for OpenRouter Mode */}
      {!usesCanonicalServiceConnections && connection.mode === "openrouter" ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-3.5 shadow-[0_14px_36px_-28px_hsl(var(--foreground)/0.6)] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Globe2Icon className="size-4 text-blue-500" />
              <span>OpenRouter Routing</span>
            </div>
            {openRouterService?.hasCredential ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-success">
                <ShieldCheckIcon className="size-3.5" />
                Using global OpenRouter credential
              </span>
            ) : null}
          </div>

          {!openRouterService?.hasCredential ? (
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-openrouter-key`}
                className="text-xs font-medium text-foreground"
              >
                OpenRouter API Key
              </label>
              <DraftInput
                id={`${idPrefix}-openrouter-key`}
                type="password"
                placeholder="sk-or-v1-..."
                value={connection.apiKey}
                onCommit={updateApiKey}
                className="font-mono text-xs"
                aria-invalid={validation.credential !== null}
                aria-describedby={validation.credential ? `${idPrefix}-openrouter-key-error` : undefined}
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your key once here or connect OpenRouter in Settings → Model Services to share
                across all profiles.
              </p>
              {validation.credential ? (
                <p id={`${idPrefix}-openrouter-key-error`} className="text-[11px] text-destructive" role="alert">
                  {validation.credential}
                </p>
              ) : null}
              {!connection.hasStoredKey && onOpenAddApiProvider ? (
                <Button type="button" size="xs" variant="outline" onClick={onOpenAddApiProvider}>
                  Connect OpenRouter
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Requests from this {driver} instance will automatically route through your connected
              OpenRouter API service.
            </p>
          )}
        </div>
      ) : null}

      {/* Details for Custom Gateway Mode */}
      {!usesCanonicalServiceConnections && connection.mode === "custom" ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-3.5 shadow-[0_14px_36px_-28px_hsl(var(--foreground)/0.6)] backdrop-blur-xl space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-custom-url`}
              className="text-xs font-medium text-foreground"
            >
              Base URL
            </label>
            <DraftInput
              id={`${idPrefix}-custom-url`}
              placeholder={isClaude ? "https://api.anthropic.com" : "https://api.openai.com/v1"}
              value={connection.baseUrl}
              onCommit={updateBaseUrl}
              className="font-mono text-xs"
              aria-invalid={validation.baseUrl !== null}
              aria-describedby={validation.baseUrl ? `${idPrefix}-custom-url-error` : undefined}
            />
            {validation.baseUrl ? (
              <p id={`${idPrefix}-custom-url-error`} className="text-[11px] text-destructive" role="alert">
                {validation.baseUrl}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-custom-key`}
              className="text-xs font-medium text-foreground"
            >
              API Key / Auth Token
            </label>
            <DraftInput
              id={`${idPrefix}-custom-key`}
              type="password"
              placeholder="API Key or Bearer Token"
              value={connection.apiKey}
              onCommit={updateApiKey}
              className="font-mono text-xs"
              aria-invalid={validation.credential !== null}
              aria-describedby={validation.credential ? `${idPrefix}-custom-key-error` : undefined}
            />
            {validation.credential ? (
              <p id={`${idPrefix}-custom-key-error`} className="text-[11px] text-destructive" role="alert">
                {validation.credential}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ServiceConnectionCard(props: {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly icon: ComponentType<{ readonly className?: string; readonly "aria-hidden"?: boolean }>;
}) {
  const Icon = props.icon;
  return (
    <button
      id={props.id}
      type="button"
      role="radio"
      aria-checked={props.selected}
      onClick={props.onSelect}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
        props.selected
          ? "border-primary/50 bg-primary/8 ring-1 ring-primary/30"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/30",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/80">
        <Icon className="size-4 text-foreground/80" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">{props.label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{props.detail}</span>
      </span>
      {props.selected ? <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden /> : null}
    </button>
  );
}
