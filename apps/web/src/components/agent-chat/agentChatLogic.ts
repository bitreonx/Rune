import type { OrchestrationRpcSchemas } from "@rune/contracts";
import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";

export type AgentChatSnapshot = typeof OrchestrationRpcSchemas.getAgentChat.output.Type;
export type AgentChatMessage = AgentChatSnapshot["messages"][number];

export type AgentChatViewState =
  | "loading"
  | "ready"
  | "sending"
  | "unsupported"
  | "unavailable"
  | "error";

export function canReadAgentChat(agent: RuntimeSubagent): boolean {
  return agent.chat?.canRead === true;
}

export function canSendAgentChat(agent: RuntimeSubagent): boolean {
  return agent.chat?.canSend === true;
}

export function canInterruptAgentChat(agent: RuntimeSubagent): boolean {
  return agent.chat?.canInterrupt === true;
}

export function optimisticAgentMessage(id: string, text: string): AgentChatMessage {
  return {
    id,
    role: "user",
    text,
    turnId: null,
    streaming: false,
  };
}

export function mergeAgentChatMessages(
  messages: ReadonlyArray<AgentChatMessage>,
  optimistic: ReadonlyArray<AgentChatMessage>,
): ReadonlyArray<AgentChatMessage> {
  if (optimistic.length === 0) {
    return messages;
  }
  const confirmedUserText = new Set(
    messages.filter((message) => message.role === "user").map((message) => message.text),
  );
  return [
    ...messages,
    ...optimistic.filter((message) => !confirmedUserText.has(message.text)),
  ];
}

export function agentChatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}
