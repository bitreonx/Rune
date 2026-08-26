"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import {
  ProviderInstanceId,
  type ProviderInstanceConfig,
} from "@rune/contracts";

import {
  closeClaudeServiceSetup,
  type ClaudeServiceSetupRequest,
} from "../../claudeServiceSetupBus";
import { OPENROUTER_LOGO_URL } from "../../claudeServices";
import { CLAUDE_ROLE_KEYS, type ClaudeRoleKey } from "../../claudeRoles";
import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { normalizeProviderAccentColor } from "../../providerInstances";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { RadioGroup } from "../ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { toastManager } from "../ui/toast";
import {
  buildClaudeServiceInstance,
  claudeServicePresetDefaults,
  deriveClaudeServiceInstanceId,
  fetchClaudeServiceCatalog,
  initialClaudeServiceDraft,
  orderClaudeCatalogModels,
  resolveClaudeServiceWizardNavigation,
  CLAUDE_SERVICE_WIZARD_STEPS,
  type ClaudeCatalogResult,
  type ClaudeServiceDraft,
} from "./AddClaudeServiceDialog.logic";
import { PROVIDER_ACCENT_SWATCHES, validateInstanceId } from "./AddProviderInstanceDialog";
import { AddProviderInstanceWizardSteps } from "./AddProviderInstanceWizardSteps";

const MODELS_STEP = 2;
const LAST_STEP = CLAUDE_SERVICE_WIZARD_STEPS.length - 1;

const PRESET_CARDS: ReadonlyArray<{
  readonly preset: "openrouter" | "custom";
  readonly title: string;
  readonly description: string;
}> = [
  {
    preset: "openrouter",
    title: "OpenRouter",
    description: "Route Claude Code through OpenRouter and pick from its model catalog.",
  },
  {
    preset: "custom",
    title: "Custom compatible service",
    description: "Use any Anthropic-compatible gateway with your own base URL.",
  },
];

const ROLE_LABELS: Readonly<Record<ClaudeRoleKey, string>> = {
  opus: "Opus role",
  sonnet: "Sonnet role",
  haiku: "Haiku role",
};

type CatalogState =
  | { readonly _tag: "idle" }
  | { readonly _tag: "loading" }
  | ClaudeCatalogResult;

/**
 * Guided setup for a Claude-compatible service (OpenRouter or any
 * Anthropic-compatible gateway): service → API key → models → roles → name.
 * Produces a `claudeAgent` provider instance whose environment points the
 * Claude CLI at the service.
 */
