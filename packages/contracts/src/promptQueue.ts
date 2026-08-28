import * as Schema from "effect/Schema";

import {
  CommandId,
  EventId,
  IsoDateTime,
  MessageId,
  NonNegativeInt,
  ThreadId,
  TrimmedNonEmptyString,
  TurnId,
} from "./baseSchemas.ts";

const PromptText = TrimmedNonEmptyString.check(Schema.isMaxLength(120_000));

export const PromptQueueItemId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(200),
  Schema.isPattern(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/),
);
export type PromptQueueItemId = typeof PromptQueueItemId.Type;

export const PromptQueueClaimId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(200),
  Schema.isPattern(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/),
);
export type PromptQueueClaimId = typeof PromptQueueClaimId.Type;

export const PromptQueueItemStatus = Schema.Literals([
  "queued",
  "claimed",
  "materialized",
  "settled",
  "failed",
  "cancelled",
  "superseded",
  "promoted",
]);
export type PromptQueueItemStatus = typeof PromptQueueItemStatus.Type;

export const PromptQueueSettlementOutcome = Schema.Literals([
  "completed",
  "failed",
  "cancelled",
  "superseded",
]);
export type PromptQueueSettlementOutcome = typeof PromptQueueSettlementOutcome.Type;

export const ExecutionControllerState = Schema.Literals([
  "idle",
  "running",
  "pausing",
  "paused",
  "resuming",
  "stopping",
  "stopped",
  "waitingForUser",
  "waitingForApproval",
  "verifying",
  "failed",
  "cancelled",
]);
export type ExecutionControllerState = typeof ExecutionControllerState.Type;

export const PromptQueueItem = Schema.Struct({
  id: PromptQueueItemId,
  threadId: ThreadId,
  prompt: PromptText,
  status: PromptQueueItemStatus,
  attempt: NonNegativeInt,
  position: NonNegativeInt,
  claimId: Schema.NullOr(PromptQueueClaimId),
  messageId: Schema.NullOr(MessageId),
  turnId: Schema.NullOr(TurnId),
  settlement: Schema.NullOr(PromptQueueSettlementOutcome),
  error: Schema.NullOr(TrimmedNonEmptyString),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type PromptQueueItem = typeof PromptQueueItem.Type;

export const PromptQueueSnapshot = Schema.Struct({
  threadId: ThreadId,
  revision: NonNegativeInt,
  executionState: ExecutionControllerState,
  activePromptId: Schema.NullOr(PromptQueueItemId),
  items: Schema.Array(PromptQueueItem),
  updatedAt: IsoDateTime,
});
export type PromptQueueSnapshot = typeof PromptQueueSnapshot.Type;

const PromptQueueCommandBase = {
  commandId: CommandId,
  threadId: ThreadId,
} as const;

export const PromptQueueCommand = Schema.Union([
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.enqueue"),
    itemId: PromptQueueItemId,
    prompt: PromptText,
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.edit"),
    itemId: PromptQueueItemId,
    prompt: PromptText,
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.delete"),
    itemId: PromptQueueItemId,
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.reorder"),
    itemIds: Schema.Array(PromptQueueItemId),
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.claim"),
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.materialize"),
    itemId: PromptQueueItemId,
    claimId: PromptQueueClaimId,
    messageId: MessageId,
    turnId: TurnId,
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.settle"),
    itemId: PromptQueueItemId,
    claimId: PromptQueueClaimId,
    outcome: PromptQueueSettlementOutcome,
    error: Schema.optionalKey(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.retry"),
    itemId: PromptQueueItemId,
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("prompt.promoteToSteer"),
    itemId: PromptQueueItemId,
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("execution.pause"),
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("execution.continue"),
  }),
  Schema.Struct({
    ...PromptQueueCommandBase,
    type: Schema.Literal("execution.stop"),
  }),
]);
export type PromptQueueCommand = typeof PromptQueueCommand.Type;

const PromptQueueEventBase = {
  eventId: EventId,
  sequence: NonNegativeInt,
  threadId: ThreadId,
  commandId: CommandId,
  occurredAt: IsoDateTime,
} as const;

export const PromptQueueEvent = Schema.Union([
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.queued"),
    itemId: PromptQueueItemId,
    prompt: PromptText,
    position: NonNegativeInt,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.edited"),
    itemId: PromptQueueItemId,
    prompt: PromptText,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.deleted"),
    itemId: PromptQueueItemId,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.reordered"),
    itemIds: Schema.Array(PromptQueueItemId),
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.claimed"),
    itemId: PromptQueueItemId,
    claimId: PromptQueueClaimId,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.materialized"),
    itemId: PromptQueueItemId,
    claimId: PromptQueueClaimId,
    messageId: MessageId,
    turnId: TurnId,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.settled"),
    itemId: PromptQueueItemId,
    claimId: PromptQueueClaimId,
    outcome: PromptQueueSettlementOutcome,
    error: Schema.NullOr(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.retried"),
    itemId: PromptQueueItemId,
    attempt: NonNegativeInt,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("prompt.promoted_to_steer"),
    itemId: PromptQueueItemId,
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("execution.paused"),
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("execution.continued"),
  }),
  Schema.Struct({
    ...PromptQueueEventBase,
    type: Schema.Literal("execution.stopped"),
  }),
]);
export type PromptQueueEvent = typeof PromptQueueEvent.Type;

type WithoutSequence<T> = T extends { readonly sequence: number } ? Omit<T, "sequence"> : never;
export type PromptQueueEventInput = WithoutSequence<PromptQueueEvent>;

export const PromptQueueOperationCode = Schema.Literals([
  "invalid-command",
  "not-found",
  "conflict",
  "persistence",
]);
export type PromptQueueOperationCode = typeof PromptQueueOperationCode.Type;

export class PromptQueueOperationError extends Schema.TaggedErrorClass<PromptQueueOperationError>()(
  "PromptQueueOperationError",
  {
    code: PromptQueueOperationCode,
    operation: TrimmedNonEmptyString,
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {}

export const PromptQueueSnapshotInput = Schema.Struct({ threadId: ThreadId });
export type PromptQueueSnapshotInput = typeof PromptQueueSnapshotInput.Type;

export const EXECUTION_CONTROLLER_WS_METHODS = {
  snapshot: "executionController.snapshot",
  dispatch: "executionController.dispatch",
} as const;
