import { it } from "@effect/vitest";
import { CommandId, MessageId, ThreadId, TurnId } from "@rune/contracts/baseSchemas";
import { PromptQueueClaimId, PromptQueueItemId } from "@rune/contracts/promptQueue";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { expect } from "vite-plus/test";

import { SqlitePersistenceMemory } from "../persistence/Layers/Sqlite.ts";
import * as PromptQueueServiceModule from "./PromptQueueService.ts";

const serviceLayer = PromptQueueServiceModule.PromptQueueServiceLive.pipe(
  Layer.provideMerge(SqlitePersistenceMemory),
);

it.layer(serviceLayer)("PromptQueueService", (it) => {
  it.effect("persists stable queue transitions and makes duplicate enqueue idempotent", () =>
    Effect.gen(function* () {
      const service = yield* PromptQueueServiceModule.PromptQueueService;
      const threadId = ThreadId.make("thread-service");
      const itemId = PromptQueueItemId.make("item-stable");
      const enqueue = {
        type: "prompt.enqueue" as const,
        commandId: CommandId.make("command-enqueue"),
        threadId,
        itemId,
        prompt: "run the focused test",
      };

      const first = yield* service.dispatch(enqueue);
      const duplicate = yield* service.dispatch(enqueue);
      expect(duplicate.revision).toBe(first.revision);
      expect(duplicate.items).toHaveLength(1);
      expect(duplicate.items[0]?.id).toBe(itemId);

      const claimed = yield* service.dispatch({
        type: "prompt.claim" as const,
        commandId: CommandId.make("command-claim"),
        threadId,
      });
      expect(claimed.items[0]?.status).toBe("claimed");
      const claimId = claimed.items[0]?.claimId;
      expect(claimId).toBeTruthy();

      const materialized = yield* service.dispatch({
        type: "prompt.materialize" as const,
        commandId: CommandId.make("command-materialize"),
        threadId,
        itemId,
        claimId: claimId as PromptQueueClaimId,
        messageId: MessageId.make("message-stable"),
        turnId: TurnId.make("turn-stable"),
      });
      expect(materialized.executionState).toBe("running");

      const settled = yield* service.dispatch({
        type: "prompt.settle" as const,
        commandId: CommandId.make("command-settle"),
        threadId,
        itemId,
        claimId: claimId as PromptQueueClaimId,
        outcome: "completed" as const,
      });
      expect(settled.executionState).toBe("idle");
      expect(settled.items[0]?.status).toBe("settled");

      const reloaded = yield* service.snapshot({ threadId });
      expect(reloaded.revision).toBe(settled.revision);
      expect(reloaded.items[0]?.messageId).toBe("message-stable");
    }),
  );
});
