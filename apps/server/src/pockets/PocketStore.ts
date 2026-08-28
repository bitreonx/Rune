// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
// @effect-diagnostics globalDateInEffect:off
// @effect-diagnostics tryCatchInEffectGen:off
// @effect-diagnostics preferSchemaOverJson:off
import { randomUUID } from "node:crypto";

import { PocketEvent, PocketOperationError } from "@rune/contracts";
import type {
  PocketCommand,
  PocketEventInput,
  PocketImportInput,
  PocketSnapshot,
} from "@rune/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import {
  decidePocketCommand,
  emptyPocketState,
  pocketSnapshot,
  reducePocketState,
  type PocketState,
} from "./PocketState.ts";

const PocketEventRow = Schema.Struct({
  sequence: Schema.Int,
  eventJson: Schema.String,
});

const ReadEventsRequest = Schema.Struct({});
const AppendEventRequest = Schema.Struct({
  eventType: Schema.String,
  eventJson: Schema.String,
  occurredAt: Schema.String,
});

function storeError(operation: string, message: string, cause?: unknown): PocketOperationError {
  return new PocketOperationError({
    code: "persistence",
    operation,
    message,
    ...(cause === undefined ? {} : { cause }),
  });
}

export interface PocketStoreShape {
  readonly snapshot: () => Effect.Effect<PocketSnapshot, PocketOperationError>;
  readonly dispatch: (
    command: PocketCommand,
  ) => Effect.Effect<PocketSnapshot, PocketOperationError>;
  readonly importLegacy: (
    input: PocketImportInput,
  ) => Effect.Effect<PocketSnapshot, PocketOperationError>;
}

export class PocketStore extends Context.Service<PocketStore, PocketStoreShape>()(
  "rune/pockets/PocketStore",
) {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const readRows = SqlSchema.findAll({
    Request: ReadEventsRequest,
    Result: PocketEventRow,
    execute: () => sql`
      SELECT sequence, event_json AS "eventJson"
      FROM pocket_events
      ORDER BY sequence ASC
    `,
  });
  const appendRow = SqlSchema.findOne({
    Request: AppendEventRequest,
    Result: Schema.Struct({ sequence: Schema.Int }),
    execute: (input) => sql`
      INSERT INTO pocket_events (event_type, event_json, occurred_at)
      VALUES (${input.eventType}, ${input.eventJson}, ${input.occurredAt})
      RETURNING sequence
    `,
  });

  const decodeEvents = Effect.fn("PocketStore.decodeEvents")(function* () {
    const rows = yield* readRows({}).pipe(
      Effect.mapError((cause) => storeError("read-events", "Failed to read Pocket events.", cause)),
    );
    const events: PocketEvent[] = [];
    for (const row of rows) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.eventJson) as unknown;
      } catch (cause) {
        return yield* storeError(
          "read-events:parse",
          "A persisted Pocket event was not valid JSON.",
          cause,
        );
      }
      const event = yield* Schema.decodeUnknownEffect(PocketEvent)({
        ...(parsed as Record<string, unknown>),
        sequence: row.sequence,
      }).pipe(
        Effect.mapError((cause) =>
          storeError("read-events:decode", "A persisted Pocket event could not be decoded.", cause),
        ),
      );
      events.push(event);
    }
    return events;
  });

  const readState = Effect.fn("PocketStore.readState")(function* () {
    const events = yield* decodeEvents();
    let state: PocketState = emptyPocketState();
    for (const event of events) state = reducePocketState(state, event);
    return { state, revision: events.at(-1)?.sequence ?? 0 };
  });

  const append = Effect.fn("PocketStore.append")(function* (eventInput: PocketEventInput) {
    const row = yield* appendRow({
      eventType: eventInput.type,
      eventJson: JSON.stringify(eventInput),
      occurredAt: eventInput.occurredAt,
    }).pipe(
      Effect.mapError((cause) =>
        storeError("append-event", "Failed to persist Pocket event.", cause),
      ),
    );
    return { ...eventInput, sequence: row.sequence } as PocketEvent;
  });

  const dispatch: PocketStoreShape["dispatch"] = (command) =>
    Effect.gen(function* () {
      const current = yield* readState();
      const decision = decidePocketCommand(current.state, command, {
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
      });
      if (decision._tag === "failure") return yield* decision.error;
      const event = yield* append(decision.event);
      return pocketSnapshot(reducePocketState(current.state, event), event.sequence);
    });

  const importLegacy: PocketStoreShape["importLegacy"] = (input) =>
    Effect.gen(function* () {
      let current = yield* readState();
      const pendingPockets = input.snapshot.pockets.filter(
        (pocket) => current.state.pockets[pocket.id] === undefined,
      );
      while (pendingPockets.length > 0) {
        const importable = pendingPockets.find(
          (pocket) =>
            pocket.parentPocketId === null ||
            current.state.pockets[pocket.parentPocketId] !== undefined,
        );
        if (importable === undefined) {
          return yield* storeError(
            "import-legacy:parents",
            "Legacy Pocket data contains a cycle or an unresolved parent.",
          );
        }
        const pendingIndex = pendingPockets.indexOf(importable);
        pendingPockets.splice(pendingIndex, 1);
        const decision = decidePocketCommand(
          current.state,
          { type: "pocket.create", pocket: importable },
          {
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          },
        );
        if (decision._tag === "failure") return yield* decision.error;
        const event = yield* append(decision.event);
        current = { state: reducePocketState(current.state, event), revision: event.sequence };
      }
      for (const membership of input.snapshot.threadMemberships) {
        if (current.state.threadMemberships[`${membership.pocketId}:${membership.threadId}`])
          continue;
        const decision = decidePocketCommand(
          current.state,
          { type: "pocket.thread-added", ...membership },
          {
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          },
        );
        if (decision._tag === "failure") return yield* decision.error;
        const event = yield* append(decision.event);
        current = { state: reducePocketState(current.state, event), revision: event.sequence };
      }
      for (const reference of input.snapshot.fileReferences) {
        const key = `${reference.pocketId}:${reference.environmentId}:${reference.relativePath}`;
        if (current.state.fileReferences[key]) continue;
        const decision = decidePocketCommand(
          current.state,
          { type: "pocket.file-referenced", ...reference },
          {
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          },
        );
        if (decision._tag === "failure") return yield* decision.error;
        const event = yield* append(decision.event);
        current = { state: reducePocketState(current.state, event), revision: event.sequence };
      }
      return pocketSnapshot(current.state, current.revision);
    });

  return {
    snapshot: () =>
      readState().pipe(Effect.map(({ state, revision }) => pocketSnapshot(state, revision))),
    dispatch,
    importLegacy,
  } satisfies PocketStoreShape;
});

export const layer = Layer.effect(PocketStore, make);
