import {
  CheckCircle2Icon,
  ClipboardIcon,
  ExternalLinkIcon,
  FolderTreeIcon,
  GitBranchIcon,
  Layers3Icon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";

import { formatProviderSkillDisplayName } from "@rune/client-runtime/providerSkills";

import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { SkillWorkspaceEntry } from "../../skills/skillsWorkspace.logic";

export function SkillDetailPanel({
  entry,
  onUseSkill,
}: {
  readonly entry: SkillWorkspaceEntry | null;
  readonly onUseSkill: (entry: SkillWorkspaceEntry) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!entry) {
    return (
      <aside className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/20 p-6 text-center">
        <Layers3Icon className="size-5 text-muted-foreground/70" aria-hidden />
        <p className="mt-3 text-sm font-medium text-foreground">Choose a skill to inspect it</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          RUNE keeps the provider and environment boundary visible so a skill never appears to come
          from the wrong workspace.
        </p>
      </aside>
    );
  }

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(`$${entry.name} `);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const repositoryUrl = (() => {
    if (!entry.repositoryUrl) return null;
    try {
      const url = new URL(entry.repositoryUrl);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  })();
  let repositoryLabel = "Open repository";
  try {
    if (repositoryUrl) {
      const url = new URL(repositoryUrl);
      if (url.hostname.toLowerCase().endsWith("github.com")) repositoryLabel = "Open on GitHub";
    }
  } catch {
    // Invalid metadata is treated as absent; the server remains the source of truth.
  }

  return (
    <aside
      className="sticky top-5 rounded-2xl border border-[color-mix(in_srgb,var(--rune-violet-soft)_30%,var(--border))] bg-[var(--rune-surface-raised)] p-5 shadow-[0_18px_50px_-34px_color-mix(in_srgb,var(--rune-violet-strong)_55%,transparent)]"
      data-rune-skill-detail
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--rune-violet-soft)_35%,var(--border))] bg-[var(--rune-violet-soft)]/20 text-[var(--rune-violet-strong)]">
            <SparklesIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-[-0.025em] text-foreground">
              {formatProviderSkillDisplayName(entry.skill)}
            </h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">${entry.name}</p>
          </div>
        </div>
        <Badge variant={entry.skill.enabled ? "success" : "outline"} size="sm">
          {entry.skill.enabled ? "Ready" : "Disabled"}
        </Badge>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{entry.description}</p>

      <dl className="mt-5 grid gap-2 text-xs">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2.5">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <FolderTreeIcon className="size-3.5" /> Source
          </dt>
          <dd className="max-w-[12rem] truncate font-medium text-foreground">{entry.safePath}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2.5">
          <dt className="text-muted-foreground">Provider</dt>
          <dd className="font-medium text-foreground">{entry.providerDisplayName}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2.5">
          <dt className="text-muted-foreground">Scope</dt>
          <dd className="font-medium capitalize text-foreground">{entry.scope}</dd>
        </div>
        {entry.sources.length > 1 ? (
          <div className="rounded-xl bg-muted/35 px-3 py-2.5">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <GitBranchIcon className="size-3.5" aria-hidden /> Sources
            </dt>
            <dd className="mt-2 grid gap-1.5">
              {entry.sources.map((source) => (
                <div
                  key={`${source.providerInstanceId}:${source.safePath}`}
                  className="flex min-w-0 items-center justify-between gap-3 text-[11px]"
                >
                  <span className="truncate font-medium text-foreground">
                    {source.providerDisplayName}
                  </span>
                  <span className="max-w-[11rem] truncate text-muted-foreground">
                    {source.safePath}
                  </span>
                </div>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onUseSkill(entry)}>
          <CheckCircle2Icon className="size-3.5" /> Use in composer
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void copyCommand()}>
          <ClipboardIcon className={cn("size-3.5", copied && "text-[var(--rune-violet-strong)]")} />
          {copied ? "Copied" : "Copy command"}
        </Button>
        {repositoryUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost-muted"
            render={<a href={repositoryUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon className="size-3.5" /> {repositoryLabel}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
