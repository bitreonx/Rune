import * as Effect from "effect/Effect";

export interface ScheduledToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
  readonly rawArguments?: string;
  readonly mutation?: boolean;
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
    const safeResults = yield* Effect.all(
      safeCalls.map((call) =>
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
    return calls.flatMap((call) => {
      const observation = byId.get(call.id);
      return observation === undefined ? [] : [observation];
    });
  });
}
