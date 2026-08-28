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
  | "pausing"
  | "paused"
  | "interrupting"
  | "steering"
  | "resuming"
  | "stopping"
  | "abandoned"
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
  | {
      readonly type: "reorder";
      readonly itemId: string;
      readonly beforeItemId: string | null;
      readonly now: string;
    }
  | { readonly type: "promote-steer"; readonly itemId: string; readonly now: string }
  | { readonly type: "claim-next"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "pause-requested"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "pause-confirmed"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "continue-requested"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "continue-confirmed"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "stop-requested"; readonly turnId: TurnId; readonly now: string }
  | { readonly type: "abandon"; readonly turnId: TurnId; readonly now: string }
  | {
      readonly type: "settle";
      readonly itemId: string;
      readonly status: "completed" | "failed" | "cancelled" | "superseded";
      readonly error?: string | null;
      readonly now: string;
    }
  | { readonly type: "restore-queued"; readonly itemId: string; readonly now: string }
  | {
      readonly type: "set-execution";
      readonly status: PromptQueueExecutionStatus;
      readonly activeTurnId: TurnId | null;
    }
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

function bump(
  state: PromptQueueThreadState,
  patch: Omit<PromptQueueThreadState, "revision">,
): PromptQueueThreadState {
  return { ...patch, revision: state.revision + 1 };
}

