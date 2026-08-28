import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationCommand,
  type OrchestrationThreadShell,
} from "@rune/contracts";
import { expect, it } from "@effect/vitest";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import { OrchestrationCommandInvariantError } from "../Errors.ts";
import {
  OrchestrationEngineService,
  type OrchestrationEngineShape,
} from "../Services/OrchestrationEngine.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import { TemporaryThreadSweeper } from "../Services/TemporaryThreadSweeper.ts";
import { makeTemporaryThreadSweeperLive } from "./TemporaryThreadSweeper.ts";

const defaultModelSelection = {
  instanceId: ProviderInstanceId.make("codex"),
  model: "gpt-5-codex",
} as const;

function makeShell(input: {
  readonly id: string;
  readonly temporaryAt: string | null;
  readonly temporaryDeletionSnoozedUntil?: string | null;
  readonly updatedAt: string;
}): OrchestrationThreadShell {
  return {
    id: ThreadId.make(input.id),
    projectId: ProjectId.make("project-temporary-sweeper"),
    title: `Thread ${input.id}`,
    modelSelection: defaultModelSelection,
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    latestTurn: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: input.updatedAt,
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    snoozedUntil: null,
    snoozedAt: null,
    pinnedAt: null,
    temporaryAt: input.temporaryAt,
    ...(input.temporaryDeletionSnoozedUntil !== undefined
      ? { temporaryDeletionSnoozedUntil: input.temporaryDeletionSnoozedUntil }
      : {}),
    pinOrderKey: null,
    titleRegeneration: null,
    session: null,
    latestUserMessageAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    hasActionableProposedPlan: false,
    backgroundLiveness: null,
    planProgress: null,
  };
}

const drain = Effect.forEach(Array.from({ length: 25 }), () => Effect.yieldNow, {
  discard: true,
});

interface HarnessOptions {
  readonly shells: ReadonlyArray<OrchestrationThreadShell>;
  /** Number of dispatch calls (successes or failures) before releasing the test. */
  readonly expectedCalls: number;
  readonly dispatchImplementation?: OrchestrationEngineShape["dispatch"];
}

const makeHarnessLayer = (input: HarnessOptions) =>
  Effect.gen(function* () {
    const calls: Array<OrchestrationCommand> = [];
    const settled = yield* Deferred.make<void>();
    let callCount = 0;

    // Record every attempt (even failures) before delegating to the
    // implementation, then release the test once the expected number of calls
    // has landed.
    const dispatch: OrchestrationEngineShape["dispatch"] = (command) =>
      Effect.sync(() => {
        calls.push(command);
        callCount += 1;
      }).pipe(
        Effect.flatMap(() =>
          callCount >= input.expectedCalls ? Deferred.succeed(settled, undefined) : Effect.void,
        ),
        Effect.flatMap(() =>
          input.dispatchImplementation
            ? input.dispatchImplementation(command)
            : Effect.succeed({ sequence: 1 }),
        ),
      );

    const layer = makeTemporaryThreadSweeperLive({
      ttlMs: 1_000,
      sweepIntervalMs: 60_000,
    }).pipe(
      Layer.provideMerge(
        Layer.succeed(ProjectionSnapshotQuery, {
          getCommandReadModel: () => Effect.die("unused"),
          getSnapshot: () => Effect.die("unused"),
          getShellSnapshot: () =>
            Effect.succeed({
              snapshotSequence: 0,
              projects: [],
              threads: [...input.shells],
              updatedAt: "2026-04-14T00:00:00.000Z",
            }),
          getArchivedShellSnapshot: () => Effect.die("unused"),
          searchThreads: () => Effect.succeed({ matches: [] }),
              listThreadsForPicker: () => Effect.succeed({ matches: [] }),
              capsulePreview: () =>
                Effect.succeed({
                  threadId: "" as never,
                  threadTitle: "t",
                  claimCount: 0,
                  tokenEstimate: 0,
                  topClaimTexts: [],
                }),
              capsuleExpand: () =>
                Effect.succeed({
                  threadId: "" as never,
                  threadHarness: "unknown",
                  rawEvent: null,
                  text: "",
                  degraded: true,
                  tokenCount: 0,
                  claimIdsCovered: [],
                }),
          getSnapshotSequence: () => Effect.die("unused"),
          getCounts: () => Effect.die("unused"),
          getActiveProjectByWorkspaceRoot: () => Effect.die("unused"),
          getProjectShellById: () => Effect.die("unused"),
          getFirstActiveThreadIdByProjectId: () => Effect.die("unused"),
          getThreadCheckpointContext: () => Effect.die("unused"),
          getFullThreadDiffContext: () => Effect.die("unused"),
          getThreadShellById: () => Effect.die("unused"),
          getThreadDetailById: () => Effect.die("unused"),
          getThreadDetailSnapshot: () => Effect.die("unused"),
        }),
      ),
      Layer.provideMerge(
        Layer.succeed(OrchestrationEngineService, {
          readEvents: () => Stream.empty,
          streamDomainEvents: Stream.empty,
          latestSequence: Effect.succeed(0),
          dispatch,
        }),
      ),
      Layer.provideMerge(NodeServices.layer),
    );

    return { layer, calls, settled };
  });

