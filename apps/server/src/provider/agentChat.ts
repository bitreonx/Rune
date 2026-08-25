import {
  OrchestrationRpcSchemas,
  RuntimeTaskId,
  TurnId,
} from "@t3tools/contracts";

import type { ProviderThreadSnapshot } from "./Services/ProviderAdapter.ts";

export type OrchestrationAgentChatSnapshot =
  typeof OrchestrationRpcSchemas.getAgentChat.output.Type;

function textFromUserContent(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((part) => {
      if (typeof part !== "object" || part === null) {
        return "";
      }
      const text = (part as Record<string, unknown>).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function asTextMessage(
  item: Record<string, unknown>,
  turnId: TurnId,
): OrchestrationAgentChatSnapshot["messages"][number] | undefined {
  const itemId = typeof item.id === "string" ? item.id.trim() : "";
  if (!itemId) {
    return undefined;
  }

  if (item.type === "userMessage") {
    const text = textFromUserContent(item.content);
    return {
      id: itemId,
      role: "user",
      text,
      turnId,
      streaming: false,
    };
  }

  if (item.type === "agentMessage" && typeof item.text === "string") {
    return {
      id: itemId,
      role: "assistant",
      text: item.text,
      turnId,
      streaming: false,
    };
  }

  return undefined;
}

/**
 * Convert provider-specific child-thread items into the small transcript the
 * child-chat UI is allowed to render. Tool calls and reasoning remain in the
 * activity roster; they are intentionally not copied into the chat stream.
 */
export function normalizeProviderAgentChatSnapshot(
  agentId: RuntimeTaskId,
  snapshot: ProviderThreadSnapshot,
): OrchestrationAgentChatSnapshot {
  const messages: Array<OrchestrationAgentChatSnapshot["messages"][number]> = [];
  for (const turn of snapshot.turns) {
    for (const rawItem of turn.items) {
      if (typeof rawItem !== "object" || rawItem === null) {
        continue;
      }
      const message = asTextMessage(rawItem as Record<string, unknown>, turn.id);
      if (message) {
        messages.push(message);
      }
    }
  }
  return { agentId, messages };
}
