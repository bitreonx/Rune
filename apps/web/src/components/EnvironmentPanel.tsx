import type {
  ActionProposalRecord,
  EnvironmentId,
  ProjectScript,
  ScopedThreadRef,
  VcsStatusResult,
} from "@rune/contracts";
import {
  ChevronRight,
  ExternalLink,
  FileDiff,
  FolderOpen,
  GitBranch,
  Globe2,
  Play,
  Server,
  TerminalSquare,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { ScriptIcon } from "./projectScriptEditor";
import {
  useDiscoveredLocalServers,
  type PreviewableServer,
} from "./preview/useDiscoveredLocalServers";
import { formatChangeSummary, summarizeEnvironmentChanges } from "./environmentSurface.logic";

type RegisteredActionRecord = {
  readonly action: {
    readonly id: string;
    readonly name: string;
    readonly description?: string | undefined;
  };
};

interface EnvironmentPanelProps {
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  readonly threadRef: ScopedThreadRef;
  readonly cwd: string | null;
  readonly chatDiff: ReadonlyArray<{
    readonly path: string;
    readonly insertions?: number;
    readonly deletions?: number;
  }> | null;
  readonly gitStatus: VcsStatusResult | null;
  readonly gitStatusPending: boolean;
  readonly gitStatusError: unknown;
  readonly scripts: ReadonlyArray<ProjectScript>;
  readonly registeredActions?: ReadonlyArray<RegisteredActionRecord> | undefined;
  readonly actionProposals?: ReadonlyArray<ActionProposalRecord> | undefined;
  readonly configuredPreviewUrls: ReadonlyArray<string>;
  readonly onOpenFiles: () => void;
  readonly onOpenDiff: () => void;
  readonly onOpenTerminal: () => void;
  readonly onOpenBrowser: () => void;
  readonly onRunScript: (script: ProjectScript) => void;
  readonly onRunAction?: (action: RegisteredActionRecord["action"]) => void;
  readonly onDecideActionProposal?: (
    proposalId: string,
    decision: "approve" | "reject" | "dismiss",
  ) => void;
  readonly onOpenServer: (server: PreviewableServer) => void;
  readonly onOpenExplorer: () => void;
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section
      className="border-b border-border/55 px-3 py-3 last:border-b-0"
      aria-labelledby={`environment-${props.title.toLowerCase()}`}
    >
      <h3
        id={`environment-${props.title.toLowerCase()}`}
        className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {props.title}
      </h3>
      <div className="overflow-hidden rounded-lg border border-border/55 bg-background/35">
        {props.children}
      </div>
    </section>
  );
}

