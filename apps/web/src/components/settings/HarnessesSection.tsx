import { useState } from "react";
import {
  BUILT_IN_HARNESS_DEFINITIONS,
  HarnessKind,
  type HarnessProfileConfig,
  ProfileId,
  type ServerProvider,
  type ServerSettings,
} from "@rune/contracts";
import {
  PlusIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { PROVIDER_ICON_BY_PROVIDER } from "../chat/providerIconUtils";
import { AddHarnessDialog } from "./AddHarnessDialog";
import { cn } from "../../lib/utils";

export function HarnessesSection(props: {
  settings: ServerSettings;
  serverProviders?: ReadonlyArray<ServerProvider>;
  onUpdateSettings: (patch: Partial<ServerSettings>) => void;
  onOpenInstance?: (instanceId: string) => void;
  onDeleteInstance?: (instanceId: string) => void;
  onRunUpdate?: (driver: string) => void;
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
          <h3 className="text-base font-semibold tracking-tight text-foreground">Coding Harnesses</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Run coding agents using their native harnesses, accounts, tools, subagents and execution environments.
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
          const instanceCount = kindProfiles.length;
          const hasProfiles = instanceCount > 0;

          // Find live status for this harness from serverProviders
          const liveProvider = props.serverProviders?.find(
            (sp) =>
              String(sp.driver) === String(kind) ||
              kindProfiles.some((p) => String(p.instanceId) === String(sp.instanceId)),
          );

          const isInstalled = liveProvider?.installed ?? false;
          const isWarning = liveProvider?.status === "warning";
          const isError = liveProvider?.status === "error";
          const authStatus = liveProvider?.auth?.status;
          const isEnabled = kindProfiles.some((p) => p.enabled);

          let statusBadge = (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
              Needs setup
            </span>
          );

          let subtitle = "CLI not configured · Click to set up";

          if (hasProfiles) {
            if (!isEnabled) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  Disabled
                </span>
              );
              subtitle = `${instanceCount} instance${instanceCount === 1 ? "" : "s"} · Disabled`;
            } else if (isError) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-destructive/10 text-destructive">
                  <span className="size-1.5 rounded-full bg-destructive" />
                  Error
                </span>
              );
              subtitle = liveProvider?.message || "Health check failed";
            } else if (authStatus === "unauthenticated") {
              statusBadge = (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Sign-in required
                </span>
              );
              subtitle = "Sign in to authenticate session";
            } else if (isWarning) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Needs attention
                </span>
              );
              subtitle = liveProvider?.message || "Configuration requires review";
            } else {
              statusBadge = (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              );
              const names = kindProfiles.map((p) => p.displayName).filter(Boolean);
              subtitle = `${instanceCount} instance${instanceCount === 1 ? "" : "s"}${names.length > 0 ? `: ${names.slice(0, 3).join(" · ")}` : ""}`;
            }
          } else if (isInstalled) {
            statusBadge = (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                CLI detected
              </span>
            );
            subtitle = "CLI installed · Click to configure";
          }

          const IconComp = PROVIDER_ICON_BY_PROVIDER[kind as any];

          return (
            <button
              key={kind}
              type="button"
              onClick={() => handleCardClick(kind, kindProfiles)}
              className={cn(
                "group flex items-center justify-between rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all",
                "hover:border-border hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring",
              )}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
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
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {statusBadge}
                <ChevronRightIcon className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </button>
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
