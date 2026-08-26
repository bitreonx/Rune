import { scopeProjectRef } from "@rune/client-runtime/environment";
import type { EnvironmentThreadShell } from "@rune/client-runtime/state/models";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BotIcon,
  CloudIcon,
  Code2Icon,
  FileCode2Icon,
  FolderGit2Icon,
  FolderIcon,
  GitBranchIcon,
  Layers3Icon,
  MessageSquareTextIcon,
  PlusIcon,
  Settings2Icon,
  TerminalIcon,
  WorkflowIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";

import { APP_BASE_NAME } from "../branding";
import { useClientSettings } from "../hooks/useSettings";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { formatRelativeTimeLabel } from "../timestampFormat";
import { selectProjectGroupingSettings } from "../logicalProject";
import {
  buildSidebarProjectSnapshots,
  type SidebarProjectSnapshot,
} from "../sidebarProjectGrouping";
import {
  useProjects,
  useThreadShellsForProjectRefs,
} from "../state/entities";
import { useEnvironments, usePrimaryEnvironmentId } from "../state/environments";
import { isElectron } from "../env";
import {
  buildRuneProjectWorkspaceModel,
  type RuneProjectWorkspaceModel,
} from "./runeProjectWorkspace.logic";
import { ProjectFavicon } from "./ProjectFavicon";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { SidebarInset } from "./ui/sidebar";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

const EMPTY_PROJECT_REFS: ReadonlyArray<SidebarProjectSnapshot["memberProjectRefs"][number]> = [];

export function RuneProjectWorkspace({ projectKey }: { readonly projectKey: string }) {
  const projects = useProjects();
  const projectGroupingSettings = useClientSettings(selectProjectGroupingSettings);
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const { environments } = useEnvironments();
  const environmentLabels = useMemo(
    () => new Map(environments.map((environment) => [environment.environmentId, environment.label])),
    [environments],
  );
  const groups = useMemo(
    () =>
      buildSidebarProjectSnapshots({
        projects,
        settings: projectGroupingSettings,
        primaryEnvironmentId,
        resolveEnvironmentLabel: (environmentId) => environmentLabels.get(environmentId) ?? null,
      }),
    [environmentLabels, primaryEnvironmentId, projectGroupingSettings, projects],
  );
  const group = useMemo(
    () =>
      groups.find((candidate) => candidate.projectKey === projectKey) ??
      groups.find((candidate) =>
        candidate.memberProjects.some(
          (member) => member.physicalProjectKey === projectKey,
        ),
      ) ??
      null,
    [groups, projectKey],
  );
  const projectRefs = group?.memberProjectRefs ?? EMPTY_PROJECT_REFS;
  const threadShells = useThreadShellsForProjectRefs(projectRefs);
  const model = useMemo(
    () =>
      group
        ? buildRuneProjectWorkspaceModel({
            group: {
              projectKey: group.projectKey,
              displayName: group.displayName,
              workspaceRoot: group.workspaceRoot,
              updatedAt: group.updatedAt,
              memberProjects: group.memberProjects.map((member) => ({
                environmentId: member.environmentId,
                id: member.id,
                environmentLabel: member.environmentLabel,
              })),
            },
            threads: threadShells,
          })
        : null,
    [group, threadShells],
  );

  if (!group || !model) {
    return <RuneProjectWorkspaceMissing />;
  }

  return <RuneProjectWorkspaceView group={group} model={model} />;
}

