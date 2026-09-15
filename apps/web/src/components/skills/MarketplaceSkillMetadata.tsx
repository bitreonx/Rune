import type { ComponentProps } from "react";

import { getProviderOrServiceIcon } from "../chat/providerIconUtils";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import {
  MARKETPLACE_COMPATIBILITY_LABEL,
  type SkillMarketplaceCompatibility,
  type SkillMarketplaceStatus,
} from "../../skills/marketplaceRegistry";

export const MARKETPLACE_INSTALL_SCOPE = "Project";
export const MARKETPLACE_INSTALL_DIRECTORY = ".agents/skills";
export const MARKETPLACE_INSTALL_SCOPE_LABEL =
  `${MARKETPLACE_INSTALL_SCOPE} · ${MARKETPLACE_INSTALL_DIRECTORY}` as const;

export function marketplaceStatusLabel(status: SkillMarketplaceStatus): string {
  switch (status) {
    case "available":
      return "Not installed";
    case "update":
      return "Update available";
    case "installed":
      return "Installed";
  }
}

export function marketplaceStatusVariant(
  status: SkillMarketplaceStatus,
): NonNullable<ComponentProps<typeof Badge>["variant"]> {
  switch (status) {
    case "available":
      return "outline";
    case "update":
      return "warning";
    case "installed":
      return "success";
  }
}

export function marketplaceRepositoryHref(repository: string): string | null {
  try {
    const url = new URL(repository);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function marketplaceRepositoryLabel(repository: string): string {
  try {
    const url = new URL(repository);
    return `${url.hostname}${url.pathname.replace(/\/$/u, "")}`;
  } catch {
    return repository;
  }
}

function marketplaceCompatibilityIconKind(harness: SkillMarketplaceCompatibility): string {
  if (harness === "rune-native") return "runeNative";
  if (harness === "claude") return "claudeAgent";
  return harness;
}

export function MarketplaceCompatibilityMarks({
  compatibility,
  className,
}: {
  readonly compatibility: ReadonlyArray<SkillMarketplaceCompatibility>;
  readonly className?: string;
}) {
  return (
    <span
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label={`Compatible with ${compatibility.map((harness) => MARKETPLACE_COMPATIBILITY_LABEL[harness]).join(", ")}`}
      data-rune-marketplace-compatibility
    >
      {compatibility.map((harness) => {
        const ProviderIcon = getProviderOrServiceIcon(marketplaceCompatibilityIconKind(harness));
        return (
          <Badge key={harness} variant="outline" size="sm">
            {ProviderIcon ? <ProviderIcon className="me-1 inline size-3" aria-hidden /> : null}
            {MARKETPLACE_COMPATIBILITY_LABEL[harness]}
          </Badge>
        );
      })}
    </span>
  );
}
