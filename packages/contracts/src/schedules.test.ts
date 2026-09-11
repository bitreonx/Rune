import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  IanaTimezone,
  RuneSchedule,
  ScheduleActionParameterValues,
  ScheduleCommandReceipt,
  ScheduleCreateInput,
  ScheduleEvent,
  ScheduleExecutionResult,
  ScheduleId,
  ScheduleMissedOccurrenceDecision,
  ScheduleMutationResult,
  SchedulePolicy,
  ScheduleRun,
  ScheduleRunId,
  ScheduleRunNowResult,
  ScheduleRunSettlementInput,
  ScheduleRunStatus,
  ScheduleSubscriptionMessage,
  ScheduleTarget,
  ScheduleTrigger,
  WsScheduleContractVersion,
} from "./schedules.js";

const at = "2026-03-08T06:30:00.000Z";
const threadId = "thread:daily";
const projectId = "project:demo";
const environmentId = "environment:local";

const promptTarget = {
  type: "prompt" as const,
  threadId,
  prompt: "Review the latest changes and summarize the risks.",
};

const policy = {
  approvalPolicy: "inherit" as const,
  allowProviderFallback: false,
  catchUp: "coalesce-one" as const,
};

const schedule = {
  id: "schedule:daily-review",
  name: "Daily review",
  environmentId,
  trigger: { type: "interval" as const, firstRunAt: at, everySeconds: 3_600 },
  target: promptTarget,
  policy,
  displayTimeZone: "America/New_York",
  status: "active" as const,
  version: 1,
  claimedRunCount: 0,
  nextRunAt: at,
  createdAt: at,
  updatedAt: at,
  createdBy: "agent" as const,
};

const run = {
  id: "schedule-run:daily-review:1",
  scheduleId: schedule.id,
  trigger: "scheduled" as const,
  scheduledFor: at,
  createdAt: at,
  status: "claimed" as const,
  threadId,
};

