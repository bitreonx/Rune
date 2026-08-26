import {
  CommandId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationReadModel,
} from "@rune/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { decideOrchestrationCommand } from "./decider.ts";

const NOW = "2026-01-01T00:00:00.000Z";
const TEMPORARY_AT = "1969-12-30T00:00:00.000Z";

function makeReadModel(input: {
  readonly temporaryAt?: string | null;
}): OrchestrationReadModel {
  return {
    snapshotSequence: 0,
    projects: [
      {
        id: ProjectId.make("project-1"),
        title: "Project",
        workspaceRoot: "/tmp/workspace",
        defaultModelSelection: null,
        scripts: [],
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
      },
    ],
    threads: [
      {
        id: ThreadId.make("thread-1"),
        projectId: ProjectId.make("project-1"),
        title: "Thread",
        modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.4" },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        latestTurn: null,
        createdAt: NOW,
        updatedAt: NOW,
        archivedAt: null,
        settledOverride: null,
        settledAt: null,
        snoozedUntil: null,
        snoozedAt: null,
        pinnedAt: null,
        pinOrderKey: null,
        temporaryAt: input.temporaryAt ?? null,
        deletedAt: null,
        messages: [],
        proposedPlans: [],
        activities: [],
        checkpoints: [],
        session: null,
      },
    ],
    updatedAt: NOW,
  };
}

it.layer(NodeServices.layer)("temporary thread decider", (it) => {
  it.effect("flags a thread temporary, stamping temporaryAt and updatedAt together", () =>
    Effect.gen(function* () {
      const event = yield* decideOrchestrationCommand({
        command: {
          type: "thread.temporary.set",
          commandId: CommandId.make("cmd-temporary-flag"),
          threadId: ThreadId.make("thread-1"),
          temporary: true,
        },
        readModel: makeReadModel({}),
      });
      const events = Array.isArray(event) ? event : [event];
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("thread.temporary-set");
      if (events[0]?.type === "thread.temporary-set") {
        expect(events[0].payload.temporaryAt).toBe(events[0].payload.updatedAt);
        expect(events[0].payload.updatedAt).not.toBe(NOW);
      }
    }),
  );

  it.effect("re-flagging a temporary thread preserves its original temporaryAt", () =>
    Effect.gen(function* () {
      const event = yield* decideOrchestrationCommand({
        command: {
          type: "thread.temporary.set",
          commandId: CommandId.make("cmd-temporary-again"),
          threadId: ThreadId.make("thread-1"),
          temporary: true,
        },
        readModel: makeReadModel({ temporaryAt: TEMPORARY_AT }),
      });
      const events = Array.isArray(event) ? event : [event];
      if (events[0]?.type === "thread.temporary-set") {
        expect(events[0].payload.temporaryAt).toBe(TEMPORARY_AT);
        expect(events[0].payload.updatedAt).toBe(NOW);
      }
    }),
  );

  it.effect("keep clears temporaryAt", () =>
    Effect.gen(function* () {
      const event = yield* decideOrchestrationCommand({
        command: {
          type: "thread.temporary.set",
          commandId: CommandId.make("cmd-temporary-keep"),
          threadId: ThreadId.make("thread-1"),
          temporary: false,
        },
        readModel: makeReadModel({ temporaryAt: TEMPORARY_AT }),
      });
      const events = Array.isArray(event) ? event : [event];
      expect(events[0]?.type).toBe("thread.temporary-set");
      if (events[0]?.type === "thread.temporary-set") {
        expect(events[0].payload.temporaryAt).toBeNull();
        expect(events[0].payload.updatedAt).not.toBe(NOW);
      }
    }),
  );

  it.effect("keeping a permanent thread preserves updatedAt", () =>
    Effect.gen(function* () {
      const event = yield* decideOrchestrationCommand({
        command: {
          type: "thread.temporary.set",
          commandId: CommandId.make("cmd-temporary-keep-noop"),
          threadId: ThreadId.make("thread-1"),
          temporary: false,
        },
        readModel: makeReadModel({}),
      });
      const events = Array.isArray(event) ? event : [event];
      expect(events[0]?.type).toBe("thread.temporary-set");
      if (events[0]?.type === "thread.temporary-set") {
        expect(events[0].payload.temporaryAt).toBeNull();
        expect(events[0].payload.updatedAt).toBe(NOW);
      }
    }),
  );

  it.effect("a bootstrap thread.create carries the temporary flag into thread.created", () =>
    Effect.gen(function* () {
      const event = yield* decideOrchestrationCommand({
        command: {
          type: "thread.create",
          commandId: CommandId.make("cmd-create-temp"),
          threadId: ThreadId.make("thread-2"),
          projectId: ProjectId.make("project-1"),
          title: "Temp chat",
          modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.4" },
          runtimeMode: "full-access",
          interactionMode: "default",
          branch: null,
          worktreePath: null,
          temporary: true,
          createdAt: NOW,
        },
        readModel: makeReadModel({}),
      });
      const events = Array.isArray(event) ? event : [event];
      expect(events[0]?.type).toBe("thread.created");
      if (events[0]?.type === "thread.created") {
        expect(events[0].payload.temporary).toBe(true);
      }
    }),
  );

  it.effect("a plain thread.create omits the temporary flag", () =>
    Effect.gen(function* () {
      const event = yield* decideOrchestrationCommand({
        command: {
          type: "thread.create",
          commandId: CommandId.make("cmd-create-plain"),
          threadId: ThreadId.make("thread-3"),
          projectId: ProjectId.make("project-1"),
          title: "Normal chat",
          modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.4" },
          runtimeMode: "full-access",
          interactionMode: "default",
          branch: null,
          worktreePath: null,
          createdAt: NOW,
        },
        readModel: makeReadModel({}),
      });
      const events = Array.isArray(event) ? event : [event];
      if (events[0]?.type === "thread.created") {
        expect(events[0].payload.temporary).toBeUndefined();
      }
    }),
  );
});
