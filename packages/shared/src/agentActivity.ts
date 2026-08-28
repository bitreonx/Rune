import type {
  AgentExecutionStage,
  OrchestrationCheckpointSummary,
  OrchestrationThreadActivity,
} from "@rune/contracts";

export type AgentActivityStatus = "working" | "waiting" | "done" | "failed" | "paused";
export type AgentActivityPhase =
  | "explore"
  | "research"
  | "implement"
  | "test"
  | "fix"
  | "review"
  | "other";
export type AgentActivityPhaseSource = "typed" | "structured" | "fallback";
export type AgentActivityStatusSource = "typed" | "fallback";

export interface AgentActivityChangeRecord {
  readonly id: string;
  readonly path: string;
  readonly kind: string;
  readonly additions: number;
  readonly deletions: number;
  /** A bounded preview of the real diff; the full diff remains checkpoint-owned. */
  readonly preview?: ReadonlyArray<string> | undefined;
  readonly source: "turn-diff" | "checkpoint" | "activity";
  readonly turnId: string | null;
}

export type AgentActivityReceiptKind = "phase" | "change" | "command" | "verification" | "state";

export interface AgentActivityReceipt {
  readonly id: string;
  readonly kind: AgentActivityReceiptKind;
  readonly label: string;
  readonly status: AgentActivityStatus;
  readonly createdAt: string;
  readonly turnId: string | null;
}
export interface AgentActivityOperation {
  readonly id: string;
  readonly kind: string;
  readonly createdAt: string;
  readonly turnId: string | null;
  readonly filePath?: string | undefined;
  readonly rawTrace: OrchestrationThreadActivity;
}
export interface AgentActivity {
  readonly id: string;
  readonly phase: AgentActivityPhase;
  readonly label: string;
  readonly status: AgentActivityStatus;
  readonly createdAt: string;
  readonly operations: ReadonlyArray<AgentActivityOperation>;
  readonly phaseSource: AgentActivityPhaseSource;
  readonly statusSource: AgentActivityStatusSource;
  readonly executionStage?: AgentExecutionStage | undefined;
  readonly receipts: ReadonlyArray<AgentActivityReceipt>;
  readonly changes: ReadonlyArray<AgentActivityChangeRecord>;
  readonly reasoningSummary?: string | undefined;
  readonly failureSummary?: string | undefined;
}
export interface AgentActivityJob {
  readonly activities: ReadonlyArray<AgentActivity>;
  readonly phases: ReadonlyArray<{
    readonly phase: AgentActivityPhase;
    readonly activities: ReadonlyArray<AgentActivity>;
  }>;
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const payloadText = (a: OrchestrationThreadActivity, key: string) => text(record(a.payload)?.[key]);

const GENERIC_LABELS = new Set([
  "working",
  "working through the task",
  "exploring the project",
  "researching the repository",
  "implementing the change",
  "running tests",
  "fixing remaining errors",
  "reviewing the result",
  "tool",
  "tool updated",
  "tool started",
  "task started",
  "task completed",
  "task updated",
  "reasoning update",
  "webfetch",
]);

const EXECUTION_STAGE_PHASE: Record<AgentExecutionStage, AgentActivityPhase> = {
  inspect: "explore",
  execute: "implement",
  verify: "test",
  finalize: "review",
};

function isGenericLabel(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[.\u2026]+$/u, "");
  return (
    GENERIC_LABELS.has(normalized) ||
    /\b(started|updated|completed|failed|error)\b$/u.test(normalized)
  );
}

function typedStatusValue(value: unknown): AgentActivityStatus | undefined {
  if (typeof value !== "string") return undefined;
  switch (value.toLowerCase()) {
    case "failed":
    case "error":
      return "failed";
    case "waiting":
    case "pending":
    case "idle":
      return "waiting";
    case "paused":
    case "interrupted":
    case "cancelled":
    case "canceled":
    case "stopped":
      return "paused";
    case "completed":
    case "success":
    case "succeeded":
    case "exhausted":
      return "done";
    case "running":
    case "in_progress":
    case "in-progress":
    case "continued":
      return "working";
    default:
      return undefined;
  }
}

function typedPhase(a: OrchestrationThreadActivity):
  | {
      readonly phase: AgentActivityPhase;
      readonly source: AgentActivityPhaseSource;
      readonly executionStage?: AgentExecutionStage | undefined;
    }
  | undefined {
  const payload = record(a.payload);
  const phase = payload?.phase;
  if (
    phase === "explore" ||
    phase === "research" ||
    phase === "implement" ||
    phase === "test" ||
    phase === "fix" ||
    phase === "review" ||
    phase === "other"
  ) {
    return { phase, source: "typed" };
  }

  const stageValue = payload?.stage;
  if (
    stageValue === "inspect" ||
    stageValue === "execute" ||
    stageValue === "verify" ||
    stageValue === "finalize"
  ) {
    return {
      phase: EXECUTION_STAGE_PHASE[stageValue],
      source: "typed",
      executionStage: stageValue,
    };
  }

  if (
    a.kind === "approval.requested" ||
    a.kind === "approval.resolved" ||
    a.kind.startsWith("user-input.")
  ) {
    return { phase: "other", source: "structured" };
  }
  if (a.kind === "turn.diff.updated" || a.kind === "change.detected") {
    return { phase: "implement", source: "typed" };
  }
  if (a.kind === "context-compaction") return { phase: "other", source: "typed" };
  return undefined;
}

