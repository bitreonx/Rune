import {
  ScheduleCreateInput,
  ScheduleDeleteInput,
  ScheduleListInput,
  SchedulePauseInput,
  ScheduleResumeInput,
  ScheduleRunNowInput,
  ScheduleRunsInput,
  ScheduleUpdateInput,
  type EnvironmentId,
  type ProjectId,
  type ScheduleActionTarget,
  type ScheduleTarget,
  type ThreadId,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { ScheduleRegistryShape } from "../../persistence/Services/ScheduleRegistry.ts";
import type { NativeToolContext, NativeToolDef } from "./ApiTools.ts";

/** The authority carried into a native API session, never supplied by a model. */
export interface NativeScheduleContext {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly projectId?: ProjectId | undefined;
  readonly registry: ScheduleRegistryShape;
}

const scheduleContext = (ctx: NativeToolContext): NativeScheduleContext | undefined =>
  ctx.schedule;

const invalidArguments = (detail: string) => new Error(`Invalid schedule arguments: ${detail}`);

const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown) =>
  Effect.try({
    try: () => Schema.decodeUnknownSync(schema)(input),
    catch: (cause) => invalidArguments(cause instanceof Error ? cause.message : "schema mismatch"),
  });

const parseString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const parseLimit = (value: unknown): number | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 100) {
    return undefined;
  }
  return value;
};

const currentScope = (schedule: NativeScheduleContext) => ({
  environmentId: schedule.environmentId,
  ...(schedule.projectId === undefined ? {} : { projectIds: [schedule.projectId] }),
  threadIds: [schedule.threadId],
});

const summarizeSchedule = (schedule: {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly target: { readonly type: string; readonly threadId: string };
  readonly projectId?: string;
  readonly displayTimeZone: string;
  readonly policy: {
    readonly approvalPolicy: string;
    readonly allowProviderFallback: boolean;
    readonly catchUp: string;
    readonly providerInstanceId?: string;
  };
  readonly nextRunAt: string | null;
  readonly version: number;
  readonly createdBy: string;
}) => ({
  id: schedule.id,
  name: schedule.name,
  status: schedule.status,
  targetType: schedule.target.type,
  threadId: schedule.target.threadId,
  ...(schedule.projectId === undefined ? {} : { projectId: schedule.projectId }),
  displayTimeZone: schedule.displayTimeZone,
  nextRunAt: schedule.nextRunAt,
  version: schedule.version,
  createdBy: schedule.createdBy,
  policy: {
    approvalPolicy: schedule.policy.approvalPolicy,
    allowProviderFallback: schedule.policy.allowProviderFallback,
    catchUp: schedule.policy.catchUp,
    ...(schedule.policy.providerInstanceId === undefined
      ? {}
      : { providerInstanceId: schedule.policy.providerInstanceId }),
  },
});

const summarizeRun = (run: {
  readonly id: string;
  readonly scheduleId: string;
  readonly trigger: string;
  readonly scheduledFor: string;
  readonly status: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly providerInstanceId?: string;
  readonly threadId: string;
  readonly receiptSummary?: string;
  readonly error?: string;
}) => ({
  id: run.id,
  scheduleId: run.scheduleId,
  trigger: run.trigger,
  scheduledFor: run.scheduledFor,
  status: run.status,
  ...(run.startedAt === undefined ? {} : { startedAt: run.startedAt }),
  ...(run.completedAt === undefined ? {} : { completedAt: run.completedAt }),
  ...(run.providerInstanceId === undefined ? {} : { providerInstanceId: run.providerInstanceId }),
  threadId: run.threadId,
  ...(run.receiptSummary === undefined ? {} : { receiptSummary: run.receiptSummary }),
  ...(run.error === undefined ? {} : { error: run.error }),
});

const resultText = (value: unknown): string => JSON.stringify(value);

const targetFromArgs = (value: unknown, schedule: NativeScheduleContext): unknown => {
  if (typeof value !== "object" || value === null) return value;
  const target = value as Record<string, unknown>;
  if (target.type === "prompt") {
    return { ...target, threadId: schedule.threadId } satisfies Partial<ScheduleTarget>;
  }
  if (target.type === "action") {
    return {
      ...target,
      threadId: schedule.threadId,
      ...(schedule.projectId === undefined ? {} : { projectId: schedule.projectId }),
    } satisfies Partial<ScheduleActionTarget>;
  }
  return value;
};

const getSchedule = (ctx: NativeToolContext): NativeScheduleContext => {
  const schedule = scheduleContext(ctx);
  if (schedule === undefined) throw new Error("RUNE scheduling is unavailable in this session.");
  return schedule;
};

const baseTool = (input: {
  readonly name: string;
  readonly description: string;
  readonly parametersJsonSchema: Record<string, unknown>;
  readonly requiresApproval: boolean;
  readonly execute: NativeToolDef["execute"];
}): NativeToolDef => input;

