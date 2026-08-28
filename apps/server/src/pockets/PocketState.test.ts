import { describe, expect, it } from "vite-plus/test";

import type { PocketCommand, PocketEvent } from "@rune/contracts";

import {
  decidePocketCommand,
  emptyPocketState,
  pocketSnapshot,
  reducePocketState,
} from "./PocketState.ts";

const pocket = {
  id: "pocket-a" as never,
  title: "Work",
  parentPocketId: null,
  orderKey: "a",
  archivedAt: null,
  trashedAt: null,
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};

describe("Pocket decider and projector", () => {
  it("rejects cycles and preserves the event as the state transition boundary", () => {
    const state = reducePocketState(emptyPocketState(), {
      type: "pocket.created",
      eventId: "event-a",
      sequence: 1,
      occurredAt: pocket.createdAt,
      pocket,
    } as PocketEvent);
    const decision = decidePocketCommand(
      state,
      {
        type: "pocket.move",
        pocketId: pocket.id,
        parentPocketId: pocket.id,
        orderKey: "b",
      } as PocketCommand,
      { eventId: "event-b", occurredAt: pocket.updatedAt },
    );
    expect(decision._tag).toBe("failure");
    expect(pocketSnapshot(state, 1).pockets).toHaveLength(1);
  });

  it("projects membership and file references and removes them with the Pocket", () => {
    let state = reducePocketState(emptyPocketState(), {
      type: "pocket.created",
      eventId: "event-a",
      sequence: 1,
      occurredAt: pocket.createdAt,
      pocket,
    } as PocketEvent);
    state = reducePocketState(state, {
      type: "pocket.thread-added",
      eventId: "event-b",
      sequence: 2,
      occurredAt: pocket.updatedAt,
      pocketId: pocket.id,
      threadId: "thread-a" as never,
      orderKey: "a",
    } as PocketEvent);
    state = reducePocketState(state, {
      type: "pocket.file-referenced",
      eventId: "event-c",
      sequence: 3,
      occurredAt: pocket.updatedAt,
      pocketId: pocket.id,
      environmentId: "environment-a" as never,
      relativePath: "src/main.ts",
      kind: "reference",
    } as PocketEvent);
    expect(pocketSnapshot(state, 3).threadMemberships).toHaveLength(1);
    expect(pocketSnapshot(state, 3).fileReferences).toHaveLength(1);
    state = reducePocketState(state, {
      type: "pocket.deleted",
      eventId: "event-d",
      sequence: 4,
      occurredAt: pocket.updatedAt,
      pocketId: pocket.id,
    } as PocketEvent);
    expect(pocketSnapshot(state, 4)).toMatchObject({
      pockets: [],
      threadMemberships: [],
      fileReferences: [],
    });
  });
});
