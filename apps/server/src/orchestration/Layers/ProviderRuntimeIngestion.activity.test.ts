import {
  EventId,
  ProviderDriverKind,
  RuntimeTaskId,
  ThreadId,
  type ProviderRuntimeEvent,
} from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import { runtimeEventToActivities } from "./ProviderRuntimeIngestion.ts";

const base = {
  provider: ProviderDriverKind.make("codex"),
  createdAt: "2026-08-06T00:00:00.000Z",
  threadId: ThreadId.make("thread-1"),
};

describe("runtimeEventToActivities task progress", () => {
  it("persists usage independently from replaceable activity", () => {
    const taskId = RuntimeTaskId.make("agent-1");
    const usageOnly = {
      ...base,
      type: "task.progress",
      eventId: EventId.make("evt-usage"),
      payload: {
        taskId,
        description: "Agent one",
        typedUsage: { totalTokens: 73_700_000 },
      },
    } satisfies ProviderRuntimeEvent;
    const command = {
      ...base,
      type: "task.progress",
      eventId: EventId.make("evt-command"),
      payload: {
        taskId,
        description: "Agent one",
        summary: "Running tests",
        lastToolName: "exec_command",
      },
    } satisfies ProviderRuntimeEvent;

    const usageActivities = runtimeEventToActivities(usageOnly);
    const commandActivities = runtimeEventToActivities(command);

    expect(usageActivities.map((activity) => activity.id)).toEqual(["task-usage:thread-1:agent-1"]);
    expect(commandActivities.map((activity) => activity.id)).toEqual([
      "task-progress:thread-1:agent-1",
    ]);
    const usagePayload = usageActivities[0]?.payload as Record<string, unknown> | undefined;
    expect(usagePayload?.typedUsage).toEqual({ totalTokens: 73_700_000 });
    expect(usagePayload?.usageSnapshot).toBe(true);
  });

  it("splits combined progress and usage into their independent snapshots", () => {
    const event = {
      ...base,
      type: "task.progress",
      eventId: EventId.make("evt-combined"),
      payload: {
        taskId: RuntimeTaskId.make("agent-2"),
        description: "Agent two",
        summary: "Inspecting the panel",
        typedUsage: { totalTokens: 4_200, toolUses: 7 },
        status: "running",
      },
    } satisfies ProviderRuntimeEvent;

    const activities = runtimeEventToActivities(event);
    const progressPayload = activities[0]?.payload as Record<string, unknown>;
    const usagePayload = activities[1]?.payload as Record<string, unknown>;

    expect(activities.map((activity) => activity.id)).toEqual([
      "task-progress:thread-1:agent-2",
      "task-usage:thread-1:agent-2",
    ]);
    expect(progressPayload.summary).toBe("Inspecting the panel");
    expect(progressPayload.status).toBe("running");
    expect(progressPayload).not.toHaveProperty("typedUsage");
    expect(usagePayload.typedUsage).toEqual({ totalTokens: 4_200, toolUses: 7 });
    expect(usagePayload.usageSnapshot).toBe(true);
    expect(usagePayload).not.toHaveProperty("status");
  });
});
describe("runtimeEventToActivities tool streaming persistence", () => {
  const accumulatedStdout = [
    "first line of output",
    ...Array.from({ length: 500 }, (_, index) => `Capturing frame ${index}/9028`),
  ].join("\n");
  const streamingData = {
    toolCallId: "tool-call-1",
    kind: "execute",
    command: "blender --render",
    rawOutput: { stdout: accumulatedStdout },
    content: [{ type: "content", content: { type: "text", text: accumulatedStdout } }],
  };

  it("persists tool.updated with the wire projection of data, not the accumulated stream", () => {
    const event = {
      ...base,
      type: "item.updated",
      eventId: EventId.make("evt-tool-streaming-updated"),
      payload: {
        itemType: "command_execution",
        status: "inProgress",
        title: "Render",
        detail: accumulatedStdout,
        data: streamingData,
      },
    } satisfies ProviderRuntimeEvent;

    const activities = runtimeEventToActivities(event);

    expect(activities).toHaveLength(1);
    const payload = activities[0]?.payload as Record<string, unknown>;
    const data = payload.data as Record<string, unknown>;
    expect(payload.status).toBe("inProgress");
    expect(data.toolCallId).toBe("tool-call-1");
    expect(data.command).toBe("blender --render");
    expect(data.rawOutput).toEqual({ content: "first line of output" });
    expect(data.content).toBeUndefined();
    expect(JSON.stringify(data).length).toBeLessThan(1_000);
  });

  it("persists the full terminal payload on tool.completed", () => {
    const event = {
      ...base,
      type: "item.completed",
      eventId: EventId.make("evt-tool-streaming-completed"),
      payload: {
        itemType: "command_execution",
        status: "completed",
        title: "Render",
        data: streamingData,
      },
    } satisfies ProviderRuntimeEvent;

    const activities = runtimeEventToActivities(event);

    expect(activities).toHaveLength(1);
    const payload = activities[0]?.payload as Record<string, unknown>;
    expect(payload.data).toEqual(streamingData);
  });
});

describe("runtimeEventToActivities turn trace", () => {
  it("projects model attribution and one compact request record", () => {
    const started = {
      ...base,
      type: "turn.started",
      eventId: EventId.make("evt-turn-started"),
      providerInstanceId: "gateway-1",
      turnId: "turn-1",
      payload: { model: "gpt-test", effort: "high" },
    } satisfies ProviderRuntimeEvent;
    const request = {
      ...base,
      type: "api.request.usage",
      eventId: EventId.make("evt-request-usage"),
      providerInstanceId: "gateway-1",
      turnId: "turn-1",
      payload: {
        requestId: "request-1",
        requestNumber: 1,
        retry: true,
        inputTokens: 100,
        outputTokens: 20,
        cachedInputTokens: 80,
        reasoningTokens: 5,
        timeToFirstByteMs: 120,
        streamDurationMs: 800,
      },
    } satisfies ProviderRuntimeEvent;

    expect(runtimeEventToActivities(started)[0]).toMatchObject({
      kind: "turn.trace.started",
      turnId: "turn-1",
      payload: {
        provider: "codex",
        providerInstanceId: "gateway-1",
        model: "gpt-test",
      },
    });
    expect(runtimeEventToActivities(request)[0]).toMatchObject({
      kind: "turn.trace.request",
      summary: "Request 1 retried",
      payload: {
        requestId: "request-1",
        retry: true,
        timeToFirstByteMs: 120,
        streamDurationMs: 800,
      },
    });
  });

  it("projects attributed request milestones without creating a new activity surface", () => {
    const event = {
      ...base,
      type: "turn.trace",
      eventId: EventId.make("evt-trace-stage"),
      providerInstanceId: "gateway-1",
      turnId: "turn-1",
      payload: {
        stage: "queue.wait",
        durationMs: 41,
        requestId: "request-main",
        purpose: "main",
        budget: { maxRequests: 4 },
      },
    } satisfies ProviderRuntimeEvent;

    expect(runtimeEventToActivities(event)[0]).toMatchObject({
      kind: "turn.trace.request",
      payload: {
        stage: "queue.wait",
        durationMs: 41,
        requestId: "request-main",
        purpose: "main",
      },
    });
  });
});
