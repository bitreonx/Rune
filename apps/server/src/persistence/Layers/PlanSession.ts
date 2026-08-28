import {
  PlanSession as PlanSessionSchema,
  PlanSessionError,
  type PlanSession as PlanSessionRecord,
  type PlanRevision,
  type PlanSessionGetInput,
  type PlanSessionResumeInput,
  type PlanSessionTransitionInput,
  type PlanSessionUpdateInput,
  TrimmedNonEmptyString,
} from "@rune/contracts";
import { resumePlanSession, transitionPlanSession } from "@rune/shared/plan";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { PlanSession, type PlanSessionServiceShape } from "../Services/PlanSession.ts";

const StoredPlanSessionRow = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  version: Schema.Int,
  sessionJson: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
type StoredPlanSessionRow = typeof StoredPlanSessionRow.Type;

const PlanSessionJson = Schema.fromJsonString(PlanSessionSchema);
const encodePlanSession = Schema.encodeSync(PlanSessionJson);

const failure = (
  code: ConstructorParameters<typeof PlanSessionError>[0]["code"],
  operation: string,
  message: string,
  ids: { readonly id?: string; readonly threadId?: string } = {},
  issues?: ReadonlyArray<{
    readonly code: string;
    readonly path: string;
    readonly message: string;
  }>,
) =>
  new PlanSessionError({
    code,
    operation,
    message,
    ...(ids.id === undefined ? {} : { id: ids.id as never }),
    ...(ids.threadId === undefined ? {} : { threadId: ids.threadId as never }),
    ...(issues === undefined ? {} : { issues: issues as never }),
  });

const nowIso = () => DateTime.now.pipe(Effect.map(DateTime.formatIso));

const revisionHistoryFor = (
  current: PlanSessionRecord,
  changedAt: PlanSessionRecord["updatedAt"],
  summary: string,
): ReadonlyArray<PlanRevision> =>
  [
    ...(current.revisionHistory ?? []),
    {
      version: current.version,
      stage: current.stage,
      summary: TrimmedNonEmptyString.make(summary),
      specification: current.specification,
      tasks: current.tasks,
      dependencyGraph: current.dependencyGraph,
      changedAt,
    },
  ].slice(-50);

