import {
  ChatMutationLedgerAppendInput,
  ChatMutationLedgerAppendResult,
  ChatMutationLedgerError,
  ChatMutationLedgerErrorCode,
  ChatMutationLedgerListInput,
  ChatMutationLedgerListResult,
  ChatMutationLedgerSettleInput,
  ChatMutationLedgerSettleResult,
  ChatMutationOperation,
  ChatMutationStatus,
  MutationPath,
  canSettleChatMutation,
  type MutationOperationId,
} from "@rune/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";

import {
  ChatMutationLedger,
  type ChatMutationLedgerServiceShape,
} from "../Services/ChatMutationLedger.ts";

const StoredMutationRow = Schema.Struct({
  operationId: Schema.String,
  chatId: Schema.String,
  threadId: Schema.String,
  turnId: Schema.String,
  branchId: Schema.String,
  pathsJson: Schema.String,
  patchHash: Schema.String,
  actor: Schema.String,
  agentId: Schema.NullOr(Schema.String),
  checkpointRef: Schema.NullOr(Schema.String),
  beforeHash: Schema.NullOr(Schema.String),
  afterHash: Schema.NullOr(Schema.String),
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  settledAt: Schema.NullOr(Schema.String),
  settledBy: Schema.NullOr(Schema.String),
});
type StoredMutationRow = typeof StoredMutationRow.Type;

const PathsJson = Schema.fromJsonString(Schema.Array(MutationPath));

const failure = (code: ChatMutationLedgerErrorCode, message: string, operationId?: string) =>
  new ChatMutationLedgerError({
    code,
    message,
    ...(operationId === undefined ? {} : { operationId: operationId as MutationOperationId }),
  });

