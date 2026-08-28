import { type ReactNode, type Ref, useEffect } from "react";

import { RIGHT_PANEL_SHEET_CLASS_NAME } from "../rightPanelLayout";
import { cn } from "../lib/utils";
import { runePanelTransitionClass, type RunePanelMotionState } from "../runePanelMotion";
export function RightPanelSheet(props: {
  children: ReactNode;
  hostRef?: Ref<HTMLDivElement>;
  mode: "inline" | "sheet";
  open: boolean;
  onClose: () => void;
  motionState?: RunePanelMotionState;
  maximized?: boolean;
}) {
  const motionState = props.motionState ?? (props.open ? "open" : "closed");
  useEffect(() => {
    if (props.mode !== "sheet" || !props.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.mode, props.onClose, props.open]);

  return (
    <>
      {props.mode === "sheet" ? (
        <button
          type="button"
          aria-label="Close right panel"
          className="rune-right-panel-backdrop"
          data-rune-right-panel-backdrop
          data-rune-right-panel-state={motionState}
          onClick={props.onClose}
        />
      ) : null}
      <div
        key="rune-right-panel-host"
        ref={props.hostRef}
        className={cn(
          "rune-right-panel-host flex min-h-0 min-w-0 overflow-hidden",
          props.mode === "sheet"
            ? cn(RIGHT_PANEL_SHEET_CLASS_NAME, "fixed inset-y-0 right-0 z-[51] rounded-l-2xl")
            : props.maximized
              ? "flex-1"
              : "shrink-0 rounded-2xl border border-[color-mix(in_srgb,var(--border)_78%,var(--rune-violet-soft))]",
          props.maximized && "rune-right-panel-maximized",
          runePanelTransitionClass(motionState),
        )}
        data-rune-right-panel-host
        data-rune-right-panel-mode={props.mode}
        data-rune-right-panel-state={motionState}
        data-rune-right-panel-maximized={props.maximized ? "true" : "false"}
        role="complementary"
        aria-label="Right panel"
      >
        <div
          className="rune-right-panel-surface surface-glass flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden shadow-2xl shadow-black/15"
          data-rune-right-panel-surface
          data-rune-right-panel-surface-state={motionState}
          data-right-panel-surface-content
        >
          {props.children}
        </div>
      </div>
    </>
  );
}
