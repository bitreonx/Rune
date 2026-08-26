import type { ThreadId, TurnId } from "@rune/contracts";

export type PromptQueueMode = "queue" | "steer";
export type PromptQueueItemStatus =
  | "queued"
  | "claimed"
  | "steering"
  | "completed"
  | "cancelled"
  | "superseded"
  | "failed";

export type PromptQueueExecutionStatus =
  | "idle"
  | "running"
  | "queued"
  | "interrupting"
  | "steering"
  | "resuming"
  | "waiting_for_user"
  | "failed"
  | "cancelled";

export interface PromptQueueItem {
  readonly id: string;
  readonly threadId: ThreadId;
  readonly text: string;
  readonly mode: PromptQueueMode;
  readonly status: PromptQueueItemStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly attempt: number;
  readonly claimedTurnId: TurnId | null;
  readonly error: string | null;
}

export interface InterruptedTaskContext {
  readonly turnId: TurnId;
  readonly originalObjective: string;
  readonly unfinishedWork: readonly string[];
  readonly completedWork: readonly string[];
  readonly discoveries: readonly string[];
  readonly changedFiles: readonly string[];
  readonly toolResults: readonly string[];
  readonly interruptedBy: string;
  readonly interruptedAt: string;
  readonly resumeIntent: "resume" | "abandoned";
}

export interface PromptQueueThreadState {
  readonly threadId: ThreadId;
  readonly executionStatus: PromptQueueExecutionStatus;
  readonly activeTurnId: TurnId | null;
  readonly queue: readonly PromptQueueItem[];
  readonly interruptedTasks: readonly InterruptedTaskContext[];
  readonly revision: number;
}

export type PromptQueueAction =
  | { readonly type: "enqueue"; readonly item: PromptQueueItem }
  | { readonly type: "edit"; readonly itemId: string; readonly text: string; readonly now: string }
  | { readonly type: "remove"; readonly itemId: string; readonly now: string }
  | { readonly type: "reorder"; readonly itemId: string; readonly beforeItemId: string | null; readonly now: string }
  | { readonly type: "promote-steer"; readonly itemId: string; readonly now: string }
  | { readonly type: "claim-next"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "settle"; readonly itemId: string; readonly status: "completed" | "failed" | "cancelled" | "superseded"; readonly error?: string | null; readonly now: string }
  | { readonly type: "set-execution"; readonly status: PromptQueueExecutionStatus; readonly activeTurnId: TurnId | null }
  | { readonly type: "record-interruption"; readonly context: InterruptedTaskContext };

export function createPromptQueueThreadState(threadId: ThreadId): PromptQueueThreadState {
  return {
    threadId,
    executionStatus: "idle",
    activeTurnId: null,
    queue: [],
    interruptedTasks: [],
    revision: 0,
  };
}

function bump(state: PromptQueueThreadState, patch: Omit<PromptQueueThreadState, "revision">): PromptQueueThreadState {
  return { ...patch, revision: state.revision + 1 };
}

export function reducePromptQueue(
  state: PromptQueueThreadState,
  action: PromptQueueAction,
): PromptQueueThreadState {
  switch (action.type) {
    case "enqueue":
      if (state.queue.some((item) => item.id === action.item.id)) return state;
      return bump(state, { ...state, queue: [...state.queue, action.item] });
    case "edit":
      return bump(state, {
        ...state,
        queue: state.queue.map((item) =>
          item.id === action.itemId && item.status === "queued"
            ? { ...item, text: action.text, updatedAt: action.now }
            : item,
        ),
      });
    case "remove":
      return bump(state, {
        ...state,
        queue: state.queue.map((item) =>
          item.id === action.itemId && item.status === "queued"
            ? { ...item, status: "cancelled", updatedAt: action.now }
            : item,
        ),
      });
    case "reorder": {
      const moving = state.queue.find((item) => item.id === action.itemId && item.status === "queued");
      if (!moving || action.beforeItemId === action.itemId) return state;
      const remaining = state.queue.filter((item) => item.id !== action.itemId);
      const index = action.beforeItemId === null
        ? remaining.length
        : Math.max(0, remaining.findIndex((item) => item.id === action.beforeItemId));
      remaining.splice(index < 0 ? remaining.length : index, 0, { ...moving, updatedAt: action.now });
      return bump(state, { ...state, queue: remaining });
    }
    case "promote-steer": {
      const item = state.queue.find((candidate) => candidate.id === action.itemId && candidate.status === "queued");
      if (!item) return state;
      return bump(state, {
        ...state,
        executionStatus: "interrupting",
        queue: [
          { ...item, mode: "steer", status: "steering", updatedAt: action.now },
          ...state.queue.filter((candidate) => candidate.id !== action.itemId),
        ],
      });
    }
    case "claim-next": {
      const index = state.queue.findIndex((item) => item.status === "queued" || item.status === "steering");
      if (index < 0) return state;
      const item = state.queue[index]!;
      const nextQueue = [...state.queue];
      nextQueue[index] = { ...item, status: "claimed", claimedTurnId: action.turnId, attempt: item.attempt + 1, updatedAt: action.now };
      return bump(state, { ...state, executionStatus: "running", activeTurnId: action.turnId, queue: nextQueue });
    }
    case "settle":
      return bump(state, {
        ...state,
        executionStatus: action.status === "failed" ? "failed" : state.executionStatus,
        queue: state.queue.map((item) =>
          item.id === action.itemId && item.status === "claimed"
            ? { ...item, status: action.status, error: action.error ?? null, updatedAt: action.now }
            : item,
        ),
      });
    case "set-execution":
      return bump(state, { ...state, executionStatus: action.status, activeTurnId: action.activeTurnId });
    case "record-interruption":
      return bump(state, { ...state, interruptedTasks: [...state.interruptedTasks, action.context] });
  }
}

export function nextPromptQueueItem(state: PromptQueueThreadState): PromptQueueItem | null {
  return state.queue.find((item) => item.status === "queued" || item.status === "steering") ?? null;
}

export function hasPendingPromptQueueItems(state: PromptQueueThreadState): boolean {
  return state.queue.some((item) => item.status === "queued" || item.status === "steering" || item.status === "claimed");
}

export function createPromptQueueItem(threadId: ThreadId, text: string, now = new Date().toISOString()): PromptQueueItem {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    threadId,
    text,
    mode: "queue",
    status: "queued",
    createdAt: now,
    updatedAt: now,
    attempt: 0,
    claimedTurnId: null,
    error: null,
  };
}
