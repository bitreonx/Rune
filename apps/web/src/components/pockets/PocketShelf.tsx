import type { ReactNode } from "react";
import { ChevronRightIcon, LayersIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  POCKET_MOTION_SEQUENCE,
  projectPocketShelf,
  type PocketMotionPhase,
  type PocketWorkspaceThreadData,
} from "./pocketWorkspace.logic";

export function PocketShelf(props: {
  readonly threads: ReadonlyArray<PocketWorkspaceThreadData>;
  readonly onOpenThread: (thread: PocketWorkspaceThreadData) => void;
  readonly renderProviderMark?: (thread: PocketWorkspaceThreadData) => ReactNode;
  readonly maxVisible?: number;
  readonly motionPhase?: PocketMotionPhase;
  readonly motionProfile?: "balanced" | "expressive" | "reduced";
}) {
  const { threads: shelf, overflow } = projectPocketShelf(props.threads, props.maxVisible);
  if (shelf.length === 0) return null;

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 overflow-hidden"
      data-rune-pocket-shelf
      data-rune-pocket-surface-state="open"
      data-rune-pocket-motion-phase={props.motionPhase ?? "settle"}
      data-rune-pocket-motion-profile={props.motionProfile ?? "balanced"}
      data-rune-pocket-motion-finite="true"
      data-rune-pocket-motion-sequence={POCKET_MOTION_SEQUENCE}
      data-rune-pocket-shelf-count={shelf.length}
      data-rune-pocket-shelf-overflow={overflow}
    >
      <LayersIcon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {shelf.map((thread) => (
          <button
            key={thread.id}
            type="button"
            title={`${thread.title} · ${thread.providerLabel}`}
            aria-label={`Open ${thread.title}`}
            onClick={() => props.onOpenThread(thread)}
            className={cn(
              "inline-flex min-w-0 max-w-36 shrink-0 items-center gap-1 rounded-md border border-border/55 bg-background/70 px-1.5 py-1 text-[11px] text-muted-foreground transition-colors",
              "hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
            )}
          >
            <span className="grid size-4 shrink-0 place-items-center" aria-hidden>
              {props.renderProviderMark?.(thread) ?? (
                <span className="text-[9px] font-semibold text-muted-foreground/80">
                  {thread.providerLabel.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <span className="truncate">{thread.title}</span>
            <ChevronRightIcon className="size-3 shrink-0 opacity-45" aria-hidden />
          </button>
        ))}
        {overflow > 0 ? (
          <span
            className="shrink-0 rounded-md px-1.5 py-1 text-[10px] font-medium text-muted-foreground/70"
            aria-label={`${overflow} more threads`}
            data-rune-pocket-shelf-overflow-label
          >
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}
