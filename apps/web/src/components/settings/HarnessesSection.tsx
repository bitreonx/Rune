import { useState, type ReactNode } from "react";
import {
  BUILT_IN_HARNESS_DEFINITIONS,
  defaultInstanceIdForDriver,
  HarnessKind,
  ProviderDriverKind,
  ProviderInstanceId,
  resolveProviderInstanceEnabled,
  type HarnessProfileConfig,
  ProfileId,
  type ServerProvider,
  type ServerSettings,
} from "@rune/contracts";
import { PlusIcon, ChevronRightIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import {
  canOneClickUpdateProviderCandidate,
  collectProviderUpdateCandidates,
  hasOneClickUpdateProviderCandidate,
} from "../ProviderUpdateLaunchNotification.logic";
import { Button } from "../ui/button";
import { PROVIDER_ICON_BY_PROVIDER } from "../chat/providerIconUtils";
import { AddHarnessDialog } from "./AddHarnessDialog";
import { cn } from "../../lib/utils";
import { ProviderSetupNotice } from "./ProviderSetupNotice";
import { StatusBadge } from "./StatusBadge";
import { resolveProviderStatusKey } from "./providerStatus";
import { SettingResetButton } from "./settingsLayout";

interface HarnessInstanceView {
  readonly instanceId: ProviderInstanceId;
  readonly driver: ProviderDriverKind;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly isDefault: boolean;
  readonly isDirty: boolean;
}

export function HarnessesSection(props: {
  settings: ServerSettings;
  serverProviders?: ReadonlyArray<ServerProvider>;
  onUpdateSettings: (patch: Partial<ServerSettings>) => void;
  onOpenInstance?: (instanceId: string) => void;
  onRunUpdate?: (instanceId: ProviderInstanceId) => void;
  onDeleteInstance?: (instanceId: ProviderInstanceId) => void;
  onResetInstance?: (driver: ProviderDriverKind) => void;
  environmentId?: string;
  readOnly?: boolean;
}) {
  const [addHarnessOpen, setAddHarnessOpen] = useState(false);
  const [targetHarnessKind, setTargetHarnessKind] = useState<string | undefined>(undefined);

  const profiles = Object.values(props.settings.harnesses?.profiles ?? {});

  // Group profiles by harness kind
  const profilesByKind = new Map<string, HarnessProfileConfig[]>();
  for (const profile of profiles) {
    const kind = profile.harnessKind;
    const list = profilesByKind.get(kind) ?? [];
    list.push(profile);
    profilesByKind.set(kind, list);
  }

  // Also group legacy provider instances if any exist
  const legacyInstances = props.settings.providerInstances ?? {};
  for (const [id, inst] of Object.entries(legacyInstances)) {
    const driver = String(inst.driver);
    if (!profiles.some((p) => String(p.instanceId) === id)) {
      const list = profilesByKind.get(driver) ?? [];
      list.push({
        profileId: ProfileId.make(id),
        harnessKind: HarnessKind.make(driver),
        displayName: inst.displayName?.trim() || driver,
        enabled: inst.enabled ?? true,
        instanceId: id as any,
        route: {
          modelServiceId: "native",
          defaultModel: "default",
          sameModelEverywhere: true,
          roleOverrides: {},
        },
        routeVersion: 1,
      });
      profilesByKind.set(driver, list);
    }
  }

  const allHarnesses = [...BUILT_IN_HARNESS_DEFINITIONS];
  const updateCandidates = collectProviderUpdateCandidates(props.serverProviders ?? []);
  const updateCandidateByInstanceId = new Map(
    updateCandidates.map((candidate) => [String(candidate.instanceId), candidate]),
  );

  const instancesByKind = new Map<string, Map<string, HarnessInstanceView>>();
  const upsertInstance = (
    driver: ProviderDriverKind,
    instanceId: ProviderInstanceId,
    input: {
      readonly displayName?: string | undefined;
      readonly enabled?: boolean;
      readonly isDirty?: boolean;
    },
  ) => {
    const kind = String(driver);
    const instances = instancesByKind.get(kind) ?? new Map<string, HarnessInstanceView>();
    const id = String(instanceId);
    const existing = instances.get(id);
    const isDefault = id === String(defaultInstanceIdForDriver(driver));
    const defaultDisplayName = BUILT_IN_HARNESS_DEFINITIONS.find(
      (definition) => String(definition.kind) === kind,
    )?.displayName;
    instances.set(id, {
      instanceId,
      driver,
      displayName:
        input.displayName?.trim() ||
        existing?.displayName ||
        (isDefault ? (defaultDisplayName ?? kind) : id),
      enabled: input.enabled ?? existing?.enabled ?? true,
      isDefault,
      isDirty: input.isDirty ?? existing?.isDirty ?? false,
    });
    instancesByKind.set(kind, instances);
  };

  for (const profile of profiles) {
    upsertInstance(ProviderDriverKind.make(String(profile.harnessKind)), profile.instanceId, {
      displayName: profile.displayName,
      enabled: profile.enabled,
    });
  }
  for (const [rawId, instance] of Object.entries(legacyInstances)) {
    const instanceId = rawId as ProviderInstanceId;
    upsertInstance(instance.driver, instanceId, {
      displayName: instance.displayName,
      enabled: resolveProviderInstanceEnabled(instance),
      isDirty: true,
    });
  }
  for (const liveProvider of props.serverProviders ?? []) {
    upsertInstance(liveProvider.driver, liveProvider.instanceId, {
      displayName: liveProvider.displayName,
      enabled: liveProvider.enabled,
    });
  }

  const handleCardClick = (kind: string, kindProfiles: HarnessProfileConfig[]) => {
    const targetInstanceId = kindProfiles[0]?.instanceId ?? kind;
    if (props.onOpenInstance) {
      props.onOpenInstance(String(targetInstanceId));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Coding Harnesses
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            One calm place to connect harnesses, accounts, models, tools, subagents, and execution
            environments.
          </p>
        </div>
        {!props.readOnly ? (
          <Button
            size="sm"
            onClick={() => {
              setTargetHarnessKind(undefined);
              setAddHarnessOpen(true);
            }}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <PlusIcon className="size-3.5" />
            Add provider
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {allHarnesses.map((def) => {
          const kind = def.kind;
          const kindProfiles = profilesByKind.get(kind) ?? [];
          const kindInstances = [...(instancesByKind.get(kind) ?? new Map()).values()].sort(
            (left, right) =>
              Number(right.isDefault) - Number(left.isDefault) ||
              left.displayName.localeCompare(right.displayName) ||
              String(left.instanceId).localeCompare(String(right.instanceId)),
          );
          const instanceCount = Math.max(kindProfiles.length, kindInstances.length);
          const hasProfiles = instanceCount > 0;

          // Find live status for this harness from serverProviders
          const liveProvider = props.serverProviders?.find(
            (sp) =>
              String(sp.driver) === String(kind) ||
              kindProfiles.some((p) => String(p.instanceId) === String(sp.instanceId)),
          );

          const isEnabled = kindProfiles.some((p) => p.enabled);
          const statusKey = resolveProviderStatusKey(liveProvider, {
            driver: ProviderDriverKind.make(String(kind)),
            enabled: hasProfiles ? isEnabled : true,
          });
          const subtitle = hasProfiles
            ? !isEnabled
              ? `${instanceCount} connection${instanceCount === 1 ? "" : "s"} · Disabled`
              : (liveProvider?.message ??
                `${instanceCount} connection${instanceCount === 1 ? "" : "s"} configured`)
            : liveProvider?.installed
              ? "CLI installed · Click to configure"
              : "No instance yet · Click to set up";

          const IconComp = PROVIDER_ICON_BY_PROVIDER[kind as any];
          return (
            <div key={kind} className="flex min-w-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCardClick(kind, kindProfiles)}
                className={cn(
                  "group flex min-w-0 items-center justify-between rounded-xl border border-border/60 bg-card p-3.5 text-left transition-[background-color,border-color,transform] duration-200 ease-out",
                  "hover:-translate-y-px hover:border-border hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring",
                )}
              >
                <div className="flex min-w-0 items-center gap-3 pr-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-foreground ring-1 ring-border/50 transition-colors group-hover:bg-muted">
                    {IconComp ? (
                      <IconComp className="size-5" />
                    ) : (
                      <SparklesIcon className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm leading-tight text-foreground truncate">
                        {def.displayName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {statusKey === "pending" ? (
                    <span
                      className="size-1.5 rounded-full bg-muted-foreground/45"
                      aria-label="Provider status pending"
                    />
                  ) : (
                    <StatusBadge statusKey={statusKey} />
                  )}
                  <ChevronRightIcon className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </button>
              <ProviderSetupNotice
                driver={ProviderDriverKind.make(String(kind))}
                provider={liveProvider}
              />
              {kindInstances.map((instance) => {
                const instanceProvider = props.serverProviders?.find(
                  (provider) => String(provider.instanceId) === String(instance.instanceId),
                );
                const updateCandidate = updateCandidateByInstanceId.get(
                  String(instance.instanceId),
                );
                const canRunUpdate =
                  updateCandidate !== undefined &&
                  hasOneClickUpdateProviderCandidate(
                    updateCandidate,
                    props.serverProviders ?? [],
                  ) &&
                  canOneClickUpdateProviderCandidate(updateCandidate, props.serverProviders ?? []);
                const headerAction =
                  instance.isDefault && instance.isDirty && props.onResetInstance ? (
                    <SettingResetButton
                      label={`${instance.displayName} provider settings`}
                      onClick={() => props.onResetInstance?.(instance.driver)}
                    />
                  ) : null;
                return (
                  <ProviderInstanceActionDetails
                    key={String(instance.instanceId)}
                    instanceId={instance.instanceId}
                    displayName={instance.displayName}
                    enabled={instance.enabled}
                    provider={instanceProvider}
                    headerAction={headerAction}
                    onOpen={
                      props.onOpenInstance
                        ? () => props.onOpenInstance?.(String(instance.instanceId))
                        : undefined
                    }
                    onRunUpdate={
                      canRunUpdate && props.onRunUpdate
                        ? () => props.onRunUpdate?.(instance.instanceId)
                        : undefined
                    }
                    onDelete={
                      !instance.isDefault && props.onDeleteInstance
                        ? () => props.onDeleteInstance?.(instance.instanceId)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <AddHarnessDialog
        open={addHarnessOpen}
        onOpenChange={setAddHarnessOpen}
        settings={props.settings}
        initialHarnessKind={targetHarnessKind}
        onSaveProfile={(profile) => {
          const nextProfiles = {
            ...(props.settings.harnesses?.profiles ?? {}),
            [profile.profileId]: profile,
          };
          props.onUpdateSettings({
            harnesses: {
              profiles: nextProfiles,
              services: props.settings.harnesses?.services ?? {},
            },
          });
        }}
      />
    </div>
  );
}

function ProviderInstanceActionDetails(props: {
  readonly instanceId: ProviderInstanceId;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly provider: ServerProvider | undefined;
  readonly headerAction: ReactNode;
  readonly onOpen: (() => void) | undefined;
  readonly onRunUpdate: (() => void) | undefined;
  readonly onDelete: (() => void) | undefined;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2"
      aria-label={`${props.displayName} provider instance ${props.instanceId}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              props.enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          <span className="truncate text-xs font-medium text-foreground">{props.displayName}</span>
          <code className="truncate text-[10px] text-muted-foreground">
            {String(props.instanceId)}
          </code>
        </div>
        <span className="block truncate text-[11px] text-muted-foreground">
          {props.provider?.models.length ?? 0} models · {props.provider?.status ?? "not checked"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {props.headerAction}
        {props.onRunUpdate ? (
          <Button
            type="button"
            size="compact"
            variant="ghost-muted"
            onClick={props.onRunUpdate}
            aria-label={`Update ${props.displayName}`}
          >
            Update
          </Button>
        ) : null}
        {props.onDelete ? (
          <Button
            type="button"
            size="icon-micro"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={props.onDelete}
            aria-label={`Delete provider instance ${props.instanceId}`}
          >
            <Trash2Icon className="size-3" aria-hidden />
          </Button>
        ) : null}
        {props.onOpen ? (
          <Button
            type="button"
            size="icon-micro"
            variant="ghost-muted"
            onClick={props.onOpen}
            aria-label={`Open ${props.displayName} settings`}
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
