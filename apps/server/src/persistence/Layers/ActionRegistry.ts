import {
  ActionProposal,
  ActionProposalDecisionResult,
  ActionProposalStatus,
  ActionRegistryError,
  ActionRegistryRecord,
  ActionRunReceipt,
  ActionRunHistory,
  ActionScope,
  RuneAction,
  type ActionScope as ActionScopeType,
  type ActionParameterValues,
} from "@rune/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { ActionRegistry, type ActionRegistryServiceShape } from "../Services/ActionRegistry.ts";
import { analyzeLearnedActionRuns, buildLearnedActionProposal } from "@rune/shared/learnedActions";
import { verifyActionRequirements } from "@rune/shared/actionVerification";

const StoredActionRow = Schema.Struct({
  actionId: Schema.String,
  version: Schema.Int,
  scope: ActionScope,
  workspaceRoot: Schema.String,
  projectId: Schema.String,
  actionJson: Schema.String,
});
type StoredActionRow = typeof StoredActionRow.Type;

const StoredProposalRow = Schema.Struct({
  proposalId: Schema.String,
  actionId: Schema.String,
  scope: ActionScope,
  workspaceRoot: Schema.String,
  projectId: Schema.String,
  actionJson: Schema.String,
  reason: Schema.String,
  successfulRunIdsJson: Schema.String,
  status: ActionProposalStatus,
  createdAt: Schema.String,
  decidedAt: Schema.NullOr(Schema.String),
  decidedBy: Schema.NullOr(Schema.String),
});
type StoredProposalRow = typeof StoredProposalRow.Type;

const StoredRunRow = Schema.Struct({
  runId: Schema.String,
  actionId: Schema.String,
  actionVersion: Schema.Int,
  scope: ActionScope,
  workspaceRoot: Schema.String,
  projectId: Schema.String,
  threadId: Schema.NullOr(Schema.String),
  turnId: Schema.NullOr(Schema.String),
  status: Schema.String,
  parametersJson: Schema.String,
  modelCalls: Schema.Int,
  startedAt: Schema.NullOr(Schema.String),
  completedAt: Schema.NullOr(Schema.String),
  recordedAt: Schema.String,
  receiptJson: Schema.NullOr(Schema.String),
});
type StoredRunRow = typeof StoredRunRow.Type;

const ActionJson = Schema.fromJsonString(RuneAction);
const ProposalRunIdsJson = Schema.fromJsonString(Schema.Array(Schema.String));
const ParametersJson = Schema.fromJsonString(
  Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Number, Schema.Boolean])),
);
const ReceiptJson = Schema.fromJsonString(ActionRunReceipt);
const encodeAction = Schema.encodeSync(ActionJson);
const encodeProposalRunIds = Schema.encodeSync(ProposalRunIdsJson);
const encodeParameters = Schema.encodeSync(ParametersJson);
const encodeReceipt = Schema.encodeSync(ReceiptJson);

const failure = (
  code: ConstructorParameters<typeof ActionRegistryError>[0]["code"],
  message: string,
  ids: { readonly actionId?: string; readonly proposalId?: string } = {},
) =>
  new ActionRegistryError({
    code,
    message,
    ...(ids.actionId === undefined ? {} : { actionId: ids.actionId as never }),
    ...(ids.proposalId === undefined ? {} : { proposalId: ids.proposalId }),
  });

type NormalizedContext = {
  readonly scope: ActionScopeType;
  readonly workspaceKey: string;
  readonly projectKey: string;
  readonly workspaceRoot?: string;
  readonly projectId?: string;
};

const normalizeContext = (
  scope: ActionScopeType,
  workspaceRoot: string | undefined,
  projectId: string | undefined,
): Effect.Effect<NormalizedContext, ActionRegistryError> => {
  if (scope === "global" && (workspaceRoot !== undefined || projectId !== undefined)) {
    return Effect.fail(
      failure("invalid-context", "Global actions cannot have workspace or project context."),
    );
  }
  if (scope === "workspace" && (workspaceRoot === undefined || projectId !== undefined)) {
    return Effect.fail(
      failure("invalid-context", "Workspace actions require only a workspace root."),
    );
  }
  if (scope === "project" && projectId === undefined) {
    return Effect.fail(failure("invalid-context", "Project actions require a project id."));
  }
  return Effect.succeed({
    scope,
    workspaceKey: workspaceRoot ?? "",
    projectKey: projectId ?? "",
    ...(workspaceRoot === undefined ? {} : { workspaceRoot }),
    ...(projectId === undefined ? {} : { projectId }),
  });
};

