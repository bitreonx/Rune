import * as Clock from "effect/Clock";
import * as Crypto from "effect/Crypto";
import * as Duration from "effect/Duration";

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";

import { CommandId } from "@t3tools/contracts";

import { forkParked } from "../../serverActivation.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import {
  TemporaryThreadSweeper,
  type TemporaryThreadSweeperShape,
} from "../Services/TemporaryThreadSweeper.ts";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 30 * 60 * 1000;

export interface TemporaryThreadSweeperLiveOptions {
  readonly ttlMs?: number;
  readonly sweepIntervalMs?: number;
}

const makeTemporaryThreadSweeper = (options?: TemporaryThreadSweeperLiveOptions) =>
  Effect.gen(function* () {
    const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
    const orchestrationEngine = yield* OrchestrationEngineService;
    const crypto = yield* Crypto.Crypto;
    // Fresh id per delete so the engine never sees a repeated server command.
    const serverCommandId = crypto.randomUUIDv4.pipe(
      Effect.map((uuid) => CommandId.make(`server:temporary-thread-sweeper:${uuid}`)),
    );

    const ttlMs = Math.max(1, options?.ttlMs ?? DEFAULT_TTL_MS);
    const sweepIntervalMs = Math.max(1, options?.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS);

    const sweep = Effect.gen(function* () {
      const { threads } = yield* projectionSnapshotQuery.getShellSnapshot();
      const now = yield* Clock.currentTimeMillis;
      let purgedCount = 0;

      for (const thread of threads) {
        // getShellSnapshot only returns live threads, so anything still flagged
        // here is an active temporary chat past its TTL.
        if (thread.temporaryAt == null) {
          continue;
        }

        const updatedAtMs = Date.parse(thread.updatedAt);
        if (Number.isNaN(updatedAtMs)) {
          yield* Effect.logWarning("orchestration.temporary-thread-sweeper.invalid-updated-at", {
            threadId: thread.id,
            updatedAt: thread.updatedAt,
          });
          continue;
        }

        const idleDurationMs = now - updatedAtMs;
        if (idleDurationMs < ttlMs) {
          continue;
        }

        const commandId = yield* serverCommandId;
        const purged = yield* orchestrationEngine
          .dispatch({
            type: "thread.delete",
            commandId,
            threadId: thread.id,
          })
          .pipe(
            Effect.tap(() =>
              Effect.logInfo("orchestration.temporary-thread-sweeper.purged", {
                threadId: thread.id,
                temporaryAt: thread.temporaryAt,
                idleDurationMs,
                reason: "temporary_ttl",
              }),
            ),
            Effect.as(true),
            Effect.catchCause((cause) =>
              Effect.logWarning("orchestration.temporary-thread-sweeper.dispatch-failed", {
                threadId: thread.id,
                cause,
              }).pipe(Effect.as(false)),
            ),
          );

        if (purged) {
          purgedCount += 1;
        }
      }

      if (purgedCount > 0) {
        yield* Effect.logInfo("orchestration.temporary-thread-sweeper.sweep-complete", {
          purgedCount,
          totalThreads: threads.length,
        });
      }
    });

    const start: TemporaryThreadSweeperShape["start"] = () =>
      Effect.gen(function* () {
        yield* forkParked(
          sweep.pipe(
            Effect.catch((error: unknown) =>
              Effect.logWarning("orchestration.temporary-thread-sweeper.sweep-failed", {
                error,
              }),
            ),
            Effect.catchDefect((defect: unknown) =>
              Effect.logWarning("orchestration.temporary-thread-sweeper.sweep-defect", {
                defect,
              }),
            ),
            Effect.repeat(Schedule.spaced(Duration.millis(sweepIntervalMs))),
          ),
        );

        yield* Effect.logInfo("orchestration.temporary-thread-sweeper.started", {
          ttlMs,
          sweepIntervalMs,
        });
      });

    return {
      start,
    } satisfies TemporaryThreadSweeperShape;
  });

export const makeTemporaryThreadSweeperLive = (options?: TemporaryThreadSweeperLiveOptions) =>
  Layer.effect(TemporaryThreadSweeper, makeTemporaryThreadSweeper(options));

export const TemporaryThreadSweeperLive = makeTemporaryThreadSweeperLive();
