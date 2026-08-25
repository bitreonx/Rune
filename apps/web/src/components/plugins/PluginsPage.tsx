import { useAtomValue } from "@effect/atom-react";
import { FolderIcon, PuzzleIcon, UserRoundIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { EnvironmentId } from "@t3tools/contracts";

import { useEnvironments, usePrimaryEnvironmentId } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { Button } from "../ui/button";
import { PluginsPageSection } from "./PluginsPageSection";
import { buildPluginWorkspaceEntries, groupPluginsByScope } from "../../plugins/pluginsWorkspace.logic";

function EnvironmentPicker({
  environments,
  value,
  onChange,
}: {
  readonly environments: ReadonlyArray<{ environmentId: EnvironmentId; label: string }>;
  readonly value: EnvironmentId | null;
  readonly onChange: (value: EnvironmentId) => void;
}) {
  return (
    <label className="flex min-w-48 items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-3 py-2 text-xs">
      <span className="text-muted-foreground">Environment</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const next = event.currentTarget.value as EnvironmentId;
          if (next) onChange(next);
        }}
        aria-label="Plugin environment"
        className="min-w-0 flex-1 appearance-none bg-transparent text-right font-medium text-foreground outline-none"
      >
        {environments.map((environment) => (
          <option key={environment.environmentId} value={environment.environmentId}>{environment.label}</option>
        ))}
      </select>
    </label>
  );
}

export function PluginsPage() {
  const { environments, isReady } = useEnvironments();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const [environmentOverride, setEnvironmentOverride] = useState<EnvironmentId | null>(null);
  const [scopeFilter, setScopeFilter] = useState<"all" | "project" | "user">("all");
  const environmentId = environmentOverride ?? primaryEnvironmentId ?? environments[0]?.environmentId ?? null;
  const providerValue = useAtomValue(serverEnvironment.providersValueAtom(environmentId ?? ("" as EnvironmentId)));
  const providers = providerValue ?? EMPTY_SERVER_PROVIDERS;
  const entries = useMemo(
    () => (environmentId ? buildPluginWorkspaceEntries({ environmentId, providers }) : []),
    [environmentId, providers],
  );
  const groups = useMemo(() => groupPluginsByScope(entries), [entries]);
  const visibleEntries = scopeFilter === "all" ? entries : groups[scopeFilter];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--rune-surface-canvas)]" data-rune-plugins-page>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rune-violet-strong)]">
              <PuzzleIcon className="size-3.5" aria-hidden />
              RUNE / Plugins
            </div>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
              Extensions with a visible boundary.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              See plugin-backed skills by project and user scope. This inventory is provider-owned:
              RUNE never claims a plugin is installed or enabled from browser-local state.
            </p>
          </div>
          <EnvironmentPicker environments={environments} value={environmentId} onChange={setEnvironmentOverride} />
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              ["all", "All extensions", entries.length],
              ["project", "This project", groups.project.length],
              ["user", "All projects", groups.user.length],
            ] as const).map(([value, label, count]) => (
              <Button key={value} type="button" size="sm" variant={scopeFilter === value ? "secondary" : "ghost-muted"} className="rounded-full" onClick={() => setScopeFilter(value)}>
                {label}<span className="ms-1 tabular-nums text-muted-foreground">{count}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Provider registry status: <span className="font-medium text-foreground">read-only inventory</span></p>
        </div>

        {!isReady || (environmentId && providerValue === null) ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/20 p-6 text-sm text-muted-foreground" role="status">Loading provider extensions…</div>
        ) : visibleEntries.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/20 p-8 text-center">
            <PuzzleIcon className="mx-auto size-5 text-muted-foreground/70" aria-hidden />
            <p className="mt-3 text-sm font-medium text-foreground">No provider plugin manifests reported</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Plugins appear here when a connected provider exposes skills from its managed plugin root.
              Their permissions remain controlled by the provider and environment.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <PluginsPageSection title="This project" icon={<FolderIcon className="size-4" />} entries={visibleEntries.filter((entry) => entry.scope === "project")} />
            <PluginsPageSection title="All projects" icon={<UserRoundIcon className="size-4" />} entries={visibleEntries.filter((entry) => entry.scope === "user")} />
          </div>
        )}
      </div>
    </main>
  );
}
