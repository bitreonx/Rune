import type { OrchestrationThreadActivity } from "@rune/contracts";

export type AgentActivityStatus = "working" | "waiting" | "done" | "failed" | "paused";
export type AgentActivityPhase = "explore" | "research" | "implement" | "test" | "fix" | "review" | "other";

export interface AgentActivityOperation {
  readonly id: string;
  readonly kind: string;
  readonly createdAt: string;
  readonly turnId: string | null;
  readonly toolName?: string;
  readonly filePath?: string;
  readonly command?: string;
  readonly rawTrace: OrchestrationThreadActivity;
}

export interface AgentActivity {
  readonly id: string;
  readonly phase: AgentActivityPhase;
  readonly label: string;
  readonly status: AgentActivityStatus;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly operations: ReadonlyArray<AgentActivityOperation>;
  readonly reasoningSummary?: string;
}

export interface AgentActivityJob {
  readonly phases: ReadonlyArray<{ readonly phase: AgentActivityPhase; readonly activities: ReadonlyArray<AgentActivity> }>;
  readonly activities: ReadonlyArray<AgentActivity>;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function payloadText(activity: OrchestrationThreadActivity, key: string): string | undefined {
  return text(record(activity.payload)?.[key]);
}

function classify(activity: OrchestrationThreadActivity): { phase: AgentActivityPhase; label: string } {
  const payload = record(activity.payload);
  const haystack = [activity.kind, activity.summary, payloadText(activity, "title"), payloadText(activity, "command")]
    .filter(Boolean).join(" ").toLowerCase();
  if (activity.tone === "error" || /\b(error|fail|exception|fix)\b/u.test(haystack)) return { phase: "fix", label: "Fixing remaining errors" };
  if (/\b(test|lint|typecheck|build|check|verify)\b/u.test(haystack)) return { phase: "test", label: "Running tests" };
  if (/\b(review|diff|inspect result|reviewing)\b/u.test(haystack)) return { phase: "review", label: "Reviewing the result" };
  if (/\b(edit|write|patch|move|delete|implement|change|create)\b/u.test(haystack) || payload?.itemType === "file_change") return { phase: "implement", label: "Implementing the change" };
  if (/\b(web|fetch|documentation|docs|url|http)\b/u.test(haystack)) return { phase: "research", label: "Researching the repository" };
  if (/\b(search|grep|find|read|file|repository|project|explore)\b/u.test(haystack)) return { phase: "explore", label: "Exploring the project" };
  return { phase: "other", label: "Working on the task" };
}

function status(activity: OrchestrationThreadActivity): AgentActivityStatus {
  const value = payloadText(activity, "status")?.toLowerCase();
  if (activity.tone === "error" || value === "failed") return "failed";
  if (activity.kind.includes("approval.requested") || activity.kind.includes("user-input.requested")) return "waiting";
  if (value === "stopped" || value === "paused" || activity.kind.includes("interrupted")) return "paused";
  if (activity.kind.endsWith(".completed") || activity.kind.endsWith(".resolved") || value === "completed") return "done";
  return "working";
}

function operation(activity: OrchestrationThreadActivity): AgentActivityOperation {
  const payload = record(activity.payload);
  const data = record(payload?.data) ?? payload;
  return {
    id: activity.id,
    kind: activity.kind,
    createdAt: activity.createdAt,
    turnId: activity.turnId,
    ...(text(payload?.toolName) ? { toolName: text(payload?.toolName) } : {}),
    ...(text(data?.path) ? { filePath: text(data?.path) } : {}),
    ...(text(data?.command) ? { command: text(data?.command) } : {}),
    rawTrace: activity,
  };
}

function reasoningSummary(activity: OrchestrationThreadActivity): string | undefined {
  for (const key of ["reasoningSummary", "decision", "hypothesis", "explanation"]) {
    const value = payloadText(activity, key);
    if (value && value.length <= 280) return value;
  }
  return undefined;
}

export function deriveAgentActivityJob(activities: ReadonlyArray<OrchestrationThreadActivity>): AgentActivityJob {
  const ordered = [...activities].sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt));
  const result: AgentActivity[] = [];
  for (const source of ordered) {
    if (["tool.started", "tool.progress", "task.updated", "context-window.updated"].includes(source.kind)) continue;
    const classified = classify(source);
    const current = result.at(-1);
    const canMerge = current && current.phase === classified.phase && current.turnId === source.turnId && current.status !== "failed" && status(source) !== "waiting";
    if (canMerge) {
      const nextStatus = status(source);
      result[result.length - 1] = {
        ...current,
        status: nextStatus === "working" ? current.status : nextStatus,
        completedAt: nextStatus === "done" ? source.createdAt : current.completedAt,
        operations: [...current.operations, operation(source)],
        ...(reasoningSummary(source) ? { reasoningSummary: reasoningSummary(source) } : {}),
      };
    } else {
      result.push({
        id: `agent-activity:${source.id}`,
        ...classified,
        status: status(source),
        createdAt: source.createdAt,
        operations: [operation(source)],
        ...(reasoningSummary(source) ? { reasoningSummary: reasoningSummary(source) } : {}),
      });
    }
  }
  const phases = new Map<AgentActivityPhase, AgentActivity[]>();
  for (const activity of result) phases.set(activity.phase, [...(phases.get(activity.phase) ?? []), activity]);
  return { activities: result, phases: [...phases].map(([phase, grouped]) => ({ phase, activities: grouped })) };
}
