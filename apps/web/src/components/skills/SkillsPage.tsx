import { useAtomValue } from "@effect/atom-react";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleDashedIcon,
  FilterIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { EnvironmentId } from "@t3tools/contracts";

import { formatProviderSkillDisplayName } from "@t3tools/client-runtime/providerSkills";

import { cn } from "../../lib/utils";
import { setPendingRuneSkill } from "../../runeSkillHandoff";
import { useEnvironments, usePrimaryEnvironmentId } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SkillDetailPanel } from "./SkillDetailPanel";
import {
  buildSkillWorkspaceEntries,
  filterSkillWorkspaceEntries,
  type SkillWorkspaceEntry,
  type SkillWorkspaceSourceFilter,
} from "../../skills/skillsWorkspace.logic";

const SOURCE_FILTERS: ReadonlyArray<{ value: SkillWorkspaceSourceFilter; label: string }> = [
  { value: "all", label: "All skills" },
  { value: "project", label: "Project" },
  { value: "repo", label: "Repository" },
  { value: "personal", label: "Personal" },
  { value: "app", label: "App" },
  { value: "system", label: "System" },
  { value: "other", label: "Other" },
];

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
    <label className="relative flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-3 py-2 text-xs">
      <span className="sr-only">Skill environment</span>
      <span className="truncate text-muted-foreground">Environment</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const next = event.currentTarget.value as EnvironmentId;
          if (next) onChange(next);
        }}
        className="min-w-0 flex-1 appearance-none bg-transparent pe-5 text-right font-medium text-foreground outline-none"
        aria-label="Skill environment"
      >
        {environments.length === 0 ? <option value="">No environments</option> : null}
        {environments.map((environment) => (
          <option key={environment.environmentId} value={environment.environmentId}>
            {environment.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-2.5 size-3.5 text-muted-foreground" aria-hidden />
    </label>
  );
}

function SkillListRow({
  entry,
  selected,
  onSelect,
}: {
  readonly entry: SkillWorkspaceEntry;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-card/80",
        selected
          ? "border-[color-mix(in_srgb,var(--rune-violet-soft)_50%,var(--border))] bg-[var(--rune-violet-soft)]/10"
          : "border-border/60 bg-card/35",
      )}
      onClick={onSelect}
      aria-pressed={selected}
      data-rune-skill-row={entry.key}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-border/70 bg-background/65 text-[var(--rune-violet-strong)]">
        <SparklesIcon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {formatProviderSkillDisplayName(entry.skill)}
          </span>
          {entry.skill.enabled ? <CheckIcon className="size-3.5 shrink-0 text-emerald-500" aria-label="Enabled" /> : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{entry.description}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" size="sm" className="capitalize">{entry.scope}</Badge>
          <Badge variant="outline" size="sm">{entry.providerDisplayName}</Badge>
        </span>
      </span>
    </button>
  );
}

export function SkillsPage() {
  const { environments, isReady } = useEnvironments();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const navigate = useNavigate();
  const [environmentOverride, setEnvironmentOverride] = useState<EnvironmentId | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SkillWorkspaceSourceFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const environmentId = environmentOverride ?? primaryEnvironmentId ?? environments[0]?.environmentId ?? null;
  const providerValue = useAtomValue(
    serverEnvironment.providersValueAtom(environmentId ?? ("" as EnvironmentId)),
  );
  const providers = providerValue ?? EMPTY_SERVER_PROVIDERS;
  const entries = useMemo(
    () => (environmentId ? buildSkillWorkspaceEntries({ environmentId, providers }) : []),
    [environmentId, providers],
  );
  const filteredEntries = useMemo(
    () => filterSkillWorkspaceEntries(entries, query, sourceFilter),
    [entries, query, sourceFilter],
  );
  const selectedEntry = filteredEntries.find((entry) => entry.key === selectedKey) ?? filteredEntries[0] ?? null;
  const enabledCount = entries.filter((entry) => entry.skill.enabled).length;

  const useSkill = (entry: SkillWorkspaceEntry) => {
    // The composer owns the durable draft; this route only exposes the safe command
    // token and returns the user to the workspace where it can be edited before send.
    setPendingRuneSkill(entry.name);
    void navigate({ to: "/" });
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--rune-surface-canvas)]" data-rune-skills-page>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rune-violet-strong)]">
              <SparklesIcon className="size-3.5" aria-hidden />
              RUNE / Skills
            </div>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
              Tools your agents already know.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Browse the skills reported by each connected provider. Scope and source stay visible,
              so a project skill never gets mistaken for a global one.
            </p>
          </div>
          <EnvironmentPicker
            environments={environments}
            value={environmentId}
            onChange={(value) => {
              setEnvironmentOverride(value);
              setSelectedKey(null);
            }}
          />
        </header>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Discovered</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{entries.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across this environment</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Enabled</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{enabledCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Available in the composer</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Providers</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{providers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Reporting skill catalogs</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-b border-border/60 pb-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search skills" aria-label="Search skills" className="h-9 rounded-xl ps-9" />
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:ms-auto">
            <FilterIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {SOURCE_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                size="xs"
                variant={sourceFilter === filter.value ? "secondary" : "ghost-muted"}
                className="shrink-0 rounded-full px-2.5 text-[11px]"
                onClick={() => setSourceFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {!isReady || (environmentId && providerValue === null) ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/20 p-6 text-sm text-muted-foreground" role="status">
            <CircleDashedIcon className="size-4 animate-spin text-[var(--rune-violet-strong)]" aria-hidden />
            Loading skill catalogs…
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/20 p-8 text-center">
            <SparklesIcon className="mx-auto size-5 text-muted-foreground/70" aria-hidden />
            <p className="mt-3 text-sm font-medium text-foreground">
              {entries.length === 0 ? "No provider skills reported yet" : "No skills match this view"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              {entries.length === 0
                ? "Connect or refresh a provider to make its real skill catalog available here."
                : "Try another source filter or clear the search to see the rest of the catalog."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
            <section className="min-w-0 space-y-2" aria-label="Available skills">
              {filteredEntries.map((entry) => (
                <SkillListRow
                  key={entry.key}
                  entry={entry}
                  selected={selectedEntry?.key === entry.key}
                  onSelect={() => setSelectedKey(entry.key)}
                />
              ))}
            </section>
            <SkillDetailPanel entry={selectedEntry} onUseSkill={useSkill} />
          </div>
        )}
      </div>
    </main>
  );
}