const listSchema = {
  type: "object",
  properties: { status: { type: "string", enum: ["active", "paused", "completed", "failed"] }, limit: { type: "integer", minimum: 1, maximum: 100 } },
  additionalProperties: false,
};

const runsSchema = {
  type: "object",
  properties: { scheduleId: { type: "string", pattern: "^schedule:[A-Za-z0-9][A-Za-z0-9._-]*$" }, limit: { type: "integer", minimum: 1, maximum: 100 } },
  additionalProperties: false,
};

const targetSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["prompt", "action"] },
    prompt: { type: "string", minLength: 1, maxLength: 32_000 },
    actionId: { type: "string", pattern: "^action\\.[a-z0-9][a-z0-9-]*$" },
    parameters: { type: "object", maxProperties: 100, additionalProperties: { type: ["string", "number", "boolean"] } },
  },
  required: ["type"],
  additionalProperties: false,
};

const triggerSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["once", "interval"] },
    runAt: { type: "string" },
    firstRunAt: { type: "string" },
    everySeconds: { type: "integer", minimum: 1 },
  },
  required: ["type"],
  additionalProperties: false,
};

const policySchema = {
  type: "object",
  properties: {
    approvalPolicy: { type: "string", enum: ["inherit", "never", "always"] },
    providerInstanceId: { type: "string" },
    allowProviderFallback: { type: "boolean" },
    catchUp: { type: "string", enum: ["skip", "coalesce-one"] },
    maxRuns: { type: "integer", minimum: 1 },
  },
  required: ["approvalPolicy", "allowProviderFallback", "catchUp"],
  additionalProperties: false,
};

const createSchema = {
  type: "object",
  properties: {
    idempotencyKey: { type: "string", minLength: 1, maxLength: 256 },
    name: { type: "string", minLength: 1, maxLength: 200 },
    trigger: triggerSchema,
    target: targetSchema,
    policy: policySchema,
    displayTimeZone: { type: "string", minLength: 1, maxLength: 128 },
  },
  required: ["idempotencyKey", "name", "trigger", "target", "policy", "displayTimeZone"],
  additionalProperties: false,
};

const updateSchema = {
  type: "object",
  properties: {
    scheduleId: { type: "string", pattern: "^schedule:[A-Za-z0-9][A-Za-z0-9._-]*$" },
    idempotencyKey: { type: "string", minLength: 1, maxLength: 256 },
    expectedVersion: { type: "integer", minimum: 1 },
    name: { type: "string", minLength: 1, maxLength: 200 },
    trigger: triggerSchema,
    target: targetSchema,
    policy: policySchema,
    displayTimeZone: { type: "string", minLength: 1, maxLength: 128 },
  },
  required: ["scheduleId", "idempotencyKey"],
  additionalProperties: false,
};

const mutationSchema = {
  type: "object",
  properties: {
    scheduleId: { type: "string", pattern: "^schedule:[A-Za-z0-9][A-Za-z0-9._-]*$" },
    idempotencyKey: { type: "string", minLength: 1, maxLength: 256 },
    expectedVersion: { type: "integer", minimum: 1 },
  },
  required: ["scheduleId", "idempotencyKey"],
  additionalProperties: false,
};

export const runeScheduleListTool = baseTool({
  name: "rune_schedule_list",
  description: "List scheduled tasks created in RUNE for the current thread. This never reads provider-owned automations.",
  parametersJsonSchema: listSchema,
  requiresApproval: false,
  execute: (args, ctx) =>
    Effect.gen(function* () {
      const schedule = getSchedule(ctx);
      const input = yield* decode(ScheduleListInput, {
        ...(args.status === undefined ? {} : { status: args.status }),
        ...(parseLimit(args.limit) === undefined ? {} : { limit: parseLimit(args.limit) }),
        threadId: schedule.threadId,
      });
      const result = yield* schedule.registry.list(currentScope(schedule), input);
      return resultText({ sequence: result.sequence, schedules: result.schedules.map(summarizeSchedule) });
    }),
});

export const runeScheduleRunHistoryTool = baseTool({
  name: "rune_schedule_run_history",
  description: "List bounded execution history for RUNE scheduled tasks in the current thread.",
  parametersJsonSchema: runsSchema,
  requiresApproval: false,
  execute: (args, ctx) =>
    Effect.gen(function* () {
      const schedule = getSchedule(ctx);
      const scheduleId = parseString(args.scheduleId);
      const input = yield* decode(ScheduleRunsInput, {
        ...(scheduleId === undefined ? {} : { scheduleId }),
        ...(parseLimit(args.limit) === undefined ? {} : { limit: parseLimit(args.limit) }),
      });
      const result = yield* schedule.registry.runs(currentScope(schedule), input);
      return resultText({ runs: result.runs.map(summarizeRun) });
    }),
});

