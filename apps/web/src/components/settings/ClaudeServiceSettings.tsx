"use client";

import { Globe2Icon, KeyRoundIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ProviderInstanceEnvironmentVariable,
  ProviderInstanceEnvironment,
} from "@t3tools/contracts";

import { OPENROUTER_BASE_URL } from "../../claudeServices";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { DraftInput } from "../ui/draft-input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";

export const CLAUDE_SERVICE_ENVIRONMENT_VARIABLE_NAMES = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
] as const;

export type ClaudeServiceId = "anthropic" | "openrouter" | "custom";

export interface ClaudeServiceEnvironmentDraft {
  readonly service: ClaudeServiceId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly apiKeyStored: boolean;
}

export const CLAUDE_SERVICE_PRESETS: ReadonlyArray<{
  readonly id: ClaudeServiceId;
  readonly label: string;
  readonly description: string;
  readonly baseUrl: string;
}> = [
  {
    id: "anthropic",
    label: "Anthropic",
    description: "Use Claude directly through Anthropic.",
    baseUrl: "",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Route Claude Code through OpenRouter and choose compatible models below.",
    baseUrl: OPENROUTER_BASE_URL,
  },
  {
    id: "custom",
    label: "Custom compatible service",
    description: "Use an Anthropic-compatible gateway with your own base URL.",
    baseUrl: "",
  },
];

const CLAUDE_SERVICE_PRESET_BY_ID = new Map(
  CLAUDE_SERVICE_PRESETS.map((preset) => [preset.id, preset]),
);

function environmentValue(
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>,
  name: string,
): ProviderInstanceEnvironmentVariable | undefined {
  return environment.find((variable) => variable.name === name);
}

function normalizedBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function hasStoredValue(variable: ProviderInstanceEnvironmentVariable | undefined): boolean {
  return Boolean(variable && (variable.valueRedacted === true || variable.value.trim().length > 0));
}

export function readClaudeServiceEnvironment(
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>,
): ClaudeServiceEnvironmentDraft {
  const baseUrlVariable = environmentValue(environment, "ANTHROPIC_BASE_URL");
  const authTokenVariable = environmentValue(environment, "ANTHROPIC_AUTH_TOKEN");
  const apiKeyVariable = environmentValue(environment, "ANTHROPIC_API_KEY");
  const baseUrl = baseUrlVariable?.value.trim() ?? "";
  const normalizedUrl = normalizedBaseUrl(baseUrl);
  const service: ClaudeServiceId =
    normalizedUrl === OPENROUTER_BASE_URL
      ? "openrouter"
      : baseUrl.length > 0 || hasStoredValue(authTokenVariable)
        ? "custom"
        : "anthropic";
  const keyVariable = service === "anthropic" ? apiKeyVariable : authTokenVariable;

  return {
    service,
    baseUrl,
    apiKey: keyVariable?.valueRedacted === true ? "" : (keyVariable?.value ?? ""),
    apiKeyStored: hasStoredValue(keyVariable),
  };
}

function addVariable(
  result: ProviderInstanceEnvironmentVariable[],
  variable: ProviderInstanceEnvironmentVariable,
): void {
  result.push(variable);
}

/**
 * Translate the friendly Claude service form back into the provider-instance
 * environment contract while preserving unrelated variables and redacted
 * secrets that the browser is not allowed to read.
 */
export function buildClaudeServiceEnvironment(
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>,
  draft: ClaudeServiceEnvironmentDraft,
): ProviderInstanceEnvironment {
  const managed = new Set<string>(CLAUDE_SERVICE_ENVIRONMENT_VARIABLE_NAMES);
  const result: ProviderInstanceEnvironmentVariable[] = environment
    .filter((variable) => !managed.has(variable.name))
    .map((variable) => ({ ...variable }));
  const existingBaseUrl = environmentValue(environment, "ANTHROPIC_BASE_URL");
  const existingAuthToken = environmentValue(environment, "ANTHROPIC_AUTH_TOKEN");
  const existingApiKey = environmentValue(environment, "ANTHROPIC_API_KEY");
  const service = draft.service;

  if (service !== "anthropic" && draft.baseUrl.trim().length > 0) {
    addVariable(result, {
      name: "ANTHROPIC_BASE_URL",
      value: draft.baseUrl.trim(),
      sensitive: false,
    });
  } else if (service !== "anthropic" && existingBaseUrl?.valueRedacted === true) {
    addVariable(result, { ...existingBaseUrl });
  }

  if (service === "anthropic") {
    if (draft.apiKey.trim().length > 0) {
      addVariable(result, {
        name: "ANTHROPIC_API_KEY",
        value: draft.apiKey,
        sensitive: true,
      });
    } else if (draft.apiKeyStored && existingApiKey) {
      addVariable(result, { ...existingApiKey, name: "ANTHROPIC_API_KEY" });
    }
    return result;
  }

  if (draft.apiKey.trim().length > 0) {
    addVariable(result, {
      name: "ANTHROPIC_AUTH_TOKEN",
      value: draft.apiKey,
      sensitive: true,
    });
  } else if (draft.apiKeyStored && existingAuthToken) {
    addVariable(result, { ...existingAuthToken, name: "ANTHROPIC_AUTH_TOKEN" });
  }

  // An explicitly empty API key prevents Claude Code from falling back to a
  // globally configured Anthropic key when a compatible gateway is selected.
  addVariable(result, {
    name: "ANTHROPIC_API_KEY",
    value: "",
    sensitive: true,
  });
  return result;
}