export function AddClaudeServiceDialog({ request }: { readonly request: ClaudeServiceSetupRequest }) {
  const navigate = useNavigate();
  const settings = useEnvironmentSettings(request.environmentId);
  const updateSettings = useUpdateEnvironmentSettings(request.environmentId);

  const [draft, setDraft] = useState<ClaudeServiceDraft>(initialClaudeServiceDraft);
  const [wizardStep, setWizardStep] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [catalogState, setCatalogState] = useState<CatalogState>({ _tag: "idle" });
  const [modelQuery, setModelQuery] = useState("");
  const [customModelInput, setCustomModelInput] = useState("");

  const existingIds = useMemo(
    () => new Set(Object.keys(settings.providerInstances ?? {})),
    [settings.providerInstances],
  );

  // The catalog is fetched once per dialog session when the Models step is
  // reached; the request is aborted if the dialog unmounts mid-flight.
  const catalogRequestedRef = useRef(false);
  // The catalogRequestedRef guard makes this a once-per-session fetch when the
  // Models step is first reached; navigating back and forth must not abort an
  // in-flight request, so the abort is wired to unmount (dialog close) only.
  const catalogAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (wizardStep < MODELS_STEP || catalogRequestedRef.current) return;
    catalogRequestedRef.current = true;
    const controller = new AbortController();
    catalogAbortRef.current = controller;
    setCatalogState({ _tag: "loading" });
    void fetchClaudeServiceCatalog(draft.baseUrl, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setCatalogState(result);
      }
    });
  }, [wizardStep]);
  useEffect(() => () => catalogAbortRef.current?.abort(), []);

  const instanceId = deriveClaudeServiceInstanceId(draft, existingIds);
  const instanceIdError = validateInstanceId(instanceId, existingIds);

  const patchDraft = (patch: Partial<ClaudeServiceDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const selectPreset = (preset: "openrouter" | "custom") => {
    const defaults = claudeServicePresetDefaults(preset);
    patchDraft({ preset, baseUrl: defaults.baseUrl, label: defaults.label });
  };

  const applyWizardNavigation = (step: number, error: string | null) => {
    if (error !== null) setHasAttemptedSubmit(true);
    setNavigationError(error);
    setWizardStep(step);
  };

  const navigateToStep = (requestedStep: number) => {
    const navigation = resolveClaudeServiceWizardNavigation(wizardStep, requestedStep, draft);
    applyWizardNavigation(
      navigation.step,
      navigation.kind === "blocked" ? navigation.error : null,
    );
  };

  const toggleModel = (id: string) => {
    patchDraft({
      models: draft.models.includes(id)
        ? draft.models.filter((model) => model !== id)
        : [...draft.models, id],
    });
  };

  const addCustomModel = () => {
    const id = customModelInput.trim();
    if (id.length === 0 || draft.models.includes(id)) {
      setCustomModelInput("");
      return;
    }
    patchDraft({ models: [...draft.models, id] });
    setCustomModelInput("");
  };

  const catalogModels = useMemo(
    () => (catalogState._tag === "Success" ? orderClaudeCatalogModels(catalogState.models) : []),
    [catalogState],
  );
  const query = modelQuery.trim().toLowerCase();
  const visibleCatalogModels = query.length > 0
    ? catalogModels.filter(
        (model) =>
          model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query),
      )
    : catalogModels;
  // Catalog ids the user picked but that are not in the (visible) list — e.g.
  // fetched under a previous filter — still render as removable chips below.
  const customPickedModels = draft.models.filter((id) => !catalogModels.some((m) => m.id === id));

  const handleSave = () => {
    setHasAttemptedSubmit(true);
    if (instanceIdError !== null) return;

    const nextInstance: ProviderInstanceConfig = {
      ...buildClaudeServiceInstance(draft, instanceId),
      enabled: true,
    };
    const brandedId = ProviderInstanceId.make(instanceId);
    try {
      updateSettings({
        providerInstances: {
          ...settings.providerInstances,
          [brandedId]: nextInstance,
        },
      });
      toastManager.add({
        type: "success",
        title: `${draft.label.trim() || "Service"} added`,
        description: "Pick it in any project's model picker to use it there.",
      });
      closeClaudeServiceSetup();
      if (request.origin === "settings") {
        void navigate({
          to: "/settings/providers/$instanceId",
          params: { instanceId },
          search: { env: request.environmentId },
        });
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Could not add the service",
        description: error instanceof Error ? error.message : "Update failed.",
      });
    }
  };

  const roleOptions = useMemo(() => {
    const options = new Set<string>(draft.models);
    for (const model of catalogModels) options.add(model.id);
    return [...options].sort((left, right) => left.localeCompare(right));
  }, [draft.models, catalogModels]);

  return (
    <Dialog open onOpenChange={(open) => !open && closeClaudeServiceSetup()}>
      <DialogPopup className="max-w-xl overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add Claude service</DialogTitle>
            <DialogDescription>
              Route Claude Code through OpenRouter or any Anthropic-compatible gateway. The service
              becomes available in every project's model picker.
            </DialogDescription>
            <AddProviderInstanceWizardSteps
              steps={CLAUDE_SERVICE_WIZARD_STEPS}
              currentStep={wizardStep}
              summaries={[null, null, `${draft.models.length} picked`, null, null]}
              instanceIdError={instanceIdError}
              resolveNavigation={(requestedStep) => {
                const navigation = resolveClaudeServiceWizardNavigation(wizardStep, requestedStep, draft);
                return navigation.kind === "blocked"
                  ? { kind: "blocked", step: navigation.step, error: navigation.error }
                  : { kind: "navigate", step: navigation.step };
              }}
              onNavigation={(navigation) =>
                applyWizardNavigation(
                  navigation.step,
                  navigation.kind === "blocked" ? navigation.error : null,
                )
              }
            />
          </DialogHeader>

          <div
            data-slot="dialog-panel"
            className="space-y-4 bg-zinc-25/80 px-6 py-5 ring-1 ring-black/5 dark:bg-white/2 dark:ring-white/5"
          >
            {/* Step 0 — Service */}
            <div className={cn("grid gap-2", wizardStep !== 0 && "hidden")}>
              <span
                id="add-claude-service-label"
                className="text-sm font-medium text-foreground"
              >
                Service
              </span>
              <RadioGroup
                value={draft.preset}
                onValueChange={(value) => {
                  if (value === "openrouter" || value === "custom") selectPreset(value);
                }}
                aria-labelledby="add-claude-service-label"
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {PRESET_CARDS.map((card) => (
                  <RadioPrimitive.Root
                    key={card.preset}
                    value={card.preset}
                    className="relative flex cursor-pointer items-start gap-3 rounded-lg bg-card px-3 py-3 text-left outline-none ring-1 ring-black/5 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-primary/8 data-checked:ring-2 data-checked:ring-primary dark:bg-white/3 dark:ring-white/5 dark:hover:bg-white/5 dark:data-checked:bg-primary/15 dark:data-checked:ring-primary"
                  >
                    {card.preset === "openrouter" ? (
                      <img
                        src={OPENROUTER_LOGO_URL}
                        alt=""
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 rounded-sm object-contain"
                      />
                    ) : (
                      <span className="mt-0.5 size-4 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {card.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {card.description}
                      </span>
                    </span>
                    <RadioPrimitive.Indicator
                      className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <CheckIcon className="size-3.5 shrink-0" />
                    </RadioPrimitive.Indicator>
                  </RadioPrimitive.Root>
                ))}
              </RadioGroup>
              {draft.preset === "custom" ? (
                <label className="mt-1 grid gap-1.5">
                  <span className="text-xs font-medium text-foreground">Base URL</span>
                  <Input
                    className="bg-background"
                    placeholder="https://your-gateway.example.com"
                    value={draft.baseUrl}
                    onChange={(event) => patchDraft({ baseUrl: event.target.value })}
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={hasAttemptedSubmit && draft.baseUrl.trim().length === 0}
                  />
                  {hasAttemptedSubmit && draft.baseUrl.trim().length === 0 ? (
                    <span className="text-[11px] text-destructive">
                      A base URL is required for a custom service.
                    </span>
                  ) : null}
                </label>
              ) : null}
            </div>

            {/* Step 1 — API key */}
            <label className={cn("grid gap-2", wizardStep !== 1 && "hidden")}>
              <span className="text-xs font-medium text-foreground">API key</span>
              <Input
                className="bg-background"
                type="password"
                autoComplete="off"
                value={draft.apiKey}
                onChange={(event) => patchDraft({ apiKey: event.target.value })}
                placeholder={
                  draft.preset === "openrouter" ? "sk-or-v1-…" : "Paste the service's API key"
                }
                spellCheck={false}
              />
              <span className="text-[11px] text-muted-foreground">
                Stored securely — never displayed after saving.
              </span>
            </label>

            {/* Step 2 — Models */}
            <div className={cn("grid gap-3", wizardStep !== MODELS_STEP && "hidden")}>
              {catalogState._tag === "loading" ? (
                <p className="text-xs text-muted-foreground">Loading the model catalog…</p>
              ) : catalogState._tag === "Failure" ? (
                <p className="text-xs text-warning">
                  Couldn't load the catalog — add model IDs manually below.
                </p>
              ) : null}

              {catalogModels.length > 0 ? (
                <>
                  <label className="relative block">
                    <SearchIcon
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      className="bg-background pl-8"
                      placeholder="Search models"
                      value={modelQuery}
                      onChange={(event) => setModelQuery(event.target.value)}
                    />
                  </label>
                  <div className="max-h-52 overflow-y-auto rounded-lg bg-card p-1 ring-1 ring-black/5 dark:ring-white/5">
                    {visibleCatalogModels.map((model) => (
                      <label
                        key={model.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          className="size-3.5 accent-[var(--primary)]"
                          checked={draft.models.includes(model.id)}
                          onChange={() => toggleModel(model.id)}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {model.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {model.id}
                        </span>
                      </label>
                    ))}
                    {visibleCatalogModels.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                        No models match "{modelQuery}".
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-foreground">Add model ID</span>
                <div className="flex items-center gap-2">
                  <Input
                    className="bg-background"
                    placeholder="vendor/model-id"
                    value={customModelInput}
                    onChange={(event) => setCustomModelInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomModel();
                      }
                    }}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCustomModel}
                    disabled={customModelInput.trim().length === 0}
                  >
                    <PlusIcon className="size-3.5" />
                    Add
                  </Button>
                </div>
              </label>

              {draft.models.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {draft.models.map((id) => (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full bg-card py-0.5 pl-2.5 pr-1 font-mono text-[11px] text-foreground ring-1 ring-black/10 dark:ring-white/10"
                    >
                      {id}
                      <button
                        type="button"
                        className="grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => toggleModel(id)}
                        aria-label={`Remove ${id}`}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              {hasAttemptedSubmit && draft.models.length === 0 ? (
                <span className="text-[11px] text-destructive">
                  Pick at least one model before continuing.
                </span>
              ) : null}
            </div>

            {/* Step 3 — Roles */}
            <div className={cn("grid gap-3", wizardStep !== 3 && "hidden")}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Optional: pin gateway models to Claude's roles so subagents and background tasks use
                them. You can change this later on the service's page.
              </p>
              {CLAUDE_ROLE_KEYS.map((key) => {
                const pinned = draft.roles[key];
                // The select must be able to display the pinned model even if
                // it has since left the picked set.
                const options =
                  pinned !== undefined && !roleOptions.includes(pinned)
                    ? [...roleOptions, pinned]
                    : roleOptions;
                return (
                  <div key={key} className="grid gap-1.5">
                    <span className="text-xs font-medium text-foreground">{ROLE_LABELS[key]}</span>
                    <Select
                      value={pinned ?? ""}
                      onValueChange={(value) =>
                        patchDraft({
                          roles: value
                            ? { ...draft.roles, [key]: value }
                            : (() => {
                                const { [key]: _omit, ...rest } = draft.roles;
                                return rest;
                              })(),
                        })
                      }
                    >
                      <SelectTrigger size="compact" aria-label={ROLE_LABELS[key]}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectItem value="">Leave unset</SelectItem>
                        {options.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Step 4 — Finish */}
            <div className={cn("grid gap-4", wizardStep !== LAST_STEP && "hidden")}>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-foreground">Display name</span>
                <Input
                  className="bg-background"
                  placeholder="Claude OpenRouter"
                  value={draft.label}
                  onChange={(event) => patchDraft({ label: event.target.value })}
                />
              </label>

              <div className="grid gap-2">
                <span className="text-xs font-medium text-foreground">Accent color</span>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={normalizeProviderAccentColor(draft.accentColor) ?? PROVIDER_ACCENT_SWATCHES[0]}
                    onChange={(event) => patchDraft({ accentColor: event.target.value })}
                    aria-label="Service accent color"
                    className="h-8 w-10 cursor-pointer rounded-xl border border-input bg-background p-0.5"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PROVIDER_ACCENT_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        className={cn(
                          "size-6 cursor-pointer rounded-full border transition",
                          draft.accentColor.toLowerCase() === swatch
                            ? "scale-110 border-foreground ring-2 ring-ring ring-offset-1 ring-offset-background"
                            : "border-black/10 hover:scale-105 dark:border-white/20",
                        )}
                        style={{ backgroundColor: swatch }}
                        onClick={() => patchDraft({ accentColor: swatch })}
                        aria-label={`Use ${swatch} accent`}
                      />
                    ))}
                    {draft.accentColor ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => patchDraft({ accentColor: "" })}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-medium text-foreground">Instance ID</span>
                <Input
                  className="bg-background"
                  value={instanceIdOverrideText(draft, instanceId)}
                  onChange={(event) => patchDraft({ instanceIdOverride: event.target.value })}
                  spellCheck={false}
                  aria-invalid={instanceIdError !== null && hasAttemptedSubmit}
                />
                {instanceIdError !== null && hasAttemptedSubmit ? (
                  <span className="text-[11px] text-destructive">{instanceIdError}</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Routing key used by threads and sessions. Letters, digits, '-', or '_'.
                  </span>
                )}
              </label>
            </div>

            {navigationError !== null ? (
              <p className="text-[11px] text-destructive">{navigationError}</p>
            ) : null}
          </div>

          <DialogFooter variant="bare">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (wizardStep === 0) {
                  closeClaudeServiceSetup();
                  return;
                }
                navigateToStep(wizardStep - 1);
              }}
            >
              {wizardStep === 0 ? "Cancel" : "Back"}
            </Button>
            {wizardStep < LAST_STEP ? (
              <Button size="sm" onClick={() => navigateToStep(wizardStep + 1)}>
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={instanceIdError !== null}>
                Add service
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

/** Show an in-progress override verbatim; otherwise the derived preview. */
function instanceIdOverrideText(draft: ClaudeServiceDraft, derivedId: string): string {
  return draft.instanceIdOverride ?? derivedId;
}
