import { FolderPlusIcon, SearchIcon, SettingsIcon, SquarePenIcon } from "lucide-react";
import { memo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { openCommandPalette } from "~/commandPaletteBus";
import { cn } from "~/lib/utils";
import { RuneMark } from "../RuneMark";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

function RailButton({
  label,
  onClick,
  children,
  className,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            size="icon"
            type="button"
            className={cn("relative focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar", className)}
            onClick={onClick}
            aria-label={label}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side="right">{label}</TooltipPopup>
    </Tooltip>
  );
}

/**
 * Minimized sidebar state: instead of leaving the screen, the sidebar
 * collapses to a slim action rail that keeps the primary entry points — new
 * thread, search, projects, settings — one click away while giving the
 * workspace the full window width.
 */
export const ThreadSidebarRail = memo(function ThreadSidebarRail(props: {
  readonly isElectron: boolean;
  readonly canCreateThreads: boolean;
  readonly onNewThread: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <SidebarHeader
        data-rune-sidebar-section="workspace"
        className={cn(
          "h-[var(--workspace-topbar-height)] shrink-0 flex-row items-center justify-center bg-[var(--rune-sidebar-surface)] px-0 py-0",
          props.isElectron && "drag-region",
        )}
      >
        <Link
          aria-label="Go to RUNE workspace"
          data-rune-sidebar-row="workspace"
          className="relative z-10 hidden h-7 w-fit items-center text-foreground outline-hidden ring-ring focus-visible:ring-2 md:flex"
          to="/"
        >
          <RuneMark size="sm" showWordmark={false} />
        </Link>
      </SidebarHeader>
      <div
        className="flex min-h-0 flex-1 flex-col items-center gap-2 p-2"
        data-rune-sidebar-section="rail"
        data-rune-sidebar-rail=""
      >
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <RailButton label="New thread" onClick={props.onNewThread} className={cn(!props.canCreateThreads && "pointer-events-none opacity-50")}>
              <SquarePenIcon />
            </RailButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <RailButton label="Search" onClick={() => openCommandPalette()}>
              <SearchIcon />
            </RailButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <RailButton label="Add project" onClick={() => openCommandPalette({ open: "add-project" })}>
              <FolderPlusIcon />
            </RailButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-auto w-full">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <RailButton label="Settings" onClick={() => void navigate({ to: "/settings" })}>
                <SettingsIcon />
              </RailButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    </>
  );
});
