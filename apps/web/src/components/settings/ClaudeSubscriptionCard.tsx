import { defaultInstanceIdForDriver, ProviderDriverKind } from "@rune/contracts";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import {
  instanceBadgePresentation,
  type ProviderInstanceEntry,
} from "../../providerInstances";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { PROVIDER_STATUS_STYLES, type ProviderStatusKey } from "./providerStatus";

/**
 * Card for one Claude subscription (IDE) provider in Settings → Providers.
 * Whole-card click target: the flat inline editor stays for other drivers,
 * while subscriptions open the dedicated edit page where the feature keeps
 * growing (roles, integrations, service identity).
 */
export function ClaudeSubscriptionCard(props: {
  entry: ProviderInstanceEntry;
  modelCount: number;
  onOpen: () => void;
}) {
  const { entry } = props;
  // The server-reported status wins when present; otherwise fall back based
  // on the enabled intent so the dot reads correctly before the first probe.
  const statusKey: ProviderStatusKey =
    (entry.snapshot.status as ProviderStatusKey | undefined) ??
    (entry.enabled ? "warning" : "disabled");
  const badge = instanceBadgePresentation(entry, [entry]);
  const isCustom =
    String(entry.instanceId) !== String(defaultInstanceIdForDriver(entry.driverKind));

  return (
    <button
      type="button"
      onClick={props.onOpen}
      data-provider-accent-color={entry.accentColor}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left",
        "transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none",
        !entry.enabled && "opacity-60",
      )}
    >
      <ProviderInstanceIcon
        driverKind={entry.driverKind}
        displayName={entry.displayName}
        accentColor={entry.accentColor}
        showBadge={badge.show}
        badgeContent={badge.content}
        {...(badge.logoUrl ? { badgeLogoUrl: badge.logoUrl } : {})}
        className="size-8 shrink-0"
        iconClassName="size-6"
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn("size-2 shrink-0 rounded-full", PROVIDER_STATUS_STYLES[statusKey].dot)}
            aria-hidden
          />
          <span className="truncate text-sm font-medium text-foreground">{entry.displayName}</span>
          {isCustom ? (
            <span className="shrink-0 rounded-md bg-muted px-1 py-px font-mono text-[10px] leading-4 text-muted-foreground">
              {String(entry.instanceId)}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {props.modelCount} {props.modelCount === 1 ? "model" : "models"}
        </span>
      </span>
      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

/** First-run entry point for the subscription grid; doubles as "add another". */
export function AddServiceTile(props: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onOpen}
      className={cn(
        "flex min-h-20 flex-col items-start justify-center gap-1 rounded-2xl border border-dashed border-border/70 p-4 text-left",
        "transition-colors hover:bg-muted/30 focus-visible:outline-none",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <PlusIcon className="size-3.5" aria-hidden />
        Add service
      </span>
      <span className="text-xs text-muted-foreground">
        Route Claude through OpenRouter or another compatible gateway.
      </span>
    </button>
  );
}

/**
 * The driver kind every subscription card and the setup dialog operate on.
 * Kept here so the panel, the edit page, and the dialog share one constant.
 */
export const CLAUDE_SUBSCRIPTION_DRIVER: ProviderDriverKind =
  ProviderDriverKind.make("claudeAgent");
