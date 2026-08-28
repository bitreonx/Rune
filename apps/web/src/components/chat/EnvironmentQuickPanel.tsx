import type { EnvironmentId, VcsStatusResult } from "@rune/contracts";
import { Box, ChevronRight, FileDiff, FolderOpen, Server } from "lucide-react";
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
  readonly onOpenEnvironment: () => void;
  readonly onOpenFiles: () => void;
  readonly onOpenDiff: () => void;
  readonly onOpenExplorer: () => void;
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
  const changeCount = props.chatDiff?.length ?? props.gitStatus?.workingTree.files.length ?? 0;
  const changeValue = useMemo(() => {
    if (!props.gitStatus && !props.chatDiff) return undefined;
    return `${changeCount} ${changeCount === 1 ? "file" : "files"}`;
  }, [changeCount, props.chatDiff, props.gitStatus]);

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
                  size="icon-xs"
                  aria-label="Open environment overview"
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            />
          }
        >
          <Box className="size-3.5" />
        </TooltipTrigger>
        <TooltipPopup side="bottom">Environment overview</TooltipPopup>
      </Tooltip>
      <PopoverPopup align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="border-b border-border/55 px-3 py-3">
          <div className="flex items-center gap-2">
            <Box className="size-4 text-muted-foreground" aria-hidden />
            <p className="truncate text-sm font-semibold">{props.environmentLabel}</p>
          </div>
          <p className="mt-1 truncate pl-6 text-[11px] text-muted-foreground">
            {props.cwd ?? "No workspace"}
          </p>
        </div>
        <div className="py-1">
          {changeValue ? (
            <QuickRow
              icon={<FileDiff />}
              label="Changes"
              value={changeValue}
              onClick={props.onOpenDiff}
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
