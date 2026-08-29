import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";

/**
 * Presentation states for the Agent Dock. The runtime fold remains the only
 * source of truth; this mapping gives the UI names that are useful to a
 * person without losing provider-specific lifecycle detail.
 */
export const AGENT_DOCK_STATUSES = [
  "queued",
  "starting",
  "running",
  "waiting_for_tool",
  "waiting_for_user",
  "paused",
  "background",
  "verifying",
  "completed",
  "failed",
  "cancelled",
  "lost",
] as const;

export type AgentDockStatus = (typeof AGENT_DOCK_STATUSES)[number];

export interface AgentDockStatusMeta {
  readonly status: AgentDockStatus;
  readonly label: string;
  readonly marker: "dot" | "attention" | "check" | "dash";
  readonly live: boolean;
  readonly needsUser: boolean;
}

const STATUS_META: Record<AgentDockStatus, AgentDockStatusMeta> = {
  queued: { status: "queued", label: "Queued", marker: "dot", live: true, needsUser: false },
  starting: {
    status: "starting",
    label: "Starting",
    marker: "dot",
    live: true,
    needsUser: false,
  },
  running: { status: "running", label: "Working", marker: "dot", live: true, needsUser: false },
  waiting_for_tool: {
    status: "waiting_for_tool",
    label: "Waiting for tool",
    marker: "dot",
    live: true,
    needsUser: false,
  },
  waiting_for_user: {
    status: "waiting_for_user",
    label: "Waiting for you",
    marker: "attention",
    live: true,
    needsUser: true,
  },
  paused: { status: "paused", label: "Paused", marker: "dash", live: false, needsUser: false },
  background: {
    status: "background",
    label: "Background",
    marker: "dot",
    live: true,
    needsUser: false,
  },
  verifying: {
    status: "verifying",
    label: "Verifying",
    marker: "dot",
    live: true,
    needsUser: false,
  },
  completed: {
    status: "completed",
    label: "Completed",
    marker: "check",
    live: false,
    needsUser: false,
  },
  failed: { status: "failed", label: "Failed", marker: "attention", live: false, needsUser: false },
  cancelled: {
    status: "cancelled",
    label: "Cancelled",
    marker: "dash",
    live: false,
    needsUser: false,
  },
  lost: { status: "lost", label: "Lost", marker: "attention", live: false, needsUser: false },
};

export function agentDockStatusMeta(status: AgentDockStatus): AgentDockStatusMeta {
  return STATUS_META[status];
}

function lifecycleSignal(agent: RuntimeSubagent): string {
  return [agent.progress, agent.lastToolName, agent.result, agent.error]
    .filter((value): value is string => value !== null && value.trim().length > 0)
    .join(" ")
    .toLocaleLowerCase();
}

function isVerificationSignal(signal: string): boolean {
  return /\b(verify|verification|test|tests|testing|typecheck|type-check|lint|build|check|checks)\b/.test(
    signal,
  );
}

function isUserWaitSignal(signal: string): boolean {
  return /\b(user|you|approval|approve|input|question|review|permission|confirm|choose|select)\b/.test(
    signal,
  );
}

/**
 * Convert the tolerant legacy/provider status into the explicit Dock
 * vocabulary. `interrupted` is deliberately `lost`: it means the provider
 * session disappeared, so showing a live-looking row would be misleading.
 */
export function resolveAgentDockStatus(agent: RuntimeSubagent): AgentDockStatus {
  const signal = lifecycleSignal(agent);
  switch (agent.status) {
    case "pending":
      return agent.startedAt ? "starting" : "queued";
    case "running":
      return isVerificationSignal(signal) ? "verifying" : "running";
    case "waiting":
      return isUserWaitSignal(signal) ? "waiting_for_user" : "waiting_for_tool";
    case "idle":
      return "paused";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "interrupted":
      return "lost";
  }
}

function providerLabel(agent: RuntimeSubagent): string | null {
  const provider = agent.chat?.provider?.trim();
  if (!provider) return null;
  return provider.charAt(0).toLocaleUpperCase() + provider.slice(1);
}

function activitySummary(agent: RuntimeSubagent): string | null {
  return (
    agent.progress ??
    agent.result ??
    agent.error ??
    (agent.lastToolName ? `Using ${agent.lastToolName}` : null)
  );
}

export interface AgentDockRow {
  readonly agent: RuntimeSubagent;
  readonly status: AgentDockStatusMeta;
  readonly primary: string;
  readonly secondary: string;
}