const makeChatMutationLedger = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const mapSql = <A>(effect: Effect.Effect<A, SqlError>) =>
    effect.pipe(
      Effect.mapError(() => failure("persistence-failed", "Mutation ledger persistence failed.")),
    );
  const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

  const decodeRow = (row: unknown): Effect.Effect<ChatMutationOperation, ChatMutationLedgerError> =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(StoredMutationRow)(row).pipe(
        Effect.mapError(() =>
          failure("persistence-failed", "Persisted mutation ledger data is invalid."),
        ),
      );
      const paths = yield* Schema.decodeUnknownEffect(PathsJson)(decoded.pathsJson).pipe(
        Effect.mapError(() =>
          failure("persistence-failed", "Persisted mutation paths are invalid."),
        ),
      );
      const status = yield* Schema.decodeUnknownEffect(ChatMutationStatus)(decoded.status).pipe(
        Effect.mapError(() =>
          failure("persistence-failed", "Persisted mutation status is invalid."),
        ),
      );
      return yield* Schema.decodeUnknownEffect(ChatMutationOperation)({
        operationId: decoded.operationId,
        chatId: decoded.chatId,
        threadId: decoded.threadId,
        turnId: decoded.turnId,
        branchId: decoded.branchId,
        paths,
        patchHash: decoded.patchHash,
        actor: decoded.actor,
        ...(decoded.agentId === null ? {} : { agentId: decoded.agentId }),
        ...(decoded.checkpointRef === null ? {} : { checkpointRef: decoded.checkpointRef }),
        ...(decoded.beforeHash === null ? {} : { beforeHash: decoded.beforeHash }),
        ...(decoded.afterHash === null ? {} : { afterHash: decoded.afterHash }),
        status,
        createdAt: decoded.createdAt,
        updatedAt: decoded.updatedAt,
        settledAt: decoded.settledAt,
        ...(decoded.settledBy === null ? {} : { settledBy: decoded.settledBy }),
      }).pipe(
        Effect.mapError(() =>
          failure("persistence-failed", "Persisted mutation operation is invalid."),
        ),
      );
    });

  const selectById = (operationId: string) => sql<StoredMutationRow>`
    SELECT
      operation_id AS "operationId", chat_id AS "chatId", thread_id AS "threadId",
      turn_id AS "turnId", branch_id AS "branchId", paths_json AS "pathsJson",
      patch_hash AS "patchHash", actor, agent_id AS "agentId",
      checkpoint_ref AS "checkpointRef", before_hash AS "beforeHash",
      after_hash AS "afterHash", status, created_at AS "createdAt",
      updated_at AS "updatedAt", settled_at AS "settledAt", settled_by AS "settledBy"
    FROM chat_mutation_ledger
    WHERE operation_id = ${operationId}
  `;

  const sameImmutableData = (
    operation: ChatMutationOperation,
    input: ChatMutationLedgerAppendInput,
  ) =>
    operation.chatId === input.chatId &&
    operation.threadId === input.threadId &&
    operation.turnId === input.turnId &&
    operation.branchId === input.branchId &&
    operation.patchHash === input.patchHash &&
    operation.actor === input.actor &&
    (operation.agentId ?? null) === (input.agentId ?? null) &&
    (operation.checkpointRef ?? null) === (input.checkpointRef ?? null) &&
    (operation.beforeHash ?? null) === (input.beforeHash ?? null) &&
    (operation.afterHash ?? null) === (input.afterHash ?? null) &&
    operation.paths.length === input.paths.length &&
    operation.paths.every((path, index) => path === input.paths[index]);

  const append: ChatMutationLedgerServiceShape["append"] = (rawInput) =>
    Effect.gen(function* () {
      const input = yield* Schema.decodeUnknownEffect(ChatMutationLedgerAppendInput)(rawInput).pipe(
        Effect.mapError(() => failure("invalid-input", "Mutation append input is invalid.")),
      );
      const at = yield* nowIso;
      const pathsJson = yield* Schema.encodeEffect(PathsJson)(input.paths).pipe(
        Effect.mapError(() => failure("invalid-input", "Mutation paths could not be encoded.")),
      );
      const result = yield* mapSql(
        sql.withTransaction(
          Effect.gen(function* () {
            yield* sql`
              INSERT INTO chat_mutation_ledger (
                operation_id, chat_id, thread_id, turn_id, branch_id, paths_json,
                patch_hash, actor, agent_id, checkpoint_ref, before_hash, after_hash,
                status, created_at, updated_at, settled_at, settled_by
              ) VALUES (
                ${input.operationId}, ${input.chatId}, ${input.threadId}, ${input.turnId},
                ${input.branchId}, ${pathsJson}, ${input.patchHash},
                ${input.actor}, ${input.agentId ?? null}, ${input.checkpointRef ?? null},
                ${input.beforeHash ?? null}, ${input.afterHash ?? null}, 'pending',
                ${at}, ${at}, NULL, NULL
              ) ON CONFLICT (operation_id) DO NOTHING
            `;
            const changedRows = yield* sql<{
              readonly changed: number;
            }>`SELECT changes() AS changed`;
            const rows = yield* selectById(input.operationId);
            return { changed: (changedRows[0]?.changed ?? 0) === 1, row: rows[0] };
          }),
        ),
      );
      if (result.row === undefined) {
        return yield* failure(
          "persistence-failed",
          "Mutation ledger append was not stored.",
          input.operationId,
        );
      }
      const operation = yield* decodeRow(result.row);
      if (!result.changed && !sameImmutableData(operation, input)) {
        return yield* failure(
          "operation-conflict",
          "The operation id is already used by different mutation data.",
          input.operationId,
        );
      }
      return { operation, idempotent: !result.changed } satisfies ChatMutationLedgerAppendResult;
    });

  const list: ChatMutationLedgerServiceShape["list"] = (rawInput) =>
    Effect.gen(function* () {
      const input = yield* Schema.decodeUnknownEffect(ChatMutationLedgerListInput)(rawInput).pipe(
        Effect.mapError(() => failure("invalid-input", "Mutation list input is invalid.")),
      );
      const rows = yield* mapSql(sql<StoredMutationRow>`
        SELECT
          operation_id AS "operationId", chat_id AS "chatId", thread_id AS "threadId",
          turn_id AS "turnId", branch_id AS "branchId", paths_json AS "pathsJson",
          patch_hash AS "patchHash", actor, agent_id AS "agentId",
          checkpoint_ref AS "checkpointRef", before_hash AS "beforeHash",
          after_hash AS "afterHash", status, created_at AS "createdAt",
          updated_at AS "updatedAt", settled_at AS "settledAt", settled_by AS "settledBy"
        FROM chat_mutation_ledger
        WHERE (${input.chatId ?? null} IS NULL OR chat_id = ${input.chatId ?? null})
          AND (${input.threadId ?? null} IS NULL OR thread_id = ${input.threadId ?? null})
          AND (${input.turnId ?? null} IS NULL OR turn_id = ${input.turnId ?? null})
          AND (${input.branchId ?? null} IS NULL OR branch_id = ${input.branchId ?? null})
          AND (${input.status ?? null} IS NULL OR status = ${input.status ?? null})
        ORDER BY created_at ASC, operation_id ASC
        LIMIT ${input.limit ?? 500}
      `);
      return {
        operations: yield* Effect.forEach(rows, decodeRow),
      } satisfies ChatMutationLedgerListResult;
    });

  const settle: ChatMutationLedgerServiceShape["settle"] = (rawInput) =>
    Effect.gen(function* () {
      const input = yield* Schema.decodeUnknownEffect(ChatMutationLedgerSettleInput)(rawInput).pipe(
        Effect.mapError(() => failure("invalid-input", "Mutation settle input is invalid.")),
      );
      const rows = yield* mapSql(selectById(input.operationId));
      const existing = rows[0];
      if (existing === undefined) {
        return yield* failure(
          "operation-not-found",
          "The mutation operation was not found.",
          input.operationId,
        );
      }
      const operation = yield* decodeRow(existing);
      if (!canSettleChatMutation(operation.status, input.status)) {
        return yield* failure(
          "invalid-transition",
          "A settled mutation cannot change terminal state.",
          input.operationId,
        );
      }
      if (operation.status === input.status) {
        return { operation, idempotent: true } satisfies ChatMutationLedgerSettleResult;
      }
      const at = yield* nowIso;
      yield* mapSql(sql`
        UPDATE chat_mutation_ledger
        SET status = ${input.status}, settled_at = ${at}, updated_at = ${at},
            settled_by = ${input.settledBy ?? null}
        WHERE operation_id = ${input.operationId} AND status = 'pending'
      `);
      const changedRows = yield* mapSql(
        sql<{ readonly changed: number }>`SELECT changes() AS changed`,
      );
      const updatedRows = yield* mapSql(selectById(input.operationId));
      const updated = updatedRows[0];
      if (updated === undefined) {
        return yield* failure(
          "persistence-failed",
          "Settled mutation could not be read back.",
          input.operationId,
        );
      }
      const updatedOperation = yield* decodeRow(updated);
      if ((changedRows[0]?.changed ?? 0) !== 1) {
        if (updatedOperation.status === input.status) {
          return {
            operation: updatedOperation,
            idempotent: true,
          } satisfies ChatMutationLedgerSettleResult;
        }
        return yield* failure(
          "invalid-transition",
          "A concurrent settlement already chose a different terminal state.",
          input.operationId,
        );
      }
      return {
        operation: updatedOperation,
        idempotent: false,
      } satisfies ChatMutationLedgerSettleResult;
    });

  return { append, list, settle } satisfies ChatMutationLedgerServiceShape;
});

export const ChatMutationLedgerLive = Layer.effect(ChatMutationLedger, makeChatMutationLedger);
