import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";

import {
  CommandId,
  EventId,
  ProviderDriverKind,
  ProviderInstanceId,
  type OrchestrationCommand,
  type OrchestrationProjectShell,
  type OrchestrationThreadShell,
  type ProviderRuntimeEvent,
  type RuneSchedule,
  type ScheduleRun,
} from "@rune/contracts";

import { makeScheduleExecutionBridge } from "./ScheduleExecutionBridge.ts";
import type { OrchestrationEngineShape } from "../orchestration/Services/OrchestrationEngine.ts";
import type { ProjectionSnapshotQueryShape } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import type { ProviderServiceShape } from "../provider/Services/ProviderService.ts";
import type { ProviderRegistryShape } from "../provider/Services/ProviderRegistry.ts";

const threadId = "thread:schedule-target" as OrchestrationThreadShell["id"];
const projectId = "project:schedule-target" as OrchestrationProjectShell["id"];
const primaryInstanceId = ProviderInstanceId.make("codex-primary");
const alternateInstanceId = ProviderInstanceId.make("codex-alternate");

const project = {
  id: projectId,
  title: "Scheduled project",
  workspaceRoot: "C:/work/scheduled",
  defaultModelSelection: null,
  scripts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as OrchestrationProjectShell;

const thread = {
  id: threadId,
  projectId,
  title: "Scheduled thread",
  modelSelection: { instanceId: primaryInstanceId, model: "gpt-schedule" },
  runtimeMode: "full-access",
  interactionMode: "default",
  branch: null,
  worktreePath: null,
  latestTurn: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
  settledOverride: null,
  snoozedUntil: null,
} as OrchestrationThreadShell;

const schedule = (policy: RuneSchedule["policy"], target: RuneSchedule["target"]): RuneSchedule =>
  ({
    id: "schedule:nightly",
    name: "Nightly run",
    environmentId: "environment:test",
    projectId,
    trigger: { type: "once", runAt: "2026-01-01T00:00:00.000Z" },
    target,
    policy,
    displayTimeZone: "UTC",
    status: "active",
    version: 1,
    claimedRunCount: 0,
    nextRunAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "user",
  }) as RuneSchedule;

const run = {
  id: "schedule-run:nightly:1",
  scheduleId: "schedule:nightly",
  trigger: "scheduled",
  scheduledFor: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:01.000Z",
  status: "dispatching",
  threadId,
} as ScheduleRun;

const providerSnapshot = (instanceId: ProviderInstanceId) =>
  ({
    instanceId,
    driver: ProviderDriverKind.make("codex"),
    displayName: String(instanceId),
    enabled: true,
    installed: true,
    version: "1.0.0",
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-01-01T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
  }) as const;

const runtimeEvent = (input: {
  readonly eventId: string;
  readonly type: ProviderRuntimeEvent["type"];
  readonly providerInstanceId: ProviderInstanceId;
  readonly turnId?: string;
  readonly payload: unknown;
}) =>
  ({
    eventId: EventId.make(input.eventId),
    orchestrationCommandId: CommandId.make("schedule:schedule-run:nightly:1:command"),
    provider: ProviderDriverKind.make("codex"),
    providerInstanceId: input.providerInstanceId,
    threadId,
    createdAt: "2026-01-01T00:00:02.000Z",
    ...(input.turnId === undefined ? {} : { turnId: input.turnId }),
    type: input.type,
    payload: input.payload,
  }) as ProviderRuntimeEvent;

const makeHarness = (input: {
  readonly providers: ReadonlyArray<ReturnType<typeof providerSnapshot>>;
  readonly events: ReadonlyArray<ProviderRuntimeEvent>;
}) =>
  Effect.gen(function* () {
    const eventQueue = yield* Queue.unbounded<ProviderRuntimeEvent>();
    const dispatched: Array<OrchestrationCommand> = [];
    const orchestrationEngine: OrchestrationEngineShape = {
      readEvents: () => Stream.empty,
      dispatch: (command) =>
        Effect.gen(function* () {
          dispatched.push(command);
          for (const event of input.events) {
            yield* Queue.offer(eventQueue, event);
          }
          return { sequence: 1 };
        }),
      streamDomainEvents: Stream.empty,
      latestSequence: Effect.succeed(1),
    };
    const projectionSnapshotQuery = {
      getThreadShellById: () => Effect.succeed(Option.some(thread)),
      getProjectShellById: () => Effect.succeed(Option.some(project)),
    } as ProjectionSnapshotQueryShape;
    const providerService = {
      streamEvents: Stream.empty,
      subscribeEvents: Effect.succeed(Stream.fromQueue(eventQueue)),
      interruptTurn: () => Effect.void,
    } as ProviderServiceShape;
    const providerRegistry = {
      getProviders: Effect.succeed(input.providers),
    } as ProviderRegistryShape;

    return {
      bridge: makeScheduleExecutionBridge({
        orchestrationEngine,
        projectionSnapshotQuery,
        providerService,
        providerRegistry,
      }),
      dispatched,
    };
  });

const promptTarget = {
  type: "prompt" as const,
  threadId,
  prompt: "Run the scheduled review",
};

it.effect("dispatches a stable normal turn and settles from the matching provider receipt", () =>
  Effect.gen(function* () {
    const { bridge, dispatched } = yield* makeHarness({
      providers: [providerSnapshot(primaryInstanceId)],
      events: [
        runtimeEvent({
          eventId: "provider-receipt:started",
          type: "turn.started",
          providerInstanceId: primaryInstanceId,
          turnId: "turn:scheduled",
          payload: {
            model: "gpt-schedule",
            route: {
              harness: "codex",
              instanceId: primaryInstanceId,
              model: "gpt-schedule",
            },
          },
        }),
        runtimeEvent({
          eventId: "provider-receipt:completed",
          type: "turn.completed",
          providerInstanceId: primaryInstanceId,
          turnId: "turn:scheduled",
          payload: { state: "completed" },
        }),
      ],
    });

    const result = yield* bridge.execute({
      schedule: schedule(
        {
          approvalPolicy: "inherit",
          allowProviderFallback: false,
          catchUp: "skip",
        },
        promptTarget,
      ),
      run,
    });

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toMatchObject({
      type: "thread.turn.start",
      commandId: "schedule:schedule-run:nightly:1:command",
      threadId,
      message: {
        messageId: "schedule:schedule-run:nightly:1:message",
        role: "user",
        text: "Run the scheduled review",
        attachments: [],
      },
      modelSelection: { instanceId: primaryInstanceId, model: "gpt-schedule" },
    });
    expect(result).toEqual({
      status: "succeeded",
      summary: "Scheduled prompt completed",
      providerInstanceId: primaryInstanceId,
      threadId,
      orchestrationCommandId: "schedule:schedule-run:nightly:1:command",
      providerReceiptId: "provider-receipt:completed",
    });
  }),
);

it.effect("maps schedule approval policy to the dispatched runtime mode", () =>
  Effect.gen(function* () {
    for (const [approvalPolicy, runtimeMode] of [
      ["never", "full-access"],
      ["always", "approval-required"],
    ] as const) {
      const { bridge, dispatched } = yield* makeHarness({
        providers: [providerSnapshot(primaryInstanceId)],
        events: [
          runtimeEvent({
            eventId: `provider-receipt:${approvalPolicy}-started`,
            type: "turn.started",
            providerInstanceId: primaryInstanceId,
            turnId: `turn:${approvalPolicy}`,
            payload: { model: "gpt-schedule" },
          }),
          runtimeEvent({
            eventId: `provider-receipt:${approvalPolicy}-completed`,
            type: "turn.completed",
            providerInstanceId: primaryInstanceId,
            turnId: `turn:${approvalPolicy}`,
            payload: { state: "completed" },
          }),
        ],
      });

      yield* bridge.execute({
        schedule: schedule(
          {
            approvalPolicy,
            allowProviderFallback: false,
            catchUp: "skip",
          },
          promptTarget,
        ),
        run,
      });

      expect(dispatched[0]?.runtimeMode).toBe(runtimeMode);
    }
  }),
);

it.effect("uses exactly one configured alternate only when fallback is enabled", () =>
  Effect.gen(function* () {
    const { bridge, dispatched } = yield* makeHarness({
      providers: [
        { ...providerSnapshot(primaryInstanceId), status: "error" },
        providerSnapshot(alternateInstanceId),
      ],
      events: [
        runtimeEvent({
          eventId: "provider-receipt:alternate-started",
          type: "turn.started",
          providerInstanceId: alternateInstanceId,
          turnId: "turn:alternate",
          payload: { model: "gpt-schedule" },
        }),
        runtimeEvent({
          eventId: "provider-receipt:alternate-completed",
          type: "turn.completed",
          providerInstanceId: alternateInstanceId,
          turnId: "turn:alternate",
          payload: { state: "completed" },
        }),
      ],
    });

    const result = yield* bridge.execute({
      schedule: schedule(
        {
          approvalPolicy: "inherit",
          allowProviderFallback: true,
          catchUp: "skip",
          providerInstanceId: primaryInstanceId,
        },
        promptTarget,
      ),
      run,
    });

    expect(dispatched[0]).toMatchObject({
      modelSelection: { instanceId: alternateInstanceId, model: "gpt-schedule" },
    });
    expect(result).toMatchObject({
      status: "succeeded",
      providerInstanceId: alternateInstanceId,
      providerReceiptId: "provider-receipt:alternate-completed",
    });
  }),
);

it.effect("blocks action targets without dispatching or exposing action parameters", () =>
  Effect.gen(function* () {
    const secret = "do-not-return-this";
    const { bridge, dispatched } = yield* makeHarness({
      providers: [providerSnapshot(primaryInstanceId)],
      events: [],
    });

    const result = yield* bridge.execute({
      schedule: schedule(
        {
          approvalPolicy: "inherit",
          allowProviderFallback: false,
          catchUp: "skip",
        },
        {
          type: "action",
          threadId,
          projectId,
          actionId: "action:unsupported",
          parameters: { secret },
        },
      ),
      run,
    });

    expect(dispatched).toHaveLength(0);
    expect(result).toEqual({
      status: "blocked",
      reason: "Scheduled action targets are not supported yet.",
      threadId,
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  }),
);

it.effect("blocks when the provider asks for interaction after the scheduled turn starts", () =>
  Effect.gen(function* () {
    const { bridge } = yield* makeHarness({
      providers: [providerSnapshot(primaryInstanceId)],
      events: [
        runtimeEvent({
          eventId: "provider-receipt:started-for-request",
          type: "turn.started",
          providerInstanceId: primaryInstanceId,
          turnId: "turn:request",
          payload: { model: "gpt-schedule" },
        }),
        runtimeEvent({
          eventId: "provider-receipt:request",
          type: "request.opened",
          providerInstanceId: primaryInstanceId,
          turnId: "turn:request",
          payload: { requestType: "command_execution_approval" },
        }),
      ],
    });

    const result = yield* bridge.execute({
      schedule: schedule(
        {
          approvalPolicy: "inherit",
          allowProviderFallback: false,
          catchUp: "skip",
        },
        promptTarget,
      ),
      run,
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "Scheduled turn requires interactive input.",
      threadId,
    });
  }),
);
