import { FileDiff, Files, FlaskConical, Globe2, MessageSquare, TerminalSquare } from "lucide-react";

import type { AgentArtifactAvailability, AgentArtifactSurface } from "./agentDock.logic";

const ARTIFACTS: ReadonlyArray<{
  readonly key: AgentArtifactSurface;
  readonly label: string;
  readonly icon: typeof FileDiff;
  readonly unavailable: string;
}> = [
  { key: "diff", label: "Diff", icon: FileDiff, unavailable: "No repository diff is available." },
  { key: "files", label: "Files", icon: Files, unavailable: "Open a project to browse files." },
  {
    key: "terminal",
    label: "Terminal",
    icon: TerminalSquare,
    unavailable: "Open a project to use a terminal.",
  },
  {
    key: "browser",
    label: "Browser",
    icon: Globe2,
    unavailable: "Browser previews are unavailable here.",
  },
];

export function AgentArtifactBar({
  verificationActive,
  availability,
  onOpenSurface,
  onOpenVerification,
}: {
  readonly verificationActive: boolean;
  readonly availability?: AgentArtifactAvailability;
  readonly onOpenSurface?: (surface: AgentArtifactSurface) => void;
  readonly onOpenVerification: () => void;
}) {
  return (
    <nav
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/55 px-2 py-1"
      aria-label="Agent surfaces"
      data-rune-agent-artifact-bar
    >
      <button
        type="button"
        className={
          verificationActive
            ? "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            : "inline-flex shrink-0 items-center gap-1 rounded-sm bg-accent px-2 py-1 text-[10px] text-foreground"
        }
        onClick={() => onOpenVerification()}
        aria-current={!verificationActive ? "page" : undefined}
      >
        <MessageSquare aria-hidden className="size-3" />
        Agent
      </button>
      <button
        type="button"
        className={
          verificationActive
            ? "inline-flex shrink-0 items-center gap-1 rounded-sm bg-accent px-2 py-1 text-[10px] text-foreground"
            : "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        }
        onClick={() => onOpenVerification()}
        aria-current={verificationActive ? "page" : undefined}
      >
        <FlaskConical aria-hidden className="size-3" />
        Verification
      </button>
      {ARTIFACTS.map((artifact) => {
        const Icon = artifact.icon;
        const available = availability?.[artifact.key] === true && onOpenSurface !== undefined;
        return (
          <button
            key={artifact.key}
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => onOpenSurface?.(artifact.key)}
            disabled={!available}
            title={available ? `Open ${artifact.label}` : artifact.unavailable}
          >
            <Icon aria-hidden className="size-3" />
            {artifact.label}
          </button>
        );
      })}
    </nav>
  );
}
