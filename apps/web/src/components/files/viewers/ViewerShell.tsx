import type { WorkspaceFileKind } from "@rune/shared/fileKind";
import { Clipboard, ExternalLink, FolderOpen, MessageSquarePlus, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

import { viewerMetadataLabel } from "./viewerShell.logic.ts";

export type ViewerShellKind = WorkspaceFileKind | "browser-preview" | "truncated-text";

export interface ViewerShellProps {
  readonly name: string;
  readonly relativePath: string;
  readonly kind: ViewerShellKind;
  readonly mime?: string;
  readonly byteLength?: number;
  readonly originKey?: string;
  readonly openExternallyHref?: string;
  readonly onOpenExternally?: () => void;
  readonly onCopyPath?: () => void;
  readonly onRevealInFiles?: () => void;
  readonly onRevealInExplorer?: () => void;
  readonly onAddToChat?: () => void;
  readonly onClose?: () => void;
  readonly children: ReactNode;
}

function ActionButton(props: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost-muted"
            size="icon-xs"
            aria-label={props.label}
            onClick={props.onClick}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipPopup>{props.label}</TooltipPopup>
    </Tooltip>
  );
}

/**
 * Shared chrome for every file viewer. Viewers own only their content and
 * content-specific controls; file identity and cross-surface actions live
 * here so Explorer, chat, and agent artifacts cannot drift apart.
 */
export function ViewerShell(props: ViewerShellProps) {
  const metadata = viewerMetadataLabel({
    kind: props.kind,
    ...(props.mime !== undefined ? { mime: props.mime } : {}),
    ...(props.byteLength !== undefined ? { byteLength: props.byteLength } : {}),
  });

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background/90 motion-safe:transition-[opacity,transform] motion-safe:duration-250 motion-safe:ease-out motion-reduce:transition-none"
      data-viewer-shell
      data-viewer-origin-key={props.originKey ?? props.relativePath}
      aria-label={`Preview ${props.name}`}
    >
      <header className="surface-glass flex min-h-10 shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground" title={props.relativePath}>
            {props.name}
          </div>
          <div className="truncate text-[10px] text-muted-foreground" data-viewer-metadata>
            {metadata}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {props.openExternallyHref ? (
            <ActionButton
              label="Open externally"
              onClick={() => window.open(props.openExternallyHref, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="size-3.5" />
            </ActionButton>
          ) : props.onOpenExternally ? (
            <ActionButton label="Open externally" onClick={props.onOpenExternally}>
              <ExternalLink className="size-3.5" />
            </ActionButton>
          ) : null}
          {props.onCopyPath ? (
            <ActionButton label="Copy path" onClick={props.onCopyPath}>
              <Clipboard className="size-3.5" />
            </ActionButton>
          ) : null}
          {props.onRevealInFiles ? (
            <ActionButton label="Reveal in RUNE Files" onClick={props.onRevealInFiles}>
              <FolderOpen className="size-3.5" />
            </ActionButton>
          ) : null}
          {props.onRevealInExplorer ? (
            <ActionButton label="Reveal in system Explorer" onClick={props.onRevealInExplorer}>
              <ExternalLink className="size-3.5" />
            </ActionButton>
          ) : null}
          {props.onAddToChat ? (
            <ActionButton label="Add to chat" onClick={props.onAddToChat}>
              <MessageSquarePlus className="size-3.5" />
            </ActionButton>
          ) : null}
          {props.onClose ? (
            <ActionButton label="Close" onClick={props.onClose}>
              <X className="size-3.5" />
            </ActionButton>
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col" data-viewer-content>
        {props.children}
      </div>
    </section>
  );
}
