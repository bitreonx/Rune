import type { AgentActivity } from "@rune/shared/agentActivity";

import { cn } from "~/lib/utils";
import { changedFileName } from "./changedFilesPresentation";
import { formatWorkspaceRelativePath } from "../../filePathDisplay";

export function ChangeReceipt(props: {
  readonly job: AgentActivity;
  readonly workspaceRoot: string | undefined;
  readonly onOpenFile: (relativePath: string) => void;
}) {
  return (
    <div
      className="mt-1 grid gap-1 border-s border-border/45 ps-3 pt-0.5"
      data-change-receipt="true"
    >
      {props.job.changes.map((change) => {
        const displayPath = formatWorkspaceRelativePath(change.path, props.workspaceRoot);
        return (
          <button
            key={change.id}
            type="button"
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            onClick={() => props.onOpenFile(change.path)}
          >
            <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground" title={displayPath}>
              {changedFileName(change.path)}
            </span>
            <span className="shrink-0 tabular-nums font-mono">
              <span className={cn(change.additions > 0 ? "text-success" : "text-muted-foreground/60")}>
                +{change.additions}
              </span>{" "}
              <span className={cn(change.deletions > 0 ? "text-destructive" : "text-muted-foreground/60")}>
                −{change.deletions}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