export const runeScheduleCreateTool = baseTool({
  name: "rune_schedule_create",
  description: "Create a durable scheduled task in RUNE for the current thread. The schedule runs through RUNE, not Codex, Antigravity, or another provider account.",
  parametersJsonSchema: createSchema,
  requiresApproval: true,
  execute: (args, ctx) =>
    Effect.gen(function* () {
      const schedule = getSchedule(ctx);
      const input = yield* decode(ScheduleCreateInput, {
        ...args,
        environmentId: schedule.environmentId,
        ...(schedule.projectId === undefined ? {} : { projectId: schedule.projectId }),
        target: targetFromArgs(args.target, schedule),
      });
      const result = yield* schedule.registry.create(currentScope(schedule), input, "agent");
      return resultText({ schedule: summarizeSchedule(result.schedule), receiptId: result.receipt.commandId });
    }),
});

export const runeScheduleUpdateTool = baseTool({
  name: "rune_schedule_update",
  description: "Update a RUNE scheduled task in the current thread using optimistic version checking.",
  parametersJsonSchema: updateSchema,
  requiresApproval: true,
  execute: (args, ctx) =>
    Effect.gen(function* () {
      const schedule = getSchedule(ctx);
      const input = yield* decode(ScheduleUpdateInput, {
        ...args,
        ...(args.target === undefined ? {} : { target: targetFromArgs(args.target, schedule) }),
        ...(schedule.projectId === undefined ? {} : { projectId: schedule.projectId }),
      });
      const result = yield* schedule.registry.update(currentScope(schedule), input);
      return resultText({ schedule: summarizeSchedule(result.schedule), receiptId: result.receipt.commandId });
    }),
});

const makeStatusTool = (input: {
  readonly name: string;
  readonly description: string;
  readonly schema: Schema.Schema<unknown, unknown>;
  readonly invoke: (
    registry: ScheduleRegistryShape,
    scope: ReturnType<typeof currentScope>,
    value: Record<string, unknown>,
  ) => Effect.Effect<{
    readonly schedule: Parameters<typeof summarizeSchedule>[0];
    readonly receipt: { readonly commandId: string };
  }>;
}): NativeToolDef =>
  baseTool({
    name: input.name,
    description: input.description,
    parametersJsonSchema: mutationSchema,
    requiresApproval: true,
    execute: (args, ctx) =>
      Effect.gen(function* () {
        const schedule = getSchedule(ctx);
        const value = yield* decode(input.schema, args);
        const result = yield* input.invoke(schedule.registry, currentScope(schedule), value);
        return resultText({ schedule: summarizeSchedule(result.schedule), receiptId: result.receipt.commandId });
      }),
  });

export const runeSchedulePauseTool = makeStatusTool({
  name: "rune_schedule_pause",
  description: "Pause a RUNE scheduled task. Pausing is reversible with rune_schedule_resume.",
  schema: SchedulePauseInput,
  invoke: (registry, scope, value) => registry.pause(scope, value),
});

export const runeScheduleResumeTool = makeStatusTool({
  name: "rune_schedule_resume",
  description: "Resume a paused RUNE scheduled task.",
  schema: ScheduleResumeInput,
  invoke: (registry, scope, value) => registry.resume(scope, value),
});

export const runeScheduleDeleteTool = makeStatusTool({
  name: "rune_schedule_delete",
  description: "Delete a RUNE scheduled task in the current thread.",
  schema: ScheduleDeleteInput,
  invoke: (registry, scope, value) => registry.remove(scope, value),
});

export const runeScheduleRunNowTool = baseTool({
  name: "rune_schedule_run_now",
  description: "Request one immediate run of a RUNE scheduled task in the current thread.",
  parametersJsonSchema: mutationSchema,
  requiresApproval: true,
  execute: (args, ctx) =>
    Effect.gen(function* () {
      const schedule = getSchedule(ctx);
      const input = yield* decode(ScheduleRunNowInput, args);
      const result = yield* schedule.registry.runNow(currentScope(schedule), input);
      return resultText({ schedule: summarizeSchedule(result.schedule), run: summarizeRun(result.run), receiptId: result.receipt.commandId });
    }),
});

export const SCHEDULE_READ_TOOLS: ReadonlyArray<NativeToolDef> = [
  runeScheduleListTool,
  runeScheduleRunHistoryTool,
];

export const SCHEDULE_MUTATION_TOOLS: ReadonlyArray<NativeToolDef> = [
  runeScheduleCreateTool,
  runeScheduleUpdateTool,
  runeSchedulePauseTool,
  runeScheduleResumeTool,
  runeScheduleDeleteTool,
  runeScheduleRunNowTool,
];
