// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics tryCatchInEffectGen:off
import { randomUUID } from "node:crypto";

import { CommandId, EventId, ThreadId } from "@rune/contracts/baseSchemas";
import {
  PromptQueueClaimId,
  PromptQueueEvent,
  PromptQueueOperationError,
} from "@rune/contracts/promptQueue";
import type {
  PromptQueueCommand,
  PromptQueueEventInput,
  PromptQueueSnapshot,
  PromptQueueSnapshotInput,
} from "@rune/contracts/promptQueue";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import {
  decidePromptQueueCommand,
  emptyPromptQueueState,
  promptQueueSnapshot,
  reducePromptQueueState,
  type PromptQueueState,
} from "./PromptQueueState.ts";

const EventRow = Schema.Struct({ sequence: Schema.Int, eventJson: Schema.String });
const EventRequest = Schema.Struct({ threadId: ThreadId });
const CommandRequest = Schema.Struct({ commandId: CommandId });
const AppendRequest = Schema.Struct({
  eventId: EventId,
  threadId: ThreadId,
  commandId: CommandId,
  eventType: Schema.String,
  occurredAt: Schema.String,
  eventJson: Schema.String,
});
const CommandRow = Schema.Struct({ threadId: ThreadId });
const JsonString = Schema.fromJsonString(Schema.Unknown);
const encodeJson = Schema.encodeSync(JsonString);

function persistenceError(
  operation: string,
  message: string,
  cause?: unknown,
): PromptQueueOperationError {
  return new PromptQueueOperationError({
    code: "persistence",
    operation,
    message,
    ...(cause === undefined ? {} : { cause }),
  });
}

function domainError(
  code: "invalid-command" | "not-found" | "conflict",
  operation: string,
  message: string,
): PromptQueueOperationError {
  return new PromptQueueOperationError({ code, operation, message });
}

function serviceError(cause: unknown): PromptQueueOperationError {
  return Schema.is(PromptQueueOperationError)(cause)
    ? cause
    : persistenceError("transaction", "Prompt queue transaction failed.", cause);
}

export interface PromptQueueServiceShape {
  readonly snapshot: (
    input: PromptQueueSnapshotInput,
  ) => Effect.Effect<PromptQueueSnapshot, PromptQueueOperationError>;
  readonly dispatch: (
    command: PromptQueueCommand,
  ) => Effect.Effect<PromptQueueSnapshot, PromptQueueOperationError>;
}

export class PromptQueueService extends Context.Service<
  PromptQueueService,
  PromptQueueServiceShape
