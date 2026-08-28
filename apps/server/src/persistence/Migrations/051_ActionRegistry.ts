import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** Durable, provider-neutral action versions, learned proposals, and safe run metadata. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS action_registry_versions (
      action_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      scope TEXT NOT NULL CHECK (scope IN ('global', 'workspace', 'project')),
      workspace_root TEXT NOT NULL DEFAULT '',
      project_id TEXT NOT NULL DEFAULT '',
      action_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (action_id, version, scope, workspace_root, project_id)
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS action_registry_versions_lookup
    ON action_registry_versions (scope, workspace_root, project_id, action_id, version DESC)
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS action_proposals (
      proposal_id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL,
      scope TEXT NOT NULL CHECK (scope IN ('global', 'workspace', 'project')),
      workspace_root TEXT NOT NULL DEFAULT '',
      project_id TEXT NOT NULL DEFAULT '',
      action_json TEXT NOT NULL,
      reason TEXT NOT NULL,
      successful_run_ids_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'rejected', 'dismissed')),
      created_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by TEXT
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS action_proposals_status_created
    ON action_proposals (status, created_at, proposal_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS action_proposals_context
    ON action_proposals (scope, workspace_root, project_id, created_at)
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS action_run_history (
      run_id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL,
      action_version INTEGER NOT NULL,
      scope TEXT NOT NULL CHECK (scope IN ('global', 'workspace', 'project')),
      workspace_root TEXT NOT NULL DEFAULT '',
      project_id TEXT NOT NULL DEFAULT '',
      thread_id TEXT,
      turn_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('approval-required', 'blocked', 'started', 'succeeded', 'failed', 'cancelled')),
      parameters_json TEXT NOT NULL,
      model_calls INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      recorded_at TEXT NOT NULL
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS action_run_history_action_recorded
    ON action_run_history (action_id, recorded_at DESC, run_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS action_run_history_project_recorded
    ON action_run_history (project_id, recorded_at DESC, run_id)
  `;
});
