import type {
  ExecutionControllerState,
  PromptQueueClaimId,
  PromptQueueCommand,
  PromptQueueEvent,
  PromptQueueEventInput,
  PromptQueueItem,
  PromptQueueItemId,
  PromptQueueOperationError,
  PromptQueueSettlementOutcome,
  PromptQueueSnapshot,
  ThreadId,
} from "@rune/contracts";

export interface PromptQueueState {
  readonly threadId: ThreadId;
  readonly revision: number;
  readonly executionState: ExecutionControllerState;
  readonly activePromptId: PromptQueueItemId | null;
  readonly items: Readonly<Record<string, PromptQueueItem>>;
  readonly updatedAt: string;
}

export type PromptQueueDecision =
  | { readonly _tag: "event"; readonly event: PromptQueueEventInput }
  | { readonly _tag: "none"; readonly reason: "queue-empty" | "idempotent" }
  | { readonly _tag: "failure"; readonly error: PromptQueueOperationError };

export interface PromptQueueDecisionContext {
  readonly eventId: PromptQueueEvent["eventId"];
  readonly occurredAt: string;
  readonly claimId: PromptQueueClaimId;
}

export const emptyPromptQueueState = (threadId: ThreadId, updatedAt: string): PromptQueueState => ({
  threadId,
  revision: 0,
  executionState: "idle",
  activePromptId: null,
  items: {},
  updatedAt,
});

const activeStatuses = new Set<PromptQueueItem["status"]>(["queued", "promoted", "failed"]);
const claimedStatuses = new Set<PromptQueueItem["status"]>(["claimed", "materialized"]);

function failure(
  code: "invalid-command" | "not-found" | "conflict",
  operation: string,
  message: string,
): PromptQueueDecision {
  return {
    _tag: "failure",
    error: { _tag: "PromptQueueOperationError", code, operation, message },
  } as PromptQueueDecision;
}

function itemFor(state: PromptQueueState, itemId: PromptQueueItemId): PromptQueueItem | undefined {
  return state.items[itemId];
}

function isExecutionBlocked(state: PromptQueueState): boolean {
  return ["pausing", "paused", "resuming", "stopping", "stopped", "failed", "cancelled"].includes(
    state.executionState,
  );
}

