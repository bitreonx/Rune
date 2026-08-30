"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { BookOpenIcon, CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ProviderInstanceId,
  ProviderDriverKind,
  apiKeyEnvironmentVariableForDriver,
  type EnvironmentId,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
} from "@rune/contracts";

import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { cn } from "../../lib/utils";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import {
  normalizeProviderAccentColor,
  withIsolatedProviderInstanceConfig,
} from "../../providerInstances";
import { Button } from "../ui/button";
import { ACPRegistryIcon, Gemini, GithubCopilotIcon, PiAgentIcon, type Icon } from "../Icons";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { RadioGroup } from "../ui/radio-group";
import { toastManager } from "../ui/toast";
import {
  DRIVER_OPTION_BY_VALUE,
  DRIVER_OPTIONS,
  getProviderSetupGuide,
} from "./providerDriverMeta";
import { ProviderSettingsForm, deriveProviderSettingsFields } from "./ProviderSettingsForm";
import { AnimatedHeight } from "../AnimatedHeight";
import {
  ADD_PROVIDER_WIZARD_STEPS,
  resolveAddProviderInstanceDialogTitle,
  resolveAddProviderWizardSteps,
  resolveInitialWizardStep,
  resolveVisibleWizardStep,
  resolveWizardNavigation,
  resolveWizardStep,
  type WizardNavigation,
} from "./AddProviderInstanceDialog.logic";
import { AddProviderInstanceWizardSteps } from "./AddProviderInstanceWizardSteps";

export const PROVIDER_ACCENT_SWATCHES = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
] as const;

/**
 * Normalize a user-provided label into a slug suffix for the instance id.
 * The full id is formed by prefixing the driver slug — e.g. label "Work" on
 * driver "codex" becomes `codex_work`. Output is trimmed to 48 chars so the
 * final composed id stays under the 64-char slug cap enforced by
 * `ProviderInstanceId` in `@rune/contracts`.
 */
function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function deriveInstanceId(driver: ProviderDriverKind, label: string): string {
  const slug = slugifyLabel(label);
  return slug ? `${driver}_${slug}` : "";
}

const INSTANCE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const DEFAULT_DRIVER_KIND = ProviderDriverKind.make("codex");
const DEFAULT_DRIVER_OPTION = DRIVER_OPTIONS[0]!;
const EMPTY_CONFIG_DRAFT: Record<string, unknown> = {};
interface ComingSoonDriverOption {
  readonly value: ProviderDriverKind;
  readonly label: string;
  readonly icon: Icon;
}

const COMING_SOON_DRIVER_OPTIONS: readonly ComingSoonDriverOption[] = [
  {
    value: ProviderDriverKind.make("githubCopilot"),
    label: "Github Copilot",
    icon: GithubCopilotIcon,
  },
  {
    value: ProviderDriverKind.make("gemini"),
    label: "Gemini",
    icon: Gemini,
  },
  {
    value: ProviderDriverKind.make("acpRegistry"),
    label: "ACP Registry",
    icon: ACPRegistryIcon,
  },
  {
    value: ProviderDriverKind.make("piAgent"),
    label: "Pi Agent",
    icon: PiAgentIcon,
  },
];

/**
 * Validate an instance id against the same slug rules the server applies in
 * `ProviderInstanceId` (see `packages/contracts/src/providerInstance.ts`).
 * Returns a user-facing error string, or `null` if valid.
 */
export function validateInstanceId(id: string, existing: ReadonlySet<string>): string | null {
  if (id.length === 0) return "Instance ID is required.";
  if (id.length > 64) return "Instance ID must be 64 characters or fewer.";
  if (!INSTANCE_ID_PATTERN.test(id)) {
    return "Instance ID must start with a letter and use only letters, digits, '-', or '_'.";
  }
  if (existing.has(id)) return `An instance named '${id}' already exists.`;
  return null;
}

interface AddProviderInstanceDialogProps {
  readonly open: boolean;
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  readonly onOpenChange: (open: boolean) => void;
  /** Preselect the provider family when adding from an instance workspace. */
  readonly initialDriver?: ProviderDriverKind | undefined;
}

