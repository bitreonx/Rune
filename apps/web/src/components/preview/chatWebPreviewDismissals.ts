import { create } from "zustand";

/** Server key -> live-set signature captured when the card was dismissed. */
type ThreadDismissals = ReadonlyMap<string, string>;

interface ChatWebPreviewDismissalState {
  readonly byThread: ReadonlyMap<string, ThreadDismissals>;
  dismiss: (threadKey: string, serverKey: string, signature: string) => void;
}

/**
 * In-memory only: dismissing hides the card until this thread's live server
 * set changes, after which the stale signature stops matching and the card
 * returns. Nothing survives a reload, which is the right lifetime for a
 * "seen it" acknowledgement.
 */
export const useChatWebPreviewDismissalStore = create<ChatWebPreviewDismissalState>()((set) => ({
  byThread: new Map(),
  dismiss: (threadKey, serverKey, signature) =>
    set((state) => {
      const nextDismissals = new Map(state.byThread.get(threadKey));
      nextDismissals.set(serverKey, signature);
      const byThread = new Map(state.byThread);
      byThread.set(threadKey, nextDismissals);
      return { byThread };
    }),
}));
