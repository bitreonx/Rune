import type {
  PocketCommand,
  PocketEvent,
  PocketEventInput,
  PocketOperationError,
  PocketSnapshot,
  PocketThreadMembership,
  PocketFileReference,
  RunePocket,
} from "@rune/contracts";

export interface PocketState {
  readonly pockets: Readonly<Record<string, RunePocket>>;
  readonly threadMemberships: Readonly<Record<string, PocketThreadMembership>>;
  readonly fileReferences: Readonly<Record<string, PocketFileReference>>;
}

export const emptyPocketState = (): PocketState => ({
  pockets: {},
  threadMemberships: {},
  fileReferences: {},
});

export type PocketDecision =
  | { readonly _tag: "success"; readonly event: PocketEventInput }
  | { readonly _tag: "failure"; readonly error: PocketOperationError };

function membershipKey(pocketId: string, threadId: string): string {
  return `${pocketId}:${threadId}`;
}

function fileReferenceKey(pocketId: string, environmentId: string, relativePath: string): string {
  return `${pocketId}:${environmentId}:${relativePath}`;
}

function failure(
  code: "invalid-command" | "not-found" | "conflict",
  operation: string,
  message: string,
): PocketDecision {
  return {
    _tag: "failure",
    error: { _tag: "PocketOperationError", code, operation, message },
  } as PocketDecision;
}

function isDescendant(state: PocketState, candidateId: string, ancestorId: string): boolean {
  let current = state.pockets[candidateId]?.parentPocketId ?? null;
  const seen = new Set<string>();
  while (current !== null && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = state.pockets[current]?.parentPocketId ?? null;
  }
  return false;
}

export function decidePocketCommand(
  state: PocketState,
  command: PocketCommand,
  context: { readonly eventId: string; readonly occurredAt: string },
): PocketDecision {
  const envelope = (
    type: PocketEventInput["type"],
    payload: Record<string, unknown>,
  ): PocketEventInput =>
    ({
      type,
      eventId: context.eventId,
      occurredAt: context.occurredAt,
      ...payload,
    }) as unknown as PocketEventInput;

  switch (command.type) {
    case "pocket.create":
      if (state.pockets[command.pocket.id]) {
        return failure("conflict", command.type, `Pocket '${command.pocket.id}' already exists.`);
      }
      if (command.pocket.parentPocketId !== null && !state.pockets[command.pocket.parentPocketId]) {
        return failure(
          "not-found",
          command.type,
          `Parent Pocket '${command.pocket.parentPocketId}' was not found.`,
        );
      }
      return {
        _tag: "success",
        event: envelope("pocket.created", { pocket: command.pocket }),
      };
    case "pocket.rename":
      return state.pockets[command.pocketId]
        ? { _tag: "success", event: envelope("pocket.renamed", command) }
        : failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
    case "pocket.move":
      if (!state.pockets[command.pocketId]) {
        return failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
      }
      if (
        command.parentPocketId === command.pocketId ||
        (command.parentPocketId !== null &&
          (!state.pockets[command.parentPocketId] ||
            isDescendant(state, command.parentPocketId, command.pocketId)))
      ) {
        return failure(
          "conflict",
          command.type,
          "A Pocket cannot be moved inside itself or a child.",
        );
      }
      return { _tag: "success", event: envelope("pocket.moved", command) };
    case "pocket.archive":
      return state.pockets[command.pocketId]
        ? {
            _tag: "success",
            event: envelope("pocket.archived", {
              pocketId: command.pocketId,
              archivedAt: context.occurredAt,
            }),
          }
        : failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
    case "pocket.trash":
      return state.pockets[command.pocketId]
        ? {
            _tag: "success",
            event: envelope("pocket.trashed", {
              pocketId: command.pocketId,
              trashedAt: context.occurredAt,
            }),
          }
        : failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
    case "pocket.restore":
      return state.pockets[command.pocketId]
        ? { _tag: "success", event: envelope("pocket.restored", { pocketId: command.pocketId }) }
        : failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
    case "pocket.delete":
      return state.pockets[command.pocketId]
        ? { _tag: "success", event: envelope("pocket.deleted", { pocketId: command.pocketId }) }
        : failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
    case "pocket.thread-added":
      if (!state.pockets[command.pocketId]) {
        return failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
      }
      if (state.threadMemberships[membershipKey(command.pocketId, command.threadId)]) {
        return failure("conflict", command.type, "Thread is already a member of this Pocket.");
      }
      return {
        _tag: "success",
        event: envelope("pocket.thread-added", command),
      };
    case "pocket.thread-removed":
      return state.threadMemberships[membershipKey(command.pocketId, command.threadId)]
        ? { _tag: "success", event: envelope("pocket.thread-removed", command) }
        : failure("not-found", command.type, "Thread is not a member of this Pocket.");
    case "pocket.thread-reordered":
      return state.threadMemberships[membershipKey(command.pocketId, command.threadId)]
        ? { _tag: "success", event: envelope("pocket.thread-reordered", command) }
        : failure("not-found", command.type, "Thread is not a member of this Pocket.");
    case "pocket.file-referenced":
      if (!state.pockets[command.pocketId]) {
        return failure("not-found", command.type, `Pocket '${command.pocketId}' was not found.`);
      }
      if (
        state.fileReferences[
          fileReferenceKey(command.pocketId, command.environmentId, command.relativePath)
        ]
      ) {
        return failure("conflict", command.type, "File is already referenced by this Pocket.");
      }
      return {
        _tag: "success",
        event: envelope("pocket.file-referenced", { ...command, kind: "reference" }),
      };
    case "pocket.file-unreferenced":
      return state.fileReferences[
        fileReferenceKey(command.pocketId, command.environmentId, command.relativePath)
      ]
        ? { _tag: "success", event: envelope("pocket.file-unreferenced", command) }
        : failure("not-found", command.type, "File is not referenced by this Pocket.");
  }
}

