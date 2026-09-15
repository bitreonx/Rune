import { useAtomValue } from "@effect/atom-react";
import { createPullRequestEnvironmentAtoms } from "@rune/client-runtime/state/pull-requests";
import type {
  EnvironmentId,
  PullRequestDetail,
  PullRequestListInput,
  PullRequestListStatsInput,
  PullRequestRef,
  VcsStatusResult,
} from "@rune/contracts";
import * as Option from "effect/Option";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useCallback, useMemo } from "react";

import { connectionAtomRuntime } from "../connection/runtime";
import { appAtomRegistry } from "../rpc/atomRegistry";
import {
  mergePullRequestLists,
  type EnvironmentPullRequestStat,
  type MergedPullRequestList,
} from "../components/pullRequest/pullRequestList.logic";
import { formatEnvironmentQueryError } from "./query";

export const pullRequestEnvironment = createPullRequestEnvironmentAtoms(connectionAtomRuntime);

export const linkedPullRequestDetailAtom = pullRequestEnvironment.detail;

type PullRequestSummaryLike = Pick<NonNullable<VcsStatusResult["pr"]>, "updatedAt">;

/** Keeps a newer host observation from being overwritten by a slower, older response. */
export function newestPullRequestSummary<T extends PullRequestSummaryLike>(current: T, next: T): T {
  const currentAt = current.updatedAt ? Date.parse(current.updatedAt) : Number.NEGATIVE_INFINITY;
  const nextAt = next.updatedAt ? Date.parse(next.updatedAt) : Number.NEGATIVE_INFINITY;
  return Number.isFinite(nextAt) && (!Number.isFinite(currentAt) || nextAt >= currentAt)
    ? next
    : current;
}

/** Shares the detail query's latest value while preventing an older host response from regressing
 * a badge during rapid refreshes. */
const sharedPullRequestSummaries = new Map<string, PullRequestDetail>();

export function useSharedPullRequestSummary(
  environmentId: EnvironmentId | null,
  reference: PullRequestRef | null,
  query: { readonly data: PullRequestDetail | null },
): PullRequestDetail | null {
  if (environmentId === null || reference === null) return query.data;
  const key = JSON.stringify([environmentId, reference.projectId, reference.repository, reference.number]);
  const previous = sharedPullRequestSummaries.get(key);
  if (query.data === null) return previous ?? null;
  const latest = previous === undefined ? query.data : newestPullRequestSummary(previous, query.data);
  if (latest !== previous) sharedPullRequestSummaries.set(key, latest);
  return latest;
}

export interface EnvironmentQueryTarget<Input> {
  readonly environmentId: EnvironmentId;
  readonly input: Input;
}

interface MergedEnvironmentQueryView<A> {
  /** One entry per environment that has answered, in the order the targets were given. */
  readonly values: ReadonlyArray<readonly [EnvironmentId, A]>;
  /** The first environment that failed. Others may still have answered — this is not fatal. */
  readonly error: string | null;
  readonly isPending: boolean;
}

/**
 * The same per-environment query read across several environments at once. React cannot subscribe
 * to a list of atoms whose length changes, so the fan-out happens inside one derived atom keyed by
 * the targets — the same shape the cross-environment thread search uses.
 *
 * An environment that fails contributes nothing rather than blanking the page: the pull request
 * list is a union, and one unreachable machine should not hide the others' rows.
 */
function createMergedEnvironmentQuery<Input, A>(
  label: string,
  atomFor: (
    target: EnvironmentQueryTarget<Input>,
  ) => Atom.Atom<AsyncResult.AsyncResult<A, unknown>>,
) {
  const family = Atom.family((key: string) =>
    Atom.make((get): MergedEnvironmentQueryView<A> => {
      const targets = JSON.parse(key) as ReadonlyArray<EnvironmentQueryTarget<Input>>;
      const values: Array<readonly [EnvironmentId, A]> = [];
      let error: string | null = null;
      let isPending = false;
      for (const target of targets) {
        const result = get(atomFor(target));
        isPending ||= result.waiting;
        if (result._tag === "Failure" && error === null) {
          error = formatEnvironmentQueryError(result.cause);
        }
        const value = Option.getOrNull(AsyncResult.value(result));
        if (value !== null) values.push([target.environmentId, value]);
      }
      return { values, error, isPending };
    }).pipe(Atom.withLabel(`${label}:${key}`)),
  );
  const empty = Atom.make<MergedEnvironmentQueryView<A>>({
    values: [],
    error: null,
    isPending: false,
  }).pipe(Atom.withLabel(`${label}:empty`));
  return function useMergedQuery(targets: ReadonlyArray<EnvironmentQueryTarget<Input>>) {
    const key = JSON.stringify(targets);
    const view = useAtomValue(targets.length === 0 ? empty : family(key));
    const refresh = useCallback(() => {
      for (const target of JSON.parse(key) as ReadonlyArray<EnvironmentQueryTarget<Input>>) {
        appAtomRegistry.refresh(atomFor(target));
      }
    }, [key]);
    return { ...view, refresh };
  };
}

const usePullRequestListsQuery = createMergedEnvironmentQuery(
  "web-pull-requests:list",
  pullRequestEnvironment.list,
);

const usePullRequestStatsQuery = createMergedEnvironmentQuery(
  "web-pull-requests:list-stats",
  pullRequestEnvironment.listStats,
);

export interface MergedPullRequestListView {
  readonly data: MergedPullRequestList | null;
  readonly error: string | null;
  readonly isPending: boolean;
  readonly refresh: () => void;
}

/** One listing per environment, merged into the single list the page renders. */
export function usePullRequestList(
  targets: ReadonlyArray<EnvironmentQueryTarget<PullRequestListInput>>,
): MergedPullRequestListView {
  const query = usePullRequestListsQuery(targets);
  const data = useMemo(() => mergePullRequestLists(query.values), [query.values]);
  return { data, error: query.error, isPending: query.isPending, refresh: query.refresh };
}

/** The line counts for the rows on screen, asked of each environment for its own rows. */
export function usePullRequestListStats(
  targets: ReadonlyArray<EnvironmentQueryTarget<PullRequestListStatsInput>>,
): {
  readonly stats: ReadonlyArray<EnvironmentPullRequestStat> | null;
  readonly refresh: () => void;
} {
  const query = usePullRequestStatsQuery(targets);
  const stats = useMemo(
    () =>
      query.values.length === 0
        ? null
        : query.values.flatMap(([environmentId, result]) =>
            result.stats.map((stat) => ({ ...stat, environmentId })),
          ),
    [query.values],
  );
  return { stats, refresh: query.refresh };
}
