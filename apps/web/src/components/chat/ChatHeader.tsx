import {
  type EnvironmentId,
  type ProjectScript,
  type ResolvedKeybindingsConfig,
  type ThreadId,
} from "@rune/contracts";
import { scopeThreadRef } from "@rune/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@rune/client-runtime/state/runtime";
import type { ChangeRequestSettleSource } from "@rune/client-runtime/state/thread-settled";
import { ChevronDownIcon } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { toastManager } from "../ui/toast";
import ProjectScriptsControl, {
  type NewProjectScriptInput,
  type ProjectScriptActionResult,
} from "../ProjectScriptsControl";
import { EnvironmentQuickPanel } from "./EnvironmentQuickPanel";
import type { TurnDiffFileChange } from "~/types";
import type { VcsStatusResult } from "@rune/contracts";
import type { RemoteOpenMode } from "../../remoteOpen";
import { useRuneProjectFileScripts } from "~/hooks/useRuneProjectFileScripts";
import { useThreadActionMenu } from "~/hooks/useThreadActionMenu";
import { readLocalApi } from "~/localApi";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { observeResponsiveBreakpointFade, usePanelAnimationSettings } from "../../panelAnimations";
import { ProjectFavicon } from "../ProjectFavicon";
import {
  WorkspaceBreadcrumb,
  WorkspaceBreadcrumbItem,
  WorkspaceBreadcrumbSeparator,
} from "../WorkspaceBreadcrumb";
import { cn } from "~/lib/utils";

interface ChatHeaderProps {
  activeThreadEnvironmentId: EnvironmentId;
  activeThreadId: ThreadId;
  activeThreadTitle: string;
  environmentLabel: string;
  /** Drafts have no server thread yet, so the title carries no action menu. */
  isServerThread: boolean;
  /** PR feeding the settled classification, resolved by ChatView. */
  changeRequest: ChangeRequestSettleSource | null;
  activeProjectName: string | undefined;
  activeProjectCwd: string | null;
  activeProjectFaviconPath: string | null;
  activeProjectScripts: ReadonlyArray<ProjectScript> | undefined;
  preferredScriptId: string | null;
  keybindings: ResolvedKeybindingsConfig;
  rightPanelOpen: boolean;
  gitStatus: VcsStatusResult | null;
  chatDiff: ReadonlyArray<TurnDiffFileChange> | null;
  configuredPreviewUrls: ReadonlyArray<string>;
  readonly onOpenEnvironment: () => void;
  readonly onOpenFiles: () => void;
  readonly onOpenDiff: () => void;
  readonly onOpenExplorer: () => void;
  onNewThreadInProject: () => void;
  onOpenProjectSettings?: (() => void) | undefined;
  onRunProjectScript: (script: ProjectScript) => void;
  onAddProjectScript: (input: NewProjectScriptInput) => Promise<ProjectScriptActionResult>;
  onUpdateProjectScript: (
    scriptId: string,
    input: NewProjectScriptInput,
  ) => Promise<ProjectScriptActionResult>;
  onDeleteProjectScript: (scriptId: string) => Promise<ProjectScriptActionResult>;
}

/**
 * Rename commit rule shared with the sidebar's inline rename: trim, reject
 * empty (the caller toasts), and skip the mutation when nothing changed.
 */
export function resolveRenameCommit(input: {
  readonly title: string;
  readonly originalTitle: string;
}): { action: "commit"; title: string } | { action: "reject-empty" } | { action: "noop" } {
  const trimmed = input.title.trim();
  if (trimmed.length === 0) return { action: "reject-empty" };
  if (trimmed === input.originalTitle) return { action: "noop" };
  return { action: "commit", title: trimmed };
}

/**
 * Resolve the position passed to the shared action-menu bridge. Pointer
 * clicks already provide the correct anchor point; keyboard activation has no
 * pointer coordinates, so it falls back to the trigger's bottom edge.
 */
export function resolveThreadTitleMenuPosition(input: {
  readonly pointerPosition: { readonly x: number; readonly y: number } | null;
  readonly anchorRect?: { readonly left: number; readonly bottom: number };
}): { x: number; y: number } | null {
  if (input.pointerPosition !== null) return input.pointerPosition;
  if (input.anchorRect === undefined) return null;
  return { x: input.anchorRect.left, y: input.anchorRect.bottom + 4 };
}