export const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const mapSql = <A>(effect: Effect.Effect<A, SqlError>, operation: string) =>
    effect.pipe(
      Effect.mapError(() =>
        failure("persistence-failed", operation, "Plan session persistence failed."),
      ),
    );

  const decodeRow = (row: unknown, operation: string) =>
    Effect.gen(function* () {
      const stored = yield* Schema.decodeUnknownEffect(StoredPlanSessionRow)(row).pipe(
        Effect.mapError(() =>
          failure("persistence-failed", operation, "Persisted plan session row is invalid."),
        ),
      );
      return yield* Schema.decodeUnknownEffect(PlanSessionJson)(stored.sessionJson).pipe(
        Effect.mapError(() =>
          failure("persistence-failed", operation, "Persisted plan session JSON is invalid."),
        ),
      );
    });

  const selectById = (id: string) => sql<StoredPlanSessionRow>`
    SELECT
      id,
      thread_id AS "threadId",
      version,
      session_json AS "sessionJson",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM plan_sessions
    WHERE id = ${id}
  `;

  const selectByThreadId = (threadId: string) => sql<StoredPlanSessionRow>`
    SELECT
      id,
      thread_id AS "threadId",
      version,
      session_json AS "sessionJson",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM plan_sessions
    WHERE thread_id = ${threadId}
  `;

  const loadById = (id: string): Effect.Effect<PlanSessionRecord | null, PlanSessionError> =>
    mapSql(selectById(id), "PlanSession.get").pipe(
      Effect.flatMap((rows) =>
        rows.length === 0 ? Effect.succeed(null) : decodeRow(rows[0], "PlanSession.get"),
      ),
    );

  const loadByThreadId = (
    threadId: string,
  ): Effect.Effect<PlanSessionRecord | null, PlanSessionError> =>
    mapSql(selectByThreadId(threadId), "PlanSession.get").pipe(
      Effect.flatMap((rows) =>
        rows.length === 0 ? Effect.succeed(null) : decodeRow(rows[0], "PlanSession.get"),
      ),
    );

  const get: PlanSessionServiceShape["get"] = (input: PlanSessionGetInput) =>
    Effect.gen(function* () {
      if (input.id === undefined && input.threadId === undefined) {
        return yield* failure(
          "invalid-input",
          "PlanSession.get",
          "A plan session id or thread id is required.",
        );
      }
      const session =
        input.id === undefined ? yield* loadByThreadId(input.threadId!) : yield* loadById(input.id);
      if (session === null) {
        return yield* failure(
          "not-found",
          "PlanSession.get",
          "The plan session was not found.",
          input.id === undefined ? { threadId: input.threadId! } : { id: input.id },
        );
      }
      if (input.threadId !== undefined && session.threadId !== input.threadId) {
        return yield* failure(
          "invalid-input",
          "PlanSession.get",
          "The plan session does not belong to that thread.",
          {
            id: session.id,
            threadId: input.threadId,
          },
        );
      }
      return session;
    });

  const create: PlanSessionServiceShape["create"] = (input) =>
    Effect.gen(function* () {
      if (input.session.version !== 1) {
        return yield* failure(
          "invalid-session",
          "PlanSession.create",
          "A new plan session must start at version 1.",
          {
            id: input.session.id,
            threadId: input.session.threadId,
          },
        );
      }
      const [idRows, threadRows] = yield* Effect.all([
        mapSql(selectById(input.session.id), "PlanSession.create"),
        mapSql(selectByThreadId(input.session.threadId), "PlanSession.create"),
      ]);
      if (idRows.length > 0 || threadRows.length > 0) {
        return yield* failure(
          "already-exists",
          "PlanSession.create",
          "A plan session already exists for this id or thread.",
          {
            id: input.session.id,
            threadId: input.session.threadId,
          },
        );
      }
      yield* mapSql(
        sql`
        INSERT INTO plan_sessions (
          id, thread_id, version, session_json, created_at, updated_at
        ) VALUES (
          ${input.session.id}, ${input.session.threadId}, ${input.session.version},
          ${encodePlanSession(input.session)}, ${input.session.createdAt}, ${input.session.updatedAt}
        )
      `,
        "PlanSession.create",
      );
      return input.session;
    });

  const loadForMutation = (id: string, operation: string) =>
    Effect.gen(function* () {
      const session = yield* loadById(id);
      if (session === null) {
        return yield* failure("not-found", operation, "The plan session was not found.", { id });
      }
      return session;
    });

  const checkExpectedVersion = (
    current: PlanSessionRecord,
    expectedVersion: number | undefined,
    operation: string,
  ) => {
    if (expectedVersion !== undefined && expectedVersion !== current.version) {
      return Effect.fail(
        failure(
          "version-conflict",
          operation,
          "The plan session changed before this update was applied.",
          {
            id: current.id,
            threadId: current.threadId,
          },
        ),
      );
    }
    return Effect.succeed(current);
  };

  const persistRevision = (
    current: PlanSessionRecord,
    next: PlanSessionRecord,
    operation: string,
  ) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(
        sql<StoredPlanSessionRow>`
        UPDATE plan_sessions
        SET version = ${next.version},
            session_json = ${encodePlanSession(next)},
            updated_at = ${next.updatedAt}
        WHERE id = ${current.id} AND version = ${current.version}
        RETURNING
          id,
          thread_id AS "threadId",
          version,
          session_json AS "sessionJson",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
        operation,
      );
      if (rows.length === 0) {
        return yield* failure(
          "version-conflict",
          operation,
          "The plan session changed before this update was applied.",
          {
            id: current.id,
            threadId: current.threadId,
          },
        );
      }
      return yield* decodeRow(rows[0], operation);
    });

  const update: PlanSessionServiceShape["update"] = (input: PlanSessionUpdateInput) =>
    Effect.gen(function* () {
      const current = yield* loadForMutation(input.session.id, "PlanSession.update");
      yield* checkExpectedVersion(current, input.expectedVersion, "PlanSession.update");
      if (input.session.threadId !== current.threadId) {
        return yield* failure(
          "invalid-session",
          "PlanSession.update",
          "A plan session cannot move to another thread.",
          {
            id: current.id,
            threadId: input.session.threadId,
          },
        );
      }
      if (input.session.stage !== current.stage) {
        return yield* failure(
          "invalid-transition",
          "PlanSession.update",
          "Use the transition operation to change plan stage.",
          {
            id: current.id,
            threadId: current.threadId,
          },
        );
      }
      const updatedAt = yield* nowIso();
      const next = {
        ...input.session,
        id: current.id,
        threadId: current.threadId,
        createdAt: current.createdAt,
        version: current.version + 1,
        updatedAt,
        revisionHistory: revisionHistoryFor(current, updatedAt, "Plan structure updated"),
      } satisfies PlanSessionRecord;
      return yield* persistRevision(current, next, "PlanSession.update");
    });

  const transition: PlanSessionServiceShape["transition"] = (input: PlanSessionTransitionInput) =>
    Effect.gen(function* () {
      const current = yield* loadForMutation(input.id, "PlanSession.transition");
      yield* checkExpectedVersion(current, input.expectedVersion, "PlanSession.transition");
      const result = transitionPlanSession(current, input.nextStage);
      if (!result.ok) {
        return yield* failure(
          "invalid-transition",
          "PlanSession.transition",
          "The plan session cannot make that lifecycle transition.",
          {
            id: current.id,
            threadId: current.threadId,
          },
          result.issues,
        );
      }
      if (result.session.stage === current.stage) return current;
      const updatedAt = yield* nowIso();
      return yield* persistRevision(
        current,
        {
          ...result.session,
          version: current.version + 1,
          createdAt: current.createdAt,
          updatedAt,
          revisionHistory: revisionHistoryFor(
            current,
            updatedAt,
            `Plan stage changed to ${result.session.stage}.`,
          ),
        },
        "PlanSession.transition",
      );
    });

  const resume: PlanSessionServiceShape["resume"] = (input: PlanSessionResumeInput) =>
    Effect.gen(function* () {
      const current = yield* loadForMutation(input.id, "PlanSession.resume");
      yield* checkExpectedVersion(current, input.expectedVersion, "PlanSession.resume");
      const result = resumePlanSession(current, input.resumeStage);
      if (!result.ok) {
        return yield* failure(
          "invalid-transition",
          "PlanSession.resume",
          "The plan session cannot be resumed into that stage.",
          {
            id: current.id,
            threadId: current.threadId,
          },
          result.issues,
        );
      }
      const updatedAt = yield* nowIso();
      return yield* persistRevision(
        current,
        {
          ...result.session,
          version: current.version + 1,
          createdAt: current.createdAt,
          updatedAt,
          revisionHistory: revisionHistoryFor(
            current,
            updatedAt,
            `Plan resumed at ${result.session.stage}.`,
          ),
        },
        "PlanSession.resume",
      );
    });

  return { create, get, update, transition, resume } satisfies PlanSessionServiceShape;
});

export const PlanSessionLive = Layer.effect(PlanSession, make);
