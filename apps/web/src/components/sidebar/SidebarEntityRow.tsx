import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

interface SidebarEntityRowProps {
  readonly variant: "thread" | "pocket";
  readonly depth?: number;
  readonly selected?: boolean;
  readonly children: ReactNode;
}

/** Shared geometry and state treatment for navigable sidebar entities. */
export function SidebarEntityRow(props: SidebarEntityRowProps) {
  return (
    <div
      data-rune-sidebar-entity={props.variant}
      className={cn(
        "group/sidebar-entity flex min-h-8 items-center gap-1 rounded-md border border-transparent px-1 text-sm transition-colors motion-reduce:transition-none",
        props.selected
          ? "border-sidebar-border/80 bg-sidebar-row-active text-sidebar-foreground"
          : "text-sidebar-muted-foreground hover:border-sidebar-border/60 hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
      )}
      style={
        props.depth === undefined ? undefined : { paddingInlineStart: `${props.depth * 12 + 4}px` }
      }
    >
      {props.children}
    </div>
  );
}
