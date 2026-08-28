import { create } from "zustand";
import type { PromptQueueSnapshot } from "@rune/contracts";
import {
  createPromptQueueItem,
  createPromptQueueThreadState,
  reducePromptQueue,
  type PromptQueueItem,
  type PromptQueueThreadState,
} from "@rune/client-runtime/state/promptQueue";

const STORAGE_KEY = "rune:prompt-queue:v1";

type PersistedQueues = Record<string, PromptQueueThreadState>;

function readQueues(): PersistedQueues {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedQueues;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        {
          ...createPromptQueueThreadState(value.threadId),
          ...value,
          queue: Array.isArray(value.queue) ? value.queue : [],
          interruptedTasks: Array.isArray(value.interruptedTasks) ? value.interruptedTasks : [],
        },
      ]),
    );
  } catch {
    return {};
  }
}

function persist(queues: PersistedQueues) {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
  } catch {
    /* best effort; memory remains authoritative */
  }
}

interface PromptQueueStore {
  queues: PersistedQueues;
  enqueue: (threadId: string, text: string) => string;
  edit: (threadId: string, itemId: string, text: string) => void;
  remove: (threadId: string, itemId: string) => void;
  reorder: (threadId: string, itemId: string, beforeItemId: string | null) => void;
  promoteSteer: (threadId: string, itemId: string) => void;
  update: (threadId: string, action: Parameters<typeof reducePromptQueue>[1]) => void;
  hydrate: (snapshot: PromptQueueSnapshot) => void;
}

const stateFor = (queues: PersistedQueues, threadId: string) =>
  queues[threadId] ?? createPromptQueueThreadState(threadId as never);

function clientStatus(item: PromptQueueSnapshot["items"][number]): PromptQueueItem["status"] {
  if (item.status === "promoted") return "steering";
  if (item.status === "settled")
    return item.settlement === "superseded" ? "superseded" : "completed";
  if (item.status === "materialized" || item.status === "claimed") return "claimed";
  return item.status;
}

function clientExecutionStatus(
  snapshot: PromptQueueSnapshot,
  queue: readonly PromptQueueItem[],
): PromptQueueThreadState["executionStatus"] {
  switch (snapshot.executionState) {
    case "waitingForUser":
    case "waitingForApproval":
      return "waiting_for_user";
    case "stopping":
      return "stopping";
    case "stopped":
      return "abandoned";
    case "paused":
      return "paused";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "running":
      return "running";
    default:
      return queue.some((item) => item.status === "queued" || item.status === "steering")
        ? "queued"
        : "idle";
  }
}

export const usePromptQueueStore = create<PromptQueueStore>((set) => {
  const apply = (threadId: string, action: Parameters<typeof reducePromptQueue>[1]) =>
    set((current) => {
      const nextQueues = {
        ...current.queues,
        [threadId]: reducePromptQueue(stateFor(current.queues, threadId), action),
      };
      persist(nextQueues);
      return { queues: nextQueues };
    });
  return {
    queues: readQueues(),
    enqueue: (threadId, text) => {
      const item = createPromptQueueItem(threadId as never, text);
      apply(threadId, { type: "enqueue", item });
      return item.id;
    },
    edit: (threadId, itemId, text) =>
      apply(threadId, { type: "edit", itemId, text, now: new Date().toISOString() }),
    remove: (threadId, itemId) =>
      apply(threadId, { type: "remove", itemId, now: new Date().toISOString() }),
    reorder: (threadId, itemId, beforeItemId) =>
      apply(threadId, { type: "reorder", itemId, beforeItemId, now: new Date().toISOString() }),
    promoteSteer: (threadId, itemId) =>
      apply(threadId, { type: "promote-steer", itemId, now: new Date().toISOString() }),
    update: apply,
    hydrate: (snapshot) =>
      set((current) => {
        const existing = stateFor(current.queues, snapshot.threadId);
        const queue = snapshot.items.map((item) => ({
          id: item.id,
          threadId: item.threadId,
          text: item.prompt,
          mode: item.status === "promoted" ? ("steer" as const) : ("queue" as const),
          status: clientStatus(item),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          attempt: item.attempt,
          claimedTurnId: item.turnId,
          error: item.error,
        }));
        const nextQueues = {
          ...current.queues,
          [snapshot.threadId]: {
            ...existing,
            threadId: snapshot.threadId,
            executionStatus: clientExecutionStatus(snapshot, queue),
            activeTurnId:
              snapshot.activePromptId === null
                ? null
                : (queue.find((item) => item.id === snapshot.activePromptId)?.claimedTurnId ??
                  null),
            queue,
            revision: snapshot.revision,
          },
        };
        persist(nextQueues);
        return { queues: nextQueues };
      }),
  };
});

export function usePromptQueue(threadId: string | null): PromptQueueThreadState {
  const state = usePromptQueueStore((current) => (threadId ? current.queues[threadId] : undefined));
  return state ?? createPromptQueueThreadState((threadId ?? "none") as never);
}

export type { PromptQueueItem };
