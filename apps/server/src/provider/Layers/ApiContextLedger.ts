import type { AgentLoopMessage } from "./ApiAgentLoop.ts";

interface LedgerEntry {
  message: AgentLoopMessage;
  key: string | undefined;
  hash: string;
  required: boolean;
}

export interface ContextCompactionResult {
  readonly removedObservationCount: number;
  readonly retainedMessageCount: number;
  readonly requiredContextRemoved: boolean;
}

export interface ObservationMetadata {
  readonly key?: string;
  readonly hash?: string;
  readonly required?: boolean;
}

const hashText = (text: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const messageText = (message: AgentLoopMessage): string => {
  if (message.role === "tool") return message.content;
  if (message.role === "assistant") return message.content ?? "";
  return message.content;
};

const messageSize = (message: AgentLoopMessage): number => messageText(message).length + 32;

export class ApiContextLedger {
  readonly #entries: LedgerEntry[] = [];

  constructor(initialMessages: ReadonlyArray<AgentLoopMessage> = []) {
    for (const message of initialMessages) this.add(message);
  }

  add(message: AgentLoopMessage, metadata: ObservationMetadata = {}): void {
    this.#entries.push({
      message,
      key: metadata.key,
      hash: metadata.hash ?? hashText(messageText(message)),
      required: metadata.required ?? false,
    });
  }

  replaceObservation(key: string, content: string, hash: string): void {
    const entry = this.#entries.find((candidate) => candidate.key === key);
    if (!entry || entry.message.role !== "tool") return;
    entry.message = { ...entry.message, content };
    entry.hash = hash;
  }

  compact(maxChars: number): ContextCompactionResult {
    let totalSize = this.#entries.reduce((sum, entry) => sum + messageSize(entry.message), 0);
    let removedObservationCount = 0;
    let requiredContextRemoved = false;

    for (let index = 0; index < this.#entries.length && totalSize > maxChars; ) {
      const entry = this.#entries[index];
      if (!entry || entry.message.role !== "tool" || entry.required) {
        index += 1;
        continue;
      }
      totalSize -= messageSize(entry.message);
      this.#entries.splice(index, 1);
      removedObservationCount += 1;
    }

    if (totalSize > maxChars) {
      requiredContextRemoved = this.#entries.some(
        (entry) => entry.required && messageSize(entry.message) > maxChars,
      );
    }

    return {
      removedObservationCount,
      retainedMessageCount: this.#entries.length,
      requiredContextRemoved,
    };
  }

  toMessages(): ReadonlyArray<AgentLoopMessage> {
    return this.#entries.map((entry) => entry.message);
  }
}

export function fingerprintToolCall(
  name: string,
  args: Record<string, unknown>,
  workspaceHash = "static-workspace",
): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  };
  return `${workspaceHash}:${name}:${JSON.stringify(canonicalize(args))}`;
}
