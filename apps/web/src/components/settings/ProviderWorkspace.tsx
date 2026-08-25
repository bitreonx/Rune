import { useAtomValue } from "@effect/atom-react";
import {
  ActivityIcon,
  CloudIcon,
  CpuIcon,
  KeyRoundIcon,
  LaptopIcon,
  ServerIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { EnvironmentId, ServerProvider } from "@t3tools/contracts";

import { useEnvironmentSettings } from "../../hooks/useSettings";
import { buildProviderWorkspaceEntries, groupProviderWorkspaceEntries } from "../../providerWorkspace";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";

const GROUP_META = {
  subscriptions: {
    label: "IDE subscriptions",
    description: "Provider accounts installed on this environment.",
    icon: LaptopIcon,
  },
  api: {
    label: "API connections",
    description: "Bring an API key and control the endpoint and model policy.",
    icon: KeyRoundIcon,
  },
  local: {
    label: "Local runtimes",
    description: "Models served directly from this machine.",
    icon: CpuIcon,
  },
  remote: {
    label: "Remote runtimes",
    description: "Provider connections hosted on another environment.",
    icon: CloudIcon,
  },
} as const;

function providerStatusLabel(snapshot: ServerProvider | undefined): string {
  if (!snapshot) return "Not checked";
  if (snapshot.availability === "unavailable") return "Unavailable";
  if (snapshot.status === "disabled" || !snapshot.enabled) return "Disabled";
  if (snapshot.auth.status === "authenticated") return "Connected";
  if (snapshot.auth.status === "unauthenticated") return "Needs sign-in";
  return snapshot.status === "error" ? "Needs attention" : "Checking";
}

function providerStatusClass(snapshot: ServerProvider | undefined): string {
  if (!snapshot || snapshot.status === "warning" || snapshot.auth.status === "unknown") {
    return "border-border/70 bg-muted/35 text-muted-foreground";
  }
  if (snapshot.availability === "unavailable" || snapshot.status === "error") {
    return "border-destructive/25 bg-destructive/8 text-destructive";
  }
  if (snapshot.status === "disabled" || !snapshot.enabled) {
    return "border-border/70 bg-muted/35 text-muted-foreground";
  }
  return "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
}

function WorkspaceEntryCard({
  entry,
}: {
  entry: ReturnType<typeof buildProviderWorkspaceEntries>[number];
}) {
  const Icon = entry.category === "api" ? KeyRoundIcon : entry.category === "local" ? CpuIcon : ServerIcon;
  const status = providerStatusLabel(entry.snapshot);
  return (
    <div
      className="group/provider flex min-w-0 flex-col gap-3 rounded-2xl border border-border/60 bg-card/55 p-3 transition-colors hover:border-[color-mix(in_srgb,var(--rune-violet-soft)_35%,var(--border))] hover:bg-card sm:p-4"
      data-provider-workspace-entry={entry.instanceId}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProviderInstanceIcon
            driverKind={entry.driver}
            displayName={entry.displayName}
            className="size-8 rounded-xl border border-border/60 bg-background p-1.5"
            iconClassName="size-4 text-foreground/80"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-foreground">{entry.displayName}</p>
              <Icon className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{entry.scope}</p>
          </div>
        </div>
        <Badge variant="outline" size="sm" className={cn("shrink-0", providerStatusClass(entry.snapshot))}>
          {status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="rounded-xl bg-muted/35 px-2.5 py-2">
          <span className="block uppercase tracking-[0.12em] text-muted-foreground/65">Models</span>
          <span className="mt-0.5 block font-medium tabular-nums text-foreground">
            {entry.modelCount}
          </span>
        </div>
        <div className="min-w-0 rounded-xl bg-muted/35 px-2.5 py-2">
          <span className="block uppercase tracking-[0.12em] text-muted-foreground/65">Default</span>
          <span className="mt-0.5 block truncate font-medium text-foreground">
            {entry.defaultModel ?? "Choose in Models"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProviderWorkspace({ environmentId }: { readonly environmentId: EnvironmentId }) {
  const settings = useEnvironmentSettings(environmentId);
  const serverProviders =
    useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? EMPTY_SERVER_PROVIDERS;
  const entries = useMemo(
    () =>
      buildProviderWorkspaceEntries({
        configs: settings.providerInstances,
        snapshots: serverProviders,
        modelPreferences: settings.providerModelPreferences,
      }),
    [serverProviders, settings.providerInstances, settings.providerModelPreferences],
  );
  const groups = useMemo(() => groupProviderWorkspaceEntries(entries), [entries]);
  const groupKeys = Object.keys(GROUP_META) as Array<keyof typeof GROUP_META>;

  return (
    <SettingsSection
      title="Provider workspace"
      icon={<ActivityIcon className="size-4 text-[var(--rune-violet-strong)]" aria-hidden />}
      data-rune-provider-workspace
    >
      <SettingsRow
        title="One place for every model connection"
        description="See which providers are connected, where they run, and which model the composer will use. API credentials stay protected on the environment that owns them."
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {groupKeys.map((groupKey) => {
            const meta = GROUP_META[groupKey];
            const GroupIcon = meta.icon;
            const groupEntries = groups[groupKey];
            if (groupEntries.length === 0) return null;
            return (
              <div key={groupKey} className="min-w-0 space-y-2" data-provider-workspace-group={groupKey}>
                <div className="flex items-center gap-2 px-1">
                  <GroupIcon className="size-3.5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{meta.label}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
                {groupEntries.map((entry) => (
                  <WorkspaceEntryCard key={entry.instanceId} entry={entry} />
                ))}
              </div>
            );
          })}
          {entries.length === 0 ? (
            <div className="sm:col-span-2">
              <SettingsRow
                title="No provider connections yet"
                description="Add an IDE subscription or API connection below to make it available in the composer."
                className="border border-dashed border-border/70 bg-muted/15"
              />
            </div>
          ) : null}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

