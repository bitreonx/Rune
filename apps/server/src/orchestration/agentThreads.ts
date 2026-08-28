import {
  RuntimeTaskId,
  ThreadId,
  type IsoDateTime,
  type OrchestrationAgentResult,
  type OrchestrationAgentThread,
  type OrchestrationThread,
  type TurnId,
} from "@rune/contracts";

export const MAX_AGENT_THREAD_DEPTH = 32;

export function agentThreadIdFor(parentThreadId: ThreadId, agentId: RuntimeTaskId): ThreadId {
  return ThreadId.make(`agent:${parentThreadId}:${agentId}`);
}

export function makeAgentThreadMetadata(input: {
  readonly parentThread: Pick<OrchestrationThread, "id" | "agent">;
  readonly agentId: RuntimeTaskId;
  readonly role?: string | null;
  readonly profileId?: string | null;
  readonly objective: string;
  readonly spawnedByTurnId?: TurnId | null;
  readonly workspaceMode?: "shared" | "isolated";
  readonly providerThreadId?: string | null;
}): OrchestrationAgentThread {
  const depth = (input.parentThread.agent?.depth ?? 0) + 1;
  if (depth > MAX_AGENT_THREAD_DEPTH) {
    throw new Error(
      `Agent thread depth ${depth} exceeds the maximum of ${MAX_AGENT_THREAD_DEPTH}.`,
    );
  }

  return {
    parentThreadId: input.parentThread.id,
    rootThreadId: input.parentThread.agent?.rootThreadId ?? input.parentThread.id,
    spawnedByTurnId: input.spawnedByTurnId ?? null,
    agentId: input.agentId,
    agentRole: input.role?.trim() || null,
    agentProfileId: input.profileId?.trim() || null,
    objective: input.objective.trim() || "Child agent task",
    depth,
    workspaceMode: input.workspaceMode ?? "shared",
    providerThreadId: input.providerThreadId?.trim() || null,
    result: null,
    resultAdoptedAt: null,
  };
}

export function findAgentThread(
  threads: ReadonlyArray<Pick<OrchestrationThread, "id" | "agent">>,
  parentThreadId: ThreadId,
  agentId: RuntimeTaskId,
): Pick<OrchestrationThread, "id" | "agent"> | undefined {
  return threads.find(
    (thread) => thread.agent?.parentThreadId === parentThreadId && thread.agent.agentId === agentId,
  );
}

export function assertAgentThreadOwnedBy(
  parentThreadId: ThreadId,
  childThread: Pick<OrchestrationThread, "agent">,
): OrchestrationAgentThread {
  const agent = childThread.agent;
  if (agent === undefined || agent === null || agent.parentThreadId !== parentThreadId) {
    throw new Error(`Thread is not a child of '${parentThreadId}'.`);
  }
  return agent;
}

export function adoptAgentResult(input: {
  readonly parentThreadId: ThreadId;
  readonly childThread: Pick<OrchestrationThread, "agent">;
  readonly result: OrchestrationAgentResult;
  readonly adoptedAt: IsoDateTime;
}): OrchestrationAgentThread {
  const agent = assertAgentThreadOwnedBy(input.parentThreadId, input.childThread);
  return {
    ...agent,
    result: input.result,
    resultAdoptedAt: input.adoptedAt,
  };
}

export function runtimeTaskId(value: string): RuntimeTaskId {
  return RuntimeTaskId.make(value);
}
