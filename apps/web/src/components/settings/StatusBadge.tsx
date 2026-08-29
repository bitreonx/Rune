import type { ProviderDriverKind, ServerProvider } from "@rune/contracts";

import { cn } from "../../lib/utils";
import {
  PROVIDER_STATUS_STYLES,
  instanceReadinessLabel,
  instanceReadinessStatusKey,
  providerStatusLabel,
  resolveProviderStatusKey,
  type InstanceReadiness,
  type ProviderStatusKey,
} from "./providerStatus";

/** One quiet, accessible status treatment shared by harnesses and instances. */
export function StatusBadge(props: {
  readonly statusKey?: ProviderStatusKey;
  readonly provider?: ServerProvider;
  readonly driver?: ProviderDriverKind;
  readonly enabled?: boolean;
  readonly label?: string;
  readonly readiness?: InstanceReadiness;
  readonly className?: string;
}) {
  const status =
    props.readiness
      ? instanceReadinessStatusKey(props.readiness)
      : (props.statusKey ??
        resolveProviderStatusKey(props.provider, {
          ...(props.driver === undefined ? {} : { driver: props.driver }),
          ...(props.enabled === undefined ? {} : { enabled: props.enabled }),
        }));
  const style = PROVIDER_STATUS_STYLES[status];
  const label =
    props.label ??
    (props.readiness ? instanceReadinessLabel(props.readiness) : providerStatusLabel(status));

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/25 px-2 py-0.5 text-[11px] font-medium",
        style.tone,
        props.className,
      )}
      data-provider-status={status}
      data-instance-readiness={props.readiness?.tag}
      aria-label={label ?? "Provider status pending"}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