export function AddProviderInstanceDialog({
  open,
  environmentId,
  environmentLabel,
  onOpenChange,
  initialDriver,
}: AddProviderInstanceDialogProps) {
  const settings = useEnvironmentSettings(environmentId);
  const updateSettings = useUpdateEnvironmentSettings(environmentId);

  const [wizardStep, setWizardStep] = useState(() => resolveInitialWizardStep(initialDriver));
  const [driver, setDriver] = useState<ProviderDriverKind>(
    () => initialDriver ?? DEFAULT_DRIVER_KIND,
  );
  const [label, setLabel] = useState("");
  const [accentColor, setAccentColor] = useState<string>("");
  const [instanceIdOverride, setInstanceIdOverride] = useState<string | null>(null);
  // Driver-specific config drafts keyed by driver so toggling between drivers
  // during the same dialog session does not lose in-progress input.
  const [configByDriver, setConfigByDriver] = useState<Record<string, Record<string, unknown>>>({});
  const [apiKeyByDriver, setApiKeyByDriver] = useState<Record<string, string>>({});
  // Errors are suppressed until the user has tried to submit once. After that
  // they update live so fixing the problem clears the message in place.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDriver(initialDriver ?? DEFAULT_DRIVER_KIND);
    setWizardStep(resolveInitialWizardStep(initialDriver));
    setHasAttemptedSubmit(false);
  }, [initialDriver, open]);

  const existingIds = useMemo(
    () => new Set(Object.keys(settings.providerInstances ?? {})),
    [settings.providerInstances],
  );

  const driverOption = DRIVER_OPTION_BY_VALUE[driver] ?? DEFAULT_DRIVER_OPTION;
  const instanceId = instanceIdOverride ?? deriveInstanceId(driver, label);
  const driverSettingsFields = useMemo(
    () => deriveProviderSettingsFields(driverOption),
    [driverOption],
  );
  const setupGuide = getProviderSetupGuide(driver);
  const { copyToClipboard, isCopied } = useCopyToClipboard<{ command: string }>({
    target: "provider setup command",
    onCopy: ({ command }) => {
      toastManager.add({
        type: "success",
        title: "Command copied",
        description: `Paste it on the machine running RUNE: ${command}`,
      });
    },
    onError: (error) => {
      toastManager.add({
        type: "error",
        title: "Could not copy command",
        description: error.message,
      });
    },
  });
  const instanceIdError = validateInstanceId(instanceId, existingIds);
  const showInstanceIdError = hasAttemptedSubmit && instanceIdError !== null;
  const previewLabel = label.trim() || `${driverOption.label} Workspace`;
  const isContextual = initialDriver !== undefined;
  // The state machine keeps the global step numbers so the existing save and
  // validation rules stay intact. Contextual entry points project those
  // indexes onto the four visible stages without rendering Harness.
  const activeWizardStep = Math.max(resolveInitialWizardStep(initialDriver), wizardStep);
  const visibleWizardStep = resolveVisibleWizardStep(initialDriver, activeWizardStep);
  const wizardSteps = resolveAddProviderWizardSteps(initialDriver);
  const wizardStepSummaries = isContextual
    ? ([previewLabel, null, null, null] as const)
    : ([driverOption.label, previewLabel, null, null, null] as const);

  const configDraft = configByDriver[driver] ?? EMPTY_CONFIG_DRAFT;
  const setConfigDraft = (config: Record<string, unknown> | undefined) => {
    setConfigByDriver((existing) => {
      const next = { ...existing };
      if (config === undefined || Object.keys(config).length === 0) {
        delete next[driver];
      } else {
        next[driver] = config;
      }
      return next;
    });
  };

  const applyWizardNavigation = (navigation: WizardNavigation) => {
    if (navigation.kind === "blocked") {
      setHasAttemptedSubmit(true);
    }
    setWizardStep(navigation.step);
  };

  const navigateToStep = (requestedStep: number) => {
    const internalStep = resolveWizardStep(initialDriver, requestedStep);
    applyWizardNavigation(
      resolveWizardNavigation(activeWizardStep, internalStep, ADD_PROVIDER_WIZARD_STEPS.length, {
        instanceIdError,
      }),
    );
  };

  const resolveVisibleWizardNavigation = (requestedStep: number): WizardNavigation =>
    resolveWizardNavigation(
      activeWizardStep,
      resolveWizardStep(initialDriver, requestedStep),
      ADD_PROVIDER_WIZARD_STEPS.length,
      { instanceIdError },
    );

  const handleSave = () => {
    setHasAttemptedSubmit(true);
    if (instanceIdError !== null) return;

    const rawConfig = configByDriver[driver] ?? {};
    const config = withIsolatedProviderInstanceConfig(
      driver,
      ProviderInstanceId.make(instanceId),
      rawConfig,
    );
    const hasConfig = Object.keys(config).length > 0;
    const apiKeyName = apiKeyEnvironmentVariableForDriver(driver);
    const apiKey = apiKeyName ? (apiKeyByDriver[driver]?.trim() ?? "") : "";
    const normalizedAccentColor = normalizeProviderAccentColor(accentColor);
    const environment: ProviderInstanceEnvironmentVariable[] =
      apiKeyName && apiKey.length > 0 ? [{ name: apiKeyName, value: apiKey, sensitive: true }] : [];

    const nextInstance: ProviderInstanceConfig = {
      driver,
      enabled: true,
      ...(label.trim().length > 0 ? { displayName: label.trim() } : {}),
      ...(normalizedAccentColor ? { accentColor: normalizedAccentColor } : {}),
      ...(environment.length > 0 ? { environment } : {}),
      ...(hasConfig ? { config } : {}),
    };
    // `ProviderInstanceId.make` revalidates the slug; we've already checked
    // it via `validateInstanceId`, but going through the brand constructor
    // keeps the type boundary honest and guards against any future drift in
    // the slug rules.
    const brandedId = ProviderInstanceId.make(instanceId);
    const nextMap = {
      ...settings.providerInstances,
      [brandedId]: nextInstance,
    };
    try {
      updateSettings({ providerInstances: nextMap });
      toastManager.add({
        type: "success",
        title: "Harness instance added",
        description: `${driverOption.label} instance '${instanceId}' was added.`,
      });
      onOpenChange(false);
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Could not add harness instance",
        description: error instanceof Error ? error.message : "Update failed.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {resolveAddProviderInstanceDialogTitle(initialDriver, driverOption.label)}
            </DialogTitle>
            <DialogDescription>
              {initialDriver
                ? `Configure this ${driverOption.label} instance on ${environmentLabel}.`
                : `Configure an additional harness instance on ${environmentLabel} — for example, a second Codex install pointed at a different workspace.`}
            </DialogDescription>
            <AddProviderInstanceWizardSteps
              steps={wizardSteps}
              currentStep={visibleWizardStep}
              summaries={wizardStepSummaries}
              instanceIdError={instanceIdError}
              resolveNavigation={resolveVisibleWizardNavigation}
              onNavigation={applyWizardNavigation}
            />
          </DialogHeader>

          <div
            data-slot="dialog-panel"
            className="space-y-4 bg-zinc-25/80 px-6 py-5 ring-1 ring-black/5 dark:bg-white/2 dark:ring-white/5"
          >
            <AnimatedHeight>
              <div className={cn("grid gap-2", activeWizardStep !== 0 && "hidden")}>
                <div id="add-instance-driver-label" className="text-sm font-medium text-foreground">
                  Harness
                </div>
                <RadioGroup
                  value={driver}
                  onValueChange={(value) => setDriver(ProviderDriverKind.make(value))}
                  aria-labelledby="add-instance-driver-label"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {DRIVER_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <RadioPrimitive.Root
                        key={option.value}
                        value={option.value}
                        className="relative flex cursor-pointer items-center gap-3 rounded-lg bg-card px-3 py-3 text-left text-muted-foreground outline-none ring-1 ring-black/5 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-primary/8 data-checked:text-foreground data-checked:ring-2 data-checked:ring-primary data-checked:hover:bg-primary/8 dark:bg-white/3 dark:ring-white/5 dark:hover:bg-white/5 dark:data-checked:bg-primary/15 dark:data-checked:ring-primary dark:data-checked:hover:bg-primary/15"
                      >
                        <IconComponent className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <RadioPrimitive.Indicator
                          className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                          aria-hidden
                        >
                          <CheckIcon className="size-3.5 shrink-0" />
                        </RadioPrimitive.Indicator>
                        {option.badgeLabel ? (
                          <Badge variant="warning" size="sm">
                            {option.badgeLabel}
                          </Badge>
                        ) : null}
                      </RadioPrimitive.Root>
                    );
                  })}
                  {COMING_SOON_DRIVER_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <RadioPrimitive.Root
                        key={option.value}
                        value={option.value}
                        disabled
                        className={cn(
                          "relative flex cursor-not-allowed items-center gap-3 rounded-lg bg-card/60 px-3 py-3 text-left opacity-55 outline-none ring-1 ring-black/5 dark:bg-white/2 dark:ring-white/5",
                        )}
                      >
                        <IconComponent
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <Badge variant="warning" size="sm">
                          Coming Soon
                        </Badge>
                      </RadioPrimitive.Root>
                    );
                  })}
                </RadioGroup>
              </div>

              <label className={cn("grid gap-2", wizardStep !== 1 && "hidden")}>
                <span className="text-xs font-medium text-foreground">Label</span>
                <Input
                  className="bg-background"
                  placeholder="e.g. Work"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">
                  Shown in the harness list. Optional.
                </span>
              </label>

              <label className={cn("grid gap-2", wizardStep !== 1 && "hidden")}>
                <span className="text-xs font-medium text-foreground">Instance ID</span>
                <Input
                  className="bg-background"
                  placeholder={`${driver}_work`}
                  value={instanceId}
                  onChange={(event) => {
                    setInstanceIdOverride(event.target.value);
                  }}
                  aria-invalid={showInstanceIdError}
                />
                {showInstanceIdError ? (
                  <span className="text-[11px] text-destructive">{instanceIdError}</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Routing key used by threads and sessions. Letters, digits, '-', or '_'.
                  </span>
                )}
              </label>

              <div className={cn("grid gap-2", wizardStep !== 1 && "hidden")}>
                <span className="text-xs font-medium text-foreground">Accent color</span>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={normalizeProviderAccentColor(accentColor) ?? PROVIDER_ACCENT_SWATCHES[0]}
                    onChange={(event) => setAccentColor(event.target.value)}
                    aria-label="Harness instance accent color"
                    className="h-8 w-10 cursor-pointer rounded-xl border border-input bg-background p-0.5"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PROVIDER_ACCENT_SWATCHES.map((swatch) => {
                      const selected = accentColor.toLowerCase() === swatch;
                      return (
                        <button
                          key={swatch}
                          type="button"
                          className={cn(
                            "size-6 cursor-pointer rounded-full border transition",
                            selected
                              ? "scale-110 border-foreground ring-2 ring-ring ring-offset-1 ring-offset-background"
                              : "border-black/10 hover:scale-105 dark:border-white/20",
                          )}
                          style={{ backgroundColor: swatch }}
                          onClick={() => setAccentColor(swatch)}
                          aria-label={`Use ${swatch} accent`}
                        />
                      );
                    })}
                  </div>
                  {accentColor ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setAccentColor("")}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Optional marker shown in the picker.
                </span>
              </div>

              {wizardStep === 2 && setupGuide ? (
                <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <BookOpenIcon className="size-4 text-primary" />
                      Finish setup on the host device
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      RUNE runs{" "}
                      <code className="rounded bg-background px-1 py-0.5">
                        {setupGuide.binary || "this connection"}
                      </code>{" "}
                      on the machine running the server. Complete the one-time setup below, then add
                      the instance and refresh its status.
                    </p>
                  </div>

                  {setupGuide.installCommand ? (
                    <div className="grid gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Install once
                      </span>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2">
                        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs text-foreground">
                          {setupGuide.installCommand}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() =>
                            copyToClipboard(setupGuide.installCommand!, {
                              command: setupGuide.installCommand!,
                            })
                          }
                          aria-label={`Copy install command for ${driverOption.label}`}
                        >
                          {isCopied ? (
                            <CheckIcon className="size-3.5" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                          {isCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {setupGuide.signInCommand ? (
                    <div className="grid gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Sign in once
                      </span>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2">
                        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs text-foreground">
                          {setupGuide.signInCommand}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() =>
                            copyToClipboard(setupGuide.signInCommand!, {
                              command: setupGuide.signInCommand!,
                            })
                          }
                          aria-label={`Copy sign-in command for ${driverOption.label}`}
                        >
                          {isCopied ? (
                            <CheckIcon className="size-3.5" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                          {isCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 pt-2 text-[11px] text-muted-foreground">
                    <span>{setupGuide.signInDescription}</span>
                    {setupGuide.docsUrl ? (
                      <a
                        href={setupGuide.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Provider docs
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {driverSettingsFields.length > 0 ? (
                <div className={cn("grid gap-4", wizardStep !== 2 && "hidden")}>
                  {apiKeyEnvironmentVariableForDriver(driver) ? (
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-foreground">API key</span>
                      <Input
                        className="bg-background"
                        type="password"
                        autoComplete="off"
                        value={apiKeyByDriver[driver] ?? ""}
                        onChange={(event) =>
                          setApiKeyByDriver((existing) => ({
                            ...existing,
                            [driver]: event.target.value,
                          }))
                        }
                        placeholder="Paste a key or leave blank to use the server environment"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        Stored as a sensitive instance environment value and never shown in provider
                        snapshots.
                      </span>
                    </label>
                  ) : null}
                  <ProviderSettingsForm
                    definition={driverOption}
                    value={configDraft}
                    idPrefix={`add-provider-${driver}`}
                    variant="dialog"
                    onChange={setConfigDraft}
                  />
                </div>
              ) : wizardStep === 2 ? (
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground">
                    This driver has no required configuration. You can add the instance now.
                  </p>
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <section
                  aria-labelledby="add-instance-model-runtime-title"
                  data-wizard-stage="model-runtime"
                  className="grid gap-3 rounded-xl border border-border/70 bg-card/60 p-4"
                >
                  <div className="grid gap-1">
                    <h3
                      id="add-instance-model-runtime-title"
                      className="text-sm font-medium text-foreground"
                    >
                      Model / Runtime
                    </h3>
                    <p className="text-xs leading-5 text-muted-foreground">
                      RUNE will discover this harness&apos;s models and validate the same runtime
                      configuration used by sessions after the instance is added.
                    </p>
                  </div>
                  <dl className="grid gap-2 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Harness</dt>
                      <dd className="font-medium text-foreground">{driverOption.label}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Model profile</dt>
                      <dd className="font-medium text-foreground">Harness defaults</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Runtime</dt>
                      <dd className="font-medium text-foreground">Pending verification</dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              {wizardStep === 4 ? (
                <section
                  aria-labelledby="add-instance-verify-title"
                  data-wizard-stage="verify"
                  className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10"
                >
                  <div className="grid gap-1">
                    <h3
                      id="add-instance-verify-title"
                      className="text-sm font-medium text-foreground"
                    >
                      Verify
                    </h3>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Review the instance before saving. Host authentication, model discovery, and
                      runtime readiness are checked when RUNE refreshes this instance.
                    </p>
                  </div>
                  <dl className="grid gap-2 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Harness</dt>
                      <dd className="font-medium text-foreground">{driverOption.label}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Instance ID</dt>
                      <dd className="font-mono text-foreground">{instanceId || "Not set"}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Configuration</dt>
                      <dd className="font-medium text-foreground">
                        {driverSettingsFields.length > 0
                          ? `${driverSettingsFields.length} driver setting${driverSettingsFields.length === 1 ? "" : "s"}`
                          : "Harness defaults"}
                      </dd>
                    </div>
                  </dl>
                  {instanceIdError !== null ? (
                    <p className="text-[11px] text-destructive">{instanceIdError}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Ready to save. This does not claim the host runtime is verified yet.
                    </p>
                  )}
                </section>
              ) : null}
            </AnimatedHeight>
          </div>

          <DialogFooter variant="bare">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (visibleWizardStep === 0) {
                  onOpenChange(false);
                  return;
                }
                setWizardStep((step) =>
                  Math.max(resolveInitialWizardStep(initialDriver), step - 1),
                );
              }}
            >
              {visibleWizardStep === 0 ? "Cancel" : "Back"}
            </Button>
            {visibleWizardStep < wizardSteps.length - 1 ? (
              <Button size="sm" onClick={() => navigateToStep(visibleWizardStep + 1)}>
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave}>
                Add instance
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