export function reducePromptQueue(
  state: PromptQueueThreadState,
  action: PromptQueueAction,
): PromptQueueThreadState {
  switch (action.type) {
    case "enqueue":
      if (
        action.item.threadId !== state.threadId ||
        action.item.status !== "queued" ||
        state.queue.some((item) => item.id === action.item.id)
      ) {
        return state;
      }
      return bump(state, { ...state, queue: [...state.queue, action.item] });
    case "edit": {
      const item = state.queue.find(
        (candidate) =>
          candidate.id === action.itemId &&
          (candidate.status === "queued" || candidate.status === "steering"),
      );
      if (!item || action.text.trim().length === 0) return state;
      return bump(state, {
        ...state,
        queue: state.queue.map((candidate) =>
          candidate.id === action.itemId
            ? { ...candidate, text: action.text, updatedAt: action.now }
            : candidate,
        ),
      });
    }
    case "remove": {
      const item = state.queue.find(
        (candidate) =>
          candidate.id === action.itemId &&
          (candidate.status === "queued" || candidate.status === "steering"),
      );
      if (!item) return state;
      return bump(state, {
        ...state,
        queue: state.queue.map((candidate) =>
          candidate.id === action.itemId
            ? { ...candidate, status: "cancelled", updatedAt: action.now }
            : candidate,
        ),
      });
    }
    case "reorder": {
      const moving = state.queue.find(
        (item) =>
          item.id === action.itemId && (item.status === "queued" || item.status === "steering"),
      );
      if (!moving || action.beforeItemId === action.itemId) return state;
      if (
        action.beforeItemId !== null &&
        !state.queue.some(
          (item) =>
            item.id === action.beforeItemId &&
            (item.status === "queued" || item.status === "steering"),
        )
      ) {
        return state;
      }
      const remaining = state.queue.filter((item) => item.id !== action.itemId);
      const requestedIndex =
        action.beforeItemId === null
          ? remaining.length
          : remaining.findIndex((item) => item.id === action.beforeItemId);
      const index = requestedIndex < 0 ? remaining.length : requestedIndex;
      remaining.splice(index, 0, { ...moving, updatedAt: action.now });
      return bump(state, { ...state, queue: remaining });
    }
    case "promote-steer": {
      const item = state.queue.find(
        (candidate) => candidate.id === action.itemId && candidate.status === "queued",
      );
      if (!item) return state;
      return bump(state, {
        ...state,
        executionStatus: state.activeTurnId === null ? "queued" : "interrupting",
        queue: [
          { ...item, mode: "steer", status: "steering", updatedAt: action.now },
          ...state.queue.filter((candidate) => candidate.id !== action.itemId),
        ],
      });
    }
    case "claim-next": {
      if (
        state.activeTurnId !== null ||
        state.executionStatus === "pausing" ||
        state.executionStatus === "paused" ||
        state.executionStatus === "resuming" ||
        state.executionStatus === "stopping"
      ) {
        return state;
      }
      const index = state.queue.findIndex(
        (item) => item.status === "queued" || item.status === "steering",
      );
      if (index < 0) return state;
      const item = state.queue[index]!;
      const nextQueue = [...state.queue];
      nextQueue[index] = {
        ...item,
        status: "claimed",
        claimedTurnId: action.turnId,
        attempt: item.attempt + 1,
        updatedAt: action.now,
      };
      return bump(state, {
        ...state,
        executionStatus: "running",
        activeTurnId: action.turnId,
        queue: nextQueue,
      });
    }
    case "pause-requested":
      if (state.activeTurnId !== action.turnId || state.executionStatus !== "running") {
        return state;
      }
      return bump(state, { ...state, executionStatus: "pausing" });
    case "pause-confirmed":
      if (state.activeTurnId !== action.turnId || state.executionStatus !== "pausing") {
        return state;
      }
      return bump(state, { ...state, executionStatus: "paused" });
    case "continue-requested":
      if (state.activeTurnId !== action.turnId || state.executionStatus !== "paused") {
        return state;
      }
      return bump(state, { ...state, executionStatus: "resuming" });
    case "continue-confirmed":
      if (state.activeTurnId !== action.turnId || state.executionStatus !== "resuming") {
        return state;
      }
      return bump(state, { ...state, executionStatus: "running" });
    case "stop-requested":
      if (
        state.activeTurnId !== action.turnId ||
        !["running", "pausing", "paused", "resuming", "interrupting"].includes(
          state.executionStatus,
        )
      ) {
        return state;
      }
      return bump(state, { ...state, executionStatus: "stopping" });
    case "abandon":
      if (state.activeTurnId !== action.turnId || state.executionStatus !== "stopping") {
        return state;
      }
      return bump(state, {
        ...state,
        executionStatus: "abandoned",
        activeTurnId: null,
      });
    case "settle": {
      const settled = state.queue.find(
        (item) => item.id === action.itemId && item.status === "claimed",
      );
      if (!settled) return state;
      const activeTurnSettled = settled.claimedTurnId === state.activeTurnId;
      const hasQueuedNext = state.queue.some(
        (item) =>
          item.id !== action.itemId && (item.status === "queued" || item.status === "steering"),
      );
      return bump(state, {
        ...state,
        executionStatus: activeTurnSettled
          ? action.status === "failed"
            ? "failed"
            : hasQueuedNext
              ? "queued"
              : "idle"
          : state.executionStatus,
        activeTurnId: activeTurnSettled ? null : state.activeTurnId,
        queue: state.queue.map((item) =>
          item.id === action.itemId && item.status === "claimed"
            ? { ...item, status: action.status, error: action.error ?? null, updatedAt: action.now }
            : item,
        ),
      });
    }
    case "restore-queued": {
      const item = state.queue.find(
        (candidate) =>
          candidate.id === action.itemId &&
          (candidate.status === "failed" || candidate.status === "steering"),
      );
      if (!item) return state;
      return bump(state, {
        ...state,
        executionStatus: state.executionStatus === "failed" ? "queued" : state.executionStatus,
        queue: state.queue.map((candidate) =>
          candidate.id === action.itemId
            ? {
                ...candidate,
                status: "queued",
                mode: "queue",
                claimedTurnId: null,
                error: null,
                updatedAt: action.now,
              }
            : candidate,
        ),
      });
    }
    case "set-execution":
      return bump(state, {
        ...state,
        executionStatus: action.status,
        activeTurnId: action.activeTurnId,
      });
    case "record-interruption":
      return bump(state, {
        ...state,
        interruptedTasks: [...state.interruptedTasks, action.context],
      });
  }
}

export function nextPromptQueueItem(state: PromptQueueThreadState): PromptQueueItem | null {
  return state.queue.find((item) => item.status === "queued" || item.status === "steering") ?? null;
}

export function hasPendingPromptQueueItems(state: PromptQueueThreadState): boolean {
  return state.queue.some(
    (item) => item.status === "queued" || item.status === "steering" || item.status === "claimed",
  );
}

let promptQueueFallbackSequence = 0;

export function createPromptQueueItem(
  threadId: ThreadId,
  text: string,
  now = new Date().toISOString(),
): PromptQueueItem {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `queue-${Date.now()}-${promptQueueFallbackSequence++}`,
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
