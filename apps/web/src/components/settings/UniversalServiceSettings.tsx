"use client";

import { useMemo } from "react";
import {
  type ProviderDriverKind,
  type ProviderInstanceEnvironmentVariable,
  type ServerSettings,
} from "@rune/contracts";
import { Globe2Icon, KeyRoundIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "../ui/button";
import { DraftInput } from "../ui/draft-input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";
import { OPENROUTER_LOGO_URL } from "../../claudeServices";

export type ServiceConnectionMode = "native" | "openrouter" | "api-provider" | "custom";

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
  const keyVar = environment.find((v) => v.name === keyVarName || v.name === "ANTHROPIC_API_KEY");

  const baseUrl = urlVar?.value.trim() ?? "";
  const normalizedUrl = baseUrl.replace(/\/+$/, "").toLowerCase();
  const hasStoredKey = Boolean(keyVar && (keyVar.valueRedacted || keyVar.value.trim().length > 0));
  const apiKey = keyVar?.valueRedacted ? "" : (keyVar?.value ?? "");

  if (normalizedUrl.includes("openrouter.ai")) {
    return { mode: "openrouter", baseUrl, apiKey, hasStoredKey };
  }
  if (baseUrl.length > 0 || hasStoredKey) {
    return { mode: "custom", baseUrl, apiKey, hasStoredKey };
  }
  return { mode: "native", baseUrl: "", apiKey: "", hasStoredKey: false };
}

export function UniversalServiceSettings(props: {
  driverKind: ProviderDriverKind;
  idPrefix: string;
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>;
  settings: ServerSettings;
  onChange: (nextEnvironment: ReadonlyArray<ProviderInstanceEnvironmentVariable>) => void;
  onOpenAddApiProvider?: () => void;
}) {
  const { driverKind, idPrefix, environment, settings, onChange } = props;
  const driver = String(driverKind);
  const isClaude = driver === "claudeAgent" || driver === "claude";

  const connection = useMemo(
    () => readInstanceServiceConnection(driverKind, environment),
    [driverKind, environment],
  );

  const connectedServices = Object.values(settings.harnesses?.services ?? {});
  const openRouterService = connectedServices.find((s) => s.kind === "openrouter");

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
      const defaultUrl = isClaude
        ? "https://openrouter.ai/api"
        : "https://openrouter.ai/api/v1";
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
    if (url.trim().length > 0) {
      next.push({ name: urlVarName, value: url.trim(), sensitive: false });
    }
    onChange(next);
  };

  const updateApiKey = (key: string) => {
    const keyVarName = isClaude ? "ANTHROPIC_AUTH_TOKEN" : "OPENAI_API_KEY";
    const next = environment.filter((v) => v.name !== keyVarName && v.name !== "ANTHROPIC_API_KEY");
    if (key.trim().length > 0) {
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
      {/* Radio Cards */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {/* Native Account */}
        <button
          type="button"
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
          type="button"
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
                <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
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
          type="button"
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

      {/* Details for OpenRouter Mode */}
      {connection.mode === "openrouter" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Globe2Icon className="size-4 text-blue-500" />
              <span>OpenRouter Routing</span>
            </div>
            {openRouterService?.hasCredential ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <ShieldCheckIcon className="size-3.5" />
                Using global OpenRouter credential
              </span>
            ) : null}
          </div>

          {!openRouterService?.hasCredential ? (
            <div className="space-y-1.5">
              <label htmlFor={`${idPrefix}-openrouter-key`} className="text-xs font-medium text-foreground">
                OpenRouter API Key
              </label>
              <DraftInput
                id={`${idPrefix}-openrouter-key`}
                type="password"
                placeholder="sk-or-v1-..."
                value={connection.apiKey}
                onCommit={updateApiKey}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your key once here or connect OpenRouter in Settings → API Providers to share across all profiles.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Requests from this {driver} instance will automatically route through your connected OpenRouter API service.
            </p>
          )}
        </div>
      ) : null}

      {/* Details for Custom Gateway Mode */}
      {connection.mode === "custom" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-custom-url`} className="text-xs font-medium text-foreground">
              Base URL
            </label>
            <DraftInput
              id={`${idPrefix}-custom-url`}
              placeholder={isClaude ? "https://api.anthropic.com" : "https://api.openai.com/v1"}
              value={connection.baseUrl}
              onCommit={updateBaseUrl}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-custom-key`} className="text-xs font-medium text-foreground">
              API Key / Auth Token
            </label>
            <DraftInput
              id={`${idPrefix}-custom-key`}
              type="password"
              placeholder="API Key or Bearer Token"
              value={connection.apiKey}
              onCommit={updateApiKey}
              className="font-mono text-xs"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
