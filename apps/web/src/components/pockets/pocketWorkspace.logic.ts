export type PocketThreadStatus = "working" | "waiting" | "needs-you" | "done";

export interface PocketWorkspaceThreadData {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly createdAt: string;
  readonly status: PocketThreadStatus;
  readonly pinned: boolean;
  readonly providerLabel: string;
  readonly subtitle?: string;
}

export type PocketWorkspaceSort = "activity" | "title" | "created";

const STATUS_PRIORITY: Record<PocketThreadStatus, number> = {
  "needs-you": 4,
  working: 3,
  waiting: 2,
  done: 1,
};

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareRecent(left: PocketWorkspaceThreadData, right: PocketWorkspaceThreadData): number {
  return timestamp(right.updatedAt) - timestamp(left.updatedAt) || left.id.localeCompare(right.id);
}

export function sortPocketThreads(
  threads: ReadonlyArray<PocketWorkspaceThreadData>,
  sort: PocketWorkspaceSort,
): PocketWorkspaceThreadData[] {
  return [...threads].sort((left, right) => {
    if (sort === "title")
      return left.title.localeCompare(right.title) || compareRecent(left, right);
    if (sort === "created") {
      return (
        timestamp(right.createdAt) - timestamp(left.createdAt) || left.id.localeCompare(right.id)
      );
    }
    return (
      STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status] ||
      Number(right.pinned) - Number(left.pinned) ||
      compareRecent(left, right)
    );
  });
}

export function filterPocketThreads(
  threads: ReadonlyArray<PocketWorkspaceThreadData>,
  query: string,
): PocketWorkspaceThreadData[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length === 0) return [...threads];
  return threads.filter((thread) =>
    [thread.title, thread.providerLabel, thread.subtitle]
      .filter((value): value is string => value !== undefined)
      .some((value) => value.toLocaleLowerCase().includes(normalized)),
  );
}

/**
 * The shelf is deliberately bounded. A Pocket can contain hundreds of
 * threads, but the quick-switch surface only needs the threads most likely to
 * need attention or to be reopened.
 */
export function selectPocketShelfThreads(
  threads: ReadonlyArray<PocketWorkspaceThreadData>,
  limit = 6,
): PocketWorkspaceThreadData[] {
  if (limit <= 0) return [];
  const selected: PocketWorkspaceThreadData[] = [];
  const seen = new Set<string>();
  const add = (thread: PocketWorkspaceThreadData | undefined) => {
    if (thread && !seen.has(thread.id)) {
      seen.add(thread.id);
      selected.push(thread);
    }
  };
  const ordered = sortPocketThreads(threads, "activity");
  for (const thread of ordered) if (thread.pinned) add(thread);
  for (const thread of ordered) {
    if (thread.status === "working" || thread.status === "needs-you") add(thread);
  }
  for (const thread of [...threads].sort(compareRecent)) add(thread);
  return selected.slice(0, limit);
}

export function groupPocketThreads(
  threads: ReadonlyArray<PocketWorkspaceThreadData>,
): ReadonlyArray<{
  readonly status: PocketThreadStatus;
  readonly threads: PocketWorkspaceThreadData[];
}> {
  return (["working", "waiting", "needs-you", "done"] as const).map((status) => ({
    status,
    threads: sortPocketThreads(
      threads.filter((thread) => thread.status === status),
      "activity",
    ),
  }));
}
