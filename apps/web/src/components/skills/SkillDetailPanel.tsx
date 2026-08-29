import {
  CheckCircle2Icon,
  ClipboardIcon,
  DownloadIcon,
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
import {
  MARKETPLACE_COMPATIBILITY_LABEL,
  marketplaceSourceMetadata,
  type SkillMarketplaceView,
} from "../../skills/marketplaceRegistry";
import { getProviderOrServiceIcon } from "../chat/providerIconUtils";

export function SkillDetailPanel({
  entry,
  isInstalling = false,
  marketplaceEntry,
  onInstallMarketplace,
  onUseSkill,
}: {
  readonly entry: SkillWorkspaceEntry | null;
  readonly marketplaceEntry?: SkillMarketplaceView | null;
  readonly onInstallMarketplace?: (entry: SkillMarketplaceView) => void;
  readonly isInstalling?: boolean;
  readonly onUseSkill: (entry: SkillWorkspaceEntry) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!entry && !marketplaceEntry) {
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

  if (marketplaceEntry) {
    const source = marketplaceSourceMetadata(marketplaceEntry.repository);
    const repositoryUrl = (() => {
      try {
        const url = new URL(marketplaceEntry.repository);
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
      } catch {
        return null;
      }
    })();
    const copyInstallCommand = async () => {
      try {
        await navigator.clipboard.writeText(
          `npx skills add ${new URL(marketplaceEntry.repository).pathname.replace(/^\//u, "")} --skill=${marketplaceEntry.slug}`,
        );
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(false);
      }
    };

    return (
      <aside
        className="sticky top-5 max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--rune-violet-soft)_30%,var(--border))] bg-[var(--rune-surface-raised)] p-5 shadow-[0_18px_50px_-34px_color-mix(in_srgb,var(--rune-violet-strong)_55%,transparent)]"
        data-rune-skill-marketplace-detail
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--rune-violet-soft)_35%,var(--border))] bg-[var(--rune-violet-soft)]/20 text-[var(--rune-violet-strong)]">
              <SparklesIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-[-0.025em] text-foreground">
                {marketplaceEntry.slug}
              </h2>
              <p className="mt-1 truncate text-xs text-muted-foreground">Marketplace discovery</p>
            </div>
          </div>
          <Badge
            variant={marketplaceEntry.status === "available" ? "outline" : "success"}
            size="sm"
          >
            {marketplaceEntry.status === "available"
              ? "Available"
              : marketplaceEntry.status === "update"
                ? "Update"
                : "Installed"}
          </Badge>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          {marketplaceEntry.description}
        </p>

        <dl className="mt-5 grid gap-2 text-xs">
          <div className="rounded-xl bg-muted/35 px-3 py-2.5">
            <dt className="text-muted-foreground">Source / author</dt>
            <dd className="mt-1 break-all font-medium text-foreground">
              {source.provider} · {source.author}
            </dd>
            <dd className="mt-1 break-all text-muted-foreground">
              {source.repositoryName} / {marketplaceEntry.path}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2.5">
            <dt className="text-muted-foreground">Catalog version</dt>
            <dd className="font-medium text-foreground">v{marketplaceEntry.version}</dd>
          </div>
          <div className="rounded-xl bg-muted/35 px-3 py-2.5">
            <dt className="text-muted-foreground">Compatible harnesses</dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">
              {marketplaceEntry.compatibility.map((harness) => (
                <Badge key={harness} variant="outline" size="sm">
                  {(() => {
                    const iconKind =
                      harness === "rune-native"
                        ? "runeNative"
                        : harness === "claude"
                          ? "claudeAgent"
                          : harness;
                    const ProviderIcon = getProviderOrServiceIcon(iconKind);
                    return ProviderIcon ? (
                      <ProviderIcon className="me-1 inline size-3" aria-hidden />
                    ) : null;
                  })()}
                  {MARKETPLACE_COMPATIBILITY_LABEL[harness]}
                </Badge>
              ))}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2.5">
            <dt className="text-muted-foreground">Install scope</dt>
            <dd className="font-medium text-foreground">Project · .agents/skills</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {marketplaceEntry.status !== "installed" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onInstallMarketplace?.(marketplaceEntry)}
              disabled={!onInstallMarketplace || isInstalling}
              title={onInstallMarketplace ? undefined : "Connect a writable project first"}
            >
              <DownloadIcon className="size-3.5" />
              {isInstalling
                ? "Installing…"
                : marketplaceEntry.status === "update"
                  ? "Install update"
                  : "Install to project"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copyInstallCommand()}
          >
            <ClipboardIcon
              className={cn("size-3.5", copied && "text-[var(--rune-violet-strong)]")}
            />
            {copied ? "Copied" : "Copy install command"}
          </Button>
          {repositoryUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost-muted"
              render={<a href={repositoryUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLinkIcon className="size-3.5" /> Open on GitHub
            </Button>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          RUNE does not execute marketplace content while browsing. Installing remains an explicit
          project or user action.
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
      className="sticky top-5 max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--rune-violet-soft)_30%,var(--border))] bg-[var(--rune-surface-raised)] p-5 shadow-[0_18px_50px_-34px_color-mix(in_srgb,var(--rune-violet-strong)_55%,transparent)]"
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
