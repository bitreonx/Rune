export interface RuneWorkspaceProjectInput {
  readonly environmentId: string;
  readonly id: string;
  readonly projectKey?: string;
  readonly title: string;
  readonly workspaceRoot: string;
  readonly updatedAt: string;
  readonly memberProjectRefs?: ReadonlyArray<{
    readonly environmentId: string;
    readonly projectId: string;
  }>;
}

export interface RuneWorkspaceThreadInput {
  readonly environmentId: string;
  readonly projectId: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
  /** Temporary chats never surface in landing cards. */
  readonly temporaryAt?: string | null;
}

export interface RuneWorkspaceProjectCard {
  readonly environmentId: string;
  readonly projectId: string;
  readonly projectKey: string;
  readonly title: string;
  readonly workspaceRoot: string;
  readonly workspaceLabel: string;
  readonly environmentLabel: string;
  readonly threadCount: number;
  readonly latestThreadTitle: string | null;
  readonly latestActivityAt: string;
}

export function buildRuneWorkspaceProjectCards(input: {
  readonly projects: ReadonlyArray<RuneWorkspaceProjectInput>;
  readonly threads: ReadonlyArray<RuneWorkspaceThreadInput>;
  readonly environmentLabels: ReadonlyMap<string, string>;
}): ReadonlyArray<RuneWorkspaceProjectCard> {
  return input.projects
    .map((project) => {
      const memberProjectRefs = project.memberProjectRefs ?? [
        { environmentId: project.environmentId, projectId: project.id },
      ];
      const memberProjectKeys = new Set(
        memberProjectRefs.map((projectRef) =>
          `${projectRef.environmentId}:${projectRef.projectId}`,
        ),
      );
      const projectThreads = input.threads
        .filter(
          (thread) =>
            memberProjectKeys.has(`${thread.environmentId}:${thread.projectId}`) &&
            thread.archivedAt === null &&
            thread.temporaryAt == null,
        )
        .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const latestThread = projectThreads[0] ?? null;

      return {
        environmentId: project.environmentId,
        projectId: project.id,
        projectKey: project.projectKey ?? `${project.environmentId}:${project.id}`,
        title: project.title,
        workspaceRoot: project.workspaceRoot,
        workspaceLabel: workspaceLabelFromRoot(project.workspaceRoot),
        environmentLabel: input.environmentLabels.get(project.environmentId) ?? "Environment",
        threadCount: projectThreads.length,
        latestThreadTitle: latestThread?.title ?? null,
        latestActivityAt: latestThread?.updatedAt ?? project.updatedAt,
      } satisfies RuneWorkspaceProjectCard;
    })
    .toSorted((a, b) => {
      const activityOrder = b.latestActivityAt.localeCompare(a.latestActivityAt);
      return activityOrder !== 0 ? activityOrder : a.title.localeCompare(b.title);
    });
}

function workspaceLabelFromRoot(workspaceRoot: string): string {
  const segments = workspaceRoot.split(/[\\/]+/).filter(Boolean);
  const lastSegment = segments.at(-1);
  return !lastSegment || lastSegment.endsWith(":") ? "Workspace" : lastSegment;
}
