import { FileDiff, Redo2, Save, Search, Undo2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export interface FileEditorToolbarProps {
  /** True while the save coordinator holds unsaved contents. */
  readonly pending: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly changesOpen: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onToggleChanges: (open: boolean) => void;
}

/** Helper rather than a component: the buttons stay part of this file's own tree. */
function toolbarButton(props: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={props.label}
            disabled={props.disabled === true}
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
 * Editing chrome for an open file: explicit save, history, in-file search,
 * and the uncommitted-changes view. Slim by design — it shares the file
 * surface with the editor itself, not the panel subheader.
 */
export function FileEditorToolbar({
  pending,
  canUndo,
  canRedo,
  changesOpen,
  onSave,
  onUndo,
  onRedo,
  onFind,
  onToggleChanges,
}: FileEditorToolbarProps) {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 bg-background px-2"
      data-file-editor-toolbar
    >
      {/* Reserved space keeps the row height stable as the dot comes and goes. */}
      <span
        aria-hidden
        className={cn(
          "mx-1 size-1.5 shrink-0 rounded-full bg-primary transition-opacity",
          pending ? "opacity-100" : "opacity-0",
        )}
      />
      {toolbarButton({
        label: "Save file",
        disabled: !pending,
        onClick: onSave,
        children: <Save className="size-3.5" />,
      })}
      <div className="flex-1" />
      {toolbarButton({
        label: "Undo",
        disabled: !canUndo,
        onClick: onUndo,
        children: <Undo2 className="size-3.5" />,
      })}
      {toolbarButton({
        label: "Redo",
        disabled: !canRedo,
        onClick: onRedo,
        children: <Redo2 className="size-3.5" />,
      })}
      {toolbarButton({
        label: "Search in file",
        onClick: onFind,
        children: <Search className="size-3.5" />,
      })}
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              className="shrink-0"
              pressed={changesOpen}
              onPressedChange={onToggleChanges}
              aria-label="Show uncommitted changes"
              variant="ghost"
              size="sm"
            >
              <FileDiff className="size-3.5" />
            </Toggle>
          }
        />
        <TooltipPopup>
          {changesOpen ? "Back to editing" : "Show uncommitted changes"}
        </TooltipPopup>
      </Tooltip>
    </div>
  );
}
