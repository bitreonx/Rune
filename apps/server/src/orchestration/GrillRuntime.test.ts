import {
  CommandId,
  EventId,
  MessageId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationThreadActivity,
} from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  findPendingGrillRequest,
  makeGrillRequestActivity,
  makeGrillContinuationCommand,
  makeGrillResolutionCommand,
  validateGrillAnswers,
  type GrillInvocation,
} from "./GrillRuntime.ts";

const NOW = "2026-08-28T00:00:00.000Z";
const THREAD_ID = ThreadId.make("thread-grill");
const INVOCATION: GrillInvocation = { alias: "/grill", prompt: "the API boundary" };

function turnStartCommand(commandId = "turn-grill") {
  return {
    type: "thread.turn.start" as const,
    commandId: CommandId.make(commandId),
    threadId: THREAD_ID,
    message: {
      messageId: MessageId.make("message-grill"),
      role: "user" as const,
      text: "/grill the API boundary",
      attachments: [],
    },
    runtimeMode: "full-access" as const,
    interactionMode: "default" as const,
    createdAt: NOW,
  };
}

function activity(
  id: string,
  kind: string,
  payload: unknown,
  sequence: number,
): OrchestrationThreadActivity {
  return {
    id: EventId.make(id),
    tone: "info",
    kind,
    summary: "activity",
    payload,
    turnId: null,
    sequence,
    createdAt: NOW,
  };
}

describe("native Grill runtime", () => {
  it("builds a canonical user-input request without provider prose", () => {
    const request = makeGrillRequestActivity({
      command: turnStartCommand(),
      invocation: INVOCATION,
    });
    const payload = request.payload as {
      readonly source?: unknown;
      readonly sourceProvider?: unknown;
      readonly questions?: ReadonlyArray<Record<string, unknown>>;
    };

    expect(request.kind).toBe("user-input.requested");
    expect(request.turnId).toBeNull();
    expect(payload.source).toBe("rune.grill");
    expect(payload.sourceProvider).toBe("runeNative");
    expect(payload.questions).toHaveLength(1);
    expect(payload.questions?.[0]).toMatchObject({
      allowCustomAnswer: true,
      allowEditSuggestedAnswer: true,
      recommendedOptionId: "product",
    });
    expect(request.summary).toContain("Needs you");
  });

  it("derives pending requests from persisted activities and resolves them locally", () => {
    const request = makeGrillRequestActivity({
      command: turnStartCommand(),
      invocation: INVOCATION,
    });
    const requestId = (request.payload as { requestId: string }).requestId;
    const pending = findPendingGrillRequest([request], requestId);
    expect(pending?.id).toBe(request.id);

    const response = makeGrillResolutionCommand({
      request,
      commandId: "respond-grill",
      threadId: THREAD_ID,
      answers: { "grill:scope": "A focused acceptance criterion" },
      createdAt: NOW,
    });
    expect(response.type).toBe("thread.activity.append");
    expect(response.activity.kind).toBe("user-input.resolved");
    expect(findPendingGrillRequest([request, response.activity], requestId)).toBeUndefined();
  });

  it("does not claim a provider user-input request", () => {
    const providerRequest = activity(
      "provider-request",
      "user-input.requested",
      { requestId: "provider-request", questions: [] },
      1,
    );
    expect(findPendingGrillRequest([providerRequest], "provider-request")).toBeUndefined();
  });

  it("rejects stale or incomplete native answers before continuation", () => {
    const request = makeGrillRequestActivity({
      command: turnStartCommand(),
      invocation: INVOCATION,
    });

    expect(validateGrillAnswers(request, { "grill:unknown": "value" })).toEqual({
      ok: false,
      reason: "The native Grill answer refers to unknown question 'grill:unknown'.",
    });
    expect(validateGrillAnswers(request, {})).toEqual({
      ok: false,
      reason: "The native Grill answer is missing 'grill:scope'.",
    });
  });

  it("accepts the native option or a bounded custom answer", () => {
    const request = makeGrillRequestActivity({
      command: turnStartCommand(),
      invocation: INVOCATION,
    });

    expect(validateGrillAnswers(request, { "grill:scope": "product" })).toEqual({
      ok: true,
      answers: { "grill:scope": "product" },
    });
    expect(validateGrillAnswers(request, { "grill:scope": "A focused acceptance criterion" })).toEqual({
      ok: true,
      answers: { "grill:scope": "A focused acceptance criterion" },
    });
  });

  it("resumes the normal provider path with bounded hidden decision context", () => {
    const request = makeGrillRequestActivity({
      command: turnStartCommand("turn-grill-continue"),
      invocation: INVOCATION,
    });
    const continuation = makeGrillContinuationCommand({
      request,
      commandId: "respond-grill-continue",
      thread: {
        id: THREAD_ID,
        modelSelection: {
          instanceId: ProviderInstanceId.make("codex"),
          model: "gpt-5.4",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
      },
      answers: { "grill:scope": "A focused acceptance criterion" },
      createdAt: NOW,
    });
    expect(continuation.type).toBe("thread.turn.start");
    expect(continuation.message.hidden).toBe(true);
    expect(continuation.message.text).toContain("A focused acceptance criterion");
    expect(continuation.message.text.length).toBeLessThanOrEqual(17_000);
  });
});
