"use client";

import {
  ArrowUpCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  LoaderIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import { useState, type ReactNode } from "react";
import {
  isProviderDriverKind,
  resolveProviderInstanceEnabled,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
  type ProviderInstanceId,
  type ProviderDriverKind,
  type ServerProvider,
  type ServerProviderModel,
} from "@rune/contracts";

import { cn } from "../../lib/utils";
import { OPENROUTER_LOGO_URL, resolveClaudeInstanceService } from "../../claudeServices";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { normalizeProviderAccentColor } from "../../providerInstances";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Collapsible, CollapsibleContent } from "../ui/collapsible";
import { DraftInput } from "../ui/draft-input";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { DriverOption } from "./providerDriverMeta";
import { StatusBadge } from "./StatusBadge";
import { ProviderEnvironmentSection } from "./ProviderEnvironmentSection";
import { ProviderSettingsForm } from "./ProviderSettingsForm";
import { ProviderModelsSection } from "./ProviderModelsSection";
import {
  CLAUDE_SERVICE_ENVIRONMENT_VARIABLE_NAMES,
  ClaudeServiceSettings,
} from "./ClaudeServiceSettings";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { ProviderAccentColorPicker } from "./ProviderAccentColorPicker";
import { RedactedSensitiveText } from "./RedactedSensitiveText";
import {
  getProviderVersionAdvisoryPresentation,
  PROVIDER_STATUS_STYLES,
  getProviderSummary,
  getProviderVersionLabel,
  type ProviderStatusKey,
  resolveProviderStatusKey,
} from "./providerStatus";

/**
 * Read a string[] at `key` from the opaque config blob, filtering out
 * non-string entries. Used for `customModels`, which is always typed as
 * `string[]` by the concrete driver schemas but arrives here as
 * `Schema.Unknown`.
 */
