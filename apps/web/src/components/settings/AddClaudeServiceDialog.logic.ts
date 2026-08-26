/**
 * Pure logic for the guided "Add Claude service" setup dialog: draft state,
 * instance-id derivation, envelope construction, gateway catalog fetching,
 * and wizard navigation guards.
 *
 * @module AddClaudeServiceDialog.logic
 */
import type { ProviderInstanceConfig } from "@rune/contracts";

import {
  OPENROUTER_BASE_URL,
} from "../../claudeServices";
import type { ClaudeRoleModels } from "../../claudeRoles";
import { buildClaudeRoleEnvironment } from "../../claudeRoles";
import {
  buildClaudeServiceEnvironment,
  type ClaudeServiceId,
} from "./ClaudeServiceSettings";

export const CLAUDE_SERVICE_WIZARD_STEPS = [
  "Service",
  "API key",
  "Models",
  "Roles",
  "Finish",
] as const;

const SERVICE_STEP = 0;
const MODELS_STEP = 2;

export interface ClaudeServiceDraft {
  readonly preset: "openrouter" | "custom";
  readonly baseUrl: string;
  readonly apiKey: string;
  /** Picked catalog / hand-added model slugs → `config.customModels`. */
  readonly models: ReadonlyArray<string>;
  /** Role pins; empty-string values are allowed mid-edit and mean "unset". */
  readonly roles: Partial<ClaudeRoleModels>;
  readonly label: string;
  readonly accentColor: string;
  readonly instanceIdOverride: string | null;
}

export function initialClaudeServiceDraft(): ClaudeServiceDraft {
  const defaults = claudeServicePresetDefaults("openrouter");
  return {
    preset: "openrouter",
    baseUrl: defaults.baseUrl,
    apiKey: "",
    models: [],
    roles: {},
    label: defaults.label,
    accentColor: "",
    instanceIdOverride: null,
  };
}

/** Base URL + display label a preset starts from. */
export function claudeServicePresetDefaults(preset: "openrouter" | "custom"): {
  readonly baseUrl: string;
  readonly label: string;
} {
  return preset === "openrouter"
    ? { baseUrl: OPENROUTER_BASE_URL, label: "Claude OpenRouter" }
    : { baseUrl: "", label: "Claude Gateway" };
}

function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

/**
 * Instance id for a new service. The OpenRouter preset has a stable default;
 * a custom service slugs its label. Collisions get `_2`, `_3` suffixes. An
 * explicit override wins verbatim — its collision state is surfaced by the
 * Finish step's validation instead of being silently renamed here.
 */
