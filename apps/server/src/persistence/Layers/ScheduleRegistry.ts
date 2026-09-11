import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";
import * as DateTime from "effect/DateTime";
import * as Semaphore from "effect/Semaphore";

import {
  ScheduleAccessScope,
  ScheduleCommandReceipt,
  ScheduleDateTime,
  ScheduleEvent,
  ScheduleListResult,
  ScheduleMutationResult,
  ScheduleNextDueResult,
  ScheduleRun,
  ScheduleRunListResult,
  ScheduleRunNowResult,
  ScheduleRunSettlementInput,
  ScheduleSubscriptionSnapshot,
  ScheduleTrigger,
  RuneSchedule,
  ScheduleId,
  ScheduleRunId,
  ScheduleRegistryError,
  ScheduleRegistryErrorCode,
  ScheduleStatus,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  SchedulePauseInput,
  ScheduleResumeInput,
  ScheduleDeleteInput,
  ScheduleRunNowInput,
  ScheduleListInput,
  ScheduleGetInput,
  ScheduleRunsInput,
  ScheduleSubscribeInput,
  ScheduleMutationOperation,
} from "@rune/contracts";
import {
  nextScheduleOccurrence,
  resolveMissedOccurrence,
} from "@rune/shared/scheduleRecurrence";
import { ScheduleRegistry, scheduleRegistryFailure, type ScheduleRegistryShape } from "../Services/ScheduleRegistry.ts";

const StoredScheduleRow = Schema.Struct({
  scheduleId: Schema.String,
  environmentId: Schema.String,
  projectId: Schema.NullOr(Schema.String),
  name: Schema.String,
  triggerJson: Schema.String,
  targetJson: Schema.String,
  policyJson: Schema.String,
  displayTimeZone: Schema.String,
  status: Schema.String,
  version: Schema.Int,
  claimedRunCount: Schema.Int,
  nextRunAt: Schema.NullOr(Schema.String),
  lastRunAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  createdBy: Schema.String,
  latestSequence: Schema.Int,
});
type StoredScheduleRow = typeof StoredScheduleRow.Type;

const StoredRunRow = Schema.Struct({
  runId: Schema.String,
  scheduleId: Schema.String,
  environmentId: Schema.String,
  trigger: Schema.String,
  scheduledFor: Schema.String,
  createdAt: Schema.String,
  startedAt: Schema.NullOr(Schema.String),
  completedAt: Schema.NullOr(Schema.String),
  status: Schema.String,
  leaseOwner: Schema.NullOr(Schema.String),
  leaseExpiresAt: Schema.NullOr(Schema.String),
  providerInstanceId: Schema.NullOr(Schema.String),
  threadId: Schema.String,
  orchestrationCommandId: Schema.NullOr(Schema.String),
  actionRunId: Schema.NullOr(Schema.String),
  providerReceiptId: Schema.NullOr(Schema.String),
  receiptSummary: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  dispatchIdempotencyKey: Schema.NullOr(Schema.String),
});
type StoredRunRow = typeof StoredRunRow.Type;

const StoredReceiptRow = Schema.Struct({
  commandId: Schema.String,
  idempotencyKey: Schema.String,
  operation: Schema.String,
  scheduleId: Schema.String,
  runId: Schema.NullOr(Schema.String),
  environmentId: Schema.String,
  threadId: Schema.NullOr(Schema.String),
  providerInstanceId: Schema.NullOr(Schema.String),
  resultJson: Schema.String,
  recordedAt: Schema.String,
});
type StoredReceiptRow = typeof StoredReceiptRow.Type;

const ScheduleJson = Schema.fromJsonString(RuneSchedule);
const RunJson = Schema.fromJsonString(ScheduleRun);
const ReceiptJson = Schema.fromJsonString(ScheduleCommandReceipt);
const encodeSchedule = Schema.encodeSync(ScheduleJson);
const encodeRun = Schema.encodeSync(RunJson);
const encodeReceipt = Schema.encodeSync(ReceiptJson);

const uuid = () => crypto.randomUUID();
const commandId = () => `command:${uuid()}`;
const scheduleId = () => `schedule:${uuid()}` as ScheduleId;
const runId = () => `schedule-run:${uuid()}` as ScheduleRunId;

const nowIso = DateTime.now.pipe(Effect.map(DateTime.formatIso));
const addSeconds = (at: string, seconds: number): string =>
  new Date(Date.parse(at) + seconds * 1_000).toISOString();

const decodeJson = <A, I>(schema: Schema.Schema<A, I>, value: string, message: string) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError(() => scheduleRegistryFailure("persistence-failed", message)),
  );

const asScheduleId = (value: string) => value as ScheduleId;
const asRunId = (value: string) => value as ScheduleRunId;