export function readConfigStringArray(config: unknown, key: string): ReadonlyArray<string> {
  if (config === null || typeof config !== "object") return [];
  const value = (config as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Set `key` to an arbitrary value on the opaque config blob. Unlike
 * provider settings field updates, does not drop empty-looking values — the
 * caller is responsible for deciding whether an empty array / empty
 * object should be stored explicitly (e.g. `customModels: []` is a
 * meaningful "user cleared their custom list" state distinct from
 * "driver default").
 */
export function nextConfigBlobWithValue(
  config: unknown,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    config !== null && typeof config === "object" ? { ...(config as Record<string, unknown>) } : {};
  base[key] = value;
  return base;
}

export function deriveProviderModelsForDisplay(input: {
  readonly liveModels: ReadonlyArray<ServerProviderModel> | undefined;
  readonly customModels: ReadonlyArray<string>;
}): ReadonlyArray<ServerProviderModel> {
  const liveCustomModelsBySlug = new Map(
    Arr.filterMap(input.liveModels ?? [], (model) =>
      model.isCustom ? Result.succeed([model.slug, model] as const) : Result.failVoid,
    ),
  );
  const serverModels = input.liveModels?.filter((model) => !model.isCustom) ?? [];
  const customModels = input.customModels.map(
    (slug) =>
      liveCustomModelsBySlug.get(slug) ?? {
        slug,
        name: slug,
        isCustom: true,
        capabilities: null,
      },
  );
  return [...serverModels, ...customModels];
}

function ProviderAuthEmail(props: {
  readonly email: string | undefined;
  readonly prefix?: string;
  readonly separator?: boolean;
}) {
  const trimmed = props.email?.trim();
  if (!trimmed) return null;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {props.separator ? <span aria-hidden>·</span> : null}
      {props.prefix ? <span className="text-muted-foreground/80">{props.prefix}</span> : null}
      <RedactedSensitiveText
        value={trimmed}
        ariaLabel="Toggle account email visibility"
        revealTooltip="Click to reveal email"
        hideTooltip="Click to hide email"
      />
    </span>
  );
}

interface ProviderInstanceCardProps {
  readonly instanceId: ProviderInstanceId;
  readonly instance: ProviderInstanceConfig;
  readonly driverOption: DriverOption | undefined;
  readonly liveProvider: ServerProvider | undefined;
  readonly isExpanded: boolean;
  readonly onExpandedChange: (open: boolean) => void;
  /** Navigate to the dedicated instance editor instead of expanding inline. */
  readonly onOpen?: (() => void) | undefined;
  readonly onUpdate: (nextInstance: ProviderInstanceConfig) => void;
  /**
   * Pass `undefined` to hide the delete button entirely. Built-in default
   * instance slots use `undefined` — they can't be deleted without losing
   * the slot, and their "reset to defaults" affordance lives on an outer
   * reset button instead. Explicit `| undefined` in the type accommodates
   * `exactOptionalPropertyTypes: true`, where an absent key and
   * `{ onDelete: undefined }` are treated as distinct shapes.
   */
  readonly onDelete?: (() => void) | undefined;
  /**
   * Optional outer reset button rendered next to the driver icon. Built-in
   * default slots supply a reset-to-factory control here; custom instances
   * omit it.
   */
  readonly headerAction?: ReactNode | undefined;
  readonly hiddenModels: ReadonlyArray<string>;
  readonly favoriteModels: ReadonlyArray<string>;
  readonly modelOrder: ReadonlyArray<string>;
  readonly onHiddenModelsChange: (next: ReadonlyArray<string>) => void;
  readonly onFavoriteModelsChange: (next: ReadonlyArray<string>) => void;
  readonly onModelOrderChange: (next: ReadonlyArray<string>) => void;
  readonly onRunUpdate?: (() => void) | undefined;
  readonly isUpdating?: boolean | undefined;
}

/**
 * A single configured provider-instance row in the Providers settings
 * section. Used for every row — both the built-in default instance for a
 * driver (rendered with `onDelete` omitted) and user-authored custom
 * instances (`onDelete` supplied). The only UI difference between the two
 * is whether the trash button is visible; every other field (display
 * name, config fields, models) behaves identically.
 *
 * Behavior notes:
 *   - `liveProvider` is matched by the caller via `instanceId`; when no
 *     match is available (e.g. the server hasn't probed yet, or the
 *     driver is not shipped by the current build) the card still renders
 *     with a neutral "checking" summary.
 *   - Unknown drivers (`driverOption === undefined`) get a read-only
 *     notice instead of editable fields, so fork instances round-trip
 *     without accidentally destroying their config.
 *   - The enabled Switch writes to the envelope's `instance.enabled`
 *     field, which is the single enabled flag: the server folds any legacy
 *     driver-specific `config.enabled` into the envelope on load and both
 *     sides resolve through `resolveProviderInstanceEnabled` (an explicit
 *     false wins, then envelope, then config, then the driver default).
 */
export function ProviderInstanceCard({
  instanceId,
  instance,
  driverOption,
  liveProvider,
  isExpanded,
  onExpandedChange,
  onOpen,
  onUpdate,
  onDelete,
  headerAction,
  hiddenModels,
  favoriteModels,
  modelOrder,
  onHiddenModelsChange,
  onFavoriteModelsChange,
  onModelOrderChange,
  onRunUpdate,
  isUpdating = false,
}: ProviderInstanceCardProps) {
  const enabled = resolveProviderInstanceEnabled(instance);
  const statusKey: ProviderStatusKey = resolveProviderStatusKey(liveProvider, {
    driver: instance.driver,
    enabled,
  });
  const statusStyle = PROVIDER_STATUS_STYLES[statusKey];
  const rawSummary = getProviderSummary(liveProvider);
  const authEmail = liveProvider?.auth.email;
  const hasAuthenticatedEmail =
    liveProvider?.auth.status === "authenticated" && Boolean(authEmail?.trim());
  const authenticatedDetail = hasAuthenticatedEmail
    ? (liveProvider?.auth.label ?? liveProvider?.auth.type ?? null)
    : null;
  const summary = rawSummary;
  const versionLabel = getProviderVersionLabel(liveProvider?.version);
  const versionAdvisory = getProviderVersionAdvisoryPresentation(liveProvider?.versionAdvisory);
  const updateCommand = versionAdvisory?.updateCommand ?? null;
  const FallbackIconComponent = driverOption?.icon;
  const displayName =
    instance.displayName?.trim() || driverOption?.label || String(instance.driver);
  const accentColor = normalizeProviderAccentColor(instance.accentColor);
  const serviceBadge = resolveClaudeInstanceService(instance);
  const { copyToClipboard } = useCopyToClipboard<{ providerName: string }>({
    onCopy: ({ providerName }) => {
      toastManager.add({
        type: "success",
        title: `${providerName} update command copied`,
        description: "Run it in a terminal when you are ready to update.",
      });
    },
    onError: (error, { providerName }) => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: `Could not copy ${providerName} update command`,
          description: error.message,
        }),
      );
    },
  });

  // Narrow `instance.driver` for callers that key on the closed
  // `ProviderDriverKind` union (e.g. `normalizeModelSlug`'s alias table). Custom
  // fork drivers pass through as `null` and those callers fall back to
  // verbatim behaviour.
  const driverKind: ProviderDriverKind | null = isProviderDriverKind(instance.driver)
    ? instance.driver
    : null;

  const customModels = readConfigStringArray(instance.config, "customModels");
  // Server-returned models may lag behind settings writes. Treat probe
  // models as the source for built-ins only; custom rows come directly
  // from the current instance config so add/remove reflects immediately.
  const modelsForDisplay = deriveProviderModelsForDisplay({
    liveModels: liveProvider?.models,
    customModels,
  });

  const updateDisplayName = (value: string) => {
    const trimmed = value.trim();
    const { displayName: _omit, ...rest } = instance;
    onUpdate(
      trimmed.length > 0
        ? ({ ...rest, displayName: trimmed } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateEnabled = (value: boolean) => {
    onUpdate({ ...instance, enabled: value });
  };

  const updateAccentColor = (value: string) => {
    const normalized = normalizeProviderAccentColor(value);
    const { accentColor: _omit, ...rest } = instance;
    onUpdate(
      normalized
        ? ({ ...rest, accentColor: normalized } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateConfig = (nextConfig: Record<string, unknown> | undefined) => {
    const { config: _omit, ...rest } = instance;
    onUpdate(
      nextConfig !== undefined
        ? ({ ...rest, config: nextConfig } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const updateCustomModels = (next: ReadonlyArray<string>) => {
    const nextConfig = nextConfigBlobWithValue(instance.config, "customModels", [...next]);
    const { config: _omit, ...rest } = instance;
    onUpdate({ ...rest, config: nextConfig } as ProviderInstanceConfig);
  };

  const updateEnvironment = (environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>) => {
    const cleaned = environment.filter((variable) => variable.name.trim().length > 0);
    const { environment: _omit, ...rest } = instance;
    onUpdate(
      cleaned.length > 0
        ? ({ ...rest, environment: cleaned } as ProviderInstanceConfig)
        : (rest as ProviderInstanceConfig),
    );
  };

  const isClaudeProvider = String(driverKind) === "claudeAgent";

  const titleIconNode = driverKind ? (
    <ProviderInstanceIcon
      driverKind={driverKind}
      displayName={displayName}
      accentColor={accentColor}
      showBadge={Boolean(accentColor) || serviceBadge === "openrouter"}
      badgeContent={serviceBadge === "openrouter" ? "logo" : "initials"}
      {...(serviceBadge === "openrouter" ? { badgeLogoUrl: OPENROUTER_LOGO_URL } : {})}
      statusDotClassName={statusStyle.dot}
      indicatorBackground="var(--card)"
      className="size-5"
      iconClassName="size-4 text-foreground/80"
      badgeClassName="right-[-0.125rem] bottom-[-0.125rem] h-3 min-w-3 px-0.5 text-[7px]"
    />
  ) : FallbackIconComponent ? (
    <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
      <FallbackIconComponent className="size-4 text-foreground/80" aria-hidden />
      <span
        className={cn(
          "pointer-events-none absolute -left-0.5 -top-0.5 size-2 rounded-full ring-2 ring-card",
          statusStyle.dot,
        )}
        aria-hidden
      />
    </span>
  ) : (
    <span className={cn("size-2 shrink-0 rounded-full", statusStyle.dot)} />
  );

  const titleHeadNode = (
    <>
      {titleIconNode}
      <h3 className="truncate text-sm font-medium tracking-[-0.005em] text-foreground">
        {displayName}
      </h3>
      {String(instanceId) !== String(instance.driver) ? (
        <code className="truncate rounded bg-muted/60 px-1 py-0.5 text-[10px] text-muted-foreground">
          {instanceId}
        </code>
      ) : null}
      {driverOption?.badgeLabel ? (
        <Badge variant="warning" size="sm" className="shrink-0">
          {driverOption.badgeLabel}
        </Badge>
      ) : null}
    </>
  );

  const titleTailNode = (
    <>
      {headerAction ? (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          {headerAction}
        </span>
      ) : null}
      {onDelete ? (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-micro"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                  aria-label={`Delete provider instance ${instanceId}`}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              }
            />
            <TooltipPopup side="top">Delete instance</TooltipPopup>
          </Tooltip>
        </span>
      ) : null}
    </>
  );

  const authRowNode = (
    <p
      className="flex min-w-0 flex-wrap items-center gap-x-1 text-[13px] leading-[1.45] text-muted-foreground/80"
      aria-live="polite"
    >
      {hasAuthenticatedEmail ? (
        <>
          <span>Authenticated as</span>
          <ProviderAuthEmail email={authEmail} />
          {authenticatedDetail ? <span>· {authenticatedDetail}</span> : null}
        </>
      ) : (
        <>
          <span>{summary.headline}</span>
          <ProviderAuthEmail email={authEmail} separator prefix="Email" />
        </>
      )}
      {summary.detail ? <span>- {summary.detail}</span> : null}
    </p>
  );

  const versionCodeNode = versionLabel ? (
    <code className="text-xs text-muted-foreground">{versionLabel}</code>
  ) : null;

  return (
    <div className="h-full rounded-2xl border border-border/60 bg-card transition-colors hover:border-border hover:bg-muted/20">
      <div
        className="cursor-pointer px-3 py-3 sm:px-4"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, input, textarea, select, a, [role='switch']")) return;
          if (onOpen) {
            onOpen();
          } else {
            onExpandedChange(!isExpanded);
          }
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {titleHeadNode}
              {versionCodeNode}
              {versionAdvisory ? (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className={cn(
                          "size-5 rounded-sm p-0",
                          versionAdvisory.emphasis === "strong"
                            ? "text-warning hover:text-warning"
                            : "text-update-foreground hover:text-update-foreground",
                        )}
                        aria-label="Update available — view details"
                      >
                        <ArrowUpCircleIcon className="size-3.5" />
                      </Button>
                    }
                  />
                  <PopoverPopup
                    side="bottom"
                    align="start"
                    className="w-[min(21rem,calc(100vw-1.5rem))] [--popup-width:min(21rem,calc(100vw-1.5rem))]"
                  >
                    <div className="grid min-w-0 gap-3">
                      <div className="grid gap-0.5">
                        <p className="text-[13px] font-semibold leading-tight text-foreground">
                          Update available
                        </p>
                        <p
                          className={cn(
                            "text-xs leading-snug",
                            versionAdvisory.emphasis === "strong"
                              ? "text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {versionAdvisory.detail}
                        </p>
                      </div>
                      {onRunUpdate ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="default"
                          className="w-full"
                          disabled={isUpdating}
                          onClick={onRunUpdate}
                        >
                          {isUpdating ? <LoaderIcon className="animate-spin" /> : <DownloadIcon />}
                          {isUpdating ? "Updating" : "Update now"}
                        </Button>
                      ) : null}
                      {onRunUpdate && updateCommand ? (
                        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <span aria-hidden className="h-px flex-1 bg-border" />
                          or, update manually using
                          <span aria-hidden className="h-px flex-1 bg-border" />
                        </div>
                      ) : null}
                      {updateCommand ? (
                        <div className="flex min-w-0 items-center gap-1 rounded-md border border-border/70 bg-muted/40 py-0.5 pr-0.5 pl-2">
                          <ScrollArea scrollFade className="h-8 min-w-0 flex-1 rounded-none">
                            <code className="flex h-full w-max items-center whitespace-nowrap pr-3 font-mono text-[11px] text-foreground">
                              {updateCommand}
                            </code>
                          </ScrollArea>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  className="size-6 shrink-0 rounded-sm p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() =>
                                    copyToClipboard(updateCommand, {
                                      providerName: displayName,
                                    })
                                  }
                                  aria-label="Copy update command"
                                >
                                  <CopyIcon className="size-3" />
                                </Button>
                              }
                            />
                            <TooltipPopup side="top">Copy command</TooltipPopup>
                          </Tooltip>
                        </div>
                      ) : null}
                    </div>
                  </PopoverPopup>
                </Popover>
              ) : null}
              {titleTailNode}
            </div>
            {authRowNode}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge statusKey={statusKey} />
              {liveProvider?.checkedAt ? (
                <span className="text-[11px] text-muted-foreground/60">
                  Checked{" "}
                  {new Date(liveProvider.checkedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
            <Button
              size="compact"
              variant="ghost-muted"
              onClick={() => (onOpen ? onOpen() : onExpandedChange(!isExpanded))}
              aria-label={onOpen ? `Open ${displayName} settings` : `Toggle ${displayName} details`}
            >
              {onOpen ? (
                <ChevronRightIcon className="size-3.5" />
              ) : (
                <ChevronDownIcon
                  className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")}
                />
              )}
            </Button>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => updateEnabled(Boolean(checked))}
              aria-label={`Enable ${displayName}`}
            />
          </div>
        </div>
      </div>

      <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
        <CollapsibleContent>
          <div className="space-y-5 px-3 pb-4 pt-2 sm:px-4">
            <div>
              <label htmlFor={`provider-instance-${instanceId}-display-name`} className="block">
                <span className="text-xs font-medium text-foreground">Display name</span>
                <DraftInput
                  id={`provider-instance-${instanceId}-display-name`}
                  className="mt-1.5"
                  value={instance.displayName ?? ""}
                  onCommit={updateDisplayName}
                  placeholder={driverOption?.label ?? "Instance label"}
                  spellCheck={false}
                  aria-describedby={`provider-instance-${instanceId}-display-name-help`}
                />
                <span
                  id={`provider-instance-${instanceId}-display-name-help`}
                  className="mt-1 block text-xs text-muted-foreground"
                >
                  Optional label shown in the provider list.
                </span>
              </label>
            </div>

            <div>
              <ProviderAccentColorPicker
                displayName={displayName}
                value={accentColor}
                onCommit={updateAccentColor}
                commitDelayMs={120}
                description="Used to distinguish this instance in picker rails and model lists."
              />
            </div>

            {isClaudeProvider ? (
              <ClaudeServiceSettings
                idPrefix={`provider-instance-${instanceId}-claude-service`}
                environment={instance.environment ?? []}
                onChange={updateEnvironment}
              />
            ) : null}

            <div>
              <ProviderEnvironmentSection
                environment={instance.environment ?? []}
                onChange={updateEnvironment}
                {...(isClaudeProvider
                  ? {
                      hiddenVariableNames: CLAUDE_SERVICE_ENVIRONMENT_VARIABLE_NAMES,
                      title: "Advanced environment variables",
                      description:
                        "Optional variables passed to Claude Code. Service URL and credentials are managed above.",
                    }
                  : {})}
              />
            </div>

            {driverOption ? (
              <ProviderSettingsForm
                definition={driverOption}
                value={instance.config}
                idPrefix={`provider-instance-${instanceId}`}
                variant="card"
                onChange={updateConfig}
              />
            ) : null}

            {driverOption !== undefined ? (
              <ProviderModelsSection
                instanceId={instanceId}
                driverKind={driverKind}
                models={modelsForDisplay}
                customModels={customModels}
                hiddenModels={hiddenModels}
                favoriteModels={favoriteModels}
                modelOrder={modelOrder}
                onChange={updateCustomModels}
                onHiddenModelsChange={onHiddenModelsChange}
                onFavoriteModelsChange={onFavoriteModelsChange}
                onModelOrderChange={onModelOrderChange}
              />
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">
                  This instance uses a driver (
                  <code className="text-foreground">{String(instance.driver)}</code>) that is not
                  shipped with the current build. Configuration values are preserved but cannot be
                  edited from this surface.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
