import {
  EnvironmentId,
  ProjectId,
  ProviderInstanceId,
  ScheduleId,
  ThreadId,
  type RuneSchedule,
  type ScheduleCreateInput,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Layer from "effect/Layer";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { expect, it } from "vite-plus/test";

import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as ProjectionThreadRepository from "../../../persistence/Services/ProjectionThreads.ts";
import * as ScheduleRegistry from "../../../persistence/Services/ScheduleRegistry.ts";
import {
  RuneControlToolkitHandlers,
  RuneControlToolkitHandlersLive,
} from "./handlers.ts";
import { RuneControlToolkit } from "./tools.ts";

const environmentId = EnvironmentId.make("environment-rune-control-test");
const projectId = ProjectId.make("project-rune-control-test");
const threadId = ThreadId.make("thread-rune-control-test");
const invocation: McpInvocationContext.McpInvocationScope = {
  environmentId,
  threadId,
  providerSessionId: "provider-session-rune-control-test",
  providerInstanceId: ProviderInstanceId.make("codex"),
  capabilities: new Set(["schedules-read", "schedules-write"]),
  issuedAt: 1,
};
const client = McpSchema.McpServerClient.of({
  clientId: 1,
  protocolVersion: "2025-06-18",
  initializePayload: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "mcp-test", version: "1.0.0" },
  },
  getClient: Effect.die("unused"),
});

let capturedListScope: unknown;
let capturedListInput: unknown;
const registry: ScheduleRegistry.ScheduleRegistryShape = {
  list: (scope, input) => {
    capturedListScope = scope;
    capturedListInput = input;
    return Effect.succeed({
      schedules: [],
      sequence: 7,
    });
  },
  get: () => Effect.die("unused"),
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  pause: () => Effect.die("unused"),
  resume: () => Effect.die("unused"),
  remove: () => Effect.die("unused"),
  runNow: () => Effect.die("unused"),
  reconcileMissed: () => Effect.die("unused"),
  claimDueRun: () => Effect.die("unused"),
  issueDispatch: () => Effect.die("unused"),
  reclaimExpiredRuns: () => Effect.die("unused"),
  settleRun: () => Effect.die("unused"),
  runs: () => Effect.die("unused"),
  nextDue: () => Effect.die("unused"),
  subscription: () => Effect.die("unused"),
};
const projectedThread = {
  projectId,
  deletedAt: null,
} as ProjectionThreadRepository.ProjectionThread;
const threadRepository: ProjectionThreadRepository.ProjectionThreadRepositoryShape = {
  upsert: () => Effect.die("unused"),
  getById: () =>
    Effect.succeed(Option.some(projectedThread)),
  listByProjectId: () => Effect.die("unused"),
  deleteById: () => Effect.die("unused"),
};

const TestLayer = McpServer.toolkit(RuneControlToolkit).pipe(
  Layer.provide(RuneControlToolkitHandlersLive),
  Layer.provideMerge(McpServer.McpServer.layer),
  Layer.provideService(ScheduleRegistry.ScheduleRegistry, registry),
  Layer.provideService(
    ProjectionThreadRepository.ProjectionThreadRepository,
    threadRepository,
  ),
);

it.effect("builds a thread-scoped environment/project access scope for reads", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const server = yield* McpServer.McpServer;
      const result = yield* server
        .callTool({ name: "rune_schedule_list", arguments: {} })
        .pipe(
          Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
          Effect.provideService(McpSchema.McpServerClient, client),
        );

      expect(result.isError).toBe(false);
      expect(result.structuredContent).toEqual({ schedules: [], sequence: 7 });
      expect(capturedListScope).toEqual({
        environmentId,
        projectIds: [projectId],
        threadIds: [threadId],
      });
      expect(capturedListInput).toEqual({ limit: 100, threadId });
    }),
  ).pipe(Effect.provide(TestLayer)),
);