const nowIso = () => DateTime.now.pipe(Effect.map(DateTime.formatIso));

export const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const fileSystem = yield* Effect.serviceOption(FileSystem.FileSystem);
  const pathService = yield* Effect.serviceOption(Path.Path);
  const decodeFailure = (message: string) => failure("persistence-failed", message);
  const mapSql = <A>(effect: Effect.Effect<A, SqlError>) =>
    effect.pipe(Effect.mapError(() => decodeFailure("Action registry persistence failed.")));

  const selectActions = (input: {
    readonly actionId?: string | undefined;
    readonly version?: number | undefined;
    readonly scope?: ActionScopeType | undefined;
    readonly workspaceRoot?: string | undefined;
    readonly projectId?: string | undefined;
  }) => {
    const workspaceRoot = input.workspaceRoot ?? null;
    const projectId = input.projectId ?? null;
    const scope = input.scope ?? null;
    const actionId = input.actionId ?? null;
    const version = input.version ?? null;
    return sql<StoredActionRow>`
      SELECT
        action_id AS "actionId",
        version,
        scope,
        workspace_root AS "workspaceRoot",
        project_id AS "projectId",
        action_json AS "actionJson"
      FROM action_registry_versions
      WHERE (${actionId} IS NULL OR action_id = ${actionId})
        AND (${version} IS NULL OR version = ${version})
        AND (${scope} IS NULL OR scope = ${scope})
        AND (${workspaceRoot} IS NULL OR workspace_root = ${workspaceRoot})
        AND (${projectId} IS NULL OR project_id = ${projectId})
      ORDER BY scope ASC, workspace_root ASC, project_id ASC, action_id ASC, version DESC
    `;
  };

  const decodeAction = (row: unknown) =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(StoredActionRow)(row).pipe(
        Effect.mapError(() => decodeFailure("Persisted action data is invalid.")),
      );
      const action = yield* Schema.decodeUnknownEffect(ActionJson)(decoded.actionJson).pipe(
        Effect.mapError(() => decodeFailure("Persisted action data is invalid.")),
      );
      return {
        action,
        ...(decoded.workspaceRoot === "" ? {} : { workspaceRoot: decoded.workspaceRoot }),
        ...(decoded.projectId === "" ? {} : { projectId: decoded.projectId }),
      } satisfies ActionRegistryRecord;
    });

  const getVersion: ActionRegistryServiceShape["getVersion"] = (input) =>
    mapSql(
      selectActions({
        actionId: input.actionId,
        version: input.version,
        scope: input.scope,
        workspaceRoot: input.workspaceRoot,
        projectId: input.projectId,
      }),
    ).pipe(
      Effect.flatMap((rows) => (rows.length === 0 ? Effect.succeed(null) : decodeAction(rows[0]))),
    );

  const insertAction = (record: ActionRegistryRecord, context: NormalizedContext) =>
    sql`
      INSERT INTO action_registry_versions (
        action_id, version, scope, workspace_root, project_id, action_json, created_at, updated_at
      ) VALUES (
        ${record.action.id}, ${record.action.version}, ${context.scope},
        ${context.workspaceKey}, ${context.projectKey}, ${encodeAction(record.action)},
        ${record.action.createdAt}, ${record.action.updatedAt}
      )
    `;

  const buildRecord = (action: RuneAction, context: NormalizedContext): ActionRegistryRecord => ({
    action,
    ...(context.workspaceRoot === undefined ? {} : { workspaceRoot: context.workspaceRoot }),
    ...(context.projectId === undefined ? {} : { projectId: context.projectId }),
  });

  const create: ActionRegistryServiceShape["create"] = (input) =>
    Effect.gen(function* () {
      const context = yield* normalizeContext(
        input.action.scope,
        input.workspaceRoot,
        input.projectId,
      );
      const existing = yield* mapSql(
        selectActions({
          actionId: input.action.id,
          scope: context.scope,
          workspaceRoot: context.workspaceRoot,
          projectId: context.projectId,
        }),
      );
      if (existing.length > 0) {
        return yield* Effect.fail(
          failure("already-exists", "An action with this id already exists.", {
            actionId: input.action.id,
          }),
        );
      }
      const at = yield* nowIso();
      const action = { ...input.action, version: 1, createdAt: at, updatedAt: at };
      const record = buildRecord(action, context);
      yield* mapSql(insertAction(record, context));
      return { action: record };
    });

  const version: ActionRegistryServiceShape["version"] = (input) =>
    Effect.gen(function* () {
      const context = yield* normalizeContext(
        input.action.scope,
        input.workspaceRoot,
        input.projectId,
      );
      const rows = yield* mapSql(
        selectActions({
          actionId: input.action.id,
          scope: context.scope,
          workspaceRoot: context.workspaceRoot,
          projectId: context.projectId,
        }),
      );
      const latest = rows[0] === undefined ? null : yield* decodeAction(rows[0]);
      if (latest === null) {
        return yield* Effect.fail(
          failure("action-not-found", "The action to version was not found.", {
            actionId: input.action.id,
          }),
        );
      }
      if (input.expectedVersion !== undefined && latest.action.version !== input.expectedVersion) {
        return yield* Effect.fail(
          failure("version-conflict", "The action changed before this version was published.", {
            actionId: input.action.id,
          }),
        );
      }
      const at = yield* nowIso();
      const action = {
        ...input.action,
        version: latest.action.version + 1,
        createdAt: latest.action.createdAt,
        updatedAt: at,
      };
      const record = buildRecord(action, context);
      yield* mapSql(insertAction(record, context));
      return { action: record };
    });

  const list: ActionRegistryServiceShape["list"] = (input) =>
    Effect.gen(function* () {
      const rows = yield* mapSql(selectActions(input));
      const decoded = yield* Effect.forEach(rows, decodeAction);
      const includeVersions = input.includeVersions === true;
      const candidates = includeVersions
        ? decoded
        : [
            ...new Map(
              decoded.map((record) => [
                `${record.action.scope}\u0000${record.workspaceRoot ?? ""}\u0000${record.projectId ?? ""}\u0000${record.action.id}`,
                record,
              ]),
            ).values(),
          ];
      return {
        actions: candidates.filter(
          (record) => input.includeDisabled === true || record.action.enabled,
        ),
      };
    });

  const selectProposal = (proposalId: string) => sql<StoredProposalRow>`
    SELECT
      proposal_id AS "proposalId", action_id AS "actionId", scope,
      workspace_root AS "workspaceRoot", project_id AS "projectId",
      action_json AS "actionJson", reason,
      successful_run_ids_json AS "successfulRunIdsJson", status,
      created_at AS "createdAt", decided_at AS "decidedAt", decided_by AS "decidedBy"
    FROM action_proposals
    WHERE proposal_id = ${proposalId}
  `;

  const decodeProposal = (row: unknown) =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(StoredProposalRow)(row).pipe(
        Effect.mapError(() => decodeFailure("Persisted action proposal data is invalid.")),
      );
      const action = yield* Schema.decodeUnknownEffect(ActionJson)(decoded.actionJson).pipe(
        Effect.mapError(() => decodeFailure("Persisted action proposal data is invalid.")),
      );
      const successfulRunIds = yield* Schema.decodeUnknownEffect(ProposalRunIdsJson)(
        decoded.successfulRunIdsJson,
      ).pipe(Effect.mapError(() => decodeFailure("Persisted action proposal data is invalid.")));
      return {
        proposal: {
          proposalId: decoded.proposalId,
          action,
          reason: decoded.reason,
          successfulRunIds,
          status: decoded.status,
          createdAt: decoded.createdAt,
          ...(decoded.decidedAt === null ? {} : { decidedAt: decoded.decidedAt }),
        },
        ...(decoded.workspaceRoot === "" ? {} : { workspaceRoot: decoded.workspaceRoot }),
        ...(decoded.projectId === "" ? {} : { projectId: decoded.projectId }),
        ...(decoded.decidedBy === null ? {} : { decidedBy: decoded.decidedBy }),
      };
    });

  const createProposal: ActionRegistryServiceShape["createProposal"] = (input) =>
    Effect.gen(function* () {
      const context = yield* normalizeContext(
        input.proposal.action.scope,
        input.workspaceRoot,
        input.projectId,
      );
      if (
        input.proposal.status !== "proposed" ||
        input.proposal.action.source !== "learned" ||
        input.proposal.successfulRunIds.length === 0
      ) {
        return yield* Effect.fail(
          failure("invalid-state", "Only verified learned actions can be proposed.", {
            proposalId: input.proposal.proposalId,
          }),
        );
      }
      const existing = yield* mapSql(selectProposal(input.proposal.proposalId));
      if (existing.length > 0) {
        return yield* Effect.fail(
          failure("already-exists", "An action proposal with this id already exists.", {
            proposalId: input.proposal.proposalId,
          }),
        );
      }
      yield* mapSql(sql`
        INSERT INTO action_proposals (
          proposal_id, action_id, scope, workspace_root, project_id, action_json,
          reason, successful_run_ids_json, status, created_at
        ) VALUES (
          ${input.proposal.proposalId}, ${input.proposal.action.id}, ${context.scope},
          ${context.workspaceKey}, ${context.projectKey}, ${encodeAction(input.proposal.action)},
          ${input.proposal.reason}, ${encodeProposalRunIds(input.proposal.successfulRunIds)},
          'proposed', ${input.proposal.createdAt}
        )
      `);
      return {
        proposal: {
          proposal: input.proposal,
          ...(context.workspaceRoot === undefined ? {} : { workspaceRoot: context.workspaceRoot }),
          ...(context.projectId === undefined ? {} : { projectId: context.projectId }),
        },
      };
    });

  const listProposals: ActionRegistryServiceShape["listProposals"] = (input) =>
    Effect.gen(function* () {
      const status = input.status ?? null;
      const workspaceRoot = input.workspaceRoot ?? null;
      const projectId = input.projectId ?? null;
      const rows = yield* mapSql(sql<StoredProposalRow>`
        SELECT
          proposal_id AS "proposalId", action_id AS "actionId", scope,
          workspace_root AS "workspaceRoot", project_id AS "projectId",
          action_json AS "actionJson", reason,
          successful_run_ids_json AS "successfulRunIdsJson", status,
          created_at AS "createdAt", decided_at AS "decidedAt", decided_by AS "decidedBy"
        FROM action_proposals
        WHERE (${status} IS NULL OR status = ${status})
          AND (${workspaceRoot} IS NULL OR workspace_root = ${workspaceRoot})
          AND (${projectId} IS NULL OR project_id = ${projectId})
        ORDER BY created_at ASC, proposal_id ASC
      `);
      return { proposals: yield* Effect.forEach(rows, decodeProposal) };
    });

  const decideProposal = (
    input: { readonly proposalId: string },
    decidedBy: string,
    nextStatus: "approved" | "rejected" | "dismissed",
  ): Effect.Effect<ActionProposalDecisionResult, ActionRegistryError> =>
    Effect.gen(function* () {
      const rows = yield* mapSql(selectProposal(input.proposalId));
      if (rows.length === 0) {
        return yield* Effect.fail(
          failure("proposal-not-found", "The action proposal was not found.", {
            proposalId: input.proposalId,
          }),
        );
      }
      const current = yield* decodeProposal(rows[0]!);
      if (current.proposal.status !== "proposed") {
        return yield* Effect.fail(
          failure("invalid-state", "Only proposed actions can be decided.", {
            proposalId: input.proposalId,
          }),
        );
      }
      const at = yield* nowIso();
      let published: ActionRegistryRecord | undefined;
      if (nextStatus === "approved") {
        const context = yield* normalizeContext(
          current.proposal.action.scope,
          current.workspaceRoot,
          current.projectId,
        );
        const actionRows = yield* mapSql(
          selectActions({
            actionId: current.proposal.action.id,
            scope: context.scope,
            workspaceRoot: context.workspaceRoot,
            projectId: context.projectId,
          }),
        );
        const latest = actionRows[0] === undefined ? null : yield* decodeAction(actionRows[0]);
        const action = {
          ...current.proposal.action,
          source: "learned" as const,
          version: (latest?.action.version ?? 0) + 1,
          enabled: true,
          updatedAt: at,
          provenance: { ...current.proposal.action.provenance, approvedBy: decidedBy },
        };
        published = buildRecord(action, context);
        yield* mapSql(
          sql.withTransaction(
            Effect.gen(function* () {
              yield* insertAction(published!, context);
              yield* sql`
            UPDATE action_proposals
            SET status = ${nextStatus}, decided_at = ${at}, decided_by = ${decidedBy}
            WHERE proposal_id = ${input.proposalId} AND status = 'proposed'
          `;
            }),
          ),
        );
      } else {
        yield* mapSql(sql`
          UPDATE action_proposals
          SET status = ${nextStatus}, decided_at = ${at}, decided_by = ${decidedBy}
          WHERE proposal_id = ${input.proposalId} AND status = 'proposed'
        `);
      }
      const updatedRows = yield* mapSql(selectProposal(input.proposalId));
      const updated = yield* decodeProposal(updatedRows[0]!);
      return { proposal: updated, ...(published === undefined ? {} : { action: published }) };
    });

  const redactParameters = (action: RuneAction, parameters: ActionParameterValues) => {
    const definitions = new Map(action.parameters.map((parameter) => [parameter.name, parameter]));
    const redacted: Record<string, string | number | boolean> = {};
    for (const [name, value] of Object.entries(parameters)) {
      const definition = definitions.get(name);
      if (definition === undefined) {
        return Effect.fail(
          failure("invalid-parameters", "Run history contained an unknown action parameter.", {
            actionId: action.id,
          }),
        );
      }
      redacted[name] =
        definition.secret === true || definition.type === "secret-reference"
          ? "<credential-ref>"
          : value;
    }
    return Effect.succeed(redacted as ActionParameterValues);
  };

  const recordRun: ActionRegistryServiceShape["recordRun"] = (run) =>
    Effect.gen(function* () {
      const context = yield* normalizeContext(run.scope, run.workspaceRoot, run.projectId);
      const action = yield* getVersion({
        actionId: run.actionId,
        version: run.actionVersion,
        scope: run.scope,
        ...(context.workspaceRoot === undefined ? {} : { workspaceRoot: context.workspaceRoot }),
        ...(context.projectId === undefined ? {} : { projectId: context.projectId }),
      });
      if (action === null || action.action.scope !== run.scope) {
        return yield* Effect.fail(
          failure("action-not-found", "The action run refers to an unknown action version.", {
            actionId: run.actionId,
          }),
        );
      }
      const parameters = yield* redactParameters(action.action, run.parameters);
      yield* mapSql(sql`
        INSERT INTO action_run_history (
          run_id, action_id, action_version, scope, workspace_root, project_id,
          thread_id, turn_id, status, parameters_json, model_calls,
          started_at, completed_at, recorded_at
          , receipt_json
        ) VALUES (
          ${run.runId}, ${run.actionId}, ${run.actionVersion}, ${context.scope},
          ${context.workspaceKey}, ${context.projectKey}, ${run.threadId ?? null}, ${run.turnId ?? null},
          ${run.status}, ${encodeParameters(parameters)}, ${run.modelCalls},
          ${run.startedAt ?? null}, ${run.completedAt ?? null}, ${run.recordedAt},
          ${run.receipt === undefined ? null : encodeReceipt(run.receipt)}
        )
        ON CONFLICT (run_id) DO UPDATE SET
          status = excluded.status,
          parameters_json = excluded.parameters_json,
          model_calls = excluded.model_calls,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          recorded_at = excluded.recorded_at,
          receipt_json = excluded.receipt_json
      `);
    });

  const maybeProposeLearnedAction = (input: {
    readonly stored: StoredRunRow;
    readonly actionRecord: ActionRegistryRecord;
    readonly at: string;
    readonly settledStatus: "succeeded" | "failed" | "cancelled";
  }) => {
    if (input.settledStatus !== "succeeded" || input.actionRecord.action.source === "learned") {
      return Effect.void;
    }
    return Effect.gen(function* () {
      const context = {
        scope: input.stored.scope,
        ...(input.stored.workspaceRoot === "" ? {} : { workspaceRoot: input.stored.workspaceRoot }),
        ...(input.stored.projectId === "" ? {} : { projectId: input.stored.projectId }),
      } satisfies {
        readonly scope: ActionScopeType;
        readonly workspaceRoot?: string;
        readonly projectId?: string;
      };
      const openProposalRows = yield* mapSql(sql<{ readonly proposalId: string }>`
        SELECT proposal_id AS "proposalId"
        FROM action_proposals
        WHERE action_id = ${input.actionRecord.action.id}
          AND scope = ${context.scope}
          AND workspace_root = ${context.workspaceRoot ?? ""}
          AND project_id = ${context.projectId ?? ""}
          AND status = 'proposed'
        LIMIT 1
      `);
      if (openProposalRows.length > 0) return;

      const successfulRows = yield* mapSql(sql<{
        readonly runId: string;
        readonly recordedAt: string;
        readonly status: string;
      }>`
        SELECT
          run_id AS "runId",
          recorded_at AS "recordedAt",
          status
        FROM action_run_history
        WHERE action_id = ${input.actionRecord.action.id}
          AND scope = ${context.scope}
          AND workspace_root = ${context.workspaceRoot ?? ""}
          AND project_id = ${context.projectId ?? ""}
          AND status IN ('succeeded', 'failed', 'cancelled', 'blocked')
        ORDER BY recorded_at ASC, run_id ASC
        LIMIT 100
      `);
      const analysis = analyzeLearnedActionRuns({
        actionId: input.actionRecord.action.id,
        runs: successfulRows.map((row) => ({
          runId: row.runId,
          actionId: input.actionRecord.action.id,
          actionVersion: input.stored.actionVersion,
          scope: context.scope,
          ...(context.workspaceRoot === undefined ? {} : { workspaceRoot: context.workspaceRoot }),
          ...(context.projectId === undefined ? {} : { projectId: context.projectId }),
          status: row.status as "succeeded" | "failed" | "cancelled" | "blocked",
          parameters: {},
          modelCalls: 0,
          recordedAt: row.recordedAt,
        })),
      });
      if (!analysis.eligible) return;
      const lastSuccessfulRunId = analysis.successfulRunIds.at(-1);
      if (lastSuccessfulRunId === undefined) return;
      const proposal = buildLearnedActionProposal({
        proposalId: `learned:${input.actionRecord.action.id}:${lastSuccessfulRunId}`,
        action: input.actionRecord.action,
        analysis,
        createdAt: input.at,
      });
      yield* createProposal({
        proposal,
        ...(context.workspaceRoot === undefined ? {} : { workspaceRoot: context.workspaceRoot }),
        ...(context.projectId === undefined ? {} : { projectId: context.projectId }),
      }).pipe(
        Effect.catchTag("ActionRegistryError", (error) =>
          error.code === "already-exists" ? Effect.void : Effect.fail(error),
        ),
      );
    });
  };

  const settleRun: ActionRegistryServiceShape["settleRun"] = (input) =>
    Effect.gen(function* () {
      const at = yield* nowIso();
      const storedRows = yield* mapSql(sql<StoredRunRow>`
        SELECT
          run_id AS "runId", action_id AS "actionId", action_version AS "actionVersion",
          scope, workspace_root AS "workspaceRoot", project_id AS "projectId",
          thread_id AS "threadId", turn_id AS "turnId", status,
          parameters_json AS "parametersJson", model_calls AS "modelCalls",
          started_at AS "startedAt", completed_at AS "completedAt", recorded_at AS "recordedAt",
          receipt_json AS "receiptJson"
        FROM action_run_history
        WHERE run_id = ${input.runId}
      `);
      const stored =
        storedRows[0] === undefined
          ? undefined
          : yield* Schema.decodeUnknownEffect(StoredRunRow)(storedRows[0]).pipe(
              Effect.mapError(() => decodeFailure("Persisted action run history is invalid.")),
            );
      const storedReceipt =
        stored?.receiptJson === undefined || stored.receiptJson === null
          ? undefined
          : yield* Schema.decodeUnknownEffect(ReceiptJson)(stored.receiptJson).pipe(
              Effect.mapError(() => decodeFailure("Persisted action receipt is invalid.")),
            );
      const baseReceipt = input.receipt ?? storedReceipt;
      const storedReceiptIsTerminal =
        storedReceipt !== undefined &&
        (storedReceipt.status === "succeeded" ||
          storedReceipt.status === "failed" ||
          storedReceipt.status === "cancelled");
      const terminalEvidenceId = `${input.runId}:terminal:${input.status}`;
      const actionRecord =
        stored === undefined
          ? null
          : yield* getVersion({
              actionId: stored.actionId as ActionRunReceipt["actionId"],
              version: stored.actionVersion,
              scope: stored.scope,
              ...(stored.workspaceRoot === "" ? {} : { workspaceRoot: stored.workspaceRoot }),
              ...(stored.projectId === "" ? {} : { projectId: stored.projectId }),
            });
      const outputTargets =
        actionRecord === null
          ? []
          : actionRecord.action.verification
              .filter(
                (requirement) =>
                  requirement.kind === "output-exists" && requirement.target !== undefined,
              )
              .flatMap((requirement) => {
                const target = requirement.target!;
                const output = actionRecord.action.outputs.find(
                  (candidate) => candidate.name === target || candidate.pattern === target,
                );
                return output?.pattern === undefined || output.pattern === target
                  ? [target]
                  : [target, output.pattern];
              })
              .filter((target, index, targets) => targets.indexOf(target) === index);
      const outputExists = yield* Option.match(fileSystem, {
        onNone: () => Effect.succeed(new Map<string, boolean>()),
        onSome: (fs) =>
          Option.match(pathService, {
            onNone: () => Effect.succeed(new Map<string, boolean>()),
            onSome: (path) =>
              Effect.forEach(
                outputTargets,
                (target) => {
                  const outputPath = path.isAbsolute(target)
                    ? target
                    : stored?.workspaceRoot === undefined || stored.workspaceRoot === ""
                      ? null
                      : path.resolve(stored.workspaceRoot, target);
                  if (outputPath === null) return Effect.succeed([target, false] as const);
                  if (
                    stored?.workspaceRoot !== undefined &&
                    stored.workspaceRoot !== "" &&
                    !path.isAbsolute(target)
                  ) {
                    const relative = path.relative(stored.workspaceRoot, outputPath);
                    if (
                      relative === ".." ||
                      relative.startsWith(`..${path.sep}`) ||
                      path.isAbsolute(relative)
                    ) {
                      return Effect.succeed([target, false] as const);
                    }
                  }
                  return fs.exists(outputPath).pipe(
                    Effect.map((exists) => [target, exists] as const),
                    Effect.orElseSucceed(() => [target, false] as const),
                  );
                },
                { concurrency: 1 },
              ).pipe(Effect.map((entries) => new Map(entries))),
          }),
      });
      const verificationResults =
        actionRecord === null
          ? []
          : verifyActionRequirements({
              requirements: actionRecord.action.verification,
              outputs: actionRecord.action.outputs,
              observation: {
                commandSucceeded: input.status === "succeeded",
                ...(input.outputText === undefined
                  ? {}
                  : { outputText: input.outputText.slice(-16_384) }),
                outputExists,
              },
            });
      // A required verifier that cannot observe its target is not proof of
      // success. Settle conservatively so an unavailable filesystem/runtime
      // check cannot turn into a learned-action candidate.
      const failedVerification = verificationResults.some((result) => result.outcome !== "passed");
      const settledStatus =
        failedVerification && input.status === "succeeded" ? ("failed" as const) : input.status;
      const settledEvidence =
        baseReceipt === undefined
          ? []
          : [
              ...baseReceipt.evidence,
              ...(baseReceipt.evidence.some((evidence) => evidence.id === terminalEvidenceId)
                ? []
                : [
                    {
                      id: terminalEvidenceId,
                      actionId: baseReceipt.actionId,
                      runId: input.runId,
                      kind: "verification" as const,
                      summary:
                        settledStatus === "succeeded"
                          ? "The correlated terminal exited successfully."
                          : `The correlated terminal settled as ${settledStatus}.`,
                      redacted: true,
                      at: input.completedAt,
                    },
                  ]),
              ...verificationResults.map((result, index) => ({
                id: `${input.runId}:verification:${index + 1}`,
                actionId: baseReceipt.actionId,
                runId: input.runId,
                kind: "verification" as const,
                summary: `Verification ${index + 1} ${result.outcome}: ${result.reason}`,
                redacted: true,
                at: input.completedAt,
              })),
            ];
      const settledReceipt =
        baseReceipt === undefined
          ? undefined
          : storedReceiptIsTerminal
            ? storedReceipt
            : ({
                ...baseReceipt,
                status: settledStatus,
                steps: baseReceipt.steps.map((step) => ({
                  ...step,
                  status:
                    settledStatus === "succeeded" ? ("succeeded" as const) : ("failed" as const),
                  ...(step.startedAt === undefined
                    ? { startedAt: baseReceipt.startedAt ?? at }
                    : {}),
                  completedAt: input.completedAt,
                  ...(step.exitCode === undefined
                    ? { exitCode: settledStatus === "succeeded" ? 0 : 1 }
                    : {}),
                })),
                evidence: settledEvidence,
                completedAt: input.completedAt,
              } satisfies ActionRunReceipt);
      yield* mapSql(sql`
        UPDATE action_run_history
        SET status = CASE
              WHEN status IN ('succeeded', 'failed', 'cancelled') THEN status
              ELSE ${settledStatus}
            END,
            completed_at = CASE
              WHEN status IN ('succeeded', 'failed', 'cancelled') THEN completed_at
              ELSE ${input.completedAt}
            END,
            recorded_at = ${at},
            receipt_json = COALESCE(${settledReceipt === undefined ? null : encodeReceipt(settledReceipt)}, receipt_json)
        WHERE run_id = ${input.runId}
      `);
      if (stored !== undefined && actionRecord !== null) {
        yield* maybeProposeLearnedAction({
          stored,
          actionRecord,
          at,
          settledStatus,
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning(
              "action run settled but learned-action proposal could not be created",
              {
                actionId: actionRecord.action.id,
                runId: input.runId,
                cause,
              },
            ),
          ),
        );
      }
    });

  const listRunHistory: ActionRegistryServiceShape["listRunHistory"] = (input) =>
    Effect.gen(function* () {
      const actionId = input.actionId ?? null;
      const projectId = input.projectId ?? null;
      const limit = Math.min(input.limit ?? 100, 500);
      const rows = yield* mapSql(sql<StoredRunRow>`
        SELECT
          run_id AS "runId", action_id AS "actionId", action_version AS "actionVersion",
          scope, workspace_root AS "workspaceRoot", project_id AS "projectId",
          thread_id AS "threadId", turn_id AS "turnId", status,
          parameters_json AS "parametersJson", model_calls AS "modelCalls",
          started_at AS "startedAt", completed_at AS "completedAt", recorded_at AS "recordedAt",
          receipt_json AS "receiptJson"
        FROM action_run_history
        WHERE (${actionId} IS NULL OR action_id = ${actionId})
          AND (${projectId} IS NULL OR project_id = ${projectId})
        ORDER BY recorded_at DESC, run_id DESC
        LIMIT ${limit}
      `);
      const runs = yield* Effect.forEach(rows, (row) =>
        Effect.gen(function* () {
          const decoded = yield* Schema.decodeUnknownEffect(StoredRunRow)(row).pipe(
            Effect.mapError(() => decodeFailure("Persisted action run history is invalid.")),
          );
          const parameters = yield* Schema.decodeUnknownEffect(ParametersJson)(
            decoded.parametersJson,
          ).pipe(Effect.mapError(() => decodeFailure("Persisted action run history is invalid.")));
          const receipt =
            decoded.receiptJson === null
              ? undefined
              : yield* Schema.decodeUnknownEffect(ReceiptJson)(decoded.receiptJson).pipe(
                  Effect.mapError(() => decodeFailure("Persisted action receipt is invalid.")),
                );
          return {
            runId: decoded.runId,
            actionId: decoded.actionId as ActionRunHistory["actionId"],
            actionVersion: decoded.actionVersion,
            scope: decoded.scope,
            ...(decoded.workspaceRoot === "" ? {} : { workspaceRoot: decoded.workspaceRoot }),
            ...(decoded.projectId === "" ? {} : { projectId: decoded.projectId }),
            ...(decoded.threadId === null ? {} : { threadId: decoded.threadId }),
            ...(decoded.turnId === null ? {} : { turnId: decoded.turnId }),
            status: decoded.status as ActionRunHistory["status"],
            parameters,
            modelCalls: decoded.modelCalls,
            ...(decoded.startedAt === null ? {} : { startedAt: decoded.startedAt }),
            ...(decoded.completedAt === null ? {} : { completedAt: decoded.completedAt }),
            ...(receipt === undefined ? {} : { receipt }),
            recordedAt: decoded.recordedAt,
          } satisfies ActionRunHistory;
        }),
      );
      return { runs };
    });

  return {
    list,
    create,
    version,
    getVersion,
    createProposal,
    listProposals,
    approveProposal: (input, decidedBy) => decideProposal(input, decidedBy, "approved"),
    rejectProposal: (input, decidedBy) => decideProposal(input, decidedBy, "rejected"),
    dismissProposal: (input, decidedBy) => decideProposal(input, decidedBy, "dismissed"),
    recordRun,
    settleRun,
    listRunHistory,
  } satisfies ActionRegistryServiceShape;
});

export const ActionRegistryLive = Layer.effect(ActionRegistry, make);