function collectPayloadText(value: unknown, key = "", depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) return [];
  if (typeof value === "string") {
    return /(?:name|tool|command|title|path|file|description|summary|type|status|detail|query)/iu.test(
      key,
    ) && value.trim()
      ? [value]
      : [];
  }
  if (Array.isArray(value))
    return value.flatMap((item) => collectPayloadText(item, key, depth + 1));
  if (typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, item]) =>
    collectPayloadText(item, childKey, depth + 1),
  );
}

function collectPayloadPaths(value: unknown, key = "", depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string") {
    return /^(path|file|filePath|file_name|filename|relativePath|relative_path)$/iu.test(key) &&
      value.trim()
      ? [value.trim()]
      : [];
  }
  if (Array.isArray(value))
    return value.flatMap((item) => collectPayloadPaths(item, key, depth + 1));
  if (typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) =>
    collectPayloadPaths(childValue, childKey, depth + 1),
  );
}

function collectChangeRecords(
  activity: OrchestrationThreadActivity,
): ReadonlyArray<AgentActivityChangeRecord> {
  const payload = record(activity.payload);
  if (!payload) return [];
  const candidates = [payload.itemFileChanges, payload.changes, payload.files].filter(
    (value): value is ReadonlyArray<unknown> => Array.isArray(value),
  );
  const preview =
    typeof payload.diffPreview === "string" ? payload.diffPreview.split("\n") : undefined;
  const records: AgentActivityChangeRecord[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    for (const entry of candidate) {
      const value = record(entry);
      const path = text(value?.path ?? value?.filePath ?? value?.filename);
      if (!path) continue;
      const key = `${activity.turnId ?? ""}:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const additions =
        typeof value?.additions === "number" && Number.isFinite(value.additions)
          ? Math.max(0, value.additions)
          : 0;
      const deletions =
        typeof value?.deletions === "number" && Number.isFinite(value.deletions)
          ? Math.max(0, value.deletions)
          : 0;
      records.push({
        id: `activity-change:${activity.id}:${path}`,
        path,
        kind: text(value?.kind) ?? "modified",
        additions,
        deletions,
        ...(preview && preview.length > 0 ? { preview: preview.slice(0, 6) } : {}),
        source: activity.kind === "turn.diff.updated" ? "turn-diff" : "activity",
        turnId: activity.turnId,
      });
    }
  }
  return records;
}

function checkpointChangeRecords(
  checkpoints: ReadonlyArray<OrchestrationCheckpointSummary>,
): ReadonlyArray<AgentActivityChangeRecord> {
  return checkpoints
    .filter((checkpoint) => checkpoint.status === "ready")
    .flatMap((checkpoint) =>
      checkpoint.files.map((file) => ({
        id: `checkpoint-change:${checkpoint.turnId}:${file.path}`,
        path: file.path,
        kind: file.kind,
        additions: file.additions,
        deletions: file.deletions,
        source: "checkpoint" as const,
        turnId: checkpoint.turnId,
      })),
    );
}

function mergeChangeRecords(
  current: ReadonlyArray<AgentActivityChangeRecord>,
  next: ReadonlyArray<AgentActivityChangeRecord>,
): ReadonlyArray<AgentActivityChangeRecord> {
  const byPath = new Map<string, AgentActivityChangeRecord>();
  for (const change of [...current, ...next]) {
    const key = `${change.turnId ?? ""}:${change.path}`;
    const previous = byPath.get(key);
    // Checkpoint stats are authoritative once available; live turn-diff stats
    // remain visible until that checkpoint arrives.
    if (previous?.source === "checkpoint" && change.source !== "checkpoint") continue;
    byPath.set(key, change);
  }
  return [...byPath.values()].toSorted((left, right) => left.path.localeCompare(right.path));
}

function classify(a: OrchestrationThreadActivity): { phase: AgentActivityPhase; label: string } {
  const payload = record(a.payload);
  const haystack = [
    a.kind,
    a.summary,
    payloadText(a, "title"),
    payloadText(a, "toolName"),
    payloadText(a, "command"),
    ...collectPayloadText(a.payload),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (a.tone === "error" || /\b(error|fail|exception|fix)\b/u.test(haystack))
    return { phase: "fix", label: "Fixing remaining errors" };
  if (/\b(test|lint|typecheck|build|check|verify)\b/u.test(haystack))
    return { phase: "test", label: "Running tests" };
  if (/\b(review|diff|result)\b/u.test(haystack))
    return { phase: "review", label: "Reviewing the result" };
  if (
    /\b(edit|write|patch|move|delete|implement|change|create)\b/u.test(haystack) ||
    payload?.itemType === "file_change"
  )
    return { phase: "implement", label: "Implementing the change" };
  if (/\b(webfetch|web|fetch|documentation|docs|url|http)\b/u.test(haystack))
    return { phase: "research", label: "Researching the repository" };
  if (/\b(search|grep|find|read|file|repository|project|explore)\b/u.test(haystack))
    return { phase: "explore", label: "Exploring the project" };
  if (/\b(approval|permission|authorize|consent)\b/u.test(haystack))
    return { phase: "other", label: "Waiting for your approval" };
  if (/\b(user[- ]?input|question|clarification)\b/u.test(haystack))
    return { phase: "other", label: "Waiting for your input" };
  if (/\b(task|agent|subagent|session|turn)\b/u.test(haystack))
    return { phase: "other", label: "Coordinating the work" };
  return { phase: "other", label: "Working through the task" };
}
function deriveStatus(a: OrchestrationThreadActivity): {
  readonly status: AgentActivityStatus;
  readonly source: AgentActivityStatusSource;
} {
  const payload = record(a.payload);
  if (a.tone === "error") return { status: "failed", source: "typed" };
  for (const value of [payload?.status, payload?.outcome, payload?.state]) {
    const typed = typedStatusValue(value);
    if (typed) return { status: typed, source: "typed" };
  }
  if (a.kind.includes("approval.requested") || a.kind.includes("user-input.requested"))
    return { status: "waiting", source: "typed" };
  if (a.kind.includes("interrupted") || a.kind === "turn.aborted")
    return { status: "paused", source: "typed" };
  if (a.kind.endsWith(".completed") || a.kind.endsWith(".resolved"))
    return { status: "done", source: "typed" };
  return { status: "working", source: "fallback" };
}

function semanticLabel(
  a: OrchestrationThreadActivity,
  phase: AgentActivityPhase,
): { readonly label: string; readonly source: AgentActivityPhaseSource } {
  const payload = record(a.payload);
  const changes = collectChangeRecords(a);
  for (const key of [
    "semanticLabel",
    "objective",
    "purpose",
    "description",
    "title",
    "phaseTitle",
  ]) {
    const value = payloadText(a, key);
    if (value && !isGenericLabel(value)) return { label: value, source: "structured" };
  }
  if (
    changes.length > 0 &&
    (a.kind === "turn.diff.updated" ||
      a.kind === "change.detected" ||
      [payload?.itemFileChanges, payload?.changes, payload?.files].some(Array.isArray))
  ) {
    const paths = changes
      .slice(0, 2)
      .map((change) => change.path)
      .join(", ");
    return {
      label: `Updating ${paths}${changes.length > 2 ? ` +${changes.length - 2} files` : ""}`,
      source: "typed",
    };
  }
  const paths = collectPayloadPaths(a.payload);
  if (
    payload?.itemType === "file_change" &&
    paths.length > 0 &&
    (a.kind === "turn.diff.updated" || a.kind === "change.detected")
  ) {
    return { label: `Updating ${paths[0]}`, source: "typed" };
  }
  if (payload?.itemType === "file_change") {
    const fallback = classify(a);
    return { label: fallback.label, source: "fallback" };
  }
  const summary = text(a.summary);
  if (summary && !isGenericLabel(summary)) return { label: summary, source: "structured" };
  const fallback = classify(a);
  return {
    label: fallback.phase === phase ? fallback.label : classify(a).label,
    source: "fallback",
  };
}

function receiptFor(
  a: OrchestrationThreadActivity,
  status: AgentActivityStatus,
  label: string,
  changes: ReadonlyArray<AgentActivityChangeRecord>,
): AgentActivityReceipt {
  const kind: AgentActivityReceiptKind =
    changes.length > 0
      ? "change"
      : a.kind === "agent.execution.progress" || a.kind === "execution.phase"
        ? "phase"
        : a.kind.includes("test") || a.kind.includes("verification")
          ? "verification"
          : a.kind.includes("command")
            ? "command"
            : "state";
  return {
    id: `activity-receipt:${a.id}`,
    kind,
    label,
    status,
    createdAt: a.createdAt,
    turnId: a.turnId,
  };
}
function toOperation(a: OrchestrationThreadActivity): AgentActivityOperation {
  const payload = record(a.payload);
  const data = record(payload?.data) ?? payload;
  const filePath = collectPayloadPaths(a.payload)[0] ?? text(data?.path);
  return {
    id: a.id,
    kind: a.kind,
    createdAt: a.createdAt,
    turnId: a.turnId,
    ...(filePath ? { filePath } : {}),
    rawTrace: a,
  };
}
function reasoning(a: OrchestrationThreadActivity): string | undefined {
  for (const key of ["reasoningSummary", "decision", "hypothesis", "explanation"]) {
    const value = payloadText(a, key);
    if (value && value.length <= 280) return value;
  }
  return undefined;
}

function failureSummary(a: OrchestrationThreadActivity): string | undefined {
  if (a.tone !== "error" && payloadText(a, "status")?.toLowerCase() !== "failed") {
    return undefined;
  }
  for (const key of ["message", "reason", "error", "detail"]) {
    const value = payloadText(a, key);
    if (value && value.length <= 280 && value !== a.summary) return value;
  }
  return undefined;
}

function mergeFailureSummary(
  current: string | undefined,
  next: string | undefined,
): string | undefined {
  if (!next || next === current) return current;
  if (!current) return next;
  return `${current}; ${next}`.slice(0, 280);
}
export function deriveAgentActivityJob(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  options?: { readonly checkpoints?: ReadonlyArray<OrchestrationCheckpointSummary> },
): AgentActivityJob {
  const ordered = [...activities].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.createdAt.localeCompare(b.createdAt),
  );
  const result: AgentActivity[] = [];
  for (const source of ordered) {
    if (
      [
        "tool.started",
        "tool.progress",
        "task.updated",
        "context-window.updated",
        "turn.trace.started",
        "turn.trace.request",
      ].includes(source.kind)
    )
      continue;
    const nextStatus = deriveStatus(source);
    const phase = typedPhase(source);
    const classified = phase
      ? { phase: phase.phase, label: semanticLabel(source, phase.phase).label }
      : classify(source);
    const semantic = semanticLabel(source, classified.phase);
    const sourceChanges = collectChangeRecords(source);
    const nextClass =
      nextStatus.status === "waiting"
        ? {
            phase: classified.phase,
            label: source.kind.includes("approval")
              ? "Waiting for your approval"
              : "Waiting for your input",
          }
        : nextStatus.status === "paused"
          ? { phase: classified.phase, label: "Paused" }
          : nextStatus.status === "failed" && classified.phase === "other"
            ? { phase: "fix" as const, label: "Fixing remaining errors" }
            : { phase: classified.phase, label: semantic.label };
    const current = result.at(-1);
    const changes = mergeChangeRecords(current?.changes ?? [], sourceChanges);
    const receipt = receiptFor(source, nextStatus.status, semantic.label, sourceChanges);
    if (current && current.phase === nextClass.phase && nextStatus.status !== "waiting") {
      result[result.length - 1] = {
        ...current,
        status: nextStatus.status,
        statusSource: nextStatus.source,
        phaseSource: phase?.source ?? current.phaseSource,
        ...(phase?.executionStage ? { executionStage: phase.executionStage } : {}),
        operations: [...current.operations, toOperation(source)],
        receipts: [...current.receipts, receipt],
        changes,
        ...(reasoning(source) ? { reasoningSummary: reasoning(source) } : {}),
        ...(mergeFailureSummary(current.failureSummary, failureSummary(source))
          ? { failureSummary: mergeFailureSummary(current.failureSummary, failureSummary(source)) }
          : {}),
      };
    } else
      result.push({
        id: `agent-activity:${source.id}`,
        ...nextClass,
        status: nextStatus.status,
        phaseSource: phase?.source ?? semantic.source,
        statusSource: nextStatus.source,
        ...(phase?.executionStage ? { executionStage: phase.executionStage } : {}),
        createdAt: source.createdAt,
        operations: [toOperation(source)],
        receipts: [receipt],
        changes: sourceChanges,
        ...(reasoning(source) ? { reasoningSummary: reasoning(source) } : {}),
        ...(failureSummary(source) ? { failureSummary: failureSummary(source) } : {}),
      });
  }
  const checkpoints = checkpointChangeRecords(options?.checkpoints ?? []);
  if (checkpoints.length > 0) {
    for (let index = 0; index < result.length; index += 1) {
      const activity = result[index]!;
      const turnIds = new Set(activity.operations.map((operation) => operation.turnId));
      const matching = checkpoints.filter((change) => turnIds.has(change.turnId));
      if (matching.length === 0) continue;
      result[index] = { ...activity, changes: mergeChangeRecords(activity.changes, matching) };
    }
  }
  const phases = new Map<AgentActivityPhase, AgentActivity[]>();
  for (const activity of result)
    phases.set(activity.phase, [...(phases.get(activity.phase) ?? []), activity]);
  return {
    activities: result,
    phases: [...phases].map(([phase, grouped]) => ({ phase, activities: grouped })),
  };
}