const schedule = {
  id: ScheduleId.make("schedule:rune-control-test"),
  name: "MCP schedule",
  environmentId,
  projectId,
  trigger: { type: "once", runAt: "2026-01-01T00:00:00.000Z" },
  target: { type: "prompt", threadId, prompt: "secret prompt" },
  policy: { approvalPolicy: "inherit", allowProviderFallback: false, catchUp: "skip" },
  displayTimeZone: "UTC",
  status: "active",
  version: 1,
  claimedRunCount: 0,
  nextRunAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdBy: "agent",
} as RuneSchedule;

it.effect("requires schedules-write and canonicalizes create scope", () => {
  let capturedCreateInput: ScheduleCreateInput | undefined;
  let createCalls = 0;
  const writeRegistry = {
    create: (_scope: unknown, input: ScheduleCreateInput) => {
      createCalls += 1;
      capturedCreateInput = input;
      return Effect.succeed({
        schedule,
        receipt: {
          commandId: "command:rune-control-test",
          idempotencyKey: input.idempotencyKey,
          operation: "create",
          scheduleId: schedule.id,
          environmentId,
          threadId,
          recordedAt: schedule.createdAt,
        },
      });
    },
  } as unknown as ScheduleRegistry.ScheduleRegistryShape;
  const input = {
    idempotencyKey: "mcp-create-1",
    name: "MCP schedule",
    trigger: { type: "once", runAt: "2026-01-01T00:00:00.000Z" },
    target: { type: "prompt", prompt: "secret prompt" },
    policy: { approvalPolicy: "inherit", allowProviderFallback: false, catchUp: "skip" },
    displayTimeZone: "UTC",
  } as const;

  return Effect.gen(function* () {
    const result = yield* RuneControlToolkitHandlers.rune_schedule_create(input).pipe(
      Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
      Effect.provideService(
        ProjectionThreadRepository.ProjectionThreadRepository,
        threadRepository,
      ),
      Effect.provideService(ScheduleRegistry.ScheduleRegistry, writeRegistry),
    );

    expect(capturedCreateInput).toMatchObject({
      environmentId,
      projectId,
      target: { type: "prompt", threadId },
    });
    expect(JSON.stringify(result)).not.toContain("secret prompt");
    expect(JSON.stringify(result)).not.toContain("parameters");
    expect(createCalls).toBe(1);
  });
});

it.effect("does not invoke schedule mutations without schedules-write", () => {
  let createCalls = 0;
  const writeRegistry = {
    create: () => {
      createCalls += 1;
      return Effect.die("must not be called");
    },
  } as unknown as ScheduleRegistry.ScheduleRegistryShape;
  const readOnlyInvocation = {
    ...invocation,
    capabilities: new Set(["schedules-read"] as const),
  };
  const input = {
    idempotencyKey: "mcp-create-read-only",
    name: "MCP schedule",
    trigger: { type: "once", runAt: "2026-01-01T00:00:00.000Z" },
    target: { type: "prompt", prompt: "secret prompt" },
    policy: { approvalPolicy: "inherit", allowProviderFallback: false, catchUp: "skip" },
    displayTimeZone: "UTC",
  } as const;

  return Effect.gen(function* () {
    const error = yield* RuneControlToolkitHandlers.rune_schedule_create(input).pipe(
      Effect.provideService(McpInvocationContext.McpInvocationContext, readOnlyInvocation),
      Effect.provideService(
        ProjectionThreadRepository.ProjectionThreadRepository,
        threadRepository,
      ),
      Effect.provideService(ScheduleRegistry.ScheduleRegistry, writeRegistry),
      Effect.flip,
    );

    expect(error).toBeInstanceOf(McpInvocationContext.McpCapabilityUnavailableError);
    expect(createCalls).toBe(0);
  });
});

it.effect("rejects a caller-supplied thread outside the credential scope", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const server = yield* McpServer.McpServer;
      const error = yield* server
        .callTool({
          name: "rune_schedule_list",
          arguments: { threadId: "thread-other" },
        })
        .pipe(
          Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
          Effect.provideService(McpSchema.McpServerClient, client),
          Effect.flip,
        );

      expect(error._tag).toBe("InvalidParams");
    }),
  ).pipe(Effect.provide(TestLayer)),
);