function RuneProjectWorkspaceView({
  group,
  model,
}: {
  readonly group: SidebarProjectSnapshot;
  readonly model: RuneProjectWorkspaceModel<EnvironmentThreadShell>;
}) {
  const handleNewThread = useNewThreadHandler();
  const openNewThread = useCallback(() => {
    void handleNewThread(scopeProjectRef(group.environmentId, group.id));
  }, [group.environmentId, group.id, handleNewThread]);
  const environmentLabelById = useMemo(
    () =>
      new Map(
        group.memberProjects.map((member) => [
          `${member.environmentId}:${member.id}`,
          member.environmentLabel ?? "Environment",
        ]),
      ),
    [group.memberProjects],
  );
  const surfaceCards = [
    {
      label: "Files",
      detail: "Inspect the project without leaving its thread context.",
      icon: FileCode2Icon,
    },
    {
      label: "Terminal",
      detail: "Run commands against the selected checkout.",
      icon: TerminalIcon,
    },
    {
      label: "Agents",
      detail: "Delegate work and keep execution visible.",
      icon: BotIcon,
    },
    {
      label: "Browser",
      detail: "Preview the running surface when available.",
      icon: WorkflowIcon,
    },
  ] as const;

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground isolate">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border/70">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Link
              to="/"
              className="font-semibold text-foreground tracking-[0.16em] transition-colors hover:text-primary"
            >
              {APP_BASE_NAME}
            </Link>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span className="truncate">Workspace</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span className="truncate text-foreground">{model.title}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              render={
                <Link
                  to="/projects/$projectKey"
                  params={{ projectKey: group.projectKey }}
                />
              }
              size="sm"
              variant="ghost"
              aria-label="Open project settings"
            >
              <Settings2Icon className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button size="sm" onClick={openNewThread}>
              <PlusIcon className="size-4" />
              New thread
            </Button>
          </div>
        </WorkspacePageHeader>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
            <section className="border-border/70 border-b pb-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                    <ProjectFavicon
                      environmentId={group.environmentId}
                      cwd={group.workspaceRoot}
                      faviconPath={group.faviconPath}
                      className="size-7"
                      fallbackIcon={FolderGit2Icon}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-primary uppercase tracking-[0.18em]">
                      <Layers3Icon className="size-3.5" />
                      Project workspace
                    </div>
                    <h1 className="truncate font-semibold text-3xl text-foreground tracking-[-0.04em] sm:text-4xl">
                      {model.title}
                    </h1>
                    <p className="mt-2 max-w-3xl truncate font-mono text-xs text-muted-foreground sm:text-sm">
                      {model.workspaceRoot}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    <FolderIcon className="size-3" />
                    {model.environmentCount} {model.environmentCount === 1 ? "checkout" : "checkouts"}
                  </Badge>
                  <Badge variant="outline">
                    <MessageSquareTextIcon className="size-3" />
                    {model.threadCount} {model.threadCount === 1 ? "thread" : "threads"}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CloudIcon className="size-3.5" />
                  {model.environmentLabels.length > 0
                    ? model.environmentLabels.join(" · ")
                    : "Connected environment"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GitBranchIcon className="size-3.5" />
                  Last activity {formatRelativeTimeLabel(model.latestActivityAt)}
                </span>
                {group.repositoryIdentity?.displayName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Code2Icon className="size-3.5" />
                    {group.repositoryIdentity.displayName}
                  </span>
                ) : null}
              </div>
            </section>

            <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
              <section aria-labelledby="rune-project-threads">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.16em]">
                      Project history
                    </p>
                    <h2 id="rune-project-threads" className="mt-1 font-semibold text-lg text-foreground">
                      Threads in this workspace
                    </h2>
                  </div>
                  <Button size="sm" variant="outline" onClick={openNewThread}>
                    <PlusIcon className="size-4" />
                    New thread
                  </Button>
                </div>

                <Card className="overflow-hidden border-border/70 bg-card/45 shadow-sm/5">
                  {model.threads.length > 0 ? (
                    <div className="divide-y divide-border/60">
                      {model.threads.map((thread) => (
                        <WorkspaceThreadRow
                          key={`${thread.environmentId}:${thread.id}`}
                          thread={thread}
                          environmentLabel={
                            environmentLabelById.get(`${thread.environmentId}:${thread.projectId}`) ??
                            "Environment"
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-4 px-6 py-10">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground">
                        <MessageSquareTextIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Start with a clean thread.</h3>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                          Keep the project boundary stable while each thread focuses on one outcome.
                        </p>
                      </div>
                      <Button onClick={openNewThread}>
                        <PlusIcon className="size-4" />
                        Start first thread
                      </Button>
                    </div>
                  )}
                </Card>
              </section>

              <aside className="space-y-4">
                <Card className="border-border/70 bg-card/35 p-4 shadow-sm/5">
                  <div className="flex items-center gap-2">
                    <Layers3Icon className="size-4 text-primary" />
                    <h2 className="font-semibold text-sm text-foreground">Workspace surfaces</h2>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    The project stays stable while each thread can open the tools it needs.
                  </p>
                  <div className="mt-4 space-y-1">
                    {surfaceCards.map((surface) => (
                      <div
                        key={surface.label}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5"
                      >
                        <surface.icon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{surface.label}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/75">
                            {surface.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border-border/70 bg-card/35 p-4 shadow-sm/5">
                  <div className="flex items-center gap-2">
                    <FolderGit2Icon className="size-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm text-foreground">Project boundary</h2>
                  </div>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground/70">Repository</dt>
                      <dd className="mt-1 truncate text-foreground">
                        {group.repositoryIdentity?.displayName ?? "Workspace folder"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground/70">Root</dt>
                      <dd className="mt-1 truncate font-mono text-[11px] text-foreground">
                        {model.workspaceRoot}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    render={
                      <Link
                        to="/projects/$projectKey"
                        params={{ projectKey: group.projectKey }}
                      />
                    }
                    className="mt-4 w-full"
                    size="sm"
                    variant="outline"
                  >
                    <Settings2Icon className="size-4" />
                    Project settings
                  </Button>
                </Card>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}

function WorkspaceThreadRow({
  thread,
  environmentLabel,
}: {
  readonly thread: EnvironmentThreadShell;
  readonly environmentLabel: string;
}) {
  const status = threadStatus(thread);
  return (
    <Link
      to="/$environmentId/$threadId"
      params={{ environmentId: thread.environmentId, threadId: thread.id }}
      className="group flex min-h-20 items-center gap-3 px-5 py-4 outline-none transition-colors hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground">
        <MessageSquareTextIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{thread.title}</p>
          {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground/80">
          <span className="truncate">{environmentLabel}</span>
          {thread.branch ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate font-mono">{thread.branch}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{formatRelativeTimeLabel(thread.updatedAt)}</span>
        </div>
      </div>
      <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
    </Link>
  );
}

function threadStatus(thread: EnvironmentThreadShell):
  | { readonly label: string; readonly variant: "default" | "outline" | "secondary" | "destructive" }
  | null {
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) {
    return { label: "Needs attention", variant: "destructive" };
  }
  if (thread.backgroundLiveness === "working") {
    return { label: "Working", variant: "default" };
  }
  if (thread.hasActionableProposedPlan) {
    return { label: "Plan ready", variant: "secondary" };
  }
  return null;
}

function RuneProjectWorkspaceMissing() {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground isolate">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border/70">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-foreground tracking-[0.16em]"
          >
            <ArrowLeftIcon className="size-3.5" />
            {APP_BASE_NAME}
          </Link>
        </WorkspacePageHeader>
        <Empty className="flex-1">
          <EmptyHeader>
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground">
              <FolderIcon className="size-5" />
            </div>
            <EmptyTitle className="text-foreground">Workspace not found</EmptyTitle>
            <EmptyDescription className="mt-2 text-muted-foreground">
              This project may have moved or is still reconnecting. Return to the workspace map to
              choose another project.
            </EmptyDescription>
            <Button render={<Link to="/" />} className="mt-5">
              <ArrowLeftIcon className="size-4" />
              Back to workspace map
            </Button>
          </EmptyHeader>
        </Empty>
      </div>
    </SidebarInset>
  );
}