export function deriveClaudeServiceInstanceId(
  draft: ClaudeServiceDraft,
  existing: ReadonlySet<string>,
): string {
  if (draft.instanceIdOverride !== null) return draft.instanceIdOverride;
  const base =
    draft.preset === "openrouter"
      ? "claude_openrouter"
      : (() => {
          const slug = slugifyLabel(draft.label);
          return slug ? `claude_${slug}` : "claude_gateway";
        })();
  let candidate = base;
  let suffix = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Build the provider-instance envelope for the finished wizard. Service
 * connection variables come first, role pins after; an API key is stored as
 * the sensitive `ANTHROPIC_AUTH_TOKEN` with an explicitly empty
 * `ANTHROPIC_API_KEY` so the CLI cannot fall back to a global key.
 */
export function buildClaudeServiceInstance(
  draft: ClaudeServiceDraft,
  instanceId: string,
): ProviderInstanceConfig {
  void instanceId;
  const service: ClaudeServiceId = draft.preset === "openrouter" ? "openrouter" : "custom";
  const environment = buildClaudeRoleEnvironment(
    buildClaudeServiceEnvironment([], {
      service,
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
      apiKeyStored: draft.apiKey.trim().length > 0,
    }),
    draft.roles,
  );

  const displayName = draft.label.trim();
  const accentColor = draft.accentColor.trim();
  return {
    driver: "claudeAgent" as ProviderInstanceConfig["driver"],
    ...(displayName.length > 0 ? { displayName } : {}),
    ...(accentColor.length > 0 ? { accentColor } : {}),
    config: { customModels: [...draft.models] },
    environment,
  };
}

export type ClaudeServiceWizardNavigation =
  | { readonly kind: "navigate"; readonly step: number }
  | { readonly kind: "blocked"; readonly step: number; readonly error: string };

/**
 * Wizard movement guard. Forward past Service requires a base URL on the
 * custom preset; forward past Models requires at least one picked model.
 * Roles and Finish are skippable. Backward navigation is always preserved.
 */
export function resolveClaudeServiceWizardNavigation(
  currentStep: number,
  requestedStep: number,
  draft: ClaudeServiceDraft,
): ClaudeServiceWizardNavigation {
  const lastStep = CLAUDE_SERVICE_WIZARD_STEPS.length - 1;
  const targetStep = Math.max(0, Math.min(lastStep, requestedStep));
  const movingForward = targetStep > currentStep;

  if (movingForward && currentStep <= SERVICE_STEP && targetStep > SERVICE_STEP) {
    if (draft.preset === "custom" && draft.baseUrl.trim().length === 0) {
      return {
        kind: "blocked",
        step: SERVICE_STEP,
        error: "A base URL is required for a custom service.",
      };
    }
  }

  if (movingForward && currentStep <= MODELS_STEP && targetStep > MODELS_STEP) {
    if (draft.models.length === 0) {
      return {
        kind: "blocked",
        step: MODELS_STEP,
        error: "Pick at least one model before continuing.",
      };
    }
  }

  return { kind: "navigate", step: targetStep };
}

export interface ClaudeCatalogModel {
  readonly id: string;
  readonly name: string;
}

export type ClaudeCatalogResult =
  | { readonly _tag: "Success"; readonly models: ReadonlyArray<ClaudeCatalogModel> }
  | { readonly _tag: "Failure" };

/**
 * Fetch `/v1/models` from an Anthropic-compatible gateway. Any failure —
 * network, HTTP status, unexpected payload shape — collapses to `_tag:
 * "Failure"` so the dialog can fall back to manual model entry.
 */
export async function fetchClaudeServiceCatalog(
  baseUrl: string,
  signal: AbortSignal,
): Promise<ClaudeCatalogResult> {
  try {
    const url = `${baseUrl.trim().replace(/\/+$/, "")}/v1/models`;
    const response = await fetch(url, { signal });
    if (!response.ok) return { _tag: "Failure" };
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) return { _tag: "Failure" };
    const data = (payload as { data?: unknown }).data;
    if (!Array.isArray(data)) return { _tag: "Failure" };
    const models: ClaudeCatalogModel[] = [];
    for (const entry of data) {
      if (typeof entry !== "object" || entry === null) continue;
      const id = (entry as { id?: unknown }).id;
      if (typeof id !== "string" || id.trim().length === 0) continue;
      const name = (entry as { name?: unknown }).name;
      models.push({
        id,
        name: typeof name === "string" && name.trim().length > 0 ? name : id,
      });
    }
    // Entries that exist but none of which decode is a shape mismatch, not an
    // empty catalog; only a genuinely empty `data` array counts as success.
    if (data.length > 0 && models.length === 0) return { _tag: "Failure" };
    return { _tag: "Success", models };
  } catch {
    return { _tag: "Failure" };
  }
}

/** Catalog order for picking: native Anthropic models first, then locale order. */
export function orderClaudeCatalogModels(
  models: ReadonlyArray<ClaudeCatalogModel>,
): ReadonlyArray<ClaudeCatalogModel> {
  return [...models].sort((left, right) => {
    const leftAnthropic = left.id.startsWith("anthropic/") ? 0 : 1;
    const rightAnthropic = right.id.startsWith("anthropic/") ? 0 : 1;
    if (leftAnthropic !== rightAnthropic) return leftAnthropic - rightAnthropic;
    return left.id.localeCompare(right.id);
  });
}
