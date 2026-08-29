import type { ProviderDriverKind, ServerProvider } from "@rune/contracts";
import { CheckIcon, CircleAlertIcon, CopyIcon, ExternalLinkIcon, RefreshCwIcon, TerminalIcon } from "lucide-react";

import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { getProviderSetupGuide } from "./providerDriverMeta";
import { getProviderSummary, type InstanceReadiness } from "./providerStatus";

/** A concrete next action for providers whose status is not ready yet. */
export function ProviderSetupNotice(props: {
  readonly driver: ProviderDriverKind;
  readonly provider: ServerProvider | undefined;
  readonly instanceLabel: string;
  readonly readiness: InstanceReadiness;
  readonly onRefresh?: () => void;
  readonly isRefreshing?: boolean;
}) {
  const { copyToClipboard, isCopied } = useCopyToClipboard<{ command: string }>({
    target: "provider setup command",
  });

  if (props.readiness.tag === "ready" || props.readiness.tag === "disabled") return null;

  const provider = props.provider;
  const guide = getProviderSetupGuide(props.driver);
  const summary = getProviderSummary(provider);
  const isAntigravity = String(props.driver) === "antigravity";
  const command =
    props.readiness.tag === "sign-in-required" && props.readiness.target === "harness"
      ? guide?.signInCommand
      : props.readiness.tag === "missing"
        ? guide?.installCommand
        : undefined;
  const title =
    props.readiness.tag === "sign-in-required"
      ? props.readiness.target === "connection"
        ? "Connect the selected model service"
        : `${props.instanceLabel} needs sign-in`
      : props.readiness.tag === "missing"
        ? `${props.instanceLabel} is not installed`
        : props.readiness.tag === "needs-attention"
          ? `${props.instanceLabel} needs attention`
          : isAntigravity
            ? "Antigravity is still discovering models"
            : `Checking ${props.instanceLabel}`;
  const description =
    props.readiness.tag === "sign-in-required"
      ? props.readiness.action
      : props.readiness.tag === "missing"
        ? provider?.message ?? `Install ${guide?.binary || "the required harness"} on the host running RUNE.`
        : props.readiness.tag === "needs-attention"
          ? `${props.readiness.reason} ${props.readiness.recovery}`
          : props.readiness.tag === "discovering-models" && props.readiness.fallbackModel
            ? `Model discovery is taking longer than expected. Using ${props.readiness.fallbackModel} while it completes.`
            : provider?.message ?? summary.detail ?? "RUNE is checking the runtime route.";

  return (
    <div
      className="flex min-w-0 items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs"
      data-provider-setup-notice={isAntigravity ? "antigravity" : "contextual"}
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="leading-relaxed text-muted-foreground">{description}</p>
        {props.readiness.tag === "discovering-models" && props.readiness.fallbackModel ? (
          <p className="leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Fallback:</span>{" "}
            {props.readiness.fallbackModel}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {command ? (
            <div className="inline-flex min-w-0 items-center gap-1 rounded-md bg-background/70 px-1.5 py-1 font-mono text-[11px] text-foreground">
              <TerminalIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <code className="truncate">{command}</code>
              <button
                type="button"
                className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => copyToClipboard(command, { command })}
                aria-label={`Copy ${props.readiness.tag === "missing" ? "install" : "sign-in"} command`}
              >
                {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
              </button>
            </div>
          ) : null}
          {props.onRefresh ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-foreground hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={props.onRefresh}
              disabled={props.isRefreshing}
            >
              <RefreshCwIcon className={props.isRefreshing ? "size-3 animate-spin" : "size-3"} aria-hidden />
              {props.isRefreshing ? "Refreshing" : "Refresh status"}
            </button>
          ) : null}
          {guide?.docsUrl ? (
            <a
              className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              href={guide.docsUrl}
              target="_blank"
              rel="noreferrer"
            >
              {isAntigravity ? "Setup" : "Provider docs"}
              <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
