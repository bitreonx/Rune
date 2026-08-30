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

export const POCKET_SHELF_MIN_ITEMS = 5;
export const POCKET_SHELF_MAX_ITEMS = 7;
export const POCKET_SHELF_DEFAULT_ITEMS = 6;

/** Shared surface-state vocabulary used by closed sidebar rows, hover peeks, and the workspace. */
export const POCKET_SURFACE_STATES = ["closed", "hover", "open"] as const;
export type PocketSurfaceState = (typeof POCKET_SURFACE_STATES)[number];

/** Stable hooks for the one-shot Pocket open morph. Keep these finite and ordered. */
export const POCKET_MOTION_PHASES = [
  "acknowledge",
  "lip-lift",
  "geometry-morph",
  "clip-reveal",
  "settle",
] as const;

export type PocketMotionPhase = (typeof POCKET_MOTION_PHASES)[number];
export const POCKET_MOTION_SEQUENCE = POCKET_MOTION_PHASES.join(" -> ");

export const POCKET_MOTION_BOUNDARIES_MS = [80, 180, 320, 520] as const;

/**
 * Project elapsed time onto the finite Pocket open sequence. Keeping this
 * pure makes the visual state testable without sleeping in tests; the React
 * surface advances it with one-shot timers.
 */
export function resolvePocketMotionPhase(
  elapsedMs: number,
  reducedMotion: boolean,
): PocketMotionPhase {
  if (reducedMotion || !Number.isFinite(elapsedMs) || elapsedMs < 0) return "settle";
  const boundary = POCKET_MOTION_BOUNDARIES_MS.findIndex((value) => elapsedMs < value);
  return POCKET_MOTION_PHASES[boundary < 0 ? POCKET_MOTION_PHASES.length - 1 : boundary]!;
}

export function clampPocketShelfLimit(limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.max(Math.floor(limit), POCKET_SHELF_MIN_ITEMS), POCKET_SHELF_MAX_ITEMS);
}

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
  limit = POCKET_SHELF_DEFAULT_ITEMS,
): PocketWorkspaceThreadData[] {
  const shelfLimit = clampPocketShelfLimit(limit);
  if (shelfLimit === 0) return [];
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
  return selected.slice(0, shelfLimit);
}

export interface PocketShelfProjection {
  readonly threads: PocketWorkspaceThreadData[];
  readonly overflow: number;
}

export function projectPocketShelf(
  threads: ReadonlyArray<PocketWorkspaceThreadData>,
  limit = POCKET_SHELF_DEFAULT_ITEMS,
): PocketShelfProjection {
  const selected = selectPocketShelfThreads(threads, limit);
  const uniqueThreadCount = new Set(threads.map((thread) => thread.id)).size;
  return {
    threads: selected,
    overflow: Math.max(0, uniqueThreadCount - selected.length),
  };
}

/**
 * A closed Pocket only exposes a small preview. Keep the same priority order
 * as the shelf, but cap it more aggressively so the sidebar remains a rail,
 * not a second thread list.
 */
export function selectPocketPeekThreads(
  threads: ReadonlyArray<PocketWorkspaceThreadData>,
  limit = 4,
): PocketWorkspaceThreadData[] {
  return selectPocketShelfThreads(threads, Math.max(0, limit)).slice(0, 4);
}

/** Keep thread and child-pocket rows inside one bounded hover surface. */
export function pocketPeekChildLimit(
  visibleThreadCount: number,
  childPocketCount: number,
  maxItems = 4,
): number {
  return Math.max(0, Math.min(childPocketCount, maxItems - Math.max(0, visibleThreadCount)));
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
