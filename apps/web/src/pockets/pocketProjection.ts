import type { EnvironmentId, PocketId, PocketSnapshot } from "@rune/contracts";

import { scopeThreadRef, scopedThreadKey } from "@rune/client-runtime/environment";

export type PocketView = "flow" | "compact" | "board";
export type PocketSort = "activity" | "title" | "created";

export interface PocketViewState {
  readonly view: PocketView;
  readonly sort: PocketSort;
  /** Search belongs to the Pocket surface, so reopening it should not clear it. */
  readonly query?: string;
  readonly lastThreadKey?: string;
  readonly scrollTop?: number;
  readonly expandedChildPocketIds: ReadonlyArray<PocketId>;
}

export const DEFAULT_POCKET_VIEW_STATE: PocketViewState = {
  view: "flow",
  sort: "activity",
  expandedChildPocketIds: [],
};

export function sanitizePocketViewState(value: unknown): PocketViewState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_POCKET_VIEW_STATE;
  }
  const candidate = value as Record<string, unknown>;
  const view = candidate.view;
  const sort = candidate.sort;
  const expanded = candidate.expandedChildPocketIds;
  return {
    view: view === "compact" || view === "board" ? view : "flow",
    sort: sort === "title" || sort === "created" ? sort : "activity",
    ...(typeof candidate.query === "string" ? { query: candidate.query } : {}),
    ...(typeof candidate.lastThreadKey === "string" && candidate.lastThreadKey.length > 0
      ? { lastThreadKey: candidate.lastThreadKey }
      : {}),
    ...(typeof candidate.scrollTop === "number" &&
    Number.isFinite(candidate.scrollTop) &&
    candidate.scrollTop >= 0
      ? { scrollTop: candidate.scrollTop }
      : {}),
    expandedChildPocketIds: Array.isArray(expanded)
      ? expanded.filter((id): id is PocketId => typeof id === "string" && id.length > 0)
      : [],
  };
}

const pocketViewStateStorageKey = (pocketId: PocketId): string => `rune:pocket-view:v1:${pocketId}`;

export function readPocketViewState(pocketId: PocketId): PocketViewState {
  if (typeof window === "undefined") return DEFAULT_POCKET_VIEW_STATE;
  try {
    const raw = window.localStorage.getItem(pocketViewStateStorageKey(pocketId));
    return raw === null ? DEFAULT_POCKET_VIEW_STATE : sanitizePocketViewState(JSON.parse(raw));
  } catch {
    return DEFAULT_POCKET_VIEW_STATE;
  }
}

export function writePocketViewState(pocketId: PocketId, state: PocketViewState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pocketViewStateStorageKey(pocketId), JSON.stringify(state));
  } catch {
    // Storage is a preference, never a reason to break the Pocket workspace.
  }
}

export function pocketDescendantIds(
  snapshot: PocketSnapshot,
  pocketId: PocketId,
): ReadonlySet<PocketId> {
  const descendants = new Set<PocketId>([pocketId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pocket of snapshot.pockets) {
      if (
        pocket.parentPocketId !== null &&
        descendants.has(pocket.parentPocketId) &&
        !descendants.has(pocket.id)
      ) {
        descendants.add(pocket.id);
        changed = true;
      }
    }
  }
  return descendants;
}

export function pocketThreadKeys(
  snapshot: PocketSnapshot,
  environmentId: EnvironmentId,
  pocketId: PocketId,
): ReadonlySet<string> {
  const ids = pocketDescendantIds(snapshot, pocketId);
  return new Set(
    snapshot.threadMemberships
      .filter((membership) => ids.has(membership.pocketId))
      .map((membership) => scopedThreadKey(scopeThreadRef(environmentId, membership.threadId))),
  );
}

export function pocketThreadCount(snapshot: PocketSnapshot, pocketId: PocketId): number {
  const ids = pocketDescendantIds(snapshot, pocketId);
  return snapshot.threadMemberships.filter((membership) => ids.has(membership.pocketId)).length;
}
