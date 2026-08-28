import {
  CommandId,
  EventId,
  MessageId,
  RUNE_NATIVE_DRIVER,
  type OrchestrationCommand,
  type OrchestrationThread,
  type OrchestrationThreadActivity,
  type ProviderUserInputAnswers,
} from "@rune/contracts";
import {
  grillDecisionNodesForInvocation,
  parseGrillInvocation,
  type GrillDecisionNode,
  type GrillInvocation,
} from "@rune/shared/grill";

/** Stable marker used to distinguish Grill from provider-originated asks. */
export const GRILL_ACTIVITY_SOURCE = "rune.grill";
export const GRILL_SOURCE_PROVIDER = RUNE_NATIVE_DRIVER;

type TurnStartCommand = Extract<OrchestrationCommand, { type: "thread.turn.start" }>;
type ActivityAppendCommand = Extract<OrchestrationCommand, { type: "thread.activity.append" }>;

interface GrillActivityPayload {
  readonly requestId: string;
  readonly source: typeof GRILL_ACTIVITY_SOURCE;
  readonly sourceProvider: typeof GRILL_SOURCE_PROVIDER;
  readonly [key: string]: unknown;
}

interface GrillQuestionPayload {
  readonly id: string;
  readonly multiSelect?: boolean;
  readonly allowCustomAnswer?: boolean;
  readonly allowSkip?: boolean;
  readonly options: ReadonlyArray<{
    readonly id?: string;
    readonly label: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function activityRequestId(activity: OrchestrationThreadActivity): string | null {
  if (!isRecord(activity.payload) || typeof activity.payload.requestId !== "string") {
    return null;
  }
  return activity.payload.requestId;
}

function isGrillPayload(payload: unknown): payload is GrillActivityPayload {
  return (
    isRecord(payload) &&
    payload.source === GRILL_ACTIVITY_SOURCE &&
    payload.sourceProvider === GRILL_SOURCE_PROVIDER &&
    typeof payload.requestId === "string"
  );
}

function grillQuestions(payload: GrillActivityPayload): ReadonlyArray<GrillQuestionPayload> {
  if (!Array.isArray(payload.questions)) return [];
  return payload.questions.flatMap((question) => {
    if (!isRecord(question) || typeof question.id !== "string" || !Array.isArray(question.options)) {
      return [];
    }
    const options = question.options.flatMap((option) => {
      if (!isRecord(option) || typeof option.label !== "string") return [];
      return [{
        ...(typeof option.id === "string" ? { id: option.id } : {}),
        label: option.label,
      }];
    });
    return [{
      id: question.id,
      options,
      ...(typeof question.multiSelect === "boolean" ? { multiSelect: question.multiSelect } : {}),
      ...(typeof question.allowCustomAnswer === "boolean"
        ? { allowCustomAnswer: question.allowCustomAnswer }
        : {}),
      ...(typeof question.allowSkip === "boolean" ? { allowSkip: question.allowSkip } : {}),
    }];
  });
}

const MAX_GRILL_ANSWER_CHARS = 16_384;

function normalizedAnswers(answers: ProviderUserInputAnswers): ProviderUserInputAnswers {
  let remaining = MAX_GRILL_ANSWER_CHARS;
  const normalized: Record<string, string> = {};
  for (const [questionId, answer] of Object.entries(answers).slice(0, 32)) {
    if (remaining <= 0) break;
    const value = Array.isArray(answer)
      ? answer.filter((item): item is string => typeof item === "string").join(", ")
      : typeof answer === "string"
        ? answer
        : answer === null || answer === undefined
          ? ""
          : String(answer);
    const bounded = value.slice(0, remaining);
    if (bounded.length === 0) continue;
    normalized[questionId.slice(0, 256)] = bounded;
    remaining -= bounded.length;
  }
  return normalized;
}

export type GrillAnswerValidation =
  | { readonly ok: true; readonly answers: ProviderUserInputAnswers }
  | { readonly ok: false; readonly reason: string };

/**
 * Validates a response against the durable native question payload. Provider
 * user-input answers are intentionally open-ended for legacy adapters, but a
 * native Grill response has a known question set and must not resume a stale
 * or forged request.
 */
export function validateGrillAnswers(
  request: OrchestrationThreadActivity,
  answers: ProviderUserInputAnswers,
): GrillAnswerValidation {
  if (!isGrillPayload(request.payload)) {
    return { ok: false, reason: "The request is not a native Grill interaction." };
  }
  const questions = grillQuestions(request.payload);
  if (questions.length === 0) {
    return { ok: false, reason: "The native Grill request has no valid questions." };
  }
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const supplied = new Set(Object.keys(answers));
  for (const questionId of supplied) {
    if (!questionsById.has(questionId)) {
      return { ok: false, reason: `The native Grill answer refers to unknown question '${questionId}'.` };
    }
  }
  for (const question of questions) {
    if (!Object.prototype.hasOwnProperty.call(answers, question.id)) {
      if (question.allowSkip === true) continue;
      return { ok: false, reason: `The native Grill answer is missing '${question.id}'.` };
    }
    const answer = answers[question.id];
    const values = Array.isArray(answer)
      ? answer
      : typeof answer === "string"
        ? [answer]
        : null;
    if (values === null || values.some((value) => typeof value !== "string")) {
      return { ok: false, reason: `The native Grill answer for '${question.id}' is invalid.` };
    }
    const trimmedValues = values.map((value) => value.trim()).filter(Boolean);
    if (trimmedValues.length === 0) {
      if (question.allowSkip === true) continue;
      return { ok: false, reason: `The native Grill answer for '${question.id}' is empty.` };
    }
    if (!question.multiSelect && trimmedValues.length > 1) {
      return { ok: false, reason: `The native Grill question '${question.id}' accepts one answer.` };
    }
    if (question.allowCustomAnswer !== true) {
      const allowed = new Set(question.options.flatMap((option) => [option.label, ...(option.id ? [option.id] : [])]));
      if (trimmedValues.some((value) => !allowed.has(value))) {
        return { ok: false, reason: `The native Grill answer for '${question.id}' is not one of its options.` };
      }
    }
  }
  return { ok: true, answers: normalizedAnswers(answers) };
}

function questionForNode(node: GrillDecisionNode, index: number, total: number) {
  const recommendedOption = node.options.find((option) => option.label === node.recommendedAnswer);
  return {
    id: node.id,
    header: total === 1 ? "Grill" : `Grill ${index + 1} of ${total}`,
    question: node.question,
    options: node.options.map((option) => ({
      id: option.id,
      label: option.label,
      description:
        option.id === recommendedOption?.id ? "Recommended starting point" : "Suggested answer",
    })),
    ...(recommendedOption === undefined ? {} : { recommendedOptionId: recommendedOption.id }),
    allowCustomAnswer: true,
    allowEditSuggestedAnswer: true,
  };
}

function requestIdFor(command: TurnStartCommand): string {
  return `grill:${String(command.commandId)}`;
}

/** Builds the durable native request that the existing asker already renders. */
export function makeGrillRequestActivity(input: {
  readonly command: TurnStartCommand;
  readonly invocation: GrillInvocation;
}): OrchestrationThreadActivity {
  const nodes = grillDecisionNodesForInvocation(input.invocation);
  const requestId = requestIdFor(input.command);
  return {
    id: EventId.make(`grill-requested:${String(input.command.commandId)}`),
    tone: "info",
    kind: "user-input.requested",
    summary:
      nodes.length === 1 ? "Needs you · Grill" : `Needs you · ${nodes.length} Grill decisions`,
    payload: {
      requestId,
      source: GRILL_ACTIVITY_SOURCE,
      sourceProvider: GRILL_SOURCE_PROVIDER,
      invocation: input.invocation.alias,
      title: "Grill",
      ...(input.invocation.prompt.length > 0
        ? { context: `Topic: ${input.invocation.prompt}` }
        : { context: "Choose the first decision to clarify before work continues." }),
      questions: nodes.map((node, index) => questionForNode(node, index, nodes.length)),
      progress: { current: 1, total: nodes.length },
      blocking: true,
      phase: "waiting-for-user",
    },
    turnId: null,
    createdAt: input.command.createdAt,
  };
}

export function makeGrillRequestCommand(input: {
  readonly command: TurnStartCommand;
  readonly invocation: GrillInvocation;
}): ActivityAppendCommand {
  return {
    type: "thread.activity.append",
    commandId: CommandId.make(`grill-request:${String(input.command.commandId)}`),
    threadId: input.command.threadId,
    activity: makeGrillRequestActivity(input),
    createdAt: input.command.createdAt,
  };
}

/**
 * Finds an unresolved native Grill request from persisted activities. This is
 * deliberately derived from the read model instead of an in-memory waiter so
 * responses remain safe across reconnects and server restarts.
 */
export function findPendingGrillRequest(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  requestId: string,
): OrchestrationThreadActivity | undefined {
  const ordered = [...activities].sort(
    (left, right) =>
      (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER) ||
      left.createdAt.localeCompare(right.createdAt) ||
      String(left.id).localeCompare(String(right.id)),
  );
  let request: OrchestrationThreadActivity | undefined;
  for (const activity of ordered) {
    if (activity.kind === "user-input.requested") {
      if (activityRequestId(activity) === requestId && isGrillPayload(activity.payload)) {
        request = activity;
      }
      continue;
    }
    if (
      activity.kind === "user-input.resolved" &&
      activityRequestId(activity) === requestId &&
      isGrillPayload(activity.payload)
    ) {
      request = undefined;
    }
  }
  return request;
}

/** Builds the matching resolution activity without invoking a provider. */
export function makeGrillResolutionCommand(input: {
  readonly request: OrchestrationThreadActivity;
  readonly commandId: string;
  readonly threadId: TurnStartCommand["threadId"];
  readonly answers: ProviderUserInputAnswers;
  readonly createdAt: string;
}): ActivityAppendCommand {
  const requestId = activityRequestId(input.request);
  if (requestId === null || !isGrillPayload(input.request.payload)) {
    throw new Error("Cannot resolve a non-Grill user-input request.");
  }
  const answers = normalizedAnswers(input.answers);
  return {
    type: "thread.activity.append",
    commandId: CommandId.make(`grill-resolved:${input.commandId}`),
    threadId: input.threadId,
    activity: {
      id: EventId.make(`grill-resolved:${input.commandId}`),
      tone: "info",
      kind: "user-input.resolved",
      summary: "Grill decision clarified",
      payload: {
        requestId,
        answers,
        source: GRILL_ACTIVITY_SOURCE,
        sourceProvider: GRILL_SOURCE_PROVIDER,
      },
      turnId: input.request.turnId,
      createdAt: input.createdAt,
    },
    createdAt: input.createdAt,
  };
}

/**
 * Hands the resolved decision ledger back to the normal provider turn path.
 * The bridge message is hidden so Grill remains a composer-native interaction
 * instead of adding an artificial questionnaire transcript to chat history.
 */
export function makeGrillContinuationCommand(input: {
  readonly request: OrchestrationThreadActivity;
  readonly commandId: string;
  readonly thread: Pick<
    OrchestrationThread,
    "id" | "modelSelection" | "runtimeMode" | "interactionMode"
  >;
  readonly answers: ProviderUserInputAnswers;
  readonly createdAt: string;
}): Extract<OrchestrationCommand, { type: "thread.turn.start" }> {
  if (!isGrillPayload(input.request.payload)) {
    throw new Error("Cannot continue a non-Grill user-input request.");
  }
  const answerLedger = Object.entries(normalizedAnswers(input.answers))
    .map(([questionId, answer]) => `${questionId}: ${answer}`)
    .join("\n")
    .slice(0, MAX_GRILL_ANSWER_CHARS);
  const topic =
    typeof input.request.payload.context === "string"
      ? input.request.payload.context
      : "the current task";
  return {
    type: "thread.turn.start",
    commandId: CommandId.make(`grill-continue:${input.commandId}`),
    threadId: input.thread.id,
    message: {
      messageId: MessageId.make(`grill-decisions:${input.commandId}`),
      role: "user",
      text: [
        "Continue the task after the native Grill interaction.",
        topic,
        "Resolved decisions:",
        answerLedger || "No decision values were supplied; use the safest reasonable assumption.",
        "Treat these decisions as user-owned constraints. Do not ask the same questions again unless new evidence makes one invalid.",
      ].join("\n\n"),
      attachments: [],
      hidden: true,
    },
    modelSelection: input.thread.modelSelection,
    runtimeMode: input.thread.runtimeMode,
    interactionMode: input.thread.interactionMode,
    createdAt: input.createdAt,
  };
}

export { parseGrillInvocation };
export type { GrillInvocation };
