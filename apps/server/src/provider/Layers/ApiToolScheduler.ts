import * as Effect from "effect/Effect";

export interface ScheduledToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
  readonly rawArguments?: string;
  readonly mutation?: boolean;
  /** Equivalent safe reads share one execution and fan out its observation. */
  readonly dedupeKey?: string;
}

export interface ToolObservation {
  readonly id: string;
  readonly content: string;
}

export interface ToolSchedulerOptions {
  readonly maxConcurrentSafeTools: number;
  readonly execute: (call: ScheduledToolCall) => Effect.Effect<string>;
}

export function scheduleToolCalls(
  calls: ReadonlyArray<ScheduledToolCall>,
  options: ToolSchedulerOptions,
): Effect.Effect<ReadonlyArray<ToolObservation>> {
  return Effect.gen(function* () {
    const safeCalls = calls.filter((call) => call.mutation !== true);
    const mutationCalls = calls.filter((call) => call.mutation === true);
    const uniqueSafeCalls: ScheduledToolCall[] = [];
    const safeCallByKey = new Map<string, ScheduledToolCall>();
    const duplicateSafeCallIds = new Map<string, string>();
    for (const call of safeCalls) {
      if (call.dedupeKey === undefined) {
        uniqueSafeCalls.push(call);
        continue;
      }
      const firstCall = safeCallByKey.get(call.dedupeKey);
      if (firstCall !== undefined) {
        duplicateSafeCallIds.set(call.id, firstCall.id);
        continue;
      }
      safeCallByKey.set(call.dedupeKey, call);
      uniqueSafeCalls.push(call);
    }
    const safeResults = yield* Effect.all(
      uniqueSafeCalls.map((call) =>
        options.execute(call).pipe(Effect.map((content) => ({ id: call.id, content }))),
      ),
      { concurrency: Math.max(1, options.maxConcurrentSafeTools) },
    );
    const orderedMutations: ToolObservation[] = [];
    for (const call of mutationCalls) {
      orderedMutations.push({ id: call.id, content: yield* options.execute(call) });
    }

    const byId = new Map(
      [...safeResults, ...orderedMutations].map((observation) => [observation.id, observation]),
    );
    for (const [duplicateId, firstId] of duplicateSafeCallIds) {
      const firstObservation = byId.get(firstId);
      if (firstObservation !== undefined) {
        byId.set(duplicateId, { id: duplicateId, content: firstObservation.content });
      }
    }
    return calls.flatMap((call) => {
      const observation = byId.get(call.id);
      return observation === undefined ? [] : [observation];
    });
  });
}
