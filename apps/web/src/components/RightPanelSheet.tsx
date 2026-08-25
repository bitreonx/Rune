import { type ReactNode } from "react";

import { RIGHT_PANEL_SHEET_CLASS_NAME } from "../rightPanelLayout";
import { cn } from "../lib/utils";
import { Sheet, SheetPopup } from "./ui/sheet";

export function RightPanelSheet(props: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  motionState?: "closed" | "opening" | "open" | "closing";
  maximized?: boolean;
}) {
  const motionState = props.motionState ?? (props.open ? "open" : "closed");
  return (
    <Sheet
      open={props.open}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
    >
      <SheetPopup
        side="right"
        showCloseButton={false}
        keepMounted
        className={cn(RIGHT_PANEL_SHEET_CLASS_NAME, props.maximized && "rune-right-panel-maximized")}
        data-rune-right-panel-host
        data-rune-right-panel-state={motionState}
        data-rune-right-panel-maximized={props.maximized ? "true" : "false"}
      >
        <div
          className="rune-right-panel-surface flex min-h-0 min-w-0 flex-1 flex-col"
          data-rune-right-panel-surface
          data-rune-right-panel-surface-state={motionState}
        >
          {props.children}
        </div>
      </SheetPopup>
    </Sheet>
  );
}
