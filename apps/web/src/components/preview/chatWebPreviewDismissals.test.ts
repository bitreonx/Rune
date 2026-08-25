import { beforeEach, describe, expect, it } from "vite-plus/test";

import { useChatWebPreviewDismissalStore } from "./chatWebPreviewDismissals";

const resetStore = () =>
  useChatWebPreviewDismissalStore.setState({ byThread: new Map() }, false);

describe("useChatWebPreviewDismissalStore", () => {
  beforeEach(resetStore);

  it("records a dismissal for the dismissing thread only", () => {
    useChatWebPreviewDismissalStore.getState().dismiss("thread-a", "localhost:5173", "sig-1");

    const byThread = useChatWebPreviewDismissalStore.getState().byThread;
    expect(byThread.get("thread-a")?.get("localhost:5173")).toBe("sig-1");
    expect(byThread.has("thread-b")).toBe(false);
  });

  it("keeps each thread's dismissals independent", () => {
    const { dismiss } = useChatWebPreviewDismissalStore.getState();
    dismiss("thread-a", "localhost:5173", "sig-1");
    dismiss("thread-b", "localhost:3000", "sig-2");

    const byThread = useChatWebPreviewDismissalStore.getState().byThread;
    expect(byThread.get("thread-a")?.has("localhost:3000")).toBe(false);
    expect(byThread.get("thread-b")?.has("localhost:5173")).toBe(false);
  });

  it("overwrites a prior dismissal of the same server", () => {
    const { dismiss } = useChatWebPreviewDismissalStore.getState();
    dismiss("thread-a", "localhost:5173", "sig-1");
    dismiss("thread-a", "localhost:5173", "sig-2");

    expect(useChatWebPreviewDismissalStore.getState().byThread.get("thread-a")?.size).toBe(1);
    expect(
      useChatWebPreviewDismissalStore.getState().byThread.get("thread-a")?.get("localhost:5173"),
    ).toBe("sig-2");
  });
});