interface ThreadTitleAnchorProps {
  readonly activeThreadTitle: string;
  readonly onDoubleClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  readonly onOpenMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

/** The title and its menu trigger share one flex anchor so neither can drift. */
export function ThreadTitleAnchor({
  activeThreadTitle,
  onDoubleClick,
  onOpenMenu,
}: ThreadTitleAnchorProps) {
  return (
    <div data-thread-title-anchor className="flex min-w-0 flex-1 items-center gap-1">
      <h2 className="min-w-0 flex-1 text-sm font-medium">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={activeThreadTitle}
                onDoubleClick={onDoubleClick}
                className="block min-w-0 max-w-full cursor-text truncate rounded-sm text-left text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            {activeThreadTitle}
          </TooltipTrigger>
          <TooltipPopup
            side="top"
            className="duration-[var(--rune-motion-fast)] ease-out motion-reduce:transition-none"
          >
            {activeThreadTitle}
          </TooltipPopup>
        </Tooltip>
      </h2>
      <button
        type="button"
        data-thread-title-trigger
        aria-label={`Thread actions for ${activeThreadTitle}`}
        aria-haspopup="menu"
        onClick={onOpenMenu}
        className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground/70 transition-[color,opacity,transform] duration-[var(--rune-motion-fast)] ease-out hover:scale-105 hover:text-foreground hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:transition-none motion-reduce:transform-none"
      >
        <ChevronDownIcon aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}

export function shouldShowOpenInPicker(input: {
  readonly activeProjectName: string | undefined;
  readonly activeThreadEnvironmentId: EnvironmentId;
  readonly primaryEnvironmentId: EnvironmentId | null;
  readonly remoteOpenMode: RemoteOpenMode;
}): boolean {
  if (!input.activeProjectName) return false;
  if (
    input.primaryEnvironmentId !== null &&
    input.activeThreadEnvironmentId === input.primaryEnvironmentId
  ) {
    return true;
  }
  // Remote environments get the picker in deep-link mode (or its explicit
  // "no SSH route" state). Non-primary local backends (e.g. WSL) keep it
  // hidden, matching pre-remote behavior.
  return input.remoteOpenMode !== "local-exec";
}

export const ChatHeader = memo(function ChatHeader({
  activeThreadEnvironmentId,
  activeThreadId,
  activeThreadTitle,
  environmentLabel,
  isServerThread,
  changeRequest,
  activeProjectName,
  activeProjectCwd,
  activeProjectFaviconPath,
  activeProjectScripts,
  preferredScriptId,
  keybindings,
  rightPanelOpen,
  gitStatus,
  chatDiff,
  configuredPreviewUrls,
  onOpenEnvironment,
  onOpenFiles,
  onOpenDiff,
  onOpenExplorer,
  onNewThreadInProject,
  onOpenProjectSettings,
  onRunProjectScript,
  onAddProjectScript,
  onUpdateProjectScript,
  onDeleteProjectScript,
}: ChatHeaderProps) {
  const fileScripts = useRuneProjectFileScripts(
    activeThreadEnvironmentId,
    activeProjectScripts ? activeProjectCwd : null,
  );
  const activeThreadRef = useMemo(
    () => scopeThreadRef(activeThreadEnvironmentId, activeThreadId),
    [activeThreadEnvironmentId, activeThreadId],
  );
  const updateThreadMetadata = useAtomCommand(threadEnvironment.updateMetadata, {
    reportFailure: false,
  });
  // Inline rename, keyed by thread: navigating away drops an in-progress
  // rename instead of committing stale text. Cleared on thread change (not
  // just hidden) so returning to the thread doesn't revive the old draft.
  const [renaming, setRenaming] = useState<{ threadId: ThreadId; title: string } | null>(null);
  if (renaming !== null && renaming.threadId !== activeThreadId) {
    setRenaming(null);
  }
  const renamingTitle = renaming?.threadId === activeThreadId ? renaming.title : null;
  const renameCommittedRef = useRef(false);
  const startRename = useCallback(() => {
    renameCommittedRef.current = false;
    setRenaming({ threadId: activeThreadId, title: activeThreadTitle });
  }, [activeThreadId, activeThreadTitle]);
  const commitRename = useCallback(
    (title: string) => {
      setRenaming(null);
      const resolution = resolveRenameCommit({ title, originalTitle: activeThreadTitle });
      if (resolution.action === "reject-empty") {
        toastManager.add({ type: "warning", title: "Thread title cannot be empty" });
        return;
      }
      if (resolution.action === "noop") return;
      void updateThreadMetadata({
        environmentId: activeThreadEnvironmentId,
        input: { threadId: activeThreadId, title: resolution.title },
      }).then((result) => {
        if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
          const error = squashAtomCommandFailure(result);
          toastManager.add({
            type: "error",
            title: "Failed to rename thread",
            description: error instanceof Error ? error.message : "An error occurred.",
          });
        }
      });
    },
    [activeThreadEnvironmentId, activeThreadId, activeThreadTitle, updateThreadMetadata],
  );
  const { openMenu, closeMenu } = useThreadActionMenu({
    threadRef: isServerThread ? activeThreadRef : null,
    projectCwd: activeProjectCwd,
    changeRequest,
    onStartRename: startRename,
  });
  const openMenuFromTitleTrigger = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const position =
        event.detail === 0
          ? resolveThreadTitleMenuPosition({
              pointerPosition: null,
              // Keyboard-generated clicks have no viewport coordinates. This
              // is the only case that needs a DOM measurement; pointer opens
              // stay anchored to the actual trigger event and the menu bridge
              // handles collision.
              anchorRect: (() => {
                const rect = event.currentTarget.getBoundingClientRect();
                return { left: rect.left, bottom: rect.bottom };
              })(),
            })
          : resolveThreadTitleMenuPosition({
              pointerPosition: { x: event.clientX, y: event.clientY },
            });
      if (position !== null) openMenu(position);
    },
    [openMenu],
  );
  const handleTitleDoubleClick = useCallback(
    (event: ReactMouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      closeMenu();
      startRename();
    },
    [closeMenu, startRename],
  );
  const handleHeaderContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (renamingTitle !== null) return;
      // The right-side controls (git, scripts, open-in) keep their own
      // behavior; only the breadcrumb area opens the thread menu.
      if ((event.target as HTMLElement).closest("[data-chat-header-actions]")) return;
      if (!isServerThread && onOpenProjectSettings === undefined) return;
      cancelPendingTitleMenu();
      event.preventDefault();
      if (!isServerThread) {
        const api = readLocalApi();
        if (!api) return;
        void api.contextMenu
          .show([{ id: "project-settings", label: "Project settings", icon: "settings" }], {
            x: event.clientX,
            y: event.clientY,
          })
          .then((action) => {
            if (action === "project-settings") onOpenProjectSettings?.();
          });
        return;
      }
      openMenu({ x: event.clientX, y: event.clientY });
    },
    [cancelPendingTitleMenu, isServerThread, onOpenProjectSettings, openMenu, renamingTitle],
  );
  const handleRenameKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === "Enter") {
        renameCommittedRef.current = true;
        commitRename(event.currentTarget.value);
      } else if (event.key === "Escape") {
        renameCommittedRef.current = true;
        setRenaming(null);
      }
    },
    [commitRename],
  );
  return (
    <div
      className="@container/header-actions flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
      onContextMenu={handleHeaderContextMenu}
    >
      <WorkspaceBreadcrumb
        ariaLabel="Thread breadcrumb"
        className="flex-1 overflow-clip [overflow-clip-margin:2px]"
      >
        {/* The project always leads the header: knowing which project a
            thread lives in is priority zero, and the thread title alone
            doesn't answer it. */}
        {activeProject ? (
          <>
            <WorkspaceBreadcrumbItem className="shrink">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`New thread in ${activeProjectName}`}
                      onClick={onNewThreadInProject}
                      className="inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  }
                >
                  <ProjectFavicon project={activeProject} className="size-3.5" />
                  <span className="max-w-40 truncate">{activeProjectName}</span>
                </TooltipTrigger>
                <TooltipPopup side="top">New thread in {activeProjectName}</TooltipPopup>
              </Tooltip>
            </WorkspaceBreadcrumbItem>
            <WorkspaceBreadcrumbSeparator />
          </>
        ) : null}
        <WorkspaceBreadcrumbItem current className="min-w-10 flex-1">
          {renamingTitle !== null ? (
            <input
              autoFocus
              aria-label="Thread title"
              className="min-w-0 flex-1 rounded-sm bg-transparent text-sm font-medium text-foreground outline-none ring-1 ring-ring/50 focus:ring-ring"
              defaultValue={renamingTitle}
              onBlur={(event) => {
                if (renameCommittedRef.current) return;
                commitRename(event.currentTarget.value);
              }}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={handleRenameKeyDown}
            />
          ) : isServerThread ? (
            <ThreadTitleAnchor
              activeThreadTitle={activeThreadTitle}
              onDoubleClick={handleTitleDoubleClick}
              onOpenMenu={openMenuFromTitleTrigger}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <h2 aria-label={activeThreadTitle} className="min-w-0 flex-1 truncate">
                    {activeThreadTitle}
                  </h2>
                }
              />
              <TooltipPopup side="top">{activeThreadTitle}</TooltipPopup>
            </Tooltip>
          )}
        </WorkspaceBreadcrumbItem>
      </WorkspaceBreadcrumb>
      <div
        ref={headerActionsRef}
        data-chat-header-actions
        className={cn(
          "flex shrink-0 items-center justify-end gap-2 @3xl/header-actions:gap-3",
          rightPanelOpen ? "pr-0" : "pr-16",
          "[[data-panel-animations=true]_&]:motion-safe:transition-[padding-right] [[data-panel-animations=true]_&]:motion-safe:[transition-duration:var(--panel-animation-duration)] [[data-panel-animations=true]_&]:motion-safe:ease-out",
        )}
      >
        {activeProjectScripts && (
          <ProjectScriptsControl
            scripts={activeProjectScripts}
            fileScripts={fileScripts}
            keybindings={keybindings}
            preferredScriptId={preferredScriptId}
            onRunScript={onRunProjectScript}
            onAddScript={onAddProjectScript}
            onUpdateScript={onUpdateProjectScript}
            onDeleteScript={onDeleteProjectScript}
          />
        )}
        {activeProjectName ? (
          <EnvironmentQuickPanel
            environmentId={activeThreadEnvironmentId}
            environmentLabel={environmentLabel}
            cwd={activeProjectCwd}
            chatDiff={chatDiff}
            gitStatus={gitStatus}
            configuredPreviewUrls={configuredPreviewUrls}
            onOpenEnvironment={onOpenEnvironment}
            onOpenFiles={onOpenFiles}
            onOpenDiff={onOpenDiff}
            onOpenExplorer={onOpenExplorer}
          />
        ) : null}
      </div>
    </div>
  );
});
