import { describe, expect, it } from "vite-plus/test";

import {
  isHistoricalMutationChoice,
  isHistoricalMutationChoiceSupported,
  resolveHistoricalMutationPolicy,
  shouldRequestHistoricalMutationChoice,
} from "./historicalMutationPolicy.ts";

const editContext = {
  operation: "edit" as const,
  hasDescendantMessages: false,
  hasOwnedFileChanges: false,
  hasQueuedPrompts: false,
  hasActiveDescendant: false,
};

describe("historical mutation policy", () => {
  it("reruns a no-impact edit without opening a destructive choice", () => {
    const resolution = resolveHistoricalMutationPolicy(editContext);

    expect(resolution.choice).toBe("keep-files-rerun");
    expect(resolution.source).toBe("safe-default");
    expect(resolution.requiresExplicitChoice).toBe(false);
    expect(resolution.reason).toBe("no-explicit-choice");
  });

  it("fails closed when an edit has descendants or owned state", () => {
    const context = {
      ...editContext,
      hasDescendantMessages: true,
      hasOwnedFileChanges: true,
      hasQueuedPrompts: true,
      hasActiveDescendant: true,
    };
    const resolution = resolveHistoricalMutationPolicy(context);

    expect(shouldRequestHistoricalMutationChoice(context)).toBe(true);
    expect(resolution.choice).toBe("cancel");
    expect(resolution.source).toBe("safe-default");
    expect(resolution.reason).toBe("impact-requires-explicit-choice");
    expect(resolution.requiresExplicitChoice).toBe(true);
  });

  it("describes rewind effects, including active settlement and queued review", () => {
    const resolution = resolveHistoricalMutationPolicy({
      ...editContext,
      hasQueuedPrompts: true,
      hasActiveDescendant: true,
      explicitChoice: "rewind-and-restore",
    });

    expect(resolution.conversation).toBe("rewind-before-target");
    expect(resolution.workspace).toBe("restore-thread-owned");
    expect(resolution.prompt).toBe("rerun-edited");
    expect(resolution.queuedPrompts).toBe("preserve-and-mark-needs-review");
    expect(resolution.requiresActiveExecutionSettlement).toBe(true);
  });

  it("allows edit-only send-as-new and preserves current state", () => {
    const resolution = resolveHistoricalMutationPolicy({
      ...editContext,
      hasDescendantMessages: true,
      explicitChoice: "keep-and-send-new",
    });

    expect(resolution.source).toBe("explicit");
    expect(resolution.conversation).toBe("retain-current");
    expect(resolution.workspace).toBe("retain-current");
    expect(resolution.prompt).toBe("send-edited-as-new");
    expect(resolution.requiresActiveExecutionSettlement).toBe(false);
  });

  it("rejects unsupported delete choices and unknown persisted values", () => {
    expect(isHistoricalMutationChoiceSupported("delete", "keep-files-rerun")).toBe(false);
    expect(isHistoricalMutationChoiceSupported("delete", "keep-and-send-new")).toBe(false);
    expect(isHistoricalMutationChoice("keep-files-rerun")).toBe(true);
    expect(isHistoricalMutationChoice("delete-and-discard")).toBe(false);

    const resolution = resolveHistoricalMutationPolicy({
      operation: "delete",
      hasDescendantMessages: true,
      hasOwnedFileChanges: true,
      hasQueuedPrompts: false,
      hasActiveDescendant: true,
      explicitChoice: "keep-files-rerun",
    });

    expect(resolution.choice).toBe("cancel");
    expect(resolution.source).toBe("invalid-explicit");
    expect(resolution.reason).toBe("choice-not-supported-for-operation");
  });
});