>()("rune/orchestration/PromptQueueService") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const writeLock = yield* Semaphore.make(1);

  const readRows = SqlSchema.findAll({
    Request: EventRequest,
    Result: EventRow,
    execute: (input) => sql`
      SELECT sequence, event_json AS "eventJson"
      FROM prompt_queue_events
      WHERE thread_id = ${input.threadId}
      ORDER BY sequence ASC
    `,
  });

  const findCommands = SqlSchema.findAll({
    Request: CommandRequest,
    Result: CommandRow,
    execute: (input) => sql`
      SELECT thread_id AS "threadId"
      FROM prompt_queue_events
      WHERE command_id = ${input.commandId}
      ORDER BY sequence ASC
      LIMIT 1
    `,
  });

  const appendRow = SqlSchema.findOne({
    Request: AppendRequest,
    Result: Schema.Struct({ sequence: Schema.Int }),
    execute: (input) => sql`
      INSERT INTO prompt_queue_events (
        event_id,
        thread_id,
        command_id,
        event_type,
        occurred_at,
        event_json
      )
      VALUES (
        ${input.eventId},
        ${input.threadId},
        ${input.commandId},
        ${input.eventType},
        ${input.occurredAt},
        ${input.eventJson}
      )
      RETURNING sequence
    `,
  });

  const decodeRows = Effect.fn("PromptQueueService.decodeRows")(function* (
    threadId: ThreadId,
    rows: ReadonlyArray<typeof EventRow.Type>,
    updatedAt: string,
  ) {
    let state: PromptQueueState = emptyPromptQueueState(threadId, updatedAt);
    for (const row of rows) {
      const parsed = yield* Schema.decodeUnknownEffect(JsonString)(row.eventJson).pipe(
        Effect.mapError((cause) =>
          persistenceError(
            "read-events:parse",
            "A persisted prompt queue event was not valid JSON.",
            cause,
          ),
        ),
      );
      const event = yield* Schema.decodeUnknownEffect(PromptQueueEvent)({
        ...(parsed as Record<string, unknown>),
        sequence: row.sequence,
      }).pipe(
        Effect.mapError((cause) =>
          persistenceError(
            "read-events:decode",
            "A persisted prompt queue event could not be decoded.",
            cause,
          ),
        ),
      );
      state = reducePromptQueueState(state, event);
    }
    return state;
  });

  const now = Effect.map(DateTime.now, DateTime.formatIso);

  const loadState = (threadId: ThreadId) =>
    Effect.gen(function* () {
      const rows = yield* readRows({ threadId }).pipe(
        Effect.mapError((cause) =>
          persistenceError("read-events", "Failed to read prompt queue events.", cause),
        ),
      );
      return yield* decodeRows(threadId, rows, yield* now);
    });

  const append = (event: PromptQueueEventInput) =>
    Effect.gen(function* () {
      const row = yield* appendRow({
        eventId: event.eventId,
        threadId: event.threadId,
        commandId: event.commandId,
        eventType: event.type,
        occurredAt: event.occurredAt,
        eventJson: encodeJson(event),
      }).pipe(
        Effect.mapError((cause) =>
          persistenceError("append-event", "Failed to persist prompt queue event.", cause),
        ),
      );
      return yield* Schema.decodeUnknownEffect(PromptQueueEvent)({
        ...event,
        sequence: row.sequence,
      }).pipe(
        Effect.mapError((cause) =>
          persistenceError(
            "append-event:decode",
            "The appended prompt queue event was invalid.",
            cause,
          ),
        ),
      );
    });

  const snapshotUnlocked = (threadId: ThreadId) =>
    Effect.gen(function* () {
      const state = yield* loadState(threadId);
      return promptQueueSnapshot(state);
    });

  const snapshot: PromptQueueServiceShape["snapshot"] = (input) =>
    writeLock
      .withPermit(sql.withTransaction(snapshotUnlocked(input.threadId)))
      .pipe(Effect.mapError(serviceError));

  const dispatchUnlocked = (command: PromptQueueCommand) =>
    Effect.gen(function* () {
      const previous = yield* findCommands({ commandId: command.commandId }).pipe(
        Effect.mapError((cause) =>
          persistenceError(
            "find-command",
            "Failed to check prompt queue command idempotency.",
            cause,
          ),
        ),
      );
      const previousCommand = previous[0];
      if (previousCommand !== undefined) {
        if (previousCommand.threadId !== command.threadId) {
          return yield* domainError(
            "conflict",
            command.type,
            `Command '${command.commandId}' was already used for another thread.`,
          );
        }
        return yield* snapshotUnlocked(command.threadId);
      }

      const state = yield* loadState(command.threadId);
      const decision = decidePromptQueueCommand(state, command, {
        eventId: EventId.make(randomUUID()),
        claimId: PromptQueueClaimId.make(`claim:${randomUUID()}`),
        occurredAt: yield* now,
      });
      if (decision._tag === "failure") return yield* decision.error;
      if (decision._tag === "none") return promptQueueSnapshot(state);

      const saved = yield* append(decision.event);
      return promptQueueSnapshot(reducePromptQueueState(state, saved));
    });

  const dispatch: PromptQueueServiceShape["dispatch"] = (command) =>
    writeLock
      .withPermit(sql.withTransaction(dispatchUnlocked(command)))
      .pipe(Effect.mapError(serviceError));

  return { snapshot, dispatch } satisfies PromptQueueServiceShape;
});

export const PromptQueueServiceLive = Layer.effect(PromptQueueService, make);
