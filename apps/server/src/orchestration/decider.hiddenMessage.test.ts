import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
} from "@rune/contracts";
import { createModelSelection } from "@rune/shared/model";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as NodeServices from "@effect/platform-node/NodeServices";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const asEventId = (value: string): EventId => EventId.make(value);
const asProjectId = (value: string): ProjectId => ProjectId.make(value);
const asMessageId = (value: string): MessageId => MessageId.make(value);
const seedModelSelection = () =>
  createModelSelection(ProviderInstanceId.make("codex"), "gpt-5-codex", []);

it.layer(NodeServices.layer)("decider hidden messages", (it) => {
  it.effect("propagates hidden flag from turn start into message-sent payload", () =>
    Effect.gen(function* () {
      const now = "2026-01-01T00:00:00.000Z";
      const initial = createEmptyReadModel(now);
      const withProject = yield* projectEvent(initial, {
        sequence: 1,
        eventId: asEventId("evt-project-create-hidden"),
        aggregateKind: "project",
        aggregateId: asProjectId("project-1"),
        type: "project.created",
        occurredAt: now,
        commandId: CommandId.make("cmd-project-create"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-project-create"),
        metadata: {},
        payload: {
          projectId: asProjectId("project-1"),
          title: "Project",
          workspaceRoot: "/tmp/project",
          defaultModelSelection: null,
          scripts: [],
          createdAt: now,
          updatedAt: now,
        },
      });
      const readModel = yield* projectEvent(withProject, {
        sequence: 2,
        eventId: asEventId("evt-thread-create-hidden"),
        aggregateKind: "thread",
        aggregateId: ThreadId.make("thread-1"),
        type: "thread.created",
        occurredAt: now,
        commandId: CommandId.make("cmd-thread-create"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-thread-create"),
        metadata: {},
        payload: {
          threadId: ThreadId.make("thread-1"),
          projectId: asProjectId("project-1"),
          title: "Thread",
          modelSelection: seedModelSelection(),
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "approval-required",
          branch: null,
          worktreePath: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      const result = yield* decideOrchestrationCommand({
        command: {
          type: "thread.turn.start",
          commandId: CommandId.make("cmd-turn-start-hidden"),
          threadId: ThreadId.make("thread-1"),
          message: {
            messageId: asMessageId("message-user-hidden"),
            role: "user",
            text: "Continue.",
            attachments: [],
            hidden: true,
          },
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          createdAt: now,
        },
        readModel,
      });

      const events = Array.isArray(result) ? result : [result];
      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("thread.message-sent");
      if (events[0]?.type !== "thread.message-sent") {
        return;
      }
      expect(events[0].payload).toMatchObject({
        messageId: asMessageId("message-user-hidden"),
        role: "user",
        hidden: true,
      });
    }),
  );

  it.effect("omits hidden flag for regular visible messages", () =>
    Effect.gen(function* () {
      const now = "2026-01-01T00:00:00.000Z";
      const initial = createEmptyReadModel(now);
      const withProject = yield* projectEvent(initial, {
        sequence: 1,
        eventId: asEventId("evt-project-create-visible"),
        aggregateKind: "project",
        aggregateId: asProjectId("project-1"),
        type: "project.created",
        occurredAt: now,
        commandId: CommandId.make("cmd-project-create"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-project-create"),
        metadata: {},
        payload: {
          projectId: asProjectId("project-1"),
          title: "Project",
          workspaceRoot: "/tmp/project",
          defaultModelSelection: null,
          scripts: [],
          createdAt: now,
          updatedAt: now,
        },
      });
      const readModel = yield* projectEvent(withProject, {
        sequence: 2,
        eventId: asEventId("evt-thread-create-visible"),
        aggregateKind: "thread",
        aggregateId: ThreadId.make("thread-1"),
        type: "thread.created",
        occurredAt: now,
        commandId: CommandId.make("cmd-thread-create"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-thread-create"),
        metadata: {},
        payload: {
          threadId: ThreadId.make("thread-1"),
          projectId: asProjectId("project-1"),
          title: "Thread",
          modelSelection: seedModelSelection(),
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "approval-required",
          branch: null,
          worktreePath: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      const result = yield* decideOrchestrationCommand({
        command: {
          type: "thread.turn.start",
          commandId: CommandId.make("cmd-turn-start-visible"),
          threadId: ThreadId.make("thread-1"),
          message: {
            messageId: asMessageId("message-user-visible"),
            role: "user",
            text: "hello",
            attachments: [],
          },
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          createdAt: now,
        },
        readModel,
      });

      const events = Array.isArray(result) ? result : [result];
      const messageSent = events.find((event) => event.type === "thread.message-sent");
      if (messageSent?.type !== "thread.message-sent") {
        throw new Error("expected thread.message-sent event");
      }
      expect(messageSent.payload).not.toHaveProperty("hidden");
    }),
  );
});