interface ClaudeServiceSettingsProps {
  readonly idPrefix: string;
  readonly environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>;
  readonly onChange: (environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>) => void;
}

export function ClaudeServiceSettings({
  idPrefix,
  environment,
  onChange,
}: ClaudeServiceSettingsProps) {
  const [draft, setDraft] = useState<ClaudeServiceEnvironmentDraft>(() =>
    readClaudeServiceEnvironment(environment),
  );

  useEffect(() => {
    setDraft(readClaudeServiceEnvironment(environment));
  }, [environment]);

  const commit = (patch: Partial<ClaudeServiceEnvironmentDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (next.service === "custom" && next.baseUrl.trim().length === 0) return;
    onChange(buildClaudeServiceEnvironment(environment, next));
  };

  const selectedPreset = CLAUDE_SERVICE_PRESET_BY_ID.get(draft.service)!;
  const needsBaseUrl = draft.service === "custom" && draft.baseUrl.trim().length === 0;

  return (
    <section className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground">
          <Globe2Icon className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-foreground">Claude Code service</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Applies to every project using this Claude provider. Credentials are stored by Rune, not
            in the project repository.
          </p>
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-foreground">Service</span>
        <Select
          value={draft.service}
          onValueChange={(value) => {
            if (!value || !CLAUDE_SERVICE_PRESET_BY_ID.has(value as ClaudeServiceId)) return;
            const service = value as ClaudeServiceId;
            const nextBaseUrl =
              service === "anthropic"
                ? ""
                : service === "openrouter"
                  ? OPENROUTER_BASE_URL
                  : draft.baseUrl;
            commit({ service, baseUrl: nextBaseUrl, apiKey: "", apiKeyStored: false });
          }}
        >
          <SelectTrigger size="compact" aria-label="Claude Code service">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {CLAUDE_SERVICE_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <span className="text-xs text-muted-foreground">{selectedPreset.description}</span>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}-base-url`} className="text-xs font-medium text-foreground">
          Base URL
        </label>
        <DraftInput
          id={`${idPrefix}-base-url`}
          value={draft.baseUrl}
          onCommit={(value) => commit({ baseUrl: value.trim() })}
          placeholder={
            draft.service === "anthropic" ? "Leave blank for Anthropic" : OPENROUTER_BASE_URL
          }
          spellCheck={false}
          aria-invalid={needsBaseUrl}
        />
        {needsBaseUrl ? (
          <span className="text-xs text-destructive">
            A base URL is required for a custom service.
          </span>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}-api-key`} className="text-xs font-medium text-foreground">
          API key
        </label>
        <div className="flex items-center gap-2">
          <KeyRoundIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <DraftInput
            id={`${idPrefix}-api-key`}
            className="min-w-0 flex-1"
            type="password"
            autoComplete="off"
            value={draft.apiKey}
            onCommit={(value) => {
              if (value.trim().length > 0) {
                commit({ apiKey: value, apiKeyStored: true });
              }
            }}
            placeholder={
              draft.apiKeyStored ? "Stored securely — enter a new key to replace" : "Paste API key"
            }
            spellCheck={false}
          />
          {draft.apiKeyStored ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost-muted"
              onClick={() => commit({ apiKey: "", apiKeyStored: false })}
              aria-label="Clear Claude Code API key"
            >
              <RotateCcwIcon className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
        <span className={cn("text-xs text-muted-foreground", needsBaseUrl && "text-warning")}>
          {draft.service === "anthropic"
            ? "Uses ANTHROPIC_API_KEY."
            : "Uses ANTHROPIC_AUTH_TOKEN for the compatible service."}{" "}
          Stored separately from the app and never displayed after saving.
        </span>
      </div>
    </section>
  );
}