const makeRegistry = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  // Receipt lookup happens before each command's write transaction. Serialize
  // commands in this process so same-key retries cannot both pass that lookup
  // and create duplicate schedules or manual runs.
  const commandMutex = yield* Semaphore.make(1);
  const mapSql = <A>(effect: Effect.Effect<A, SqlError>) =>
    effect.pipe(
      Effect.mapError(() =>
        scheduleRegistryFailure("persistence-failed", "Schedule persistence failed."),
      ),
    );

  const decodeScheduleRow = (row: unknown): Effect.Effect<RuneSchedule, ScheduleRegistryError> =>
    Effect.gen(function* () {
      const stored = yield* Schema.decodeUnknownEffect(StoredScheduleRow)(row).pipe(
        Effect.mapError(() =>
          scheduleRegistryFailure("persistence-failed", "Persisted schedule data is invalid."),
        ),
      );
      return yield* decodeJson(ScheduleJson, JSON.stringify({
        id: asScheduleId(stored.scheduleId),
        name: stored.name,
        environmentId: stored.environmentId,
        ...(stored.projectId === null ? {} : { projectId: stored.projectId }),
        trigger: JSON.parse(stored.triggerJson) as typeof ScheduleTrigger.Type,
        target: JSON.parse(stored.targetJson),
        policy: JSON.parse(stored.policyJson),
        displayTimeZone: stored.displayTimeZone,
        status: stored.status,
        version: stored.version,
        claimedRunCount: stored.claimedRunCount,
        nextRunAt: stored.nextRunAt,
        ...(stored.lastRunAt === null ? {} : { lastRunAt: stored.lastRunAt }),
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        createdBy: stored.createdBy,
      }), "Persisted schedule data is invalid.");
    });

  const decodeRunRow = (row: unknown): Effect.Effect<ScheduleRun, ScheduleRegistryError> =>
    Effect.gen(function* () {
      const stored = yield* Schema.decodeUnknownEffect(StoredRunRow)(row).pipe(
        Effect.mapError(() =>
          scheduleRegistryFailure("persistence-failed", "Persisted schedule run data is invalid."),
        ),
      );
      return yield* decodeJson(RunJson, JSON.stringify({
        id: asRunId(stored.runId),
        scheduleId: asScheduleId(stored.scheduleId),
        trigger: stored.trigger,
        scheduledFor: stored.scheduledFor,
        createdAt: stored.createdAt,
        ...(stored.startedAt === null ? {} : { startedAt: stored.startedAt }),
        ...(stored.completedAt === null ? {} : { completedAt: stored.completedAt }),
        status: stored.status,
        ...(stored.leaseOwner === null ? {} : { leaseOwner: stored.leaseOwner }),
        ...(stored.leaseExpiresAt === null ? {} : { leaseExpiresAt: stored.leaseExpiresAt }),
        ...(stored.providerInstanceId === null ? {} : { providerInstanceId: stored.providerInstanceId }),
        threadId: stored.threadId,
        ...(stored.orchestrationCommandId === null ? {} : { orchestrationCommandId: stored.orchestrationCommandId }),
        ...(stored.actionRunId === null ? {} : { actionRunId: stored.actionRunId }),
        ...(stored.providerReceiptId === null ? {} : { providerReceiptId: stored.providerReceiptId }),
        ...(stored.receiptSummary === null ? {} : { receiptSummary: stored.receiptSummary }),
        ...(stored.error === null ? {} : { error: stored.error }),
      }), "Persisted schedule run data is invalid.");
    });

  const selectSchedule = (id: ScheduleId) => sql<StoredScheduleRow>`
    SELECT schedule_id AS "scheduleId", environment_id AS "environmentId",
      project_id AS "projectId", name, trigger_json AS "triggerJson",
      target_json AS "targetJson", policy_json AS "policyJson",
      display_time_zone AS "displayTimeZone", status, version,
      claimed_run_count AS "claimedRunCount", next_run_at AS "nextRunAt",
      last_run_at AS "lastRunAt", created_at AS "createdAt", updated_at AS "updatedAt",
      created_by AS "createdBy", latest_sequence AS "latestSequence"
    FROM schedules WHERE schedule_id = ${id}
  `;

  const selectRun = (id: ScheduleRunId) => sql<StoredRunRow>`
    SELECT run_id AS "runId", schedule_id AS "scheduleId", environment_id AS "environmentId",
      trigger, scheduled_for AS "scheduledFor", created_at AS "createdAt",
      started_at AS "startedAt", completed_at AS "completedAt", status,
      lease_owner AS "leaseOwner", lease_expires_at AS "leaseExpiresAt",
      provider_instance_id AS "providerInstanceId", thread_id AS "threadId",
      orchestration_command_id AS "orchestrationCommandId", action_run_id AS "actionRunId",
      provider_receipt_id AS "providerReceiptId", receipt_summary AS "receiptSummary",
      error, dispatch_idempotency_key AS "dispatchIdempotencyKey"
    FROM schedule_runs WHERE run_id = ${id}
  `;

  const scopeAllows = (scope: ScheduleAccessScope, schedule: RuneSchedule) =>
    scope.environmentId === schedule.environmentId &&
    (schedule.projectId === undefined || scope.projectIds === undefined || scope.projectIds.includes(schedule.projectId)) &&
    (scope.threadIds === undefined || scope.threadIds.includes(schedule.target.threadId));

  const getSchedule = (scope: ScheduleAccessScope, id: ScheduleId) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(selectSchedule(id));
      const row = rows[0];
      if (row === undefined) return yield* Effect.fail(scheduleRegistryFailure("not-found", "Schedule not found.", { scheduleId: id }));
      const schedule = yield* decodeScheduleRow(row);
      if (!scopeAllows(scope, schedule)) return yield* Effect.fail(scheduleRegistryFailure("authorization-required", "Schedule is outside the authorized environment scope.", { scheduleId: id }));
      return schedule;
    });

  const findReceipt = (scope: ScheduleAccessScope, key: string) =>
    mapSql(sql<StoredReceiptRow>`
      SELECT command_id AS "commandId", idempotency_key AS "idempotencyKey", operation,
        schedule_id AS "scheduleId", run_id AS "runId", environment_id AS "environmentId",
        thread_id AS "threadId", provider_instance_id AS "providerInstanceId",
        result_json AS "resultJson", recorded_at AS "recordedAt"
      FROM schedule_command_receipts
      WHERE environment_id = ${scope.environmentId} AND idempotency_key = ${key}
    `);

  const decodeMutationReceipt = (row: StoredReceiptRow) =>
    decodeJson(ReceiptJson, row.resultJson, "Persisted schedule command receipt is invalid.");

  const appendEvent = (input: {
    readonly environmentId: string;
    readonly scheduleId: ScheduleId;
    readonly kind: ScheduleEvent["kind"];
    readonly at: string;
    readonly schedule?: RuneSchedule;
    readonly run?: ScheduleRun;
  }) => sql`
    INSERT INTO schedule_events (
      environment_id, schedule_id, kind, at, schedule_json, run_json
    ) VALUES (
      ${input.environmentId}, ${input.scheduleId}, ${input.kind}, ${input.at},
      ${input.schedule === undefined ? null : encodeSchedule(input.schedule)},
      ${input.run === undefined ? null : encodeRun(input.run)}
    )
  `;

  const writeReceipt = (receipt: ScheduleCommandReceipt, result: ScheduleMutationResult | ScheduleRunNowResult) =>
    sql`
      INSERT INTO schedule_command_receipts (
        environment_id, idempotency_key, command_id, operation, schedule_id, run_id,
        thread_id, provider_instance_id, result_json, recorded_at
      ) VALUES (
        ${receipt.environmentId}, ${receipt.idempotencyKey}, ${receipt.commandId},
        ${receipt.operation}, ${receipt.scheduleId}, ${receipt.runId ?? null},
        ${receipt.threadId ?? null}, ${receipt.providerInstanceId ?? null},
        ${JSON.stringify(result)}, ${receipt.recordedAt}
      )
    `;

  const decodeReceiptResult = (row: StoredReceiptRow) =>
    decodeJson(Schema.Union([ScheduleMutationResult, ScheduleRunNowResult]), row.resultJson, "Persisted schedule command result is invalid.");

  const buildSchedule = (input: ScheduleCreateInput, at: string, createdBy: RuneSchedule["createdBy"]): RuneSchedule => ({
    id: scheduleId(),
    name: input.name,
    environmentId: input.environmentId,
    ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
    trigger: input.trigger,
    target: input.target,
    policy: input.policy,
    displayTimeZone: input.displayTimeZone,
    status: "active",
    version: 1,
    claimedRunCount: 0,
    nextRunAt: input.trigger.type === "once" ? input.trigger.runAt : input.trigger.firstRunAt,
    createdAt: at,
    updatedAt: at,
    createdBy,
  });

  const insertSchedule = (schedule: RuneSchedule) => sql`
    INSERT INTO schedules (
      schedule_id, environment_id, project_id, name, trigger_json, target_json,
      policy_json, display_time_zone, status, version, claimed_run_count,
      next_run_at, last_run_at, created_at, updated_at, created_by, latest_sequence
    ) VALUES (
      ${schedule.id}, ${schedule.environmentId}, ${schedule.projectId ?? null}, ${schedule.name},
      ${JSON.stringify(schedule.trigger)}, ${JSON.stringify(schedule.target)},
      ${JSON.stringify(schedule.policy)}, ${schedule.displayTimeZone}, ${schedule.status},
      ${schedule.version}, ${schedule.claimedRunCount}, ${schedule.nextRunAt}, NULL,
      ${schedule.createdAt}, ${schedule.updatedAt}, ${schedule.createdBy}, 0
    )
  `;

  const mutation = (
    scope: ScheduleAccessScope,
    operation: ScheduleMutationOperation,
    idempotencyKey: string,
    run: (at: string) => Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>,
  ) =>
    commandMutex.withPermits(1)(
      Effect.gen(function* () {
        const previous = yield* findReceipt(scope, idempotencyKey);
        const previousRow = previous[0];
        if (previousRow !== undefined) return yield* decodeReceiptResult(previousRow) as Effect.Effect<ScheduleMutationResult, ScheduleRegistryError>;
        const at = yield* nowIso;
        return yield* run(at);
      }),
    );

  const create: ScheduleRegistryShape["create"] = (scope, input, createdBy) =>
    mutation(scope, "create", input.idempotencyKey, (at) =>
      Effect.gen(function* () {
        if (scope.environmentId !== input.environmentId) return yield* Effect.fail(scheduleRegistryFailure("authorization-required", "Schedule environment is outside the authorized scope."));
        const schedule = buildSchedule(input, at, createdBy);
        const receipt: ScheduleCommandReceipt = {
          commandId: commandId(), idempotencyKey: input.idempotencyKey, operation: "create",
          scheduleId: schedule.id, environmentId: schedule.environmentId, recordedAt: at,
          threadId: schedule.target.threadId,
        };
        const result = { schedule, receipt } satisfies ScheduleMutationResult;
        yield* mapSql(sql.withTransaction(Effect.gen(function* () {
          yield* insertSchedule(schedule);
          yield* appendEvent({ environmentId: schedule.environmentId, scheduleId: schedule.id, kind: "created", at, schedule });
          yield* writeReceipt(receipt, result);
        })));
        return result;
      }),
    );

  const update: ScheduleRegistryShape["update"] = (scope, input) =>
    mutation(scope, "update", input.idempotencyKey, (at) =>
      Effect.gen(function* () {
        const current = yield* getSchedule(scope, input.scheduleId);
        if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) return yield* Effect.fail(scheduleRegistryFailure("version-conflict", "Schedule changed before this update.", { scheduleId: input.scheduleId }));
        const trigger = input.trigger ?? current.trigger;
        const next = {
          ...current,
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
          trigger,
          ...(input.target === undefined ? {} : { target: input.target }),
          ...(input.policy === undefined ? {} : { policy: input.policy }),
          ...(input.displayTimeZone === undefined ? {} : { displayTimeZone: input.displayTimeZone }),
          nextRunAt: current.status === "active"
            ? (trigger.type === "once" ? trigger.runAt : trigger.firstRunAt)
            : current.nextRunAt,
          version: current.version + 1,
          updatedAt: at,
        } satisfies RuneSchedule;
        const receipt: ScheduleCommandReceipt = { commandId: commandId(), idempotencyKey: input.idempotencyKey, operation: "update", scheduleId: next.id, environmentId: next.environmentId, recordedAt: at, threadId: next.target.threadId };
        const result = { schedule: next, receipt } satisfies ScheduleMutationResult;
        yield* mapSql(sql.withTransaction(Effect.gen(function* () {
          yield* sql`UPDATE schedules SET name = ${next.name}, project_id = ${next.projectId ?? null}, trigger_json = ${JSON.stringify(next.trigger)}, target_json = ${JSON.stringify(next.target)}, policy_json = ${JSON.stringify(next.policy)}, display_time_zone = ${next.displayTimeZone}, version = ${next.version}, next_run_at = ${next.nextRunAt}, updated_at = ${at} WHERE schedule_id = ${next.id} AND version = ${current.version}`;
          yield* appendEvent({ environmentId: next.environmentId, scheduleId: next.id, kind: "updated", at, schedule: next });
          yield* writeReceipt(receipt, result);
        })));
        return result;
      }),
    );

  const setStatus = (
    scope: ScheduleAccessScope,
    input: SchedulePauseInput | ScheduleResumeInput,
    status: "paused" | "active",
    operation: "pause" | "resume",
  ) => mutation(scope, operation, input.idempotencyKey, (at) => Effect.gen(function* () {
    const current = yield* getSchedule(scope, input.scheduleId);
    if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) return yield* Effect.fail(scheduleRegistryFailure("version-conflict", "Schedule changed before this update.", { scheduleId: input.scheduleId }));
    const next = { ...current, status, version: current.version + 1, updatedAt: at } satisfies RuneSchedule;
    const receipt: ScheduleCommandReceipt = { commandId: commandId(), idempotencyKey: input.idempotencyKey, operation, scheduleId: next.id, environmentId: next.environmentId, recordedAt: at, threadId: next.target.threadId };
    const result = { schedule: next, receipt } satisfies ScheduleMutationResult;
    yield* mapSql(sql.withTransaction(Effect.gen(function* () {
      yield* sql`UPDATE schedules SET status = ${status}, version = ${next.version}, updated_at = ${at} WHERE schedule_id = ${next.id} AND version = ${current.version}`;
      yield* appendEvent({ environmentId: next.environmentId, scheduleId: next.id, kind: operation === "pause" ? "paused" : "resumed", at, schedule: next });
      yield* writeReceipt(receipt, result);
    })));
    return result;
  }));

  const remove: ScheduleRegistryShape["remove"] = (scope, input) =>
    mutation(scope, "delete", input.idempotencyKey, (at) => Effect.gen(function* () {
      const current = yield* getSchedule(scope, input.scheduleId);
      if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) return yield* Effect.fail(scheduleRegistryFailure("version-conflict", "Schedule changed before deletion.", { scheduleId: input.scheduleId }));
      const receipt: ScheduleCommandReceipt = { commandId: commandId(), idempotencyKey: input.idempotencyKey, operation: "delete", scheduleId: current.id, environmentId: current.environmentId, recordedAt: at, threadId: current.target.threadId };
      const result = { schedule: current, receipt } satisfies ScheduleMutationResult;
      yield* mapSql(sql.withTransaction(Effect.gen(function* () {
        yield* sql`DELETE FROM schedules WHERE schedule_id = ${current.id} AND version = ${current.version}`;
        yield* appendEvent({ environmentId: current.environmentId, scheduleId: current.id, kind: "deleted", at, schedule: current });
        yield* writeReceipt(receipt, result);
      })));
      return result;
    }));

  const pause: ScheduleRegistryShape["pause"] = (scope, input) => setStatus(scope, input, "paused", "pause");
  const resume: ScheduleRegistryShape["resume"] = (scope, input) => setStatus(scope, input, "active", "resume");

  const runNow: ScheduleRegistryShape["runNow"] = (scope, input) =>
    commandMutex.withPermits(1)(
      Effect.gen(function* () {
        const previous = yield* findReceipt(scope, input.idempotencyKey);
        const previousRow = previous[0];
        if (previousRow !== undefined) return yield* decodeReceiptResult(previousRow) as Effect.Effect<ScheduleRunNowResult, ScheduleRegistryError>;
        const current = yield* getSchedule(scope, input.scheduleId);
        if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) return yield* Effect.fail(scheduleRegistryFailure("version-conflict", "Schedule changed before run-now.", { scheduleId: current.id }));
        const at = yield* nowIso;
        const run: ScheduleRun = { id: runId(), scheduleId: current.id, trigger: "manual", scheduledFor: at, createdAt: at, status: "claimed", threadId: current.target.threadId };
        const receipt: ScheduleCommandReceipt = { commandId: commandId(), idempotencyKey: input.idempotencyKey, operation: "run-now", scheduleId: current.id, runId: run.id, environmentId: current.environmentId, recordedAt: at, threadId: current.target.threadId };
        const result = { schedule: current, run, receipt } satisfies ScheduleRunNowResult;
        yield* mapSql(sql.withTransaction(Effect.gen(function* () {
          yield* sql`INSERT INTO schedule_runs (run_id, schedule_id, environment_id, trigger, scheduled_for, created_at, status, thread_id, dispatch_idempotency_key) VALUES (${run.id}, ${run.scheduleId}, ${current.environmentId}, 'manual', ${run.scheduledFor}, ${run.createdAt}, 'claimed', ${run.threadId}, ${run.id})`;
          yield* sql`INSERT INTO schedule_dispatch_outbox (run_id, schedule_id, environment_id, idempotency_key, status, intent_json, created_at, updated_at) VALUES (${run.id}, ${run.scheduleId}, ${current.environmentId}, ${run.id}, 'pending', ${JSON.stringify({ runId: run.id, scheduleId: run.scheduleId, threadId: run.threadId, trigger: "manual" })}, ${at}, ${at})`;
          yield* appendEvent({ environmentId: current.environmentId, scheduleId: current.id, kind: "run-claimed", at, schedule: current, run });
          yield* writeReceipt(receipt, result);
        })));
        return result;
      }),
    );

  const claimDueRun: ScheduleRegistryShape["claimDueRun"] = (input) =>
    Effect.gen(function* () {
      const current = yield* getSchedule(input.scope, input.scheduleId);
      if (current.status !== "active" || current.nextRunAt === null || Date.parse(current.nextRunAt) > Date.parse(input.now)) return yield* Effect.fail(scheduleRegistryFailure("duplicate-run", "Schedule is not due.", { scheduleId: current.id }));
      if (input.expectedNextRunAt !== undefined && current.nextRunAt !== input.expectedNextRunAt) return yield* Effect.fail(scheduleRegistryFailure("duplicate-run", "Schedule advanced before this run was claimed.", { scheduleId: current.id }));
      const existing = yield* mapSql(sql<StoredRunRow>`SELECT run_id AS "runId", schedule_id AS "scheduleId", environment_id AS "environmentId", trigger, scheduled_for AS "scheduledFor", created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt", status, lease_owner AS "leaseOwner", lease_expires_at AS "leaseExpiresAt", provider_instance_id AS "providerInstanceId", thread_id AS "threadId", orchestration_command_id AS "orchestrationCommandId", action_run_id AS "actionRunId", provider_receipt_id AS "providerReceiptId", receipt_summary AS "receiptSummary", error, dispatch_idempotency_key AS "dispatchIdempotencyKey" FROM schedule_runs WHERE schedule_id = ${current.id} AND scheduled_for = ${input.scheduledFor}`);
      if (existing[0] !== undefined) return yield* decodeRunRow(existing[0]);
      const at = input.now;
      const nextCount = current.claimedRunCount + 1;
      const maxRuns = current.policy.maxRuns;
      const occurrence = nextCount >= (maxRuns ?? Number.POSITIVE_INFINITY)
        ? { status: "completed" as const }
        : nextScheduleOccurrence({ trigger: current.trigger, after: input.scheduledFor, claimedRunCount: nextCount, maxRuns });
      const nextRunAt = occurrence.status === "next" ? occurrence.at : null;
      const nextStatus = nextRunAt === null ? "completed" : current.status;
      const run: ScheduleRun = { id: runId(), scheduleId: current.id, trigger: "scheduled", scheduledFor: input.scheduledFor, createdAt: at, status: "claimed", leaseOwner: input.leaseOwner, leaseExpiresAt: addSeconds(at, input.leaseForSeconds), threadId: current.target.threadId };
      yield* mapSql(sql.withTransaction(Effect.gen(function* () {
        yield* sql`INSERT INTO schedule_runs (run_id, schedule_id, environment_id, trigger, scheduled_for, created_at, status, lease_owner, lease_expires_at, thread_id, dispatch_idempotency_key) VALUES (${run.id}, ${run.scheduleId}, ${current.environmentId}, 'scheduled', ${run.scheduledFor}, ${run.createdAt}, 'claimed', ${run.leaseOwner}, ${run.leaseExpiresAt}, ${run.threadId}, ${run.id})`;
        yield* sql`UPDATE schedules SET status = ${nextStatus}, claimed_run_count = ${nextCount}, next_run_at = ${nextRunAt}, last_run_at = ${input.scheduledFor}, version = version + 1, latest_sequence = latest_sequence + 1, updated_at = ${at} WHERE schedule_id = ${current.id} AND status = 'active' AND next_run_at = ${current.nextRunAt} AND (${input.expectedNextRunAt ?? null} IS NULL OR next_run_at = ${input.expectedNextRunAt ?? null})`;
        yield* sql`INSERT INTO schedule_dispatch_outbox (run_id, schedule_id, environment_id, idempotency_key, status, lease_owner, lease_expires_at, intent_json, created_at, updated_at) VALUES (${run.id}, ${run.scheduleId}, ${current.environmentId}, ${run.id}, 'pending', ${run.leaseOwner}, ${run.leaseExpiresAt}, ${JSON.stringify({ runId: run.id, scheduleId: run.scheduleId, threadId: run.threadId, scheduledFor: run.scheduledFor })}, ${at}, ${at})`;
        yield* appendEvent({ environmentId: current.environmentId, scheduleId: current.id, kind: "run-claimed", at, schedule: { ...current, status: nextStatus, claimedRunCount: nextCount, nextRunAt, lastRunAt: input.scheduledFor, version: current.version + 1, updatedAt: at }, run });
      })));
      return run;
    });

  const reconcileMissed: ScheduleRegistryShape["reconcileMissed"] = (input) =>
    Effect.gen(function* () {
      const current = yield* getSchedule(input.scope, input.scheduleId);
      if (current.status !== "active" || current.nextRunAt === null) {
        return {
          schedule: current,
          decision: { status: "completed" as const },
        };
      }

      // The helper takes the last scheduled instant, while the projection
      // stores the next pointer. Derive the former from the pointer so a skip
      // decision remains idempotent after a restart without materializing every
      // missed interval.
      const lastScheduledFor = current.trigger.type === "interval"
        ? new Date(Date.parse(current.nextRunAt) - current.trigger.everySeconds * 1_000).toISOString()
        : current.nextRunAt;
      const decision = resolveMissedOccurrence({
        trigger: current.trigger,
        lastScheduledFor,
        now: input.now,
        catchUp: current.policy.catchUp,
        claimedRunCount: current.claimedRunCount,
        maxRuns: current.policy.maxRuns,
      });
      if (decision.status !== "skip" && decision.status !== "completed") {
        return { schedule: current, decision };
      }

      const at = input.now;
      const next = {
        ...current,
        status: decision.status === "completed" ? "completed" as const : current.status,
        nextRunAt: decision.status === "completed" ? null : decision.nextRunAt,
        version: current.version + 1,
        updatedAt: at,
      } satisfies RuneSchedule;
      yield* mapSql(sql.withTransaction(Effect.gen(function* () {
        yield* sql`UPDATE schedules SET status = ${next.status}, next_run_at = ${next.nextRunAt}, version = ${next.version}, updated_at = ${at} WHERE schedule_id = ${current.id} AND status = 'active' AND version = ${current.version} AND next_run_at = ${current.nextRunAt}`;
        yield* appendEvent({ environmentId: current.environmentId, scheduleId: current.id, kind: "updated", at, schedule: next });
      })));
      return { schedule: next, decision };
    });

  const issueDispatch: ScheduleRegistryShape["issueDispatch"] = (input) =>
    Effect.gen(function* () {
      const runRows = yield* mapSql(selectRun(input.runId));
      const stored = runRows[0];
      if (stored === undefined) return yield* Effect.fail(scheduleRegistryFailure("not-found", "Schedule run not found.", { runId: input.runId }));
      const run = yield* decodeRunRow(stored);
      const schedule = yield* getSchedule(input.scope, run.scheduleId);
      const canAdoptManualRun = run.status === "claimed" && run.trigger === "manual" && run.leaseOwner === undefined;
      if (run.leaseOwner !== input.leaseOwner && !canAdoptManualRun) return yield* Effect.fail(scheduleRegistryFailure("authorization-required", "Schedule run lease is owned by another runner.", { runId: run.id }));
      if (run.status === "dispatching" || run.status === "running" || run.status === "succeeded" || run.status === "dispatch-uncertain") return run;
      const at = input.now;
      const leaseExpiresAt = canAdoptManualRun ? addSeconds(at, input.leaseForSeconds) : run.leaseExpiresAt;
      const next = { ...run, status: "dispatching" as const, ...(canAdoptManualRun ? { leaseOwner: input.leaseOwner, leaseExpiresAt } : {}) } satisfies ScheduleRun;
      yield* mapSql(sql.withTransaction(Effect.gen(function* () {
        yield* sql`UPDATE schedule_runs SET status = 'dispatching', started_at = COALESCE(started_at, ${at}), lease_owner = ${next.leaseOwner ?? null}, lease_expires_at = ${next.leaseExpiresAt ?? null} WHERE run_id = ${run.id} AND status = 'claimed' AND (lease_owner = ${input.leaseOwner} OR (trigger = 'manual' AND lease_owner IS NULL))`;
        const changedRows = yield* sql<{ readonly changed: number }>`SELECT changes() AS changed`;
        if ((changedRows[0]?.changed ?? 0) !== 1) return yield* Effect.fail(scheduleRegistryFailure("duplicate-run", "Schedule run was claimed by another runner.", { runId: run.id }));
        yield* sql`UPDATE schedule_dispatch_outbox SET status = 'issued', idempotency_key = ${input.idempotencyKey}, lease_owner = ${next.leaseOwner ?? null}, lease_expires_at = ${next.leaseExpiresAt ?? null}, updated_at = ${at} WHERE run_id = ${run.id} AND status = 'pending'`;
        yield* appendEvent({ environmentId: schedule.environmentId, scheduleId: schedule.id, kind: "dispatch-issued", at, schedule, run: next });
      })));
      return next;
    });

  const renewRunLease: ScheduleRegistryShape["renewRunLease"] = (input) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(selectRun(input.runId));
      const row = rows[0];
      if (row === undefined) {
        return yield* Effect.fail(
          scheduleRegistryFailure("not-found", "Schedule run not found.", { runId: input.runId }),
        );
      }
      const current = yield* decodeRunRow(row);
      const schedule = yield* getSchedule(input.scope, current.scheduleId);
      if (current.leaseOwner !== input.leaseOwner) {
        return yield* Effect.fail(
          scheduleRegistryFailure(
            "authorization-required",
            "Schedule run lease is owned by another runner.",
            { runId: current.id },
          ),
        );
      }
      if (
        !["claimed", "dispatching", "running"].includes(current.status) ||
        current.leaseExpiresAt === undefined ||
        Date.parse(current.leaseExpiresAt) <= Date.parse(input.now)
      ) {
        return yield* Effect.fail(
          scheduleRegistryFailure("execution-failed", "Schedule run lease is no longer live.", {
            runId: current.id,
          }),
        );
      }

      const leaseExpiresAt = addSeconds(input.now, input.leaseForSeconds);
      yield* mapSql(
        sql`UPDATE schedule_runs
            SET lease_expires_at = ${leaseExpiresAt}
            WHERE run_id = ${current.id}
              AND environment_id = ${schedule.environmentId}
              AND lease_owner = ${input.leaseOwner}
              AND status IN ('claimed', 'dispatching', 'running')
              AND lease_expires_at > ${input.now}`,
      );
      const refreshedRows = yield* mapSql(selectRun(current.id));
      const refreshed = refreshedRows[0];
      if (refreshed === undefined) {
        return yield* Effect.fail(
          scheduleRegistryFailure("not-found", "Schedule run disappeared during lease renewal.", {
            runId: current.id,
          }),
        );
      }
      const next = yield* decodeRunRow(refreshed);
      if (next.leaseOwner !== input.leaseOwner || next.leaseExpiresAt !== leaseExpiresAt) {
        return yield* Effect.fail(
          scheduleRegistryFailure("execution-failed", "Schedule run lease renewal was lost.", {
            runId: current.id,
          }),
        );
      }
      return next;
    });

  const reclaimExpiredRuns: ScheduleRegistryShape["reclaimExpiredRuns"] = (input) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(sql<StoredRunRow>`SELECT run_id AS "runId", schedule_id AS "scheduleId", environment_id AS "environmentId", trigger, scheduled_for AS "scheduledFor", created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt", status, lease_owner AS "leaseOwner", lease_expires_at AS "leaseExpiresAt", provider_instance_id AS "providerInstanceId", thread_id AS "threadId", orchestration_command_id AS "orchestrationCommandId", action_run_id AS "actionRunId", provider_receipt_id AS "providerReceiptId", receipt_summary AS "receiptSummary", error, dispatch_idempotency_key AS "dispatchIdempotencyKey" FROM schedule_runs WHERE environment_id = ${input.scope.environmentId} AND status IN ('claimed', 'dispatching', 'running') AND lease_expires_at IS NOT NULL AND lease_expires_at <= ${input.now}`);
      const reclaimed: ScheduleRun[] = [];
      for (const row of rows) {
        const run = yield* decodeRunRow(row);
        const schedule = yield* getSchedule(input.scope, run.scheduleId);
        const next = { ...run, leaseOwner: input.leaseOwner, leaseExpiresAt: addSeconds(input.now, input.leaseForSeconds), ...(run.status === "dispatching" || run.status === "running" ? { status: "dispatch-uncertain" as const } : {}) } satisfies ScheduleRun;
        yield* mapSql(sql`UPDATE schedule_runs SET status = ${next.status}, lease_owner = ${next.leaseOwner}, lease_expires_at = ${next.leaseExpiresAt}, error = ${next.error ?? null} WHERE run_id = ${run.id} AND lease_expires_at <= ${input.now}`);
        reclaimed.push(next);
        if (next.status === "dispatch-uncertain") yield* mapSql(sql`UPDATE schedule_dispatch_outbox SET status = 'uncertain', lease_owner = ${next.leaseOwner}, lease_expires_at = ${next.leaseExpiresAt}, updated_at = ${input.now} WHERE run_id = ${run.id}`);
        yield* mapSql(appendEvent({ environmentId: schedule.environmentId, scheduleId: schedule.id, kind: "dispatch-issued", at: input.now, schedule, run: next }));
      }
      return reclaimed;
    });

  const settleRun: ScheduleRegistryShape["settleRun"] = (scope, input) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(selectRun(input.runId));
      const row = rows[0];
      if (row === undefined) return yield* Effect.fail(scheduleRegistryFailure("not-found", "Schedule run not found.", { runId: input.runId }));
      const current = yield* decodeRunRow(row);
      const schedule = yield* getSchedule(scope, current.scheduleId);
      if (current.status === input.status && ["succeeded", "blocked", "failed", "skipped", "dispatch-uncertain"].includes(current.status)) return current;
      const next = {
        ...current,
        status: input.status,
        completedAt: input.completedAt,
        ...(input.receiptSummary === undefined ? {} : { receiptSummary: input.receiptSummary }),
        ...(input.providerInstanceId === undefined ? {} : { providerInstanceId: input.providerInstanceId }),
        ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
        ...(input.orchestrationCommandId === undefined ? {} : { orchestrationCommandId: input.orchestrationCommandId }),
        ...(input.actionRunId === undefined ? {} : { actionRunId: input.actionRunId }),
        ...(input.providerReceiptId === undefined ? {} : { providerReceiptId: input.providerReceiptId }),
        ...(input.error === undefined ? {} : { error: input.error }),
      } satisfies ScheduleRun;
      if (["succeeded", "blocked", "failed", "skipped"].includes(current.status)) {
        return yield* Effect.fail(scheduleRegistryFailure("execution-failed", "A terminal schedule run cannot change state.", { runId: current.id }));
      }
      yield* mapSql(sql.withTransaction(Effect.gen(function* () {
        yield* sql`UPDATE schedule_runs SET status = ${next.status}, completed_at = ${next.completedAt}, receipt_summary = ${next.receiptSummary ?? null}, provider_instance_id = ${next.providerInstanceId ?? null}, thread_id = ${next.threadId}, orchestration_command_id = ${next.orchestrationCommandId ?? null}, action_run_id = ${next.actionRunId ?? null}, provider_receipt_id = ${next.providerReceiptId ?? null}, error = ${next.error ?? null} WHERE run_id = ${current.id}`;
        yield* sql`UPDATE schedule_dispatch_outbox SET status = ${next.status === "dispatch-uncertain" ? "uncertain" : "settled"}, updated_at = ${input.completedAt} WHERE run_id = ${current.id}`;
        yield* appendEvent({ environmentId: schedule.environmentId, scheduleId: schedule.id, kind: "run-settled", at: input.completedAt, schedule, run: next });
      })));
      return next;
    });

  const list: ScheduleRegistryShape["list"] = (scope, input) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(sql<StoredScheduleRow>`SELECT schedule_id AS "scheduleId", environment_id AS "environmentId", project_id AS "projectId", name, trigger_json AS "triggerJson", target_json AS "targetJson", policy_json AS "policyJson", display_time_zone AS "displayTimeZone", status, version, claimed_run_count AS "claimedRunCount", next_run_at AS "nextRunAt", last_run_at AS "lastRunAt", created_at AS "createdAt", updated_at AS "updatedAt", created_by AS "createdBy", latest_sequence AS "latestSequence" FROM schedules WHERE environment_id = ${scope.environmentId} AND (${input.projectId ?? null} IS NULL OR project_id = ${input.projectId ?? null}) AND (${input.threadId ?? null} IS NULL OR json_extract(target_json, '$.threadId') = ${input.threadId ?? null}) AND (${input.status ?? null} IS NULL OR status = ${input.status ?? null}) ORDER BY updated_at DESC, schedule_id ASC LIMIT ${input.limit ?? 500}`);
      const schedules: RuneSchedule[] = [];
      for (const row of rows) {
        const schedule = yield* decodeScheduleRow(row);
        if (scopeAllows(scope, schedule)) schedules.push(schedule);
      }
      const sequenceRows = yield* mapSql(sql<{ readonly sequence: number }>`SELECT COALESCE(MAX(sequence), 0) AS sequence FROM schedule_events WHERE environment_id = ${scope.environmentId}`);
      return { schedules, sequence: sequenceRows[0]?.sequence ?? 0 } satisfies ScheduleListResult;
    });

  const runs: ScheduleRegistryShape["runs"] = (scope, input) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(sql<StoredRunRow>`SELECT run_id AS "runId", schedule_id AS "scheduleId", environment_id AS "environmentId", trigger, scheduled_for AS "scheduledFor", created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt", status, lease_owner AS "leaseOwner", lease_expires_at AS "leaseExpiresAt", provider_instance_id AS "providerInstanceId", thread_id AS "threadId", orchestration_command_id AS "orchestrationCommandId", action_run_id AS "actionRunId", provider_receipt_id AS "providerReceiptId", receipt_summary AS "receiptSummary", error, dispatch_idempotency_key AS "dispatchIdempotencyKey" FROM schedule_runs WHERE environment_id = ${scope.environmentId} AND (${input.scheduleId ?? null} IS NULL OR schedule_id = ${input.scheduleId ?? null}) ORDER BY created_at DESC, run_id DESC LIMIT ${input.limit ?? 500}`);
      const result: ScheduleRun[] = [];
      for (const row of rows) {
        const run = yield* decodeRunRow(row);
        const schedule = yield* getSchedule(scope, run.scheduleId);
        if (scope.threadIds === undefined || scope.threadIds.includes(run.threadId)) result.push(run);
        void schedule;
      }
      return { runs: result } satisfies ScheduleRunListResult;
    });

  const pendingManualRuns: ScheduleRegistryShape["pendingManualRuns"] = (scope) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(sql<StoredRunRow>`SELECT run_id AS "runId", schedule_id AS "scheduleId", environment_id AS "environmentId", trigger, scheduled_for AS "scheduledFor", created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt", status, lease_owner AS "leaseOwner", lease_expires_at AS "leaseExpiresAt", provider_instance_id AS "providerInstanceId", thread_id AS "threadId", orchestration_command_id AS "orchestrationCommandId", action_run_id AS "actionRunId", provider_receipt_id AS "providerReceiptId", receipt_summary AS "receiptSummary", error, dispatch_idempotency_key AS "dispatchIdempotencyKey" FROM schedule_runs WHERE environment_id = ${scope.environmentId} AND trigger = 'manual' AND status = 'claimed' AND lease_owner IS NULL ORDER BY created_at ASC, run_id ASC LIMIT 100`);
      const result: ScheduleRun[] = [];
      for (const row of rows) {
        const run = yield* decodeRunRow(row);
        if (scope.threadIds === undefined || scope.threadIds.includes(run.threadId)) result.push(run);
      }
      return result;
    });

  const nextDue: ScheduleRegistryShape["nextDue"] = (scope, now) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(sql<StoredScheduleRow>`SELECT schedule_id AS "scheduleId", environment_id AS "environmentId", project_id AS "projectId", name, trigger_json AS "triggerJson", target_json AS "targetJson", policy_json AS "policyJson", display_time_zone AS "displayTimeZone", status, version, claimed_run_count AS "claimedRunCount", next_run_at AS "nextRunAt", last_run_at AS "lastRunAt", created_at AS "createdAt", updated_at AS "updatedAt", created_by AS "createdBy", latest_sequence AS "latestSequence" FROM schedules WHERE environment_id = ${scope.environmentId} AND status = 'active' AND next_run_at IS NOT NULL ORDER BY next_run_at ASC, schedule_id ASC`);
      const candidates: RuneSchedule[] = [];
      for (const row of rows) {
        const schedule = yield* decodeScheduleRow(row);
        if (scopeAllows(scope, schedule) && schedule.nextRunAt !== null) candidates.push(schedule);
      }
      const nextRunAt = candidates[0]?.nextRunAt ?? null;
      return {
        nextRunAt,
        scheduleIds: nextRunAt === null
          ? []
          : candidates.filter((schedule) => schedule.nextRunAt === nextRunAt).map((schedule) => schedule.id),
      } satisfies ScheduleNextDueResult;
    });

  const subscription: ScheduleRegistryShape["subscription"] = (scope, input) =>
    Effect.gen(function* () {
      const listed = yield* list(scope, { projectId: input.projectId, threadId: input.threadId, limit: 500 });
      const history = yield* runs(scope, { limit: 500 });
      const sequenceRows = yield* mapSql(sql<{ readonly sequence: number }>`SELECT COALESCE(MAX(sequence), 0) AS sequence FROM schedule_events WHERE environment_id = ${scope.environmentId}`);
      return { type: "snapshot", sequence: sequenceRows[0]?.sequence ?? 0, schedules: listed.schedules, runs: history.runs } satisfies ScheduleSubscriptionSnapshot;
    });

  const get: ScheduleRegistryShape["get"] = (scope, input) => getSchedule(scope, input.scheduleId);

  return { list, get, create, update, pause, resume, remove, runNow, reconcileMissed, claimDueRun, issueDispatch, renewRunLease, reclaimExpiredRuns, pendingManualRuns, settleRun, runs, nextDue, subscription } satisfies ScheduleRegistryShape;
});

export const ScheduleRegistryLive = Layer.effect(ScheduleRegistry, makeRegistry);
