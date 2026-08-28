import {
  ChatMutationLedgerAppendInput,
  ChatMutationLedgerAppendResult,
  ChatMutationLedgerError,
  ChatMutationLedgerListInput,
  ChatMutationLedgerListResult,
  ChatMutationLedgerSettleInput,
  ChatMutationLedgerSettleResult,
} from "@rune/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface ChatMutationLedgerServiceShape {
  readonly append: (
    input: ChatMutationLedgerAppendInput,
  ) => Effect.Effect<ChatMutationLedgerAppendResult, ChatMutationLedgerError>;
  readonly list: (
    input: ChatMutationLedgerListInput,
  ) => Effect.Effect<ChatMutationLedgerListResult, ChatMutationLedgerError>;
  readonly settle: (
    input: ChatMutationLedgerSettleInput,
  ) => Effect.Effect<ChatMutationLedgerSettleResult, ChatMutationLedgerError>;
}

export class ChatMutationLedger extends Context.Service<
  ChatMutationLedger,
  ChatMutationLedgerServiceShape
>()("rune/persistence/Services/ChatMutationLedger") {}