/** Stable urgency ordering keeps needs-you work visible without duplicating runtime state. */
export function deriveAgentDockRows(
  agents: ReadonlyArray<RuntimeSubagent>,
): ReadonlyArray<AgentDockRow> {
  const urgency: Record<AgentDockStatus, number> = {
    waiting_for_user: 0,
    failed: 1,
    waiting_for_tool: 2,
    running: 3,
    verifying: 4,
    starting: 5,
    queued: 6,
    background: 7,
    paused: 8,
    completed: 9,
    cancelled: 10,
    lost: 11,
  };
  return agents
    .map((agent) => {
      const status = agentDockStatusMeta(resolveAgentDockStatus(agent));
      const summary = activitySummary(agent);
      const secondary = [providerLabel(agent), summary ?? status.label]
        .filter((value): value is string => value !== null && value.length > 0)
        .join(" · ");
      return {
        agent,
        status,
        primary: agent.generatedName || agent.title,
        secondary,
      };
    })
    .sort(
      (left, right) =>
        urgency[left.status.status] - urgency[right.status.status] ||
        left.agent.firstSeenAt.localeCompare(right.agent.firstSeenAt) ||
        left.agent.id.localeCompare(right.agent.id),
    );
}

export interface AgentPassportField {
  readonly label: string;
  readonly value: string;
}

function permissionSummary(agent: RuntimeSubagent): string {
  if (!agent.chat) return "Activity only; provider chat is unavailable";
  const permissions = [
    agent.chat.canRead ? "read" : null,
    agent.chat.canSend ? "send" : null,
    agent.chat.canInterrupt ? "interrupt" : null,
  ].filter((value): value is string => value !== null);
  return permissions.length > 0 ? permissions.join(" · ") : "No direct actions";
}

function contextSummary(agent: RuntimeSubagent): string {
  const inputTokens = agent.usage?.inputTokens;
  return inputTokens === undefined
    ? "Not reported by provider"
    : `${inputTokens.toLocaleString()} input tokens observed`;
}

/** Identity is read from the durable runtime projection; unavailable fields stay honest. */
export function buildAgentPassport(agent: RuntimeSubagent): ReadonlyArray<AgentPassportField> {
  return [
    { label: "Role", value: agent.role ?? "Unassigned" },
    { label: "Harness", value: providerLabel(agent) ?? "Provider-native activity" },
    { label: "Model", value: agent.model ?? "Provider default" },
    { label: "Effort", value: agent.effort ?? "Provider default" },
    { label: "Mission", value: agent.title },
    {
      label: "Workspace / worktree",
      value:
        agent.agentPath ??
        agent.runHandles?.transcriptDir ??
        agent.outputFile ??
        "Parent workspace",
    },
    { label: "Permissions", value: permissionSummary(agent) },
    { label: "Inherited context size", value: contextSummary(agent) },
    { label: "Parent agent", value: agent.parentAgentId ?? "Parent thread" },
    { label: "Started", value: agent.startedAt ?? "Not started" },
  ];
}

export const AGENT_TRAIL_SECTIONS = [
  "Research",
  "Decision",
  "Changes",
  "Verification",
  "Result",
] as const;

export type AgentTrailSection = (typeof AGENT_TRAIL_SECTIONS)[number];

export interface AgentTrailEntry {
  readonly at: string | null;
  readonly text: string;
}

export type AgentTrail = Readonly<Record<AgentTrailSection, ReadonlyArray<AgentTrailEntry>>>;

function trailSection(summary: string): Exclude<AgentTrailSection, "Result"> {
  const signal = summary.toLocaleLowerCase();
  if (/\b(read|search(?:ed|ing)?|inspect|audit|research|find|scan|analy[sz])\b/.test(signal)) {
    return "Research";
  }
  if (
    /\b(edit|write|create|delete|move|rename|patch|file|implemented|changed|modify)\b/.test(signal)
  ) {
    return "Changes";
  }
  if (
    /\b(test|typecheck|type-check|lint|build|verify|verification|check|pass|fail)\b/.test(signal)
  ) {
    return "Verification";
  }
  return "Decision";
}

/** Deterministic trail projection from retained durable activity and terminal fields. */
export function deriveAgentTrail(agent: RuntimeSubagent): AgentTrail {
  const sections: Record<AgentTrailSection, AgentTrailEntry[]> = {
    Research: [],
    Decision: [],
    Changes: [],
    Verification: [],
    Result: [],
  };
  for (const entry of agent.recentActivity) {
    sections[trailSection(entry.summary)].push({ at: entry.at, text: entry.summary });
  }
  if (agent.outputFile) {
    sections.Changes.push({ at: agent.updatedAt, text: `Artifact recorded: ${agent.outputFile}` });
  }
  if (agent.result) {
    sections.Result.push({ at: agent.completedAt ?? agent.updatedAt, text: agent.result });
  } else if (agent.error) {
    sections.Result.push({ at: agent.completedAt ?? agent.updatedAt, text: agent.error });
  } else if (agent.status === "completed") {
    sections.Result.push({ at: agent.completedAt ?? agent.updatedAt, text: "Completed" });
  } else if (agent.status === "failed" || agent.status === "interrupted") {
    sections.Result.push({
      at: agent.completedAt ?? agent.updatedAt,
      text: "The provider did not record a result.",
    });
  }
  return sections;
}
