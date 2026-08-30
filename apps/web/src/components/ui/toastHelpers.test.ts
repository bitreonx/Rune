import { assert, describe, it } from "vite-plus/test";

import { hiddenToastActionProps, stackedThreadToast } from "./toastHelpers";

describe("hiddenToastActionProps", () => {
  it("is a defined update payload so Base UI can replace a previous action", () => {
    assert.equal(hiddenToastActionProps.children, null);
    assert.equal(
      "actionProps" in stackedThreadToast({ type: "loading", title: "Updating" }),
      false,
    );
    assert.deepEqual(
      stackedThreadToast({
        type: "loading",
        title: "Updating",
        actionProps: hiddenToastActionProps,
      }).actionProps,
      hiddenToastActionProps,
    );
  });
});

describe("stackedThreadToast semantics", () => {
  it("forwards the notification lane and thread scope into toast data", () => {
    const threadRef = { environmentId: "env", threadId: "thread" } as never;
    const toast = stackedThreadToast({
      type: "info",
      title: "Child finished",
      notificationKind: "agent-child",
      threadRef,
    });

    assert.deepEqual(toast.data, {
      actionLayout: "stacked-end",
      notificationKind: "agent-child",
      threadRef,
    });
  });
});
