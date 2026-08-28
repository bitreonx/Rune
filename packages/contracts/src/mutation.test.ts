import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  ChatMutationBranch,
  ChatMutationOperation,
  ChatMutationOwnership,
  canSettleChatMutation,
} from "./mutation.ts";

describe("chat mutation contracts", () => {
  it("decodes provider-neutral operation, ownership, and branch records", () => {
    const operation = Schema.decodeUnknownSync(ChatMutationOperation)({
      operationId: "op-1",
      chatId: "chat-1",
      threadId: "thread-1",
      turnId: "turn-1",
      branchId: "branch-1",
      paths: ["src/app.ts"],
      patchHash: "sha256:abc",
      actor: "agent:codex",
      status: "pending",
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      settledAt: null,
    });
    expect(operation.operationId).toBe("op-1");

    expect(
      Schema.decodeUnknownSync(ChatMutationOwnership)({
        operationId: "op-1",
        chatId: "chat-1",
        threadId: "thread-1",
        turnId: "turn-1",
        branchId: "branch-1",
        paths: ["src/app.ts"],
        actor: "agent:codex",
        ownedAt: "2026-08-28T00:00:00.000Z",
      }).paths,
    ).toEqual(["src/app.ts"]);
    expect(
      Schema.decodeUnknownSync(ChatMutationBranch)({
        branchId: "branch-1",
        chatId: "chat-1",
        threadId: "thread-1",
        status: "active",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      }).status,
    ).toBe("active");
  });

  it("only permits pending operations to settle and keeps terminal states idempotent", () => {
    expect(canSettleChatMutation("pending", "settled")).toBe(true);
    expect(canSettleChatMutation("settled", "settled")).toBe(true);
    expect(canSettleChatMutation("settled", "failed")).toBe(false);
  });
});
