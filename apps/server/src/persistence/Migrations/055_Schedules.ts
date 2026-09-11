import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** Durable storage for RUNE-owned schedules, their event log, claims, and dispatch handoff. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS schedules (
      schedule_id TEXT PRIMARY KEY,
      environment_id TEXT NOT NULL,
      project_id TEXT,
      name TEXT NOT NULL,
      trigger_json TEXT NOT NULL CHECK (json_valid(trigger_json)),
      target_json TEXT NOT NULL CHECK (json_valid(target_json)),
      policy_json TEXT NOT NULL CHECK (json_valid(policy_json)),
      display_time_zone TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'failed')),
      version INTEGER NOT NULL CHECK (version > 0),
      claimed_run_count INTEGER NOT NULL DEFAULT 0 CHECK (claimed_run_count >= 0),
      next_run_at TEXT,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL CHECK (created_by IN ('user', 'agent')),
      latest_sequence INTEGER NOT NULL DEFAULT 0 CHECK (latest_sequence >= 0)
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS schedule_events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      environment_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      event_version INTEGER NOT NULL DEFAULT 1 CHECK (event_version > 0),
      kind TEXT NOT NULL CHECK (kind IN ('created', 'updated', 'paused', 'resumed', 'deleted', 'run-claimed', 'dispatch-issued', 'run-settled')),
      at TEXT NOT NULL,
      schedule_json TEXT CHECK (schedule_json IS NULL OR json_valid(schedule_json)),
      run_json TEXT CHECK (run_json IS NULL OR json_valid(run_json))
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_events_environment_sequence
    ON schedule_events (environment_id, sequence)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_events_schedule_sequence
    ON schedule_events (schedule_id, sequence)
  `;
  yield* sql`
    CREATE TRIGGER IF NOT EXISTS schedule_events_append_only_update
    BEFORE UPDATE ON schedule_events
    BEGIN
      SELECT RAISE(ABORT, 'schedule_events is append-only');
    END
  `;
  yield* sql`
    CREATE TRIGGER IF NOT EXISTS schedule_events_append_only_delete
    BEFORE DELETE ON schedule_events
    BEGIN
      SELECT RAISE(ABORT, 'schedule_events is append-only');
    END
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS schedule_runs (
      run_id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      trigger TEXT NOT NULL CHECK (trigger IN ('scheduled', 'manual')),
      scheduled_for TEXT NOT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('claimed', 'dispatching', 'running', 'succeeded', 'blocked', 'failed', 'skipped', 'dispatch-uncertain')),
      lease_owner TEXT,
      lease_expires_at TEXT,
      provider_instance_id TEXT,
      thread_id TEXT NOT NULL,
      orchestration_command_id TEXT,
      action_run_id TEXT,
      provider_receipt_id TEXT,
      receipt_summary TEXT,
      error TEXT,
      dispatch_idempotency_key TEXT,
      UNIQUE (schedule_id, scheduled_for)
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_runs_environment_created
    ON schedule_runs (environment_id, created_at DESC, run_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_runs_schedule_scheduled
    ON schedule_runs (schedule_id, scheduled_for DESC, run_id)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_runs_lease_expiry
    ON schedule_runs (status, lease_expires_at)
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS schedule_command_receipts (
      environment_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      command_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'pause', 'resume', 'delete', 'run-now')),
      schedule_id TEXT NOT NULL,
      run_id TEXT,
      thread_id TEXT,
      provider_instance_id TEXT,
      result_json TEXT NOT NULL CHECK (json_valid(result_json)),
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (environment_id, idempotency_key)
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_command_receipts_schedule
    ON schedule_command_receipts (environment_id, schedule_id, recorded_at DESC)
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS schedule_dispatch_outbox (
      run_id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'issued', 'uncertain', 'settled')),
      lease_owner TEXT,
      lease_expires_at TEXT,
      intent_json TEXT NOT NULL CHECK (json_valid(intent_json)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (environment_id, idempotency_key)
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_dispatch_outbox_pending
    ON schedule_dispatch_outbox (status, lease_expires_at, updated_at)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS schedule_dispatch_outbox_environment
    ON schedule_dispatch_outbox (environment_id, updated_at DESC, run_id)
  `;
});