it.effect("deletes expired temporary threads and nothing else", () =>
  Effect.gen(function* () {
    // Fixtures are relative to the test clock so the TTL comparison holds
    // under both live and frozen test time.
    const staleUpdatedAt = DateTime.formatIso(DateTime.add(yield* DateTime.now, { hours: -2 }));
    const freshUpdatedAt = DateTime.formatIso(yield* DateTime.now);

    const { layer, calls, settled } = yield* makeHarnessLayer({
      expectedCalls: 1,
      shells: [
        makeShell({
          id: "thread-temporary-expired",
          temporaryAt: staleUpdatedAt,
          updatedAt: staleUpdatedAt,
        }),
        makeShell({
          id: "thread-temporary-fresh",
          temporaryAt: staleUpdatedAt,
          updatedAt: freshUpdatedAt,
        }),
        // Permanent threads never expire, no matter how stale.
        makeShell({
          id: "thread-permanent-stale",
          temporaryAt: null,
          updatedAt: staleUpdatedAt,
        }),
        makeShell({
          id: "thread-temporary-snoozed",
          temporaryAt: staleUpdatedAt,
          temporaryDeletionSnoozedUntil: "2999-01-01T00:00:00.000Z",
          updatedAt: staleUpdatedAt,
        }),
      ],
    });

    yield* Effect.gen(function* () {
      const sweeper = yield* TemporaryThreadSweeper;
      yield* sweeper.start();
      yield* Deferred.await(settled);
      yield* drain;
    }).pipe(Effect.provide(layer), Effect.scoped);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      type: "thread.delete",
      threadId: ThreadId.make("thread-temporary-expired"),
    });
    expect(calls[0]!.commandId.startsWith("server:temporary-thread-sweeper:")).toBe(true);
  }),
);

it.effect("keeps sweeping when one delete dispatch fails", () =>
  Effect.gen(function* () {
    const failedThreadId = ThreadId.make("thread-temporary-failed");
    const sweptThreadId = ThreadId.make("thread-temporary-swept");
    const staleUpdatedAt = DateTime.formatIso(DateTime.add(yield* DateTime.now, { hours: -2 }));

    const { layer, calls, settled } = yield* makeHarnessLayer({
      expectedCalls: 2,
      shells: [
        makeShell({
          id: failedThreadId,
          temporaryAt: staleUpdatedAt,
          updatedAt: staleUpdatedAt,
        }),
        makeShell({
          id: sweptThreadId,
          temporaryAt: staleUpdatedAt,
          updatedAt: staleUpdatedAt,
        }),
      ],
      dispatchImplementation: (command) =>
        command.type === "thread.delete" && command.threadId === failedThreadId
          ? Effect.fail(
              new OrchestrationCommandInvariantError({
                commandType: command.type,
                detail: "simulated dispatch failure",
              }),
            )
          : Effect.succeed({ sequence: 1 }),
    });

    yield* Effect.gen(function* () {
      const sweeper = yield* TemporaryThreadSweeper;
      yield* sweeper.start();
      yield* Deferred.await(settled);
      yield* drain;
    }).pipe(Effect.provide(layer), Effect.scoped);

    const deletedThreadIds = calls.map((command) =>
      command.type === "thread.delete" ? command.threadId : null,
    );
    expect(deletedThreadIds).toEqual([failedThreadId, sweptThreadId]);
  }),
);