export function decidePromptQueueCommand(
  state: PromptQueueState,
  command: PromptQueueCommand,
  context: PromptQueueDecisionContext,
): PromptQueueDecision {
  const event = <T extends PromptQueueEventInput["type"]>(
    type: T,
    payload: Omit<
      Extract<PromptQueueEventInput, { type: T }>,
      "type" | "eventId" | "threadId" | "commandId" | "occurredAt"
    >,
  ): PromptQueueDecision => ({
    _tag: "event",
    event: {
      type,
      eventId: context.eventId,
      threadId: state.threadId,
      commandId: command.commandId,
      occurredAt: context.occurredAt,
      ...payload,
    } as PromptQueueEventInput,
  });

  if (command.threadId !== state.threadId) {
    return failure("conflict", command.type, "The command targets a different thread.");
  }

  switch (command.type) {
    case "prompt.enqueue": {
      const existing = itemFor(state, command.itemId);
      if (existing !== undefined) {
        return existing.prompt === command.prompt && existing.threadId === command.threadId
          ? { _tag: "none", reason: "idempotent" }
          : failure("conflict", command.type, `Queue item '${command.itemId}' already exists.`);
      }
      const positions = Object.values(state.items).map((item) => item.position);
      return event("prompt.queued", {
        itemId: command.itemId,
        prompt: command.prompt,
        position: positions.length === 0 ? 0 : Math.max(...positions) + 1,
      });
    }
    case "prompt.edit": {
      const item = itemFor(state, command.itemId);
      if (item === undefined)
        return failure("not-found", command.type, `Queue item '${command.itemId}' was not found.`);
      if (item.status !== "queued" && item.status !== "failed") {
        return failure(
          "conflict",
          command.type,
          "Only queued or recoverably failed prompts can be edited.",
        );
      }
      return event("prompt.edited", { itemId: command.itemId, prompt: command.prompt });
    }
    case "prompt.delete": {
      const item = itemFor(state, command.itemId);
      if (item === undefined)
        return failure("not-found", command.type, `Queue item '${command.itemId}' was not found.`);
      if (item.status !== "queued" && item.status !== "failed") {
        return failure(
          "conflict",
          command.type,
          "A claimed or materialized prompt cannot be deleted.",
        );
      }
      return event("prompt.deleted", { itemId: command.itemId });
    }
    case "prompt.reorder": {
      const queue = Object.values(state.items).filter((item) => activeStatuses.has(item.status));
      const expected = new Set(queue.map((item) => item.id));
      const received = new Set(command.itemIds);
      if (expected.size !== received.size || [...expected].some((id) => !received.has(id))) {
        return failure(
          "conflict",
          command.type,
          "Reorder must include every queued prompt exactly once.",
        );
      }
      if (command.itemIds.length !== received.size) {
        return failure("conflict", command.type, "Reorder cannot contain duplicate prompt IDs.");
      }
      return event("prompt.reordered", { itemIds: command.itemIds });
    }
    case "prompt.claim": {
      if (
        state.executionState !== "idle" ||
        state.activePromptId !== null ||
        isExecutionBlocked(state)
      ) {
        return failure(
          "conflict",
          command.type,
          "The controller is not ready to claim another prompt.",
        );
      }
      const next = Object.values(state.items)
        .filter((item) => item.status === "queued" || item.status === "promoted")
        .toSorted((left, right) => left.position - right.position)[0];
      return next === undefined
        ? { _tag: "none", reason: "queue-empty" }
        : event("prompt.claimed", { itemId: next.id, claimId: context.claimId });
    }
    case "prompt.materialize": {
      const item = itemFor(state, command.itemId);
      if (item === undefined)
        return failure("not-found", command.type, `Queue item '${command.itemId}' was not found.`);
      if (item.status !== "claimed" || item.claimId !== command.claimId) {
        return failure(
          "conflict",
          command.type,
          "The prompt claim is stale or has already been materialized.",
        );
      }
      return event("prompt.materialized", {
        itemId: command.itemId,
        claimId: command.claimId,
        messageId: command.messageId,
        turnId: command.turnId,
      });
    }
    case "prompt.settle": {
      const item = itemFor(state, command.itemId);
      if (item === undefined)
        return failure("not-found", command.type, `Queue item '${command.itemId}' was not found.`);
      if (!claimedStatuses.has(item.status) || item.claimId !== command.claimId) {
        return failure("conflict", command.type, "The prompt claim is stale or is not settleable.");
      }
      return event("prompt.settled", {
        itemId: command.itemId,
        claimId: command.claimId,
        outcome: command.outcome,
        error: command.error ?? null,
      });
    }
    case "prompt.retry": {
      const item = itemFor(state, command.itemId);
      if (item === undefined)
        return failure("not-found", command.type, `Queue item '${command.itemId}' was not found.`);
      if (item.status !== "failed" || item.settlement !== "failed") {
        return failure(
          "conflict",
          command.type,
          "Only a recoverably failed prompt can be retried.",
        );
      }
      return event("prompt.retried", { itemId: command.itemId, attempt: item.attempt + 1 });
    }
    case "prompt.promoteToSteer": {
      const item = itemFor(state, command.itemId);
      if (item === undefined)
        return failure("not-found", command.type, `Queue item '${command.itemId}' was not found.`);
      if (item.status !== "queued")
        return failure("conflict", command.type, "Only a queued prompt can be promoted to Steer.");
      return event("prompt.promoted_to_steer", { itemId: command.itemId });
    }
    case "execution.pause":
      return state.executionState === "running"
        ? event("execution.paused", {})
        : failure("conflict", command.type, "Only a running execution can be paused.");
    case "execution.continue":
      return state.executionState === "paused" || state.executionState === "stopped"
        ? event("execution.continued", {})
        : failure(
            "conflict",
            command.type,
            "Only a paused or explicitly stopped execution can continue.",
          );
    case "execution.stop":
      return state.executionState !== "idle" &&
        state.executionState !== "stopped" &&
        state.executionState !== "cancelled"
        ? event("execution.stopped", {})
        : failure("conflict", command.type, "There is no active execution to stop.");
  }
}

function statusForSettlement(outcome: PromptQueueSettlementOutcome): PromptQueueItem["status"] {
  switch (outcome) {
    case "completed":
      return "settled";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "superseded":
      return "superseded";
  }
}

