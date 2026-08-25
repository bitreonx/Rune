export interface RuneProjectWorkspaceGroupInput {
  readonly projectKey: string;
  readonly displayName: string;
  readonly workspaceRoot: string;
  readonly updatedAt: string;
  readonly memberProjects: ReadonlyArray<{
    readonly environmentId: string;
    readonly id: string;
    readonly environmentLabel: string | null;
  }>;
}

export interface RuneProjectWorkspaceThreadInput {
  readonly environmentId: string;
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
  /** Temporary chats never surface in project overviews. */
  readonly temporaryAt?: string | null;
}

export interface RuneProjectWorkspaceModel<
  TThread extends RuneProjectWorkspaceThreadInput = RuneProjectWorkspaceThreadInput,
> {
  readonly projectKey: string;
  readonly title: string;
  readonly workspaceRoot: string;
  readonly threadCount: number;
  readonly environmentCount: number;
  readonly latestActivityAt: string;
  readonly environmentLabels: ReadonlyArray<string>;
  readonly threads: ReadonlyArray<TThread>;
}

export function buildRuneProjectWorkspaceModel<
  TThread extends RuneProjectWorkspaceThreadInput,
>(input: {
  readonly group: RuneProjectWorkspaceGroupInput;
  readonly threads: ReadonlyArray<TThread>;
}): RuneProjectWorkspaceModel<TThread> {
  const memberProjectKeys = new Set(
    input.group.memberProjects.map(
      (project) => `${project.environmentId}:${project.id}`,
    ),
  );
  const threads = input.threads
    .filter(
      (thread) =>
        thread.archivedAt === null &&
        thread.temporaryAt == null &&
        memberProjectKeys.has(`${thread.environmentId}:${thread.projectId}`),
    )
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const environmentLabels = input.group.memberProjects
    .map((project) => project.environmentLabel)
    .filter((label): label is string => label !== null && label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index);

  return {
    projectKey: input.group.projectKey,
    title: input.group.displayName,
    workspaceRoot: input.group.workspaceRoot,
    threadCount: threads.length,
    environmentCount: input.group.memberProjects.length,
    latestActivityAt: threads[0]?.updatedAt ?? input.group.updatedAt,
    environmentLabels,
    threads,
  };
}
