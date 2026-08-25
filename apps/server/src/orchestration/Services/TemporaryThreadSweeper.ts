/**
 * TemporaryThreadSweeper - Periodic purge of expired temporary threads.
 *
 * Temporary chats live outside the inbox and self-delete after a TTL of
 * inactivity. The sweeper is the timer side of that promise: it finds flagged
 * threads whose last activity is older than the TTL and dispatches ordinary
 * `thread.delete` commands, so every deletion flows through the same decider,
 * events, and teardown reactors as a manual delete.
 *
 * @module TemporaryThreadSweeper
 */
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";

/**
 * TemporaryThreadSweeperShape - Service API for the temporary-thread TTL sweep.
 */
export interface TemporaryThreadSweeperShape {
  /**
   * Start the background sweep loop within the provided scope. Idempotent per
   * process lifetime.
   */
  readonly start: () => Effect.Effect<void, never, Scope.Scope>;
}

/**
 * TemporaryThreadSweeper - Service tag for the temporary-thread TTL sweep.
 */
export class TemporaryThreadSweeper extends Context.Service<
  TemporaryThreadSweeper,
  TemporaryThreadSweeperShape
>()("t3/orchestration/Services/TemporaryThreadSweeper") {}
