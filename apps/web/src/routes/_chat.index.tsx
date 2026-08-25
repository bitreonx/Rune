import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  FolderIcon,
  GitBranchIcon,
  LinkIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";

import { openCommandPalette } from "../commandPaletteBus";
import {
  buildRuneWorkspaceProjectCards,
  type RuneWorkspaceProjectCard,
} from "../components/runeWorkspaceLanding.logic";
import { ProjectFavicon } from "../components/ProjectFavicon";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../components/ui/empty";
import { SidebarInset } from "../components/ui/sidebar";
import { WorkspacePageHeader } from "../components/WorkspacePageHeader";
import { useClientSettings } from "../hooks/useSettings";
import { selectProjectGroupingSettings } from "../logicalProject";
import { buildSidebarProjectSnapshots } from "../sidebarProjectGrouping";
import {
  useAllEnvironmentShellsBootstrapped,
  useProjects,
  useThreadShells,
} from "../state/entities";
import { useEnvironments, usePrimaryEnvironmentId } from "../state/environments";
import { APP_BASE_NAME, APP_DISPLAY_NAME } from "~/branding";
import { hasCloudPublicConfig } from "~/cloud/publicConfig";

function ChatIndexRouteView() {
  const { authGateState } = Route.useRouteContext();
  const { environments } = useEnvironments();

  if (authGateState.status === "hosted-static" && environments.length === 0) {
    return <HostedStaticOnboardingState />;
  }

  return <IndexWorkspaceLanding />;
}

/**
 * RUNE starts with the workspace map instead of silently opening a draft. It
 * keeps the project boundary visible, which makes multi-environment work feel
 * intentional and gives new users a useful home before they pick a task.
 */
function IndexWorkspaceLanding() {
  const navigate = useNavigate();
  const projects = useProjects();
  const threads = useThreadShells();
  const bootstrapped = useAllEnvironmentShellsBootstrapped();
  const { environments } = useEnvironments();
  const projectGroupingSettings = useClientSettings(selectProjectGroupingSettings);
  const primaryEnvironmentId = usePrimaryEnvironmentId();

  const environmentLabels = useMemo(
    () => new Map(environments.map((environment) => [environment.environmentId, environment.label])),
    [environments],
  );

  if (!bootstrapped) {
    return null;
  }

  const projectGroups = buildSidebarProjectSnapshots({
    projects,
    settings: projectGroupingSettings,
    primaryEnvironmentId,
    resolveEnvironmentLabel: (environmentId) => environmentLabels.get(environmentId) ?? null,
  });
  const cards = buildRuneWorkspaceProjectCards({
    projects: projectGroups.map((group) => ({
      environmentId: group.environmentId,
      id: group.id,
      projectKey: group.projectKey,
      title: group.displayName,
      workspaceRoot: group.workspaceRoot,
      updatedAt: group.updatedAt,
      memberProjectRefs: group.memberProjectRefs,
    })),
    threads,
    environmentLabels,
  });

  if (cards.length === 0) {
    return <NoProjectsHero />;
  }

  const openProject = (card: RuneWorkspaceProjectCard) => {
    void navigate({
      to: "/projects/$projectKey/workspace",
      params: { projectKey: card.projectKey },
    });
  };

  return <RuneWorkspaceLanding cards={cards} projects={projects} onOpenProject={openProject} />;
}

function NoProjectsHero() {
  const openAddProject = useCallback(() => openCommandPalette({ open: "add-project" }), []);

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader className="border-b border-border/70">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tracking-[0.16em]">{APP_BASE_NAME}</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span>First run</span>
          </div>
        </WorkspacePageHeader>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-10 sm:px-8">
          <Card className="w-full max-w-2xl overflow-hidden border-border/70 bg-card/55 shadow-sm/5">
            <div className="grid gap-8 p-7 sm:grid-cols-[minmax(0,1fr)_12rem] sm:p-10">
              <div>
                <div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <SparklesIcon className="size-5" />
                </div>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.18em]">
                  {APP_BASE_NAME} workspace
                </p>
                <h1 className="mt-3 text-balance font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                  Give your next build a home.
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Projects keep code, agents, and conversations together. Add a workspace once, then
                  return to the work without losing the thread.
                </p>
                <Button className="mt-7" size="lg" onClick={openAddProject}>
                  <PlusIcon className="size-4" />
                  Add your first project
                </Button>
              </div>

              <div className="flex flex-col justify-end border-border/70 border-t pt-5 sm:border-t-0 sm:border-l sm:pl-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FolderIcon className="size-4" />
                  <span className="text-xs font-medium">One clear starting point</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground/70">
                  Local folders and connected environments stay visible in the same workspace map.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}

