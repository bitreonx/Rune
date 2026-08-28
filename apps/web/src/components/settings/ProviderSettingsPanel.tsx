import { useAtomValue } from "@effect/atom-react";
import { connectionStatusText } from "@rune/client-runtime/connection";
import { safeErrorLogAttributes } from "@rune/client-runtime/errors";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@rune/client-runtime/state/runtime";
import {
  type EnvironmentId,
  PROVIDER_DISPLAY_NAMES,
  ProviderDriverKind,
  resolveProviderInstanceEnabled,
} from "@rune/contracts";
import {
  getBackgroundActivityPresetSettings,
  resolveServerBackgroundActivitySettings,
} from "@rune/shared/backgroundActivitySettings";
import { useNavigate } from "@tanstack/react-router";
import * as Duration from "effect/Duration";
import {
  CloudIcon,
  LaptopIcon,
  LoaderIcon,
  MonitorIcon,
  PlusIcon,
  RefreshCwIcon,
  TerminalIcon,
  BookOpenIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { openClaudeServiceSetup } from "../../claudeServiceSetupBus";
import { isDesktopLocalConnectionTarget } from "../../connection/desktopLocal";
import { isElectron } from "../../env";
import { usePrimarySessionState } from "../../environments/primary";
import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { cn } from "../../lib/utils";
import { resolveAppModelSelectionState } from "../../modelSelection";
import {
  useEnvironments,
  usePrimaryEnvironmentId,
  type EnvironmentPresentation,
} from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { useEnvironmentSessionState } from "../../state/session";
import { useAtomCommand } from "../../state/use-atom-command";
import { getRelativeTimeState } from "../../timestampFormat";
import {
  ConnectionStatusDot,
  connectionPhaseDotClassName,
  connectionPhasePingClassName,
} from "../ConnectionStatusDot";
import {
  canOneClickUpdateProviderCandidate,
  collectProviderUpdateCandidates,
  hasOneClickUpdateProviderCandidate,
  isProviderUpdateActive,
  type ProviderUpdateCandidate,
} from "../ProviderUpdateLaunchNotification.logic";
import { Button } from "../ui/button";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "../ui/number-field";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { AddProviderInstanceDialog } from "./AddProviderInstanceDialog";
import { AddServiceTile } from "./ClaudeSubscriptionCard";
import { HarnessesSection } from "./HarnessesSection";
import { ModelServicesSection } from "./ModelServicesSection";
import { DRIVER_OPTIONS, getProviderSetupGuide } from "./providerDriverMeta";
import { searchableSetting } from "./settingsSearch";
import {
  backgroundActivityOverrideSettings,
  durationToSeconds,
  normalizeIntervalSeconds,
  PROVIDER_HEALTH_INTERVAL_STEP_SECONDS,
} from "./SettingsPanels.logic";
import {
  PolicyTooltip,
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
  useRelativeTimeTick,
} from "./settingsLayout";
import {
  buildProviderEnvironmentOptions,
  classifyProviderEnvironmentAccess,
  type ProviderEnvironmentAccess,
  type ProviderOperateAccess,
  resolvePrimaryOperateAccess,
  resolveRemoteOperateAccess,
  resolveSelectedProviderEnvironmentId,
} from "./ProviderSettingsPanel.logic";

function ProviderLastChecked({ lastCheckedAt }: { lastCheckedAt: string | null }) {
  useRelativeTimeTick();
  const lastCheckedRelative = getRelativeTimeState(lastCheckedAt);

  if (lastCheckedRelative.status === "missing") {
    return null;
  }

  if (lastCheckedRelative.status === "invalid") {
    return <span className="text-[11px] text-muted-foreground/50">Checked unavailable</span>;
  }

  return (
    <span className="text-[11px] text-muted-foreground/60">
      {lastCheckedRelative.suffix ? (
        <>
          Checked <span className="font-mono tabular-nums">{lastCheckedRelative.value}</span>{" "}
          {lastCheckedRelative.suffix}
        </>
      ) : (
        <>Checked {lastCheckedRelative.value}</>
      )}
    </span>
  );
}

function providerEnvironmentIcon(environment: EnvironmentPresentation) {
  if (environment.entry.target._tag === "PrimaryConnectionTarget") return MonitorIcon;
  if (environment.entry.target._tag === "RelayConnectionTarget") return CloudIcon;
  if (environment.entry.target._tag === "SshConnectionTarget") return TerminalIcon;
  if (isDesktopLocalConnectionTarget(environment.entry.target)) return LaptopIcon;
  return CloudIcon;
}

function providerEnvironmentDetail(environment: EnvironmentPresentation): string {
  if (environment.entry.target._tag === "PrimaryConnectionTarget") return "Primary device";
  if (environment.relayManaged) return "RUNE Connect";
  if (environment.entry.target._tag === "SshConnectionTarget") return "SSH";
  if (isDesktopLocalConnectionTarget(environment.entry.target)) return "Local device";
  return environment.displayUrl ?? "Remote device";
}

function EnvironmentUnavailableRow({
  environment,
  access,
}: {
  readonly environment: EnvironmentPresentation;
  readonly access: Exclude<ProviderEnvironmentAccess, { kind: "editable" | "read-only" }>;
}) {
  const isLoading = access.kind === "loading";
  const title = isLoading
    ? "Loading provider settings"
    : access.kind === "error"
      ? "Could not connect to this device"
      : "Provider settings are unavailable";
  const description = isLoading
    ? access.reason === "permissions"
      ? "Checking what this session is allowed to change."
      : `Waiting for ${environment.label}'s configuration.`
    : connectionStatusText(environment.connection);
  // No spinner: this state can persist indefinitely for a wedged device, and a
  // continuously repainting animation would run the whole time.
  return (
    <SettingsSection title="Providers">
      <SettingsRow title={title} description={description} />
    </SettingsSection>
  );
}

export function ProviderSettingsPanel() {
  const { environments, isReady } = useEnvironments();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const options = useMemo(
    () => buildProviderEnvironmentOptions(environments, primaryEnvironmentId),
    [environments, primaryEnvironmentId],
  );
  // Raw user intent; the effective selection is re-derived every render so a
  // device that drops out of the catalog falls back without erasing the pick —
  // if it reappears (e.g. after a reconnect) the selection is restored.
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<EnvironmentId | null>(
    primaryEnvironmentId,
  );
  const effectiveEnvironmentId = resolveSelectedProviderEnvironmentId(
    options,
    selectedEnvironmentId,
    primaryEnvironmentId,
  );
  const selectedEnvironment =
    options.find((environment) => environment.environmentId === effectiveEnvironmentId) ?? null;
  const onlyPrimaryDevice =
    options.length === 1 && options[0]?.entry.target._tag === "PrimaryConnectionTarget";

  return (
    <SettingsPageContainer>
      {!onlyPrimaryDevice ? (
        <SettingsSection title="Devices">
          {options.length === 0 ? (
            // The catalog hydrates asynchronously, so an empty list before it is
            // ready means "not loaded yet", not "nothing is connected".
            <SettingsRow
              title={isReady ? "No connected devices" : "Loading devices"}
              description={
                isReady
                  ? "Connect an execution environment before configuring providers."
                  : "Reading connected execution environments."
              }
            />
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {options.map((environment) => {
                const Icon = providerEnvironmentIcon(environment);
                const selected = environment.environmentId === effectiveEnvironmentId;
                const statusText = connectionStatusText(environment.connection);
                return (
                  <button
                    key={environment.environmentId}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors sm:px-4",
                      selected
                        ? "bg-primary/8 ring-1 ring-primary/25 dark:bg-primary/12"
                        : "hover:bg-muted/40",
                    )}
                    onClick={() => setSelectedEnvironmentId(environment.environmentId)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <ConnectionStatusDot
                          tooltipText={statusText}
                          dotClassName={connectionPhaseDotClassName(environment.connection.phase)}
                          pingClassName={connectionPhasePingClassName(environment.connection.phase)}
                        />
                        <span className="truncate text-sm font-medium text-foreground">
                          {environment.label}
                        </span>
                      </span>
                      <span className="block truncate pl-[18px] text-xs text-muted-foreground">
                        {providerEnvironmentDetail(environment)} · {statusText}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </SettingsSection>
      ) : null}

      {selectedEnvironment ? (
        <SelectedEnvironmentProviderSettings
          key={selectedEnvironment.environmentId}
          environment={selectedEnvironment}
        />
      ) : null}
    </SettingsPageContainer>
  );
}

function SelectedEnvironmentProviderSettings({
  environment,
}: {
  readonly environment: EnvironmentPresentation;
}) {
  const isPrimary = environment.entry.target._tag === "PrimaryConnectionTarget";
  if (isPrimary) {
    // The desktop app owns its primary server outright; a browser session
    // checks the scopes its cookie session was granted.
    if (isElectron) {
      return <AccessGatedProviderSettings environment={environment} operateAccess="granted" />;
    }
    return <PrimarySessionGatedProviderSettings environment={environment} />;
  }
  return <RemoteSessionGatedProviderSettings environment={environment} />;
}

function PrimarySessionGatedProviderSettings({
  environment,
}: {
  readonly environment: EnvironmentPresentation;
}) {
  const primarySessionState = usePrimarySessionState();
  const operateAccess = resolvePrimaryOperateAccess({
    isPrimary: true,
    hasDesktopBridge: false,
    session: primarySessionState.data,
    isPending: primarySessionState.isPending,
    hasError: primarySessionState.error !== null,
  });
  return <AccessGatedProviderSettings environment={environment} operateAccess={operateAccess} />;
}

function RemoteSessionGatedProviderSettings({
  environment,
}: {
  readonly environment: EnvironmentPresentation;
}) {
  const sessionState = useEnvironmentSessionState(environment.environmentId);
  const operateAccess = resolveRemoteOperateAccess({
    session: sessionState.data,
    isPending: sessionState.isPending,
    hasError: sessionState.hasError,
  });
  return <AccessGatedProviderSettings environment={environment} operateAccess={operateAccess} />;
}

function AccessGatedProviderSettings({
  environment,
  operateAccess,
}: {
  readonly environment: EnvironmentPresentation;
  readonly operateAccess: ProviderOperateAccess;
}) {
  const access = classifyProviderEnvironmentAccess({
    connectionPhase: environment.connection.phase,
    hasServerConfig: environment.serverConfig !== null,
    operateAccess,
  });
  if (access.kind !== "editable" && access.kind !== "read-only") {
    return <EnvironmentUnavailableRow environment={environment} access={access} />;
  }
  return (
    <EnvironmentProviderSettings
      environmentId={environment.environmentId}
      environmentLabel={environment.label}
      readOnly={access.kind === "read-only"}
    />
  );
}

export function EnvironmentProviderSettings({
  environmentId,
  environmentLabel,
  readOnly = false,
}: {
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  /**
   * Render the full provider layout, greyed out and inert, when this session's
   * credential lacks `orchestration:operate` on the environment. Showing the
   * real configuration keeps the view honest; disabling interaction keeps
   * every one of its writes from being offered and then rejected.
   */
  readonly readOnly?: boolean;
}) {
  const settings = useEnvironmentSettings(environmentId);
  const updateSettings = useUpdateEnvironmentSettings(environmentId);
  const navigate = useNavigate();
  const serverProviders =
    useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? EMPTY_SERVER_PROVIDERS;
  const refreshServerProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });
  const updateProvider = useAtomCommand(serverEnvironment.updateProvider, {
    reportFailure: false,
  });
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);
  const [isAddInstanceDialogOpen, setIsAddInstanceDialogOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [updatingProviderDrivers, setUpdatingProviderDrivers] = useState<
    ReadonlySet<ProviderDriverKind>
  >(() => new Set());
  const refreshingRef = useRef(false);
  const updatingDriversRef = useRef<Set<ProviderDriverKind>>(new Set());

  const providerUpdateCandidates = useMemo(
    () => collectProviderUpdateCandidates(serverProviders),
    [serverProviders],
  );
  const providerUpdateCandidateByInstanceId = useMemo(
    () => new Map(providerUpdateCandidates.map((candidate) => [candidate.instanceId, candidate])),
    [providerUpdateCandidates],
  );
  const textGenerationModelSelection = resolveAppModelSelectionState(settings, serverProviders);
  const textGenInstanceId = textGenerationModelSelection.instanceId;
  const resolvedBackgroundActivity = resolveServerBackgroundActivitySettings(settings);
  const providerHealthPreset = getBackgroundActivityPresetSettings(
    resolvedBackgroundActivity.profile,
  ).providerHealthRefreshInterval;
  const providerHealthRefreshIntervalSeconds = durationToSeconds(
    resolvedBackgroundActivity.providerHealthRefreshInterval,
  );
  const defaultProviderHealthRefreshIntervalSeconds = durationToSeconds(providerHealthPreset);
  const lastCheckedAt =
    serverProviders.length > 0
      ? serverProviders.reduce(
          (latest, provider) => (provider.checkedAt > latest ? provider.checkedAt : latest),
          serverProviders[0]!.checkedAt,
        )
      : null;

  const refreshProviders = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshingProviders(true);
    void (async () => {
      const result = await refreshServerProviders({
        environmentId,
        input: {},
      });
      refreshingRef.current = false;
      setIsRefreshingProviders(false);
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        console.warn("Failed to refresh providers", {
          operation: "refresh-providers",
          environmentId,
          ...safeErrorLogAttributes(squashAtomCommandFailure(result)),
        });
      }
    })();
  }, [environmentId, refreshServerProviders]);

  const runProviderUpdate = useCallback(
    async (candidate: ProviderUpdateCandidate) => {
      // Ref-based re-entry guard, mirroring refreshProviders: a state updater
      // may run after this function returns, so it cannot gate the dispatch.
      if (updatingDriversRef.current.has(candidate.driver)) {
        return;
      }
      updatingDriversRef.current.add(candidate.driver);
      setUpdatingProviderDrivers((previous) => new Set(previous).add(candidate.driver));

      const result = await updateProvider({
        environmentId,
        input: {
          provider: candidate.driver,
          instanceId: candidate.instanceId,
        },
      });
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        const error = squashAtomCommandFailure(result);
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: `Could not update ${PROVIDER_DISPLAY_NAMES[candidate.driver] ?? candidate.driver}`,
            description:
              error instanceof Error
                ? error.message
                : "The provider update command could not be started.",
          }),
        );
      }
      updatingDriversRef.current.delete(candidate.driver);
      setUpdatingProviderDrivers((previous) => {
        if (!previous.has(candidate.driver)) {
          return previous;
        }
        const next = new Set(previous);
        next.delete(candidate.driver);
        return next;
      });
    },
    [environmentId, updateProvider],
  );


  return (
    <>
      <SettingsSection
        {...searchableSetting("providers")}
        headerAction={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost-muted"
              className="gap-1.5"
              onClick={() => setIsDocsOpen(true)}
            >
              <BookOpenIcon className="size-3.5" />
              <span className="hidden sm:inline">Sign-in guide</span>
              <span className="sm:hidden">Docs</span>
            </Button>
            <ProviderLastChecked lastCheckedAt={lastCheckedAt} />
            {!readOnly ? (
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="icon-micro"
                        variant="ghost-muted"
                        onClick={() => setIsAddInstanceDialogOpen(true)}
                        aria-label="Add provider instance"
                      >
                        <PlusIcon className="size-3" />
                      </Button>
                    }
                  />
                  <TooltipPopup side="top">Add provider instance</TooltipPopup>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="icon-micro"
                        variant="ghost-muted"
                        disabled={isRefreshingProviders}
                        onClick={() => void refreshProviders()}
                        aria-label="Refresh provider status"
                      >
                        {isRefreshingProviders ? (
                          <LoaderIcon className="size-3 animate-spin" />
                        ) : (
                          <RefreshCwIcon className="size-3" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipPopup side="top">Refresh provider status</TooltipPopup>
                </Tooltip>
              </>
            ) : null}
          </div>
        }
      >
        {readOnly ? (
          <SettingsRow
            title="Limited permissions"
            description={`This session can view ${environmentLabel}'s providers, but its credential does not allow changing their configuration.`}
          />
        ) : null}
        <div
          // `inert` blocks focus and interaction in one attribute, so the
          // read-only view stays byte-for-byte the editable layout without
          // threading a disabled flag through every control.
          inert={readOnly}
          aria-disabled={readOnly || undefined}
          className={
            readOnly ? "flex flex-col gap-6 opacity-50 select-none" : "flex flex-col gap-6"
          }
        >
          <nav
            aria-label="Provider settings sections"
            className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur sm:px-4"
          >
            {[
              ["provider-harnesses", "Harnesses"],
              ["provider-model-services", "Model Services"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </a>
            ))}
          </nav>

          <div id="provider-harnesses" className="scroll-mt-14">
            <HarnessesSection
              settings={settings}
              serverProviders={serverProviders}
              onUpdateSettings={updateSettings}
              onOpenInstance={(instanceId) =>
                void navigate({
                  to: "/settings/providers/$instanceId",
                  params: { instanceId },
                  search: { env: String(environmentId) },
                })
              }
              onRunUpdate={(driver) => {
                const candidate = Array.from(providerUpdateCandidateByInstanceId.values()).find(
                  (c) => c.driver === driver,
                );
                if (candidate) void runProviderUpdate(candidate);
              }}
              environmentId={String(environmentId)}
              readOnly={readOnly}
            />
          </div>

          <div id="provider-model-services" className="scroll-mt-14">
            <ModelServicesSection settings={settings} onUpdateSettings={updateSettings} />
          </div>

          <div className="border-t pt-4">
            <SettingsRow
              title={
                <span className="inline-flex items-center gap-1.5">
                  Health check interval
                  <PolicyTooltip>
                    This interval is configured here, then the shared Background activity policy
                    decides whether provider probes may run when the timer fires. Custom intervals
                    appear as Advanced in General settings.
                  </PolicyTooltip>
                </span>
              }
              description="Refresh provider availability, versions, auth state, and model metadata in the background. Set this to 0 seconds to rely on manual refreshes."
              resetAction={
                providerHealthRefreshIntervalSeconds !==
                defaultProviderHealthRefreshIntervalSeconds ? (
                  <SettingResetButton
                    label="provider health check interval"
                    onClick={() =>
                      updateSettings(
                        backgroundActivityOverrideSettings(
                          settings.backgroundActivity,
                          resolvedBackgroundActivity,
                          {
                            providerHealthRefreshInterval: undefined,
                          },
                        ),
                      )
                    }
                  />
                ) : null
              }
              control={
                <div className="flex shrink-0 items-center gap-2">
                  <NumberField
                    value={providerHealthRefreshIntervalSeconds}
                    min={0}
                    step={PROVIDER_HEALTH_INTERVAL_STEP_SECONDS}
                    size="sm"
                    className="w-32"
                    onValueChange={(value) =>
                      updateSettings(
                        backgroundActivityOverrideSettings(
                          settings.backgroundActivity,
                          resolvedBackgroundActivity,
                          {
                            providerHealthRefreshInterval: Duration.seconds(
                              normalizeIntervalSeconds(value),
                            ),
                          },
                        ),
                      )
                    }
                  >
                    <NumberFieldGroup>
                      <NumberFieldDecrement aria-label="Decrease provider health check interval" />
                      <NumberFieldInput aria-label="Provider health check interval in seconds" />
                      <NumberFieldIncrement aria-label="Increase provider health check interval" />
                    </NumberFieldGroup>
                  </NumberField>
                  <span className="text-xs text-muted-foreground">seconds</span>
                </div>
              }
            />
          </div>
        </div>
      </SettingsSection>

      <Dialog open={isDocsOpen} onOpenChange={setIsDocsOpen}>
        <DialogPopup className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Provider sign-in guide</DialogTitle>
            <DialogDescription>
              Each card is one independent account or service. Add multiple instances when you use
              more than one account for the same provider.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4 text-sm">
            <div className="rounded-lg border border-warning/30 bg-warning/8 p-3">
              <p className="font-medium text-foreground">What “Needs attention” means</p>
              <p className="mt-1 text-muted-foreground">
                The provider was found, but it is not ready to use. Expand its card to see the exact
                reason. If it says “Sign in required”, authenticate that specific instance.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium">1. Add an account</p>
                <p className="text-muted-foreground">
                  Choose Add provider instance, select a provider, and give the account a
                  recognizable name.
                </p>
              </div>
              <div>
                <p className="font-medium">2. Finish setup on the host device</p>
                <p className="text-muted-foreground">
                  RUNE runs provider CLIs on the machine hosting the server. The add-instance wizard
                  gives you copyable commands and the exact provider docs for each one.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DRIVER_OPTIONS.map((option) => {
                  const guide = getProviderSetupGuide(option.value);
                  if (!guide) return null;
                  const IconComponent = option.icon;
                  return (
                    <div
                      key={option.value}
                      className="grid gap-1 rounded-lg border border-border/60 bg-muted/20 p-2.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <IconComponent className="size-3.5 shrink-0" aria-hidden />
                        {option.label}
                      </div>
                      {guide.installCommand ? (
                        <code className="truncate text-[10px] text-muted-foreground">
                          Install: {guide.installCommand}
                        </code>
                      ) : null}
                      {guide.signInCommand ? (
                        <code className="truncate text-[10px] text-muted-foreground">
                          Sign in: {guide.signInCommand}
                        </code>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          API key in instance settings
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="font-medium">3. Verify and choose it</p>
                <p className="text-muted-foreground">
                  Refresh status. The account and its customized models then appear as a separate
                  option in the chat model chooser.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: model IDs such as <code className="rounded bg-muted px-1">stealth/ox-alpha</code>{" "}
              can be added in the Models section of the selected provider instance.
            </p>
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      {isAddInstanceDialogOpen ? (
        <AddProviderInstanceDialog
          open
          environmentId={environmentId}
          environmentLabel={environmentLabel}
          onOpenChange={setIsAddInstanceDialogOpen}
        />
      ) : null}
    </>
  );
}
