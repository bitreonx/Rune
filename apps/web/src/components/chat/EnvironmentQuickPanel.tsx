import type { EnvironmentId, OrchestrationSessionStatus, VcsStatusResult } from "@rune/contracts";
import { Box, CheckCircle2, ChevronRight, FileDiff, FolderOpen, Server, Users } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import type { TurnDiffFileChange } from "~/types";
import { useDiscoveredLocalServers } from "../preview/useDiscoveredLocalServers";

interface EnvironmentQuickPanelProps {
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  readonly cwd: string | null;
  readonly chatDiff: ReadonlyArray<TurnDiffFileChange> | null;
  readonly gitStatus: VcsStatusResult | null;
  readonly configuredPreviewUrls: ReadonlyArray<string>;
  readonly providerLabel?: string | null;
  readonly modelLabel?: string | null;
  readonly sessionStatus?: OrchestrationSessionStatus | null;
  readonly agentCount?: number;
  readonly verificationSummary?: string | null;
  readonly onOpenEnvironment: () => void;
  readonly onOpenFiles: () => void;
  readonly onOpenDiff: () => void;
  readonly onOpenExplorer: () => void;
}

export interface EnvironmentQuickSummaryState {
  readonly chatChangeValue: string | undefined;
  readonly workspaceChangeValue: string | undefined;
  readonly currentWorkValue: string;
  readonly sessionValue: string | undefined;
}

export function resolveEnvironmentQuickSummary(input: {
  readonly chatChangeCount: number | null;
  readonly workspaceChangeCount: number | null;
  readonly providerLabel?: string | null;
  readonly modelLabel?: string | null;
  readonly sessionStatus?: OrchestrationSessionStatus | null;
}): EnvironmentQuickSummaryState {
  const formatCount = (count: number): string =>
    count === 0 ? "None" : `${count} ${count === 1 ? "file" : "files"}`;
  const sessionValue =
    input.sessionStatus === "running"
      ? "In progress"
      : input.sessionStatus === "starting"
        ? "Starting"
        : input.sessionStatus === "ready"
          ? "Ready"
          : input.sessionStatus === "error"
            ? "Needs attention"
            : input.sessionStatus === "interrupted"
              ? "Interrupted"
              : input.sessionStatus === "stopped"
                ? "Stopped"
                : undefined;

  return {
    chatChangeValue:
      input.chatChangeCount === null ? undefined : formatCount(input.chatChangeCount),
    workspaceChangeValue:
      input.workspaceChangeCount === null ? undefined : formatCount(input.workspaceChangeCount),
    currentWorkValue: [input.providerLabel, input.modelLabel].filter(Boolean).join(" · "),
    sessionValue,
  };
}

function QuickRow(props: { icon: ReactNode; label: string; value?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent/65 text-muted-foreground [&_svg]:size-3.5"
        aria-hidden
      >
        {props.icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{props.label}</span>
      {props.value ? (
        <span className="max-w-32 truncate text-muted-foreground">{props.value}</span>
      ) : null}
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function EnvironmentQuickPanel(props: EnvironmentQuickPanelProps) {
  const servers = useDiscoveredLocalServers({
    environmentId: props.environmentId,
    configuredUrls: props.configuredPreviewUrls,
  });
  const { chatChangeValue, workspaceChangeValue, currentWorkValue, sessionValue } = useMemo(
    () =>
      resolveEnvironmentQuickSummary({
        chatChangeCount: props.chatDiff?.length ?? null,
        workspaceChangeCount: props.gitStatus?.workingTree.files.length ?? null,
        providerLabel: props.providerLabel,
        modelLabel: props.modelLabel,
        sessionStatus: props.sessionStatus,
      }),
    [
      props.chatDiff?.length,
      props.gitStatus?.workingTree.files.length,
      props.modelLabel,
      props.providerLabel,
      props.sessionStatus,
    ],
  );

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Open workspace summary"
                  data-workspace-summary-control
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            />
          }
        >
          <Box className="size-3.5" />
          <span>Summary</span>
        </TooltipTrigger>
        <TooltipPopup side="bottom">Workspace summary</TooltipPopup>
      </Tooltip>
      <PopoverPopup align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="border-b border-border/55 px-3 py-3">
          <div className="flex items-center gap-2">
            <Box className="size-4 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Workspace / Environment
              </p>
              <p className="truncate text-sm font-semibold">{props.environmentLabel}</p>
            </div>
          </div>
          <p className="mt-1 truncate pl-6 text-[11px] text-muted-foreground">
            {props.cwd ?? "No workspace"}
          </p>
        </div>
        <div className="py-1">
          {currentWorkValue || sessionValue ? (
            <QuickRow
              icon={<Box />}
              label="Current work"
              value={
                sessionValue
                  ? `${sessionValue}${currentWorkValue ? ` · ${currentWorkValue}` : ""}`
                  : currentWorkValue
              }
              onClick={props.onOpenEnvironment}
            />
          ) : null}
          {chatChangeValue ? (
            <QuickRow
              icon={<FileDiff />}
              label="Changes from this chat"
              value={chatChangeValue}
              onClick={props.onOpenDiff}
            />
          ) : null}
          {workspaceChangeValue ? (
            <QuickRow
              icon={<FileDiff />}
              label="All workspace changes"
              value={workspaceChangeValue}
              onClick={props.onOpenFiles}
            />
          ) : null}
          {props.cwd ? (
            <QuickRow
              icon={<FolderOpen />}
              label="Workspace"
              value="Files"
              onClick={props.onOpenFiles}
            />
          ) : null}
          {props.gitStatus?.isRepo ? (
            <QuickRow
              icon={<FileDiff />}
              label="Branch"
              value={props.gitStatus.refName ?? "Repository"}
              onClick={props.onOpenDiff}
            />
          ) : null}
          {props.agentCount !== undefined && props.agentCount > 0 ? (
            <QuickRow
              icon={<Users />}
              label="Subagents"
              value={`${props.agentCount}`}
              onClick={props.onOpenEnvironment}
            />
          ) : null}
          {props.verificationSummary ? (
            <QuickRow
              icon={<CheckCircle2 />}
              label="Verification"
              value={props.verificationSummary}
              onClick={props.onOpenEnvironment}
            />
          ) : null}
          {servers.length > 0 ? (
            <QuickRow
              icon={<Server />}
              label="Local servers"
              value={`${servers.length}`}
              onClick={props.onOpenEnvironment}
            />
          ) : null}
          {props.cwd ? (
            <QuickRow
              icon={<FolderOpen />}
              label="Editor"
              value="Open in Explorer"
              onClick={props.onOpenExplorer}
            />
          ) : null}
          <button
            type="button"
            onClick={props.onOpenEnvironment}
            className="mt-1 flex min-h-10 w-full items-center justify-center border-t border-border/55 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            Open full environment panel
          </button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