function Row(props: {
  label: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/65 text-muted-foreground [&_svg]:size-3.5"
        aria-hidden
      >
        {props.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{props.label}</span>
        {props.description ? (
          <span className="block truncate text-[11px] text-muted-foreground">
            {props.description}
          </span>
        ) : null}
      </span>
      {props.trailing ?? (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}

function serverLabel(server: PreviewableServer): string {
  return server.processName || "Local server";
}

function ActionProposal(props: {
  proposal: ActionProposalRecord;
  onDecide?: EnvironmentPanelProps["onDecideActionProposal"];
}) {
  const { proposal } = props;
  return (
    <div className="border-b border-border/45 px-3 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-300"
          aria-hidden
        >
          <Play className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{proposal.proposal.action.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {proposal.proposal.reason}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => props.onDecide?.(proposal.proposal.proposalId, "approve")}
              className="rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => props.onDecide?.(proposal.proposal.proposalId, "reject")}
              className="rounded-md border border-border/70 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => props.onDecide?.(proposal.proposal.proposalId, "dismiss")}
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnvironmentPanel(props: EnvironmentPanelProps) {
  const servers = useDiscoveredLocalServers({
    environmentId: props.environmentId,
    configuredUrls: props.configuredPreviewUrls,
  });
  const changes = useMemo(
    () => summarizeEnvironmentChanges({ chatDiff: props.chatDiff, gitStatus: props.gitStatus }),
    [props.chatDiff, props.gitStatus],
  );
  const hasChanges = changes.files > 0 || changes.additions > 0 || changes.deletions > 0;
  const hasRepository = props.gitStatus?.isRepo === true;

  return (
    <div
      className="surface-glass flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/45"
      data-environment-panel
    >
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-[6px]">
        <div className="flex items-start gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-accent/55 text-foreground"
            aria-hidden
          >
            <Globe2 className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{props.environmentLabel}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {props.cwd ?? "No workspace selected"}
            </p>
          </div>
        </div>
      </header>

      {hasChanges ? (
        <Section title="Changes">
          <Row
            label={props.chatDiff ? "Changes in this chat" : "Workspace changes"}
            description={formatChangeSummary(changes)}
            icon={<FileDiff />}
            onClick={props.chatDiff ? props.onOpenDiff : props.onOpenFiles}
          />
        </Section>
      ) : null}

      {props.cwd ? (
        <Section title="Workspace">
          <Row
            label="Files"
            description="Browse, preview, and edit workspace files"
            icon={<FolderOpen />}
            onClick={props.onOpenFiles}
          />
          <Row
            label="Terminal"
            description="Open a shell in this workspace"
            icon={<TerminalSquare />}
            onClick={props.onOpenTerminal}
          />
          <Row
            label="Browser preview"
            description="Open a preview surface"
            icon={<Globe2 />}
            onClick={props.onOpenBrowser}
          />
          <Row
            label="Open in Explorer"
            description="Reveal the workspace folder"
            icon={<ExternalLink />}
            onClick={props.onOpenExplorer}
          />
        </Section>
      ) : null}

      {props.scripts.length > 0 ||
      (props.registeredActions?.length ?? 0) > 0 ||
      (props.actionProposals?.length ?? 0) > 0 ? (
        <Section title="Actions">
          {props.actionProposals?.map((proposal) => (
            <ActionProposal
              key={proposal.proposal.proposalId}
              proposal={proposal}
              onDecide={props.onDecideActionProposal}
            />
          ))}
          {props.registeredActions?.map((record) => (
            <button
              key={record.action.id}
              type="button"
              onClick={() => props.onRunAction?.(record.action)}
              className="flex min-h-11 w-full items-center gap-3 border-b border-border/45 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/65 text-muted-foreground"
                aria-hidden
              >
                <Play className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{record.action.name}</span>
                {record.action.description ? (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {record.action.description}
                  </span>
                ) : null}
              </span>
              <Play className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
          {props.scripts.map((script) => (
            <button
              key={script.id}
              type="button"
              onClick={() => props.onRunScript(script)}
              className="flex min-h-11 w-full items-center gap-3 border-b border-border/45 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/65 text-muted-foreground"
                aria-hidden
              >
                <ScriptIcon icon={script.icon} className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{script.name}</span>
              <Play className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </Section>
      ) : null}

      {servers.length > 0 ? (
        <Section title="Local servers">
          {servers.map((server) => (
            <Row
              key={`${server.host}:${server.port}`}
              label={serverLabel(server)}
              description={`${server.host}:${server.port}`}
              icon={<Server />}
              onClick={() => props.onOpenServer(server)}
              trailing={
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              }
            />
          ))}
        </Section>
      ) : null}

      {hasRepository ? (
        <Section title="Repository">
          <Row
            label={props.gitStatus?.refName ? `Branch · ${props.gitStatus.refName}` : "Repository"}
            description={
              props.gitStatus?.hasWorkingTreeChanges
                ? "Working tree has changes"
                : "Working tree clean"
            }
            icon={<GitBranch />}
            onClick={props.onOpenDiff}
          />
        </Section>
      ) : props.gitStatusPending ? (
        <div className="px-4 py-4 text-xs text-muted-foreground" role="status" aria-live="polite">
          Checking repository status…
        </div>
      ) : props.gitStatusError ? (
        <div className="px-4 py-4 text-xs text-destructive" role="alert">
          Repository status is unavailable.
        </div>
      ) : null}

      {!hasChanges &&
      !props.cwd &&
      props.scripts.length === 0 &&
      (props.registeredActions?.length ?? 0) === 0 &&
      (props.actionProposals?.length ?? 0) === 0 &&
      servers.length === 0 &&
      !hasRepository ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-xs text-muted-foreground">
          This environment has no project workspace yet.
        </div>
      ) : null}
    </div>
  );
}
