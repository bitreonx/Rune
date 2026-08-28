import type { EnvironmentId, PocketId, PocketSnapshot } from "@rune/contracts";

import { scopeThreadRef, scopedThreadKey } from "@rune/client-runtime/environment";

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
