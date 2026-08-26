import type { OrchestrationThreadActivity } from "@rune/contracts";

export type AgentActivityStatus = "working" | "waiting" | "done" | "failed" | "paused";
export type AgentActivityPhase =
  | "explore"
  | "research"
  | "implement"
  | "test"
  | "fix"
  | "review"
  | "other";
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
  readonly reasoningSummary?: string | undefined;
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

function classify(a: OrchestrationThreadActivity): { phase: AgentActivityPhase; label: string } {
  const payload = record(a.payload);
  const haystack = [
    a.kind,
    a.summary,
    payloadText(a, "title"),
    payloadText(a, "toolName"),
    payloadText(a, "command"),
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
  return { phase: "other", label: "Working on the task" };
}
function status(a: OrchestrationThreadActivity): AgentActivityStatus {
  const value = payloadText(a, "status")?.toLowerCase();
  if (a.tone === "error" || value === "failed") return "failed";
  if (a.kind.includes("approval.requested") || a.kind.includes("user-input.requested"))
    return "waiting";
  if (value === "stopped" || value === "paused" || a.kind.includes("interrupted")) return "paused";
  if (a.kind.endsWith(".completed") || a.kind.endsWith(".resolved") || value === "completed")
    return "done";
  return "working";
}
function toOperation(a: OrchestrationThreadActivity): AgentActivityOperation {
  const payload = record(a.payload);
  const data = record(payload?.data) ?? payload;
  return {
    id: a.id,
    kind: a.kind,
    createdAt: a.createdAt,
    turnId: a.turnId,
    ...(text(data?.path) ? { filePath: text(data?.path) } : {}),
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
export function deriveAgentActivityJob(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): AgentActivityJob {
  const ordered = [...activities].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.createdAt.localeCompare(b.createdAt),
  );
  const result: AgentActivity[] = [];
  for (const source of ordered) {
    if (
      ["tool.started", "tool.progress", "task.updated", "context-window.updated"].includes(
        source.kind,
      )
    )
      continue;
    const nextStatus = status(source);
    const nextClass = classify(source);
    const current = result.at(-1);
    if (
      current &&
      current.phase === nextClass.phase &&
      current.status !== "failed" &&
      nextStatus !== "waiting" &&
      current.operations[0]?.turnId === source.turnId
    ) {
      result[result.length - 1] = {
        ...current,
        status: nextStatus === "working" ? current.status : nextStatus,
        operations: [...current.operations, toOperation(source)],
        ...(reasoning(source) ? { reasoningSummary: reasoning(source) } : {}),
      };
    } else
      result.push({
        id: `agent-activity:${source.id}`,
        ...nextClass,
        status: nextStatus,
        createdAt: source.createdAt,
        operations: [toOperation(source)],
        ...(reasoning(source) ? { reasoningSummary: reasoning(source) } : {}),
      });
  }
  const phases = new Map<AgentActivityPhase, AgentActivity[]>();
  for (const activity of result)
    phases.set(activity.phase, [...(phases.get(activity.phase) ?? []), activity]);
  return {
    activities: result,
    phases: [...phases].map(([phase, grouped]) => ({ phase, activities: grouped })),
  };
}
