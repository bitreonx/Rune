import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import {
  EnvironmentId,
  ProjectId,
  ScheduleId,
  ThreadId,
  type RuneSchedule,
  type ScheduleCreateInput,
} from "@rune/contracts";

import type { ScheduleRegistryShape } from "../../persistence/Services/ScheduleRegistry.ts";
import {
  runeScheduleCreateTool,
  runeScheduleListTool,
  SCHEDULE_MUTATION_TOOLS,
  SCHEDULE_READ_TOOLS,
} from "./ApiScheduleTools.ts";
import type { NativeToolContext } from "./ApiTools.ts";

const environmentId = EnvironmentId.make("environment:native-tools");
const projectId = ProjectId.make("project:native-tools");
const threadId = ThreadId.make("thread:native-tools");

const schedule = {
  id: ScheduleId.make("schedule:native-tools"),
  name: "Nightly review",
  environmentId,
  projectId,
  trigger: { type: "interval", firstRunAt: "2026-01-01T00:00:00.000Z", everySeconds: 3600 },
  target: { type: "prompt", threadId, prompt: "secret prompt that must not be echoed" },
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

const context = (registry: ScheduleRegistryShape): NativeToolContext =>
  ({
    cwd: "C:/work/native-tools",
    workspaceFileSystem: {} as NativeToolContext["workspaceFileSystem"],
    workspaceEntries: {} as NativeToolContext["workspaceEntries"],
    schedule: { environmentId, projectId, threadId, registry },
  }) as NativeToolContext;

it.effect("native create pins the target to the authoritative thread and hides prompt data", () => {
  let captured: ScheduleCreateInput | undefined;
  const registry = {
    create: (_scope: unknown, input: ScheduleCreateInput) => {
      captured = input;
      return Effect.succeed({
        schedule,
        receipt: {
          commandId: "command:native-create",
          idempotencyKey: input.idempotencyKey,
          operation: "create",
          scheduleId: schedule.id,
          environmentId,
          recordedAt: schedule.createdAt,
        },
      });
    },
  } as unknown as ScheduleRegistryShape;

  return Effect.gen(function* () {
    const prompt = "secret prompt that must not be echoed";
    const observation = yield* runeScheduleCreateTool.execute(
      {
        idempotencyKey: "tool-call-1",
        name: "Nightly review",
        trigger: { type: "once", runAt: "2026-01-01T00:00:00.000Z" },
        target: {
          type: "prompt",
          threadId: "thread:spoofed",
          prompt,
        },
        policy: { approvalPolicy: "inherit", allowProviderFallback: false, catchUp: "skip" },
        displayTimeZone: "UTC",
        environmentId: "environment:spoofed",
      },
      context(registry),
    );

    expect(captured?.environmentId).toBe(environmentId);
    expect(captured?.target).toMatchObject({ type: "prompt", threadId });
    expect(observation).not.toContain(prompt);
    expect(observation).not.toContain("environment:spoofed");
  });
});

it.effect("native list passes only the current thread scope", () => {
  let capturedScope: unknown;
  let capturedInput: unknown;
  const registry = {
    list: (scope: unknown, input: unknown) => {
      capturedScope = scope;
      capturedInput = input;
      return Effect.succeed({ sequence: 7, schedules: [schedule] });
    },
  } as unknown as ScheduleRegistryShape;

  return Effect.gen(function* () {
    const observation = yield* runeScheduleListTool.execute({ limit: 10 }, context(registry));
    expect(capturedScope).toEqual({ environmentId, projectIds: [projectId], threadIds: [threadId] });
    expect(capturedInput).toEqual({ limit: 10, threadId });
    expect(observation).toContain("schedule:native-tools");
  });
});

it("exposes reads as safe and every lifecycle mutation as approval-gated", () => {
  expect(SCHEDULE_READ_TOOLS.map((tool) => tool.name)).toEqual([
    "rune_schedule_list",
    "rune_schedule_run_history",
  ]);
  expect(SCHEDULE_READ_TOOLS.every((tool) => !tool.requiresApproval)).toBe(true);
  expect(SCHEDULE_MUTATION_TOOLS.map((tool) => tool.name)).toEqual([
    "rune_schedule_create",
    "rune_schedule_update",
    "rune_schedule_pause",
    "rune_schedule_resume",
    "rune_schedule_delete",
    "rune_schedule_run_now",
  ]);
  expect(SCHEDULE_MUTATION_TOOLS.every((tool) => tool.requiresApproval)).toBe(true);
});
