import {
  CommandId,
  EventId,
  ProjectId,
  ThreadId,
  type OrchestrationEvent,
} from "@rune/contracts";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { createEmptyReadModel, projectEvent } from "./projector.ts";

function makeEvent(input: {
  readonly sequence: number;
  readonly type: OrchestrationEvent["type"];
  readonly payload: unknown;
}): OrchestrationEvent {
  return {
    sequence: input.sequence,
    eventId: EventId.make(`event-${input.sequence}`),
    type: input.type,
    aggregateKind: "thread",
    aggregateId: ThreadId.make("thread-1"),
    occurredAt: "2026-01-01T00:00:00.000Z",
    commandId: CommandId.make(`command-${input.sequence}`),
    causationEventId: null,
    correlationId: null,
    metadata: {},
    payload: input.payload as never,
  } as OrchestrationEvent;
}

function makeThreadCreatedPayload(input: { readonly temporary?: boolean }) {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    threadId: ThreadId.make("thread-1"),
    projectId: ProjectId.make("project-1"),
    title: "Thread",
    modelSelection: { provider: "codex", model: "gpt-5.4" },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    ...(input.temporary === true ? { temporary: true } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

it.effect("projects a temporary flag from bootstrap creation", () =>
  Effect.gen(function* () {
    const now = "2026-01-01T00:00:00.000Z";
    const permanent = yield* projectEvent(
      createEmptyReadModel(now),
      makeEvent({
        sequence: 1,
        type: "thread.created",
        payload: makeThreadCreatedPayload({}),
      }),
    );
    expect(permanent.threads[0]?.temporaryAt ?? null).toBeNull();

    const temporary = yield* projectEvent(
      createEmptyReadModel(now),
      makeEvent({
        sequence: 2,
        type: "thread.created",
        payload: makeThreadCreatedPayload({ temporary: true }),
      }),
    );
    expect(temporary.threads[0]?.temporaryAt).toBe(now);
  }),
);

it.effect("projects the temporary-set lifecycle in both directions", () =>
  Effect.gen(function* () {
    const now = "2026-01-01T00:00:00.000Z";
    const created = yield* projectEvent(
      createEmptyReadModel(now),
      makeEvent({
        sequence: 1,
        type: "thread.created",
        payload: makeThreadCreatedPayload({}),
      }),
    );

    const flagged = yield* projectEvent(
      created,
      makeEvent({
        sequence: 2,
        type: "thread.temporary-set",
        payload: { threadId: ThreadId.make("thread-1"), temporaryAt: now, updatedAt: now },
      }),
    );
    expect(flagged.threads[0]?.temporaryAt).toBe(now);

    const kept = yield* projectEvent(
      flagged,
      makeEvent({
        sequence: 3,
        type: "thread.temporary-set",
        payload: { threadId: ThreadId.make("thread-1"), temporaryAt: null, updatedAt: now },
      }),
    );
    expect(kept.threads[0]?.temporaryAt).toBeNull();
  }),
);