describe("schedule contracts", () => {
  it("decodes the durable schedule, target, policy, and run shapes", () => {
    expect(Schema.decodeUnknownSync(RuneSchedule)(schedule)).toEqual(schedule);
    expect(Schema.decodeUnknownSync(ScheduleTrigger)(schedule.trigger)).toEqual(schedule.trigger);
    expect(Schema.decodeUnknownSync(ScheduleTarget)(promptTarget)).toEqual(promptTarget);
    expect(Schema.decodeUnknownSync(SchedulePolicy)(policy)).toEqual(policy);
    expect(Schema.decodeUnknownSync(ScheduleRun)(run)).toEqual(run);
    expect(Schema.decodeUnknownSync(ScheduleRunStatus)("dispatch-uncertain")).toBe(
      "dispatch-uncertain",
    );
  });

  it("requires stable opaque id prefixes and rejects empty or invalid values", () => {
    expect(Schema.decodeUnknownSync(ScheduleId)("schedule:valid-id")).toBe("schedule:valid-id");
    expect(Schema.decodeUnknownSync(ScheduleRunId)("schedule-run:valid-id")).toBe(
      "schedule-run:valid-id",
    );
    expect(() => Schema.decodeUnknownSync(ScheduleId)("daily-review")).toThrow();
    expect(() => Schema.decodeUnknownSync(ScheduleRunId)("run:daily-review")).toThrow();
    expect(() => Schema.decodeUnknownSync(RuneSchedule)({ ...schedule, name: "   " })).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(RuneSchedule)({
        ...schedule,
        trigger: { type: "interval", firstRunAt: at, everySeconds: 0 },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(RuneSchedule)({ ...schedule, displayTimeZone: "Mars/Base" }),
    ).toThrow();
  });

  it("requires thread provenance on both prompt and action targets", () => {
    expect(() =>
      Schema.decodeUnknownSync(ScheduleTarget)({ type: "prompt", prompt: "No thread" }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(ScheduleTarget)({
        type: "action",
        projectId,
        actionId: "action.run-tests",
        parameters: {},
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(ScheduleTarget)({
        type: "action",
        threadId,
        projectId,
        actionId: "action.run-tests",
        parameters: { suite: "contracts" },
      }),
    ).toMatchObject({ type: "action", threadId, projectId });
  });

  it("rejects raw secret-like action parameter names and bounds parameter maps", () => {
    expect(Schema.decodeUnknownSync(ScheduleActionParameterValues)({ suite: "contracts" })).toEqual({
      suite: "contracts",
    });
    for (const key of ["password", "api_token", "client-secret", "authorization"]) {
      expect(() =>
        Schema.decodeUnknownSync(ScheduleActionParameterValues)({ [key]: "raw-secret" }),
      ).toThrow();
    }
  });

  it("keeps timezone display separate from elapsed-UTC trigger data", () => {
    expect(Schema.decodeUnknownSync(IanaTimezone)("America/New_York")).toBe("America/New_York");
    expect(Schema.decodeUnknownSync(IanaTimezone)("UTC")).toBe("UTC");
    expect(() => Schema.decodeUnknownSync(IanaTimezone)("not-a-time-zone")).toThrow();
    expect(schedule.trigger).toEqual({ type: "interval", firstRunAt: at, everySeconds: 3_600 });
    expect(schedule.displayTimeZone).toBe("America/New_York");
  });

  it("requires idempotency keys on every mutation and exposes receipts", () => {
    const createInput = {
      idempotencyKey: "request:daily-review:create",
      name: schedule.name,
      environmentId,
      trigger: schedule.trigger,
      target: schedule.target,
      policy: schedule.policy,
      displayTimeZone: schedule.displayTimeZone,
    };
    expect(Schema.decodeUnknownSync(ScheduleCreateInput)(createInput)).toEqual(createInput);
    expect(() => Schema.decodeUnknownSync(ScheduleCreateInput)({ ...createInput, idempotencyKey: "" })).toThrow();

    const receipt = {
      commandId: "command:schedule-create",
      idempotencyKey: createInput.idempotencyKey,
      operation: "create" as const,
      scheduleId: schedule.id,
      environmentId,
      recordedAt: at,
    };
    expect(Schema.decodeUnknownSync(ScheduleCommandReceipt)(receipt)).toEqual(receipt);
    expect(
      Schema.decodeUnknownSync(ScheduleMutationResult)({ schedule, receipt }),
    ).toMatchObject({ schedule, receipt });
  });

  it("models manual runs without changing recurrence state", () => {
    const manualRun = { ...run, id: "schedule-run:daily-review:manual-1", trigger: "manual" as const };
    const result = { schedule, run: manualRun, receipt: {
      commandId: "command:schedule-run-now",
      idempotencyKey: "request:run-now",
      operation: "run-now" as const,
      scheduleId: schedule.id,
      runId: manualRun.id,
      environmentId,
      recordedAt: at,
    } };
    expect(Schema.decodeUnknownSync(ScheduleRunNowResult)(result)).toEqual(result);
    expect(schedule.claimedRunCount).toBe(0);
    expect(schedule.nextRunAt).toBe(at);
  });

  it("decodes all lifecycle results, receipts, and cursor-bearing events", () => {
    const settled = {
      ...run,
      status: "succeeded" as const,
      completedAt: "2026-03-08T06:31:00.000Z",
      providerInstanceId: "codex-local",
      orchestrationCommandId: "command:orchestration-1",
      providerReceiptId: "provider-receipt:1",
      receiptSummary: "Completed review.",
    };
    expect(Schema.decodeUnknownSync(ScheduleRun)(settled)).toEqual(settled);
    expect(Schema.decodeUnknownSync(ScheduleRunSettlementInput)({
      runId: settled.id,
      status: "blocked",
      completedAt: settled.completedAt,
      threadId,
      error: "Approval is required.",
    })).toMatchObject({ status: "blocked", runId: settled.id });

    const execution: typeof ScheduleExecutionResult.Type = {
      status: "dispatch-uncertain",
      reason: "The provider handoff outcome is unknown after restart.",
      threadId,
      orchestrationCommandId: "command:orchestration-1",
    };
    expect(Schema.decodeUnknownSync(ScheduleExecutionResult)(execution)).toEqual(execution);

    const event = {
      sequence: 1,
      scheduleId: schedule.id,
      kind: "created" as const,
      at,
      schedule,
    };
    expect(Schema.decodeUnknownSync(ScheduleEvent)(event)).toEqual(event);
    expect(Schema.decodeUnknownSync(ScheduleSubscriptionMessage)({
      type: "snapshot",
      sequence: 1,
      schedules: [schedule],
      runs: [run],
    })).toMatchObject({ type: "snapshot", sequence: 1 });
    expect(WsScheduleContractVersion).toBe(1);
  });
});
