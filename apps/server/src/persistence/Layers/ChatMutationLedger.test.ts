import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import {
  ChatMutationLedgerAppendInput,
  MutationBranchId,
  MutationOperationId,
  MutationPatchHash,
  ThreadId,
  TurnId,
} from "@rune/contracts";
import { ChatMutationLedger } from "../Services/ChatMutationLedger.ts";
import { ChatMutationLedgerLive } from "./ChatMutationLedger.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

const ledgerLayer = ChatMutationLedgerLive.pipe(Layer.provideMerge(SqlitePersistenceMemory));

const appendInput = Schema.decodeUnknownSync(ChatMutationLedgerAppendInput)({
  operationId: "operation-1",
  chatId: "chat-1",
  threadId: "thread-1",
  turnId: "turn-1",
  branchId: "branch-1",
  paths: ["src/app.ts", "src/app.test.ts"],
  patchHash: "sha256:patch-1",
  actor: "agent:codex",
  agentId: "agent-1",
  checkpointRef: "refs/rune/checkpoints/thread-1/turn-1",
});

it.effect("appends idempotently, filters by ownership, and settles once", () =>
  Effect.gen(function* () {
    const ledger = yield* ChatMutationLedger;
    const first = yield* ledger.append(appendInput);
    const repeated = yield* ledger.append(appendInput);
    assert.strictEqual(first.idempotent, false);
    assert.strictEqual(repeated.idempotent, true);
    assert.deepStrictEqual(repeated.operation, first.operation);

    const listed = yield* ledger.list({
      threadId: ThreadId.make("thread-1"),
      branchId: MutationBranchId.make("branch-1"),
    });
    assert.deepStrictEqual(
      listed.operations.map((operation) => operation.operationId),
      ["operation-1"],
    );

    const settled = yield* ledger.settle({
      operationId: MutationOperationId.make("operation-1"),
      status: "settled",
      settledBy: "user:1",
    });
    assert.strictEqual(settled.operation.status, "settled");
    assert.strictEqual(settled.operation.settledBy, "user:1");

    const repeatedSettlement = yield* ledger.settle({
      operationId: MutationOperationId.make("operation-1"),
      status: "settled",
      settledBy: "user:1",
    });
    assert.strictEqual(repeatedSettlement.idempotent, true);
    assert.strictEqual(repeatedSettlement.operation.settledAt, settled.operation.settledAt);
  }).pipe(Effect.provide(ledgerLayer)),
);

it.effect("rejects a reused operation id with different immutable data", () =>
  Effect.gen(function* () {
    const ledger = yield* ChatMutationLedger;
    yield* ledger.append(appendInput);
    const error = yield* ledger
      .append({ ...appendInput, patchHash: MutationPatchHash.make("sha256:different") })
      .pipe(Effect.flip);
    assert.strictEqual(error.code, "operation-conflict");
  }).pipe(Effect.provide(ledgerLayer)),
);
