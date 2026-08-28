import * as Schema from "effect/Schema";

import {
  CheckpointRef,
  IsoDateTime,
  ThreadId,
  TrimmedNonEmptyString,
  TurnId,
} from "./baseSchemas.ts";

const makeOpaqueId = <Brand extends string>(brand: Brand) =>
  TrimmedNonEmptyString.pipe(Schema.brand(brand));

/** The chat identity is separate from a thread so forks can share a lineage. */
export const ChatId = makeOpaqueId("ChatId");
export type ChatId = typeof ChatId.Type;

export const MutationOperationId = makeOpaqueId("MutationOperationId");
export type MutationOperationId = typeof MutationOperationId.Type;

export const MutationBranchId = makeOpaqueId("MutationBranchId");
export type MutationBranchId = typeof MutationBranchId.Type;

export const MutationPath = TrimmedNonEmptyString.check(Schema.isMaxLength(4_096));
export type MutationPath = typeof MutationPath.Type;

export const MutationPatchHash = TrimmedNonEmptyString.check(Schema.isMaxLength(256));
export type MutationPatchHash = typeof MutationPatchHash.Type;

export const MutationActor = TrimmedNonEmptyString.check(Schema.isMaxLength(512));
export type MutationActor = typeof MutationActor.Type;

/** A mutation is appended as pending, then moved once to a terminal state. */
export const ChatMutationStatus = Schema.Literals(["pending", "settled", "failed", "cancelled"]);
export type ChatMutationStatus = typeof ChatMutationStatus.Type;

export const ChatMutationTerminalStatus = Schema.Literals(["settled", "failed", "cancelled"]);
export type ChatMutationTerminalStatus = typeof ChatMutationTerminalStatus.Type;

export const ChatMutationBranchStatus = Schema.Literals(["active", "settled", "abandoned"]);
export type ChatMutationBranchStatus = typeof ChatMutationBranchStatus.Type;

/** Durable branch identity used to keep forked chat histories attributable. */
export const ChatMutationBranch = Schema.Struct({
  branchId: MutationBranchId,
  chatId: ChatId,
  threadId: ThreadId,
  parentBranchId: Schema.optionalKey(MutationBranchId),
  status: ChatMutationBranchStatus,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type ChatMutationBranch = typeof ChatMutationBranch.Type;

/** The immutable ownership projection of one operation. */
export const ChatMutationOwnership = Schema.Struct({
  operationId: MutationOperationId,
  chatId: ChatId,
  threadId: ThreadId,
  turnId: TurnId,
  branchId: MutationBranchId,
  paths: Schema.Array(MutationPath).check(Schema.isMinLength(1), Schema.isMaxLength(512)),
  actor: MutationActor,
  agentId: Schema.optionalKey(MutationActor),
  ownedAt: IsoDateTime,
});
export type ChatMutationOwnership = typeof ChatMutationOwnership.Type;

/**
 * Provider-neutral durable mutation record. Hashes and checkpoint evidence are
 * references only; raw patches are intentionally not persisted here.
 */
export const ChatMutationOperation = Schema.Struct({
  operationId: MutationOperationId,
  chatId: ChatId,
  threadId: ThreadId,
  turnId: TurnId,
  branchId: MutationBranchId,
  paths: Schema.Array(MutationPath).check(Schema.isMinLength(1), Schema.isMaxLength(512)),
  patchHash: MutationPatchHash,
  actor: MutationActor,
  agentId: Schema.optionalKey(MutationActor),
  checkpointRef: Schema.optionalKey(CheckpointRef),
  beforeHash: Schema.optionalKey(MutationPatchHash),
  afterHash: Schema.optionalKey(MutationPatchHash),
  status: ChatMutationStatus,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  settledAt: Schema.NullOr(IsoDateTime),
  settledBy: Schema.optionalKey(MutationActor),
});
export type ChatMutationOperation = typeof ChatMutationOperation.Type;

export const ChatMutationLedgerAppendInput = Schema.Struct({
  operationId: MutationOperationId,
  chatId: ChatId,
  threadId: ThreadId,
  turnId: TurnId,
  branchId: MutationBranchId,
  paths: Schema.Array(MutationPath).check(Schema.isMinLength(1), Schema.isMaxLength(512)),
  patchHash: MutationPatchHash,
  actor: MutationActor,
  agentId: Schema.optionalKey(MutationActor),
  checkpointRef: Schema.optionalKey(CheckpointRef),
  beforeHash: Schema.optionalKey(MutationPatchHash),
  afterHash: Schema.optionalKey(MutationPatchHash),
});
export type ChatMutationLedgerAppendInput = typeof ChatMutationLedgerAppendInput.Type;

export const ChatMutationLedgerListInput = Schema.Struct({
  chatId: Schema.optionalKey(ChatId),
  threadId: Schema.optionalKey(ThreadId),
  turnId: Schema.optionalKey(TurnId),
  branchId: Schema.optionalKey(MutationBranchId),
  status: Schema.optionalKey(ChatMutationStatus),
  limit: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 500 }))),
});
export type ChatMutationLedgerListInput = typeof ChatMutationLedgerListInput.Type;

export const ChatMutationLedgerSettleInput = Schema.Struct({
  operationId: MutationOperationId,
  status: ChatMutationTerminalStatus,
  settledBy: Schema.optionalKey(MutationActor),
});
export type ChatMutationLedgerSettleInput = typeof ChatMutationLedgerSettleInput.Type;

export const ChatMutationLedgerAppendResult = Schema.Struct({
  operation: ChatMutationOperation,
  idempotent: Schema.Boolean,
});
export type ChatMutationLedgerAppendResult = typeof ChatMutationLedgerAppendResult.Type;

export const ChatMutationLedgerSettleResult = Schema.Struct({
  operation: ChatMutationOperation,
  idempotent: Schema.Boolean,
});
export type ChatMutationLedgerSettleResult = typeof ChatMutationLedgerSettleResult.Type;

export const ChatMutationLedgerListResult = Schema.Struct({
  operations: Schema.Array(ChatMutationOperation),
});
export type ChatMutationLedgerListResult = typeof ChatMutationLedgerListResult.Type;

export const ChatMutationLedgerErrorCode = Schema.Literals([
  "operation-conflict",
  "operation-not-found",
  "invalid-transition",
  "invalid-input",
  "persistence-failed",
]);
export type ChatMutationLedgerErrorCode = typeof ChatMutationLedgerErrorCode.Type;

export class ChatMutationLedgerError extends Schema.TaggedErrorClass<ChatMutationLedgerError>()(
  "ChatMutationLedgerError",
  {
    code: ChatMutationLedgerErrorCode,
    message: TrimmedNonEmptyString,
    operationId: Schema.optionalKey(MutationOperationId),
  },
) {}

/** Pure transition guard shared by service implementations and callers. */
export const canSettleChatMutation = (
  current: ChatMutationStatus,
  next: ChatMutationTerminalStatus,
): boolean => current === "pending" || current === next;

// Short aliases keep the contract usable by callers that do not need the chat prefix.
export const MutationOperation = ChatMutationOperation;
export type MutationOperation = ChatMutationOperation;
export const MutationOwnership = ChatMutationOwnership;
export type MutationOwnership = ChatMutationOwnership;
export const MutationBranch = ChatMutationBranch;
export type MutationBranch = ChatMutationBranch;
