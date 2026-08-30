import { useState } from "react";
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
import { PlusIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "../ui/button";
import { getProviderBrandPresentation } from "../chat/providerIconUtils";
import { AddHarnessDialog } from "./AddHarnessDialog";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./StatusBadge";
import {
  instanceReadinessLabel,
  instanceReadinessStatusKey,
  resolveInstanceReadiness,
  resolveProviderStatusKey,
  type InstanceReadiness,
} from "./providerStatus";

function readinessPriority(readiness: InstanceReadiness): number {
  switch (readiness.tag) {
    case "ready":
      return 0;
    case "sign-in-required":
      return 1;
    case "needs-attention":
      return 2;
    case "discovering-models":
      return 3;
    case "missing":
      return 4;
    case "disabled":
      return 5;
  }
}

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
  onOpenInstance?: (instanceId: string, driver: ProviderDriverKind) => void;
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

  // Also group legacy provider instances if any exist.
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

  const handleCardClick = (
    targetInstanceId: ProviderInstanceId | string,
    driver: ProviderDriverKind,
  ) => {
    if (props.onOpenInstance) {
      props.onOpenInstance(String(targetInstanceId), driver);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Agent Harnesses
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coding-agent runtimes and their configured instances. Open a harness to manage its
            accounts and models.
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
            Add harness
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

          const liveProvider = props.serverProviders?.find(
            (sp) => String(sp.driver) === String(kind),
          );

          const readinesses = kindInstances.map((instance) => {
            const profile = kindProfiles.find(
              (candidate) => String(candidate.instanceId) === String(instance.instanceId),
            );
            const configuredInstance = props.settings.providerInstances?.[instance.instanceId];
            const profileInstance = profile
              ? {
                  driver: instance.driver,
                  enabled: profile.enabled,
                  ...(profile.route.modelServiceId !== "native"
                    ? { connectionId: String(profile.route.modelServiceId) }
                    : {}),
                  modelBindings: { main: profile.route.defaultModel },
                }
              : undefined;
            const liveInstance = props.serverProviders?.find(
              (provider) => String(provider.instanceId) === String(instance.instanceId),
            );
            const readinessInstance = configuredInstance ?? profileInstance;
            const services = props.settings.harnesses?.services;
            const fallbackModel = profile?.route.defaultModel;
            return resolveInstanceReadiness({
              ...(readinessInstance === undefined ? {} : { instance: readinessInstance }),
              ...(liveInstance === undefined ? {} : { provider: liveInstance }),
              ...(services === undefined ? {} : { services }),
              ...(fallbackModel === undefined ? {} : { fallbackModel }),
            });
          });
          const primaryReadiness = readinesses
            .slice()
            .sort((left, right) => readinessPriority(left) - readinessPriority(right))[0];

          const isEnabled = kindInstances.some((instance) => instance.enabled);
          const statusKey = primaryReadiness
            ? instanceReadinessStatusKey(primaryReadiness)
            : resolveProviderStatusKey(liveProvider, {
                driver: ProviderDriverKind.make(String(kind)),
                enabled: hasProfiles ? isEnabled : true,
              });
          const statusLabel = primaryReadiness
            ? instanceReadinessLabel(primaryReadiness)
            : liveProvider?.installed
              ? "Installed · Click to configure"
              : "Not configured";
          const subtitle =
            instanceCount > 0
              ? `${statusLabel} · ${instanceCount} instance${instanceCount === 1 ? "" : "s"}${!isEnabled ? " · Disabled" : ""}`
              : statusLabel;

          const IconComp = getProviderBrandPresentation(String(kind))?.icon;
          return (
            <div key={kind} className="flex min-w-0 flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCardClick(
                    kindInstances[0]?.instanceId ?? kind,
                    ProviderDriverKind.make(String(kind)),
                  )
                }
                aria-label={`Open ${def.displayName} harness settings`}
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
                  {primaryReadiness ? (
                    <StatusBadge readiness={primaryReadiness} />
                  ) : statusKey === "pending" ? (
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
