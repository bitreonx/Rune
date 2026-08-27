import type { ProviderDriverKind, ServerProvider } from "@rune/contracts";
import { CircleAlertIcon, ExternalLinkIcon, TerminalIcon } from "lucide-react";

import { getProviderSetupGuide } from "./providerDriverMeta";
import { getProviderSummary } from "./providerStatus";

/** A concrete next action for providers whose status is not ready yet. */
export function ProviderSetupNotice(props: {
  readonly driver: ProviderDriverKind;
  readonly provider: ServerProvider | undefined;
}) {
  if (String(props.driver) !== "antigravity") return null;

  const provider = props.provider;
  if (provider?.status === "ready") return null;

  const guide = getProviderSetupGuide(props.driver);
  const summary = getProviderSummary(provider);
  const nextStep =
    provider?.auth.status === "unauthenticated"
      ? "Authenticate Antigravity on the host that runs RUNE."
      : !provider?.installed
        ? "Install the Antigravity CLI on the host that runs RUNE, then refresh."
        : (provider?.message ?? "Run the model discovery check, then refresh this provider.");

  return (
    <div
      className="flex min-w-0 items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs"
      data-provider-setup-notice="antigravity"
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">Antigravity needs one step</p>
        <p className="leading-relaxed text-muted-foreground">{nextStep}</p>
        <p className="leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Status:</span> {summary.headline}
          {summary.detail ? ` — ${summary.detail}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {guide?.signInCommand ? (
            <code className="inline-flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-1 font-mono text-[11px] text-foreground">
              <TerminalIcon className="size-3 text-muted-foreground" aria-hidden />
              {guide.signInCommand}
            </code>
          ) : null}
          {guide?.docsUrl ? (
            <a
              className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              href={guide.docsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Setup guide
              <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