export function reducePromptQueueState(
  state: PromptQueueState,
  event: PromptQueueEvent,
): PromptQueueState {
  const base = { ...state, revision: event.sequence, updatedAt: event.occurredAt };
  switch (event.type) {
    case "prompt.queued":
      return {
        ...base,
        items: {
          ...state.items,
          [event.itemId]: {
            id: event.itemId,
            threadId: event.threadId,
            prompt: event.prompt,
            status: "queued",
            attempt: 0,
            position: event.position,
            claimId: null,
            messageId: null,
            turnId: null,
            settlement: null,
            error: null,
            createdAt: event.occurredAt,
            updatedAt: event.occurredAt,
          },
        },
      };
    case "prompt.edited": {
      const item = state.items[event.itemId];
      return item === undefined
        ? state
        : {
            ...base,
            items: {
              ...state.items,
              [event.itemId]: { ...item, prompt: event.prompt, updatedAt: event.occurredAt },
            },
          };
    }
    case "prompt.deleted": {
      const item = state.items[event.itemId];
      return item === undefined
        ? state
        : {
            ...base,
            items: {
              ...state.items,
              [event.itemId]: {
                ...item,
                status: "cancelled",
                settlement: "cancelled",
                updatedAt: event.occurredAt,
              },
            },
          };
    }
    case "prompt.reordered": {
      const items = { ...state.items };
      event.itemIds.forEach((itemId, position) => {
        const item = items[itemId];
        if (item !== undefined) items[itemId] = { ...item, position, updatedAt: event.occurredAt };
      });
      return { ...base, items };
    }
    case "prompt.claimed": {
      const item = state.items[event.itemId];
      return item === undefined
        ? state
        : {
            ...base,
            activePromptId: event.itemId,
            items: {
              ...state.items,
              [event.itemId]: {
                ...item,
                status: "claimed",
                claimId: event.claimId,
                updatedAt: event.occurredAt,
              },
            },
          };
    }
    case "prompt.materialized": {
      const item = state.items[event.itemId];
      return item === undefined
        ? state
        : {
            ...base,
            executionState: "running",
            items: {
              ...state.items,
              [event.itemId]: {
                ...item,
                status: "materialized",
                messageId: event.messageId,
                turnId: event.turnId,
                updatedAt: event.occurredAt,
              },
            },
          };
    }
    case "prompt.settled": {
      const item = state.items[event.itemId];
      if (item === undefined) return state;
      const executionState: ExecutionControllerState =
        event.outcome === "failed"
          ? "failed"
          : event.outcome === "cancelled"
            ? "cancelled"
            : "idle";
      return {
        ...base,
        executionState:
          state.activePromptId === event.itemId ? executionState : state.executionState,
        activePromptId: state.activePromptId === event.itemId ? null : state.activePromptId,
        items: {
          ...state.items,
          [event.itemId]: {
            ...item,
            status: statusForSettlement(event.outcome),
            settlement: event.outcome,
            error: event.error,
            updatedAt: event.occurredAt,
          },
        },
      };
    }
    case "prompt.retried": {
      const item = state.items[event.itemId];
      return item === undefined
        ? state
        : {
            ...base,
            executionState: state.executionState === "failed" ? "idle" : state.executionState,
            items: {
              ...state.items,
              [event.itemId]: {
                ...item,
                status: "queued",
                attempt: event.attempt,
                claimId: null,
                messageId: null,
                turnId: null,
                settlement: null,
                error: null,
                updatedAt: event.occurredAt,
              },
            },
          };
    }
    case "prompt.promoted_to_steer": {
      const item = state.items[event.itemId];
      return item === undefined
        ? state
        : {
            ...base,
            items: {
              ...state.items,
              [event.itemId]: { ...item, status: "promoted", updatedAt: event.occurredAt },
            },
          };
    }
    case "execution.paused":
      return { ...base, executionState: "paused" };
    case "execution.continued":
      return { ...base, executionState: "running" };
    case "execution.stopped":
      return { ...base, executionState: "stopped" };
  }
}

export function promptQueueSnapshot(state: PromptQueueState): PromptQueueSnapshot {
  return {
    threadId: state.threadId,
    revision: state.revision,
    executionState: state.executionState,
    activePromptId: state.activePromptId,
    items: Object.values(state.items).toSorted(
      (left, right) =>
        left.position - right.position || left.createdAt.localeCompare(right.createdAt),
    ),
    updatedAt: state.updatedAt,
  };
}
