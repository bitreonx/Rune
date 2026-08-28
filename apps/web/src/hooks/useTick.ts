import { useSyncExternalStore } from "react";

type TickStore = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => number;
};

const stores = new Map<number, TickStore>();

function getTickStore(intervalMs: number): TickStore {
  const existing = stores.get(intervalMs);
  if (existing) return existing;

  let snapshot = Date.now();
  const listeners = new Set<() => void>();
  let timer: number | null = null;

  const stop = () => {
    if (timer === null || listeners.size > 0) return;
    window.clearInterval(timer);
    timer = null;
  };
  const start = () => {
    if (timer !== null || typeof window === "undefined") return;
    timer = window.setInterval(() => {
      snapshot = Date.now();
      for (const listener of listeners) listener();
    }, intervalMs);
  };

  const store: TickStore = {
    subscribe: (listener) => {
      listeners.add(listener);
      start();
      return () => {
        listeners.delete(listener);
        stop();
      };
    },
    getSnapshot: () => snapshot,
  };
  stores.set(intervalMs, store);
  return store;
}

export function useTick(intervalMs = 1_000): number {
  const store = getTickStore(intervalMs);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
