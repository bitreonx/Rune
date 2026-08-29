import { useState } from "react";
import type { AgentActivity } from "@rune/shared/agentActivity";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { ChangeReceipt } from "./ChangeReceipt";
import { deriveChangePulseModel } from "./ChangePulse.logic";

export function ChangePulse(props: {
  readonly job: AgentActivity;
  readonly workspaceRoot: string | undefined;
  readonly onOpenFile: (relativePath: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const model = deriveChangePulseModel(props.job);
  if (!model) return null;

  return (
    <div className="ms-7 mt-1 max-w-full" data-change-pulse="true">
      <button
        type="button"
        aria-expanded={expanded}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/55 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground transition-colors",
          "hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        )}
        onClick={() => setExpanded((value) => !value)}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="tabular-nums">
          {model.fileCount} file{model.fileCount === 1 ? "" : "s"} · +{model.additions} −
          {model.deletions}
        </span>
        <span className="text-foreground/80">· {model.phaseLabel}</span>
        {model.verificationLabel ? (
          <span className="text-success">· {model.verificationLabel}</span>
        ) : (
          <span>· {model.stateLabel}</span>
        )}
        <ChevronDownIcon
          className={cn("size-3 transition-transform duration-200", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
      {expanded ? (
        <ChangeReceipt
          job={props.job}
          workspaceRoot={props.workspaceRoot}
          onOpenFile={props.onOpenFile}
        />
      ) : null}
    </div>
  );
}