export function reducePocketState(state: PocketState, event: PocketEvent): PocketState {
  switch (event.type) {
    case "pocket.created":
      return { ...state, pockets: { ...state.pockets, [event.pocket.id]: event.pocket } };
    case "pocket.renamed": {
      const pocket = state.pockets[event.pocketId];
      return pocket
        ? {
            ...state,
            pockets: {
              ...state.pockets,
              [event.pocketId]: { ...pocket, title: event.title, updatedAt: event.occurredAt },
            },
          }
        : state;
    }
    case "pocket.moved": {
      const pocket = state.pockets[event.pocketId];
      return pocket
        ? {
            ...state,
            pockets: {
              ...state.pockets,
              [event.pocketId]: {
                ...pocket,
                parentPocketId: event.parentPocketId,
                orderKey: event.orderKey,
                updatedAt: event.occurredAt,
              },
            },
          }
        : state;
    }
    case "pocket.archived": {
      const pocket = state.pockets[event.pocketId];
      return pocket
        ? {
            ...state,
            pockets: {
              ...state.pockets,
              [event.pocketId]: {
                ...pocket,
                archivedAt: event.archivedAt,
                updatedAt: event.occurredAt,
              },
            },
          }
        : state;
    }
    case "pocket.trashed": {
      const pocket = state.pockets[event.pocketId];
      return pocket
        ? {
            ...state,
            pockets: {
              ...state.pockets,
              [event.pocketId]: {
                ...pocket,
                trashedAt: event.trashedAt,
                updatedAt: event.occurredAt,
              },
            },
          }
        : state;
    }
    case "pocket.restored": {
      const pocket = state.pockets[event.pocketId];
      return pocket
        ? {
            ...state,
            pockets: {
              ...state.pockets,
              [event.pocketId]: {
                ...pocket,
                archivedAt: null,
                trashedAt: null,
                updatedAt: event.occurredAt,
              },
            },
          }
        : state;
    }
    case "pocket.deleted": {
      const pockets = { ...state.pockets };
      delete pockets[event.pocketId];
      const threadMemberships = Object.fromEntries(
        Object.entries(state.threadMemberships).filter(
          ([, membership]) => membership.pocketId !== event.pocketId,
        ),
      );
      const fileReferences = Object.fromEntries(
        Object.entries(state.fileReferences).filter(
          ([, reference]) => reference.pocketId !== event.pocketId,
        ),
      );
      return { pockets, threadMemberships, fileReferences };
    }
    case "pocket.thread-added":
      return {
        ...state,
        threadMemberships: {
          ...state.threadMemberships,
          [membershipKey(event.pocketId, event.threadId)]: {
            pocketId: event.pocketId,
            threadId: event.threadId,
            orderKey: event.orderKey,
          },
        },
      };
    case "pocket.thread-removed": {
      const threadMemberships = { ...state.threadMemberships };
      delete threadMemberships[membershipKey(event.pocketId, event.threadId)];
      return { ...state, threadMemberships };
    }
    case "pocket.thread-reordered": {
      const key = membershipKey(event.pocketId, event.threadId);
      const membership = state.threadMemberships[key];
      return membership
        ? {
            ...state,
            threadMemberships: {
              ...state.threadMemberships,
              [key]: { ...membership, orderKey: event.orderKey },
            },
          }
        : state;
    }
    case "pocket.file-referenced":
      return {
        ...state,
        fileReferences: {
          ...state.fileReferences,
          [fileReferenceKey(event.pocketId, event.environmentId, event.relativePath)]: {
            pocketId: event.pocketId,
            environmentId: event.environmentId,
            relativePath: event.relativePath,
            kind: event.kind,
          },
        },
      };
    case "pocket.file-unreferenced": {
      const fileReferences = { ...state.fileReferences };
      delete fileReferences[
        fileReferenceKey(event.pocketId, event.environmentId, event.relativePath)
      ];
      return { ...state, fileReferences };
    }
  }
}

export function pocketSnapshot(state: PocketState, revision: number): PocketSnapshot {
  return {
    revision,
    pockets: Object.values(state.pockets).toSorted(
      (left, right) =>
        left.orderKey.localeCompare(right.orderKey) || left.title.localeCompare(right.title),
    ),
    threadMemberships: Object.values(state.threadMemberships).toSorted((left, right) =>
      left.orderKey.localeCompare(right.orderKey),
    ),
    fileReferences: Object.values(state.fileReferences).toSorted((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    ),
  };
}