function RuneWorkspaceLanding(input: {
  readonly cards: ReadonlyArray<RuneWorkspaceProjectCard>;
  readonly projects: ReadonlyArray<ReturnType<typeof useProjects>[number]>;
  readonly onOpenProject: (card: RuneWorkspaceProjectCard) => void;
}) {
  const openAddProject = useCallback(() => openCommandPalette({ open: "add-project" }), []);
  const projectByKey = useMemo(
    () => {
      const byKey = new Map<string, ReturnType<typeof useProjects>[number]>();
      for (const project of input.projects) {
        byKey.set(`${project.environmentId}:${project.id}`, project);
      }
      return byKey;
    },
    [input.projects],
  );
  const threadCount = input.cards.reduce((total, card) => total + card.threadCount, 0);

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader className="border-b border-border/70">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tracking-[0.16em]">{APP_BASE_NAME}</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span className="truncate">Workspace map</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden sm:inline-flex" variant="outline">
              {input.cards.length} {input.cards.length === 1 ? "project" : "projects"}
            </Badge>
            <Button size="sm" variant="outline" onClick={openAddProject}>
              <PlusIcon className="size-4" />
              New project
            </Button>
          </div>
        </WorkspacePageHeader>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
            <section className="grid gap-8 border-border/70 border-b pb-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
              <div>
                <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-primary uppercase tracking-[0.18em]">
                  <SparklesIcon className="size-3.5" />
                  {APP_BASE_NAME} workspace
                </div>
                <h1 className="max-w-3xl text-balance font-semibold text-4xl text-foreground tracking-[-0.04em] sm:text-5xl">
                  Start from the work that matters.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Every project is a launchpad for agents, files, and conversations. Pick a workspace
                  to continue, or add a new one when the next idea deserves its own room.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-border/70 bg-card/35 p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.16em]">
                    Workspaces
                  </p>
                  <p className="mt-2 font-semibold text-2xl text-foreground">{input.cards.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Ready when you are.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/35 p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.16em]">
                    Threads
                  </p>
                  <p className="mt-2 font-semibold text-2xl text-foreground">{threadCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Context kept close.</p>
                </div>
              </div>
            </section>

            <section className="pt-8" aria-labelledby="rune-recent-workspaces">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.16em]">
                    Your map
                  </p>
                  <h2 id="rune-recent-workspaces" className="mt-1 font-semibold text-lg text-foreground">
                    Continue in a workspace
                  </h2>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Sorted by latest activity
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {input.cards.map((card, index) => (
                  <RuneWorkspaceProjectCardView
                    key={`${card.environmentId}:${card.projectId}`}
                    card={card}
                    index={index}
                    project={projectByKey.get(`${card.environmentId}:${card.projectId}`)}
                    onOpen={() => input.onOpenProject(card)}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}

function RuneWorkspaceProjectCardView(input: {
  readonly card: RuneWorkspaceProjectCard;
  readonly index: number;
  readonly project: ReturnType<typeof useProjects>[number] | undefined;
  readonly onOpen: () => void;
}) {
  return (
    <Card className="group overflow-hidden border-border/70 bg-card/45 shadow-sm/5 transition-colors hover:border-primary/45 hover:bg-card">
      <button
        type="button"
        className="flex min-h-52 w-full cursor-pointer flex-col p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={input.onOpen}
        aria-label={`Open ${input.card.title} workspace`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground">
              {input.project ? (
                <ProjectFavicon
                  environmentId={input.project.environmentId}
                  cwd={input.project.workspaceRoot}
                  faviconPath={input.project.faviconPath}
                  className="size-5"
                  fallbackIcon={FolderIcon}
                />
              ) : (
                <FolderIcon className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{input.card.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {input.card.environmentLabel}
              </p>
            </div>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground/60 transition-colors group-hover:border-border group-hover:text-foreground">
            <ArrowUpRightIcon className="size-4" />
          </span>
        </div>

        <div className="mt-7 min-w-0">
          <p className="truncate font-mono text-xs text-muted-foreground/80" title={input.card.workspaceRoot}>
            {input.card.workspaceRoot}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranchIcon className="size-3.5" />
            <span>
              {input.card.threadCount === 0
                ? "No threads yet"
                : `${input.card.threadCount} ${input.card.threadCount === 1 ? "thread" : "threads"}`}
            </span>
          </div>
        </div>

        <div className="mt-auto border-border/60 border-t pt-4">
          <p className="truncate text-xs text-muted-foreground/80">
            {input.card.latestThreadTitle
              ? `Continue “${input.card.latestThreadTitle}”`
              : "Start the first thread in this workspace"}
          </p>
          <p className="mt-2 text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Open workspace <span aria-hidden="true">→</span>
          </p>
        </div>
      </button>
    </Card>
  );
}

export const Route = createFileRoute("/_chat/")({
  component: ChatIndexRouteView,
});

function HostedStaticOnboardingState() {
  const cloudEnabled = hasCloudPublicConfig();

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground md:text-muted-foreground/60">
              {APP_DISPLAY_NAME}
            </span>
          </div>
        </WorkspacePageHeader>

        <Empty className="flex-1">
          <div className="w-full max-w-xl rounded-3xl border border-border/55 bg-card/20 px-8 py-12 shadow-sm/5">
            <EmptyHeader className="max-w-none">
              <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground">
                <LinkIcon className="size-5" />
              </div>
              <EmptyTitle className="text-foreground text-xl">
                Connect an environment to get started
              </EmptyTitle>
              <EmptyDescription className="mt-2 text-sm leading-relaxed text-muted-foreground/78">
                {cloudEnabled
                  ? "Sign in to RUNE Connect to connect a linked environment through its managed tunnel, or add a reachable backend manually."
                  : "Add a reachable backend manually to start working from this browser."}
              </EmptyDescription>
              <div className="mt-6 flex justify-center">
                <Button render={<Link to="/settings/connections" />} size="sm">
                  <PlusIcon className="size-4" />
                  {cloudEnabled ? "Open Connections" : "Add environment"}
                </Button>
              </div>
            </EmptyHeader>
          </div>
        </Empty>
      </div>
    </SidebarInset>
  );
}
